/**
 * Adapted from Kokonut UI "Action Search Bar" (@kokonutui, MIT, https://kokonutui.com):
 * generic search input with the original animated results dropdown, wired to
 * caller-supplied results instead of demo actions.
 */

import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  end?: string;
  onSelect: () => void;
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0, height: 0 },
    show: {
      opacity: 1,
      height: "auto",
      transition: { height: { duration: 0.3 }, staggerChildren: 0.04 },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } },
    },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  },
} as const;

interface ActionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  results: SearchAction[];
  placeholder?: string;
  className?: string;
}

export default function ActionSearchBar({ value, onChange, results, placeholder, className }: ActionSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const showResults = isFocused && value.trim().length > 0;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showResults || results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((p) => (p < results.length - 1 ? p + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((p) => (p > 0 ? p - 1 : results.length - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        results[activeIndex].onSelect();
      } else if (e.key === "Escape") {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    },
    [showResults, results, activeIndex],
  );

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          role="combobox"
          aria-expanded={showResults}
          aria-autocomplete="list"
          autoComplete="off"
          className="pl-9"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            role="listbox"
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg"
            variants={ANIMATION_VARIANTS.container}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <motion.ul>
              {results.map((action, i) => (
                <motion.li
                  key={action.id}
                  role="option"
                  aria-selected={activeIndex === i}
                  className={cn(
                    "flex cursor-pointer items-center justify-between px-3 py-2",
                    activeIndex === i ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                  variants={ANIMATION_VARIANTS.item}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    action.onSelect();
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-muted-foreground">{action.icon}</span>
                    <span className="text-sm font-medium">{action.label}</span>
                    {action.description && (
                      <span className="text-xs text-muted-foreground">{action.description}</span>
                    )}
                  </div>
                  {action.end && <span className="font-mono text-xs text-muted-foreground">{action.end}</span>}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
