"use client";

import React, { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Apple HIG Button Component
 * - Variants: primary, secondary, ghost, danger
 * - Sizes: small, medium, large
 * - Accessibility: proper focus states, aria labels
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0";

  const variantClasses = {
    primary: "bg-foreground text-background shadow-sm hover:opacity-85",
    secondary:
      "border border-tertiary bg-secondary text-foreground hover:bg-tertiary",
    ghost: "text-foreground hover:bg-secondary",
    danger: "bg-error text-white shadow-sm hover:opacity-85",
  };

  const sizeClasses = {
    sm: "min-h-10 px-3 py-2 text-sm rounded-lg",
    md: "min-h-11 px-4 py-2 text-base rounded-lg",
    lg: "min-h-12 px-6 py-3 text-lg rounded-xl",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? "w-full" : ""
      } ${className ?? ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            aria-hidden="true"
            className="size-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
