"use client";
// CareBridge: Reusable UI component implementation.

import * as React from "react";

import { PixelBackground } from "@/components/backgrounds/pixel";
import { cn } from "@/lib/utils";

interface AuthScreenProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthScreen({ children, className }: AuthScreenProps) {
  return (
    <PixelBackground
      className="min-h-screen bg-[#0d0d0d] text-white"
      gap={6}
      speed={35}
      pattern="center"
      darkColors="#173327,#25483a,#385f50"
      lightColors="#d7efe5,#b7dccd,#8fbfac"
    >
      <main className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_52%,rgba(52,199,89,0.13),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
        <section
          className={cn(
            "relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6",
            className,
          )}
        >
          {children}
        </section>
      </main>
    </PixelBackground>
  );
}

export function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/50 p-6 text-foreground shadow-2xl shadow-black/35 backdrop-blur-md sm:p-8">
      {children}
    </div>
  );
}
