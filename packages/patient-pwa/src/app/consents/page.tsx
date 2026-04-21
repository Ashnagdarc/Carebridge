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

function ConsentInboxContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const { markConsentRequestsRead } = useNotifications();
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    router.push(`/consents/approve/${requestId}`);
  };

  const handleDeny = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await consentApi.denyConsentRequest(requestId);
      addToast("Consent request denied", "success");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
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
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <p className="text-lg font-semibold text-foreground mb-2">
                  No Pending Requests
                </p>
                <p className="text-gray-600 mb-6">
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
