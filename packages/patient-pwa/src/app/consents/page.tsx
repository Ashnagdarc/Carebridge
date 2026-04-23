"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConsentRequest } from "@/types/consent";
import { consentApi } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { ConsentRequestCard } from "@/components/ConsentRequestCard";
import { BottomTabs } from "@/components/BottomTabs";
import { useNotifications } from "@/hooks/useNotifications";
import { triggerHaptic } from "@/lib/haptics";

function ConsentInboxContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const { markConsentRequestsRead } = useNotifications();
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDeny, setConfirmDeny] = useState<ConsentRequest | null>(null);

  useEffect(() => {
    markConsentRequestsRead();
    const loadPendingRequests = async () => {
      try {
        setIsLoading(true);
        const pending = await consentApi.getPendingRequests();
        setRequests(pending);
      } catch (error) {
        console.error("Failed to load pending requests:", error);
        addToast("Failed to load consent requests", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingRequests();
  }, [addToast, markConsentRequestsRead]);

  const handleApprove = (requestId: string) => {
    triggerHaptic();
    router.push(`/consents/approve/${requestId}`);
  };

  const handleDeny = (requestId: string) => {
    const request = requests.find((item) => item.id === requestId);
    if (request) {
      triggerHaptic();
      setConfirmDeny(request);
    }
  };

  const handleConfirmDeny = async () => {
    if (!confirmDeny) return;

    try {
      setProcessingId(confirmDeny.id);
      await consentApi.denyConsentRequest(
        confirmDeny.id,
        "Patient denied this consent request from the PWA",
      );
      addToast("Consent request denied", "success");
      setRequests((prev) => prev.filter((r) => r.id !== confirmDeny.id));
      setConfirmDeny(null);
    } catch (error) {
      console.error("Failed to deny request:", error);
      addToast("Failed to deny consent request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="pb-24">
      <Header
        title="Consent Requests"
        subtitle="Review pending healthcare data requests"
      />

      <main className="container-safe max-w-2xl mx-auto py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading requests…</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <p className="text-lg font-semibold text-foreground mb-2">
                  No Pending Requests
                </p>
                <p className="mb-6 text-muted-foreground">
                  You have no pending healthcare data requests at this time.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Review carefully:</strong> Approving a request allows
                the hospital to access your healthcare data. You can revoke
                access at any time.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mb-4"
              onClick={() => router.push("/consents/history")}
            >
              View History & Access Logs
            </Button>

            {requests.map((request) => (
              <ConsentRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onDeny={handleDeny}
                isLoading={processingId === request.id}
              />
            ))}
          </>
        )}
      </main>

      {confirmDeny && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-deny-title"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border border-tertiary bg-background p-5 shadow-xl">
            <div className="space-y-2">
              <h2 id="confirm-deny-title" className="text-lg font-bold text-foreground">
                Deny request?
              </h2>
              <p className="text-sm text-muted-foreground">
                This will tell {confirmDeny.hospital.name} that you do not grant access to{" "}
                {(confirmDeny.scopes || []).map((scope) => scope.name).join(", ") || "your health data"}.
              </p>
            </div>
            <div className="rounded-lg border border-tertiary bg-secondary p-3 text-sm text-muted-foreground">
              You can still approve a future request from this provider if your care needs change.
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmDeny(null)}
                disabled={processingId === confirmDeny.id}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleConfirmDeny}
                loading={processingId === confirmDeny.id}
              >
                Confirm Deny
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomTabs />
    </div>
  );
}

export default function ConsentInboxPage() {
  return (
    <ProtectedRoute>
      <ConsentInboxContent />
    </ProtectedRoute>
  );
}
