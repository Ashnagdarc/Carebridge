"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  backButton?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
}

/**
 * Apple HIG Header Component
 * - Large title (34px)
 * - Minimalist design with proper spacing
 * - Supports back button and action elements
 */
export function Header({
  title,
  subtitle,
  backButton = false,
  onBack,
  action,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <div className="mx-auto flex min-h-[76px] max-w-2xl items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-background/78 px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.16)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/62">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {backButton && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-tertiary/70 bg-secondary/70 text-foreground shadow-sm transition-[background-color,transform] hover:bg-tertiary active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
              aria-label="Go back"
            >
              <svg
                aria-hidden="true"
                className="size-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.65rem] font-bold leading-tight text-foreground text-balance sm:text-3xl">{title}</h1>
            {subtitle && (
              <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <div className={cn("flex shrink-0 items-center gap-1.5 rounded-full border border-tertiary/70 bg-secondary/55 p-1 shadow-sm")}>
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
