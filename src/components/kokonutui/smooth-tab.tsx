/**
 * Adapted from Kokonut UI "Smooth Tab" (@dorianbaffier, MIT, https://kokonutui.com):
 * trimmed to a segmented control with the original sliding spring indicator.
 */

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SmoothTabItem {
  id: string;
  title: string;
  count?: number;
}

interface SmoothTabProps {
  items: SmoothTabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function SmoothTab({ items, value, onChange, className }: SmoothTabProps) {
  const [dimensions, setDimensions] = React.useState({ width: 0, left: 0 });
  const buttonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const update = () => {
      const btn = buttonRefs.current.get(value);
      const container = containerRef.current;
      if (btn && container) {
        setDimensions({
          width: btn.offsetWidth,
          left: btn.offsetLeft,
        });
      }
    };
    requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [value, items]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn("relative inline-flex items-center gap-1 rounded-lg border bg-card p-1", className)}
    >
      {dimensions.width > 0 && (
        <motion.div
          className="absolute top-1 bottom-1 z-[1] rounded-md bg-secondary"
          initial={false}
          animate={{ width: dimensions.width, x: dimensions.left - 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ left: 4 }}
        />
      )}
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) buttonRefs.current.set(item.id, el);
              else buttonRefs.current.delete(item.id);
            }}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-[2] rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.title}
            {item.count !== undefined && (
              <span className={cn("ml-1.5 font-mono text-xs", selected ? "text-muted-foreground" : "text-muted-foreground/60")}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
