import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Module-level cache so navigating back to a route paints immediately instead
 * of flashing a skeleton. The API is local and answers in ~10ms, which is long
 * enough to see a loading state but far too short for it to be useful.
 */
const cache = new Map<string, unknown>();

export function putResource<T>(key: string, value: T) {
  cache.set(key, value);
}

export function dropResource(key: string) {
  cache.delete(key);
}

/**
 * A load that resolves this fast reads as a flicker, not as feedback, so the
 * skeleton is held back until the request has clearly taken a moment.
 */
const SKELETON_DELAY_MS = 150;

export interface Resource<T> {
  data: T | undefined;
  /** True when the first paint came from cache, so entry animations can be skipped. */
  warm: boolean;
  /** Only true once loading has lasted long enough to be worth showing. */
  showSkeleton: boolean;
  reload: () => Promise<void>;
  set: (value: T) => void;
}

export function useResource<T>(key: string, load: () => Promise<T>): Resource<T> {
  const warm = useRef(cache.has(key)).current;
  const [data, setData] = useState<T | undefined>(() => cache.get(key) as T | undefined);

  // Keep the latest loader without making it a dependency; the key identifies
  // the resource, and callers pass a fresh closure on every render.
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    try {
      const value = await loadRef.current();
      cache.set(key, value);
      setData(value);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [key]);

  const set = useCallback(
    (value: T) => {
      cache.set(key, value);
      setData(value);
    },
    [key],
  );

  useEffect(() => {
    let alive = true;
    void loadRef.current().then(
      (value) => {
        if (!alive) return;
        cache.set(key, value);
        setData(value);
      },
      (e: Error) => {
        if (alive) toast.error(e.message);
      },
    );
    return () => {
      alive = false;
    };
  }, [key]);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (data !== undefined) return;
    const timer = setTimeout(() => setSlow(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data]);

  return { data, warm, showSkeleton: data === undefined && slow, reload, set };
}
