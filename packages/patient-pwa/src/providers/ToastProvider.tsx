"use client";

import React, { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now().toString();
      const newToast: Toast = { id, message, type };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 flex flex-col gap-2 pointer-events-none md:left-auto md:right-6 md:max-w-sm">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const bgColor =
    toast.type === "success"
      ? "bg-green-500"
      : toast.type === "error"
        ? "bg-red-500"
        : toast.type === "warning"
          ? "bg-yellow-500"
          : "bg-blue-500";

  const icon =
    toast.type === "success"
      ? "✓"
      : toast.type === "error"
        ? "✕"
        : toast.type === "warning"
          ? "⚠"
          : "ℹ";

  return (
    <div
      className={`${bgColor} text-white rounded-lg p-3 shadow-lg flex items-start gap-2 pointer-events-auto animate-in fade-in slide-in-from-bottom-4`}
    >
      <span className="text-lg font-bold mt-0.5">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <button
        onClick={onRemove}
        className="text-white hover:opacity-80 transition-opacity ml-2"
      >
        ✕
      </button>
    </div>
  );
}
