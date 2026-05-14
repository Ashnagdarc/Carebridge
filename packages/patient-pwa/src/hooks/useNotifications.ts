"use client";
// CareBridge: Custom React hook for shared client behavior.

import { useContext } from "react";
import { NotificationsContext } from "@/providers/NotificationsProvider";

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}

