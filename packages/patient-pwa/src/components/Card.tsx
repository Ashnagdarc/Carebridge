"use client";
// CareBridge: Reusable UI component implementation.

import React, { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={`bg-secondary border border-tertiary rounded-lg p-4 ${className ?? ""}`}
      {...props}
    />
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function CardHeader({
  title,
  subtitle,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className ?? ""}`} {...props}>
      {title && <h3 className="text-lg font-bold text-foreground">{title}</h3>}
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={`space-y-3 ${className ?? ""}`} {...props} />;
}

type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={`mt-4 pt-4 border-t border-tertiary flex gap-2 ${className ?? ""}`}
      {...props}
    />
  );
}
