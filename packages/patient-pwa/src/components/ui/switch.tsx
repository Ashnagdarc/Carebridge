"use client";
// CareBridge: Reusable UI component implementation.

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=default]:h-7 data-[size=default]:w-14 data-[size=sm]:h-6 data-[size=sm]:w-12",
        "data-[state=unchecked]:bg-input/50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-data-[size=default]/switch:size-[26px] group-data-[size=sm]/switch:size-5",
          "data-[state=unchecked]:translate-x-1 data-[state=checked]:translate-x-7 data-[state=checked]:rtl:-translate-x-7",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
