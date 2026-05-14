// CareBridge: Patient PWA route/layout implementation.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - CareBridge Patient",
  description: "Sign in or create your CareBridge account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
