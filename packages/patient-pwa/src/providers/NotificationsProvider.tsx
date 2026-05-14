"use client";
// CareBridge: React context/provider setup for app-wide state.

import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/providers/ToastProvider";

type NotificationContextValue = {
  unreadConsentRequests: number;
  markConsentRequestsRead: () => void;
  pushSupported: boolean;
  pushPermission: NotificationPermission | "unsupported";
  pushEnabled: boolean;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const STORAGE_KEY_UNREAD = "carebridge_unread_consent_requests";
const STORAGE_KEY_PUSH_ENABLED = "carebridge_push_enabled";

function apiUrl() {
  const origin = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const version = process.env.NEXT_PUBLIC_API_VERSION || "v1";
  return /\/api\/v\d+$/.test(origin) ? origin : `${origin}/api/${version}`;
}

function wsOriginFromApi(api: string) {
  // Keep WS origin derivation in one place so env overrides remain predictable.
  const origin = api.replace(/\/api\/v\d+$/, "").replace(/\/$/, "");
  const isHttps = origin.startsWith("https://");
  if (origin.startsWith("http://")) return origin.replace("http://", "ws://");
  if (origin.startsWith("https://")) return origin.replace("https://", "wss://");
  return isHttps ? `wss://${origin}` : `ws://${origin}`;
}

type ConsentRequestCreatedEvent = {
  type: "consent_request_created";
  data: {
    consentRequestId: string;
    patientId: string;
    hospital: { id: string; name: string };
    scopes: string[];
    clinicalReason: string;
    createdAt: string;
  };
};

function isConsentRequestCreatedEvent(value: unknown): value is ConsentRequestCreatedEvent {
  // Runtime guard protects UI from malformed socket payloads.
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.type !== "consent_request_created") return false;
  const data = record.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return false;
  return typeof data.consentRequestId === "string" && typeof data.patientId === "string";
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [unreadConsentRequests, setUnreadConsentRequests] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  const pushSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  }, []);

  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  const refreshPushPermission = useCallback(() => {
    if (typeof window === "undefined") {
      setPushPermission("unsupported");
      return;
    }
    if (!("Notification" in window)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UNREAD);
      if (stored) setUnreadConsentRequests(Number(stored) || 0);
      const storedPush = localStorage.getItem(STORAGE_KEY_PUSH_ENABLED);
      if (storedPush) setPushEnabled(storedPush === "true");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshPushPermission();
  }, [refreshPushPermission]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleRefresh = () => refreshPushPermission();
    window.addEventListener("focus", handleRefresh);
    document.addEventListener("visibilitychange", handleRefresh);
    return () => {
      window.removeEventListener("focus", handleRefresh);
      document.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [refreshPushPermission]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_UNREAD, String(unreadConsentRequests));
  }, [unreadConsentRequests]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_PUSH_ENABLED, String(pushEnabled));
  }, [pushEnabled]);

  const markConsentRequestsRead = useCallback(() => {
    setUnreadConsentRequests(0);
  }, []);

  const clearReconnect = () => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    // Ensure reconnect timer and stale handlers are always cleaned up together.
    clearReconnect();
    reconnectAttemptRef.current = 0;
    if (socketRef.current) {
      try {
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onmessage = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    if (typeof window === "undefined") return;

    // Support explicit WS endpoint override while defaulting to API-derived origin.
    const wsPath = process.env.NEXT_PUBLIC_WS_NOTIFICATIONS_PATH || "/ws/notifications";
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || wsOriginFromApi(apiUrl());
    const url = `${wsBase}${wsPath}`;

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (message) => {
        try {
          const parsed: unknown = JSON.parse(message.data);
          if (isConsentRequestCreatedEvent(parsed)) {
            const event = parsed;
            const isOnConsents = pathname?.startsWith("/consents");
            if (!isOnConsents) {
              setUnreadConsentRequests((prev) => prev + 1);
            }

            const scopesText = (event.data.scopes || []).slice(0, 3).join(", ");
            const detail = scopesText ? ` (${scopesText})` : "";
            addToast(
              `${event.data.hospital.name} requested access${detail}`,
              "info",
              {
                onClick: () => router.push(`/consents/approve/${event.data.consentRequestId}`),
              },
            );
          }
        } catch (err) {
          console.warn("Failed to parse notification event:", err);
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (!isAuthenticated) return;
        const attempt = reconnectAttemptRef.current++;
        // Exponential backoff prevents tight reconnect loops on server outages.
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        clearReconnect();
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      };

      socket.onerror = () => {
        // Let onclose handle retries; don't crash UI.
      };
    } catch (err) {
      console.warn("WebSocket connection failed:", err);
    }
  }, [addToast, isAuthenticated, pathname, router]);

  useEffect(() => {
    disconnect();
    if (isAuthenticated) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, isAuthenticated]);

  const enablePush = useCallback(async () => {
    if (!pushSupported) {
      addToast("Push notifications are not supported on this device", "warning");
      return;
    }

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
      addToast("Notifications are blocked in browser settings for this site", "warning");
      setPushEnabled(false);
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== "granted") {
      addToast("Push notifications permission was not granted", "warning");
      setPushEnabled(false);
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
    if (!publicKey) {
      addToast("Missing VAPID public key configuration", "error");
      setPushEnabled(false);
      return;
    }

    // Push depends on an active service worker registration in this origin scope.
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      addToast("Service worker not active (enable ENABLE_PUSH_IN_DEV=true for local dev)", "warning");
      setPushEnabled(false);
      return;
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${apiUrl()}/notifications/push/subscribe`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    setPushEnabled(true);
    addToast("Push notifications enabled on this device", "success");
  }, [addToast, pushSupported]);

  const disablePush = useCallback(async () => {
    if (!pushSupported) {
      setPushEnabled(false);
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      setPushEnabled(false);
      return;
    }
    // Unsubscribe locally and notify backend so stale endpoints are removed.
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        await fetch(`${apiUrl()}/notifications/push/unsubscribe`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      } catch {
        // ignore
      }
      await subscription.unsubscribe();
    }

    setPushEnabled(false);
    addToast("Push notifications disabled on this device", "info");
  }, [addToast, pushSupported]);

  const value: NotificationContextValue = {
    unreadConsentRequests,
    markConsentRequestsRead,
    pushSupported,
    pushPermission,
    pushEnabled,
    enablePush,
    disablePush,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
