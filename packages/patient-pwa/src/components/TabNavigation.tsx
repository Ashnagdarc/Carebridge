"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface TabNavigationProps {
  items: TabItem[];
}

/**
 * Apple HIG Tab Navigation Component
 * - Sticky bottom tab bar (iOS style)
 * - Icon + label layout
 * - Active state indication
 * - Accessibility: proper ARIA labels
 */
export function TabNavigation({ items }: TabNavigationProps) {
  const pathname = usePathname();
  const activeHref = React.useMemo(() => {
    if (!pathname) return null;
    let best: string | null = null;

    for (const item of items) {
      const isExact = pathname === item.href;
      const isNested = pathname.startsWith(`${item.href}/`);
      if (!isExact && !isNested) continue;

      if (!best || item.href.length > best.length) {
        best = item.href;
      }
    }

    return best;
  }, [items, pathname]);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="pointer-events-auto mx-auto flex max-w-2xl items-stretch justify-around gap-1 rounded-[1.6rem] border border-white/10 bg-background/80 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/62">
        {items.map((item) => {
          const isActive = activeHref === item.href;
          const icon = React.isValidElement(item.icon)
            ? React.cloneElement(item.icon as React.ReactElement<{ "aria-hidden"?: boolean }>, {
                "aria-hidden": true,
              })
            : item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex min-h-[58px] flex-1 flex-col items-center justify-center rounded-[1.15rem] px-2 py-2 transition-[color,background-color,transform,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info ${
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className={`relative flex size-7 items-center justify-center rounded-full transition-transform duration-200 ${isActive ? "-translate-y-0.5 scale-105" : "group-hover:-translate-y-0.5"}`}>
                {icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2.5 -top-2.5 flex min-w-5 items-center justify-center rounded-full border border-background bg-error px-1 text-xs font-bold leading-5 text-white">
                    <span aria-hidden="true">{item.badge > 99 ? "99+" : item.badge}</span>
                    <span className="sr-only">
                      {item.badge} unread consent {item.badge === 1 ? "request" : "requests"}
                    </span>
                  </span>
                )}
              </div>
              <span className="mt-1 max-w-full truncate text-[0.72rem] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
