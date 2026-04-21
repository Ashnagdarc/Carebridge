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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-tertiary safe-area-inset-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-stretch">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 relative transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-gray-500 hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="w-6 h-6 flex items-center justify-center relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-error text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium truncate">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground rounded-full"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
