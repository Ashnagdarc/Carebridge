"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { BottomTabs } from "@/components/BottomTabs";
import { generateUID } from "@/lib/uid";
import { consentApi } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import { LogOut, Settings } from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  // Generate UID from user data (consistent across renders)
  const patientUID = useMemo(() => {
    if (!user) return "";
    return generateUID(user.name, user.externalId);
  }, [user]);

  const handleLogout = () => {
    triggerHaptic(10);
    logout();
    router.push("/login");
  };

  const handleCopyUID = async () => {
    try {
      await navigator.clipboard.writeText(patientUID);
      triggerHaptic([8, 20, 8]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy UID:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadPendingCount = async () => {
      try {
        const pending = await consentApi.getPendingRequests();
        if (!cancelled) setPendingCount(pending.length);
      } catch (error) {
        console.warn("Failed to fetch pending requests:", error);
        if (!cancelled) setPendingCount(0);
      }
    };

    loadPendingCount();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pb-24">
      <Header
        title="Dashboard"
        subtitle={`Welcome, ${user?.name}`}
        action={
          <>
            <button
              type="button"
              aria-label="Open settings"
              onClick={() => router.push("/settings")}
              className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-background hover:text-foreground active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
            >
              <Settings aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Log out"
              onClick={handleLogout}
              className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-background hover:text-foreground active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
            >
              <LogOut aria-hidden="true" className="size-5" />
            </button>
          </>
        }
      />

      <main className="container-safe max-w-2xl mx-auto py-6 space-y-6">
        {/* UID Display Card */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-bold mb-4 text-foreground text-center">
              Patient ID
            </h3>
            <div className="flex flex-col items-center gap-3">
              <p className="text-3xl font-mono font-bold text-foreground tracking-wide">
                {patientUID}
              </p>
              <Button
                variant={copied ? "primary" : "secondary"}
                size="sm"
                onClick={handleCopyUID}
              >
                {copied ? "✓ Copied!" : "Copy ID"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardBody className="flex flex-col items-center">
            <QRCodeDisplay
              value={patientUID}
              size={240}
              title="Share Your ID"
            />
          </CardBody>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-bold mb-4 text-foreground">Profile</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="text-foreground font-semibold">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-foreground font-semibold">{user?.email}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Consent Requests Card (Placeholder) */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-foreground">
                Pending Requests
              </h3>
              <span className="bg-gray-200 text-foreground text-sm font-bold px-2 py-1 rounded">
                {pendingCount ?? "—"}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              {pendingCount === null
                ? "Loading pending consent requests..."
                : pendingCount === 0
                  ? "You have no pending consent requests at this time."
                  : `You have ${pendingCount} pending consent request${
                      pendingCount === 1 ? "" : "s"
                    }.`}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => router.push("/consents")}
            >
              View All Requests
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => router.push("/consents/history")}
            >
              View Consent History
            </Button>
          </CardBody>
        </Card>
      </main>

      <BottomTabs />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
