"use client";

import React, { useMemo } from "react";
import { TabNavigation, TabItem } from "@/components/TabNavigation";
import { useNotifications } from "@/hooks/useNotifications";
import {
  HomeIcon,
  BellIcon,
  ClockIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

export function BottomTabs() {
  const { unreadConsentRequests } = useNotifications();

  const items = useMemo<TabItem[]>(
    () => [
      {
        label: "Home",
        href: "/dashboard",
        icon: <HomeIcon className="size-6" />,
      },
      {
        label: "Inbox",
        href: "/consents",
        icon: <BellIcon className="size-6" />,
        badge: unreadConsentRequests,
      },
      {
        label: "History",
        href: "/consents/history",
        icon: <ClockIcon className="size-6" />,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: <Cog6ToothIcon className="size-6" />,
      },
    ],
    [unreadConsentRequests],
  );

  return <TabNavigation items={items} />;
}
