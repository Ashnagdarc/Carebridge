"use client";

import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export interface DiaTextRevealProps {
  text: string;
  colors?: string[];
  duration?: number;
  delay?: number;
  repeat?: boolean;
  repeatDelay?: number;
  startOnView?: boolean;
  once?: boolean;
  inViewMargin?: `${number}px` | `${number}px ${number}px` | `${number}px ${number}px ${number}px` | `${number}px ${number}px ${number}px ${number}px`;
  className?: string;
}

export function DiaTextReveal({
  text,
  colors = ["#f0abfc", "#f472b6", "#fb923c", "#facc15", "#a3e635"],
  duration = 1.5,
  delay = 0,
  repeat = false,
  repeatDelay = 0.5,
  startOnView = true,
  once = true,
  inViewMargin = "0px",
  className,
}: DiaTextRevealProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, {
    once,
    margin: inViewMargin,
  });
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = !prefersReducedMotion && (!startOnView || isInView);
  const gradientStops = [...colors, colors[0]].join(", ");

  return (
    <motion.span
      ref={ref}
      className={cn("inline-block bg-clip-text", className)}
      style={{
        color: "inherit",
        WebkitTextFillColor: "transparent",
        backgroundImage: `linear-gradient(90deg, currentColor 0%, currentColor 34%, ${gradientStops}, currentColor 76%, currentColor 100%)`,
        backgroundSize: "300% 100%",
        backgroundPosition: canAnimate ? "100% 50%" : "0% 50%",
      }}
      animate={
        canAnimate
          ? {
              backgroundPosition: repeat
                ? ["100% 50%", "0% 50%", "100% 50%"]
                : "0% 50%",
            }
          : undefined
      }
      transition={{
        duration,
        delay,
        ease: [0.23, 1, 0.32, 1],
        repeat: repeat ? Infinity : 0,
        repeatDelay,
      }}
    >
      {text}
    </motion.span>
  );
}
