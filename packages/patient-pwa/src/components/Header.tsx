"use client";

import React from "react";

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
    <header className="sticky top-0 z-50 bg-background border-b border-tertiary">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          {backButton && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Go back"
            >
              <svg
                className="w-6 h-6"
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    </header>
  );
}
