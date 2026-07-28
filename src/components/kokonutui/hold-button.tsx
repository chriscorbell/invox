/**
 * Adapted from Kokonut UI "Hold Button" (@dorianbaffier, MIT, https://kokonutui.com):
 * hold-to-confirm destructive action, restyled to theme tokens, fires onConfirm
 * when the hold completes.
 */

import { Trash2 } from "lucide-react";
import { motion, useAnimation } from "motion/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  holdDuration?: number;
  onConfirm: () => void;
}

export default function HoldButton({
  className,
  holdDuration = 1200,
  onConfirm,
  children,
  ...props
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const controls = useAnimation();
  const completed = useRef(false);

  async function handleHoldStart() {
    completed.current = false;
    setIsHolding(true);
    controls.set({ width: "0%" });
    await controls.start({
      width: "100%",
      transition: { duration: holdDuration / 1000, ease: "linear" },
    });
    if (!completed.current) {
      completed.current = true;
      setIsHolding(false);
      controls.set({ width: "0%" });
      onConfirm();
    }
  }

  function handleHoldEnd() {
    if (completed.current) return;
    completed.current = true;
    setIsHolding(false);
    controls.stop();
    controls.start({ width: "0%", transition: { duration: 0.1 } });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "relative touch-none select-none overflow-hidden",
        "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      onMouseDown={handleHoldStart}
      onMouseLeave={handleHoldEnd}
      onMouseUp={handleHoldEnd}
      onTouchCancel={handleHoldEnd}
      onTouchEnd={handleHoldEnd}
      onTouchStart={handleHoldStart}
      {...props}
    >
      <motion.div
        animate={controls}
        initial={{ width: "0%" }}
        className="absolute top-0 left-0 h-full bg-destructive/20"
      />
      <span className="relative z-10 flex items-center gap-2">
        <Trash2 className="size-4" />
        {isHolding ? "Keep holding" : children ?? "Hold to delete"}
      </span>
    </Button>
  );
}
