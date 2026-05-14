"use client";
// CareBridge: Reusable UI component implementation.

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { FiCheck, FiX } from "react-icons/fi";

import { cn } from "@/lib/utils";

type IconSwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitive.Root>,
  "asChild" | "children"
> & {
  className?: string;
};

export function IconSwitch({ className, ...props }: IconSwitchProps) {
  return (
    <div
      className={cn(
        "relative inline-grid h-7 w-14 grid-cols-[1fr_1fr] items-center text-sm font-medium",
        className,
      )}
    >
      <SwitchPrimitive.Root
        {...props}
        className={cn(
          "peer absolute inset-0 inline-flex items-center rounded-full border border-border p-0.5 transition-colors",
          "data-[state=unchecked]:bg-input/50 data-[state=checked]:bg-warning",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none z-10 block size-6 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-7 data-[state=checked]:rtl:-translate-x-7",
          )}
        />
      </SwitchPrimitive.Root>

      {/* On icon (left side, visible when checked) */}
      <span className="pointer-events-none relative z-20 flex min-w-8 items-center justify-center text-background opacity-0 transition-opacity duration-200 peer-data-[state=checked]:opacity-100">
        <FiCheck className="size-4" aria-hidden="true" />
      </span>

      {/* Off icon (right side, visible when unchecked) */}
      <span className="pointer-events-none relative z-20 flex min-w-8 items-center justify-center text-muted-foreground opacity-100 transition-opacity duration-200 peer-data-[state=checked]:opacity-0">
        <FiX className="size-4" aria-hidden="true" />
      </span>
    </div>
  );
}
