"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeSwitchProps = {
  iconSize?: number;
  className?: string;
};

type TransitionRoot = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => void;
};

export function ThemeSwitch({ iconSize = 16, className }: ThemeSwitchProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = isDark ? "light" : "dark";
    const root = document.documentElement;
    const canUseViewTransition =
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      window.innerWidth <= 1800;

    if (!canUseViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    root.style.setProperty("--vt-x", `${x}px`);
    root.style.setProperty("--vt-y", `${y}px`);
    root.style.setProperty("--vt-r", `${radius}px`);

    (document as TransitionRoot).startViewTransition?.(() => {
      setTheme(nextTheme);
    });
  };

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn("h-10 w-10 rounded-full border border-border/70", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-secondary/70 text-foreground shadow-sm transition-[transform,background-color] hover:bg-tertiary/80 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ y: 6, opacity: 0, rotate: -20, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          exit={{ y: -6, opacity: 0, rotate: 20, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 450, damping: 30, mass: 0.8 }}
          className="inline-flex"
        >
          {isDark ? <MoonIcon size={iconSize} /> : <SunIcon size={iconSize} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function SunIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a7.5 7.5 0 1 0 9 9A9 9 0 1 1 12 3z" />
    </svg>
  );
}
