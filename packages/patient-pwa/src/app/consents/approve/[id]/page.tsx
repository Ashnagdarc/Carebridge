"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ConsentRequest, ExpiryOption } from "@/types/consent";
import { consentApi } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { BottomTabs } from "@/components/BottomTabs";

function ConsentApprovalContent() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const requestId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [request, setRequest] = useState<ConsentRequest | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryOption>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRequest = async () => {
      try {
        setIsLoading(true);
        const pending = await consentApi.getPendingRequests();
        const found = pending.find((item) => item.id === requestId) || null;

        if (!found) {
          addToast("Consent request not found (it may have already been handled).", "error");
          router.push("/consents");
          return;
        }

        if (!cancelled) {
          setRequest(found);
        }
      } catch (error) {
        console.error("Failed to load consent request:", error);
        addToast("Failed to load consent request details", "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (requestId) {
      loadRequest();
    } else {
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [addToast, requestId, router]);

  const getExpiryLabel = (option: ExpiryOption): string => {
    if (option === 7) return "7 days";
    if (option === 30) return "30 days";
    if (option === 365) return "1 year";
    return "Custom";
  };

  const handleConfirm = async () => {
    try {
      let expiryDays: number;
      if (selectedExpiry === "custom") {
        const trimmed = customDays.trim();
        if (!trimmed) {
          addToast("Enter a custom expiry duration in days", "error");
          return;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
          addToast("Custom expiry must be a whole number of days", "error");
          return;
        }
        expiryDays = parsed;
      } else {
        expiryDays = selectedExpiry;
      }

      if (expiryDays < 1 || expiryDays > 3650) {
        addToast("Expiry must be between 1 and 3650 days", "error");
        return;
      }

      setIsSubmitting(true);
      await consentApi.approveConsentRequest(requestId, expiryDays);
      addToast(`Consent approved for ${expiryDays} days`, "success");
      router.push("/consents");
    } catch (error) {
      console.error("Failed to approve:", error);
      addToast("Failed to approve consent request", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header
        title="Approve Request"
        subtitle={request ? `Requested by ${request.hospital.name}` : "Set access duration"}
        backButton
        onBack={() => router.push("/consents")}
      />

      <main className="container-safe max-w-2xl mx-auto py-6">
        {request && (
          <Card className="mb-6">
            <CardBody>
              <h3 className="text-lg font-bold mb-2 text-foreground">Request details</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-600">Hospital</span>
                  <span className="font-semibold text-foreground">{request.hospital.name}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-600">Requested</span>
                  <span className="text-foreground">
                    {new Date(request.requestedAt).toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-tertiary">
                  <p className="text-gray-600 mb-1">Data requested</p>
                  <p className="text-foreground font-semibold">
                    {(request.scopes || []).map((scope) => scope.name).join(", ") || "Medical data"}
                  </p>
                </div>
                <div className="pt-2 border-t border-tertiary">
                  <p className="text-gray-600 mb-1">Clinical reason</p>
                  <p className="text-foreground">{request.clinicalReason}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="mb-6">
          <CardBody>
            <h3 className="text-lg font-bold mb-4 text-foreground">
              How long should this access be valid?
            </h3>

            <div className="space-y-3 mb-6">
              {([7, 30, 365] as const).map((days) => (
                <label
                  key={days}
                  className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    borderColor: selectedExpiry === days ? "#000" : "#e5e5e5",
                    backgroundColor:
                      selectedExpiry === days ? "#f5f5f5" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="expiry"
                    value={days}
                    checked={selectedExpiry === days}
                    onChange={() => setSelectedExpiry(days)}
                    className="w-4 h-4 mr-3"
                  />
                  <span className="font-semibold text-foreground">
                    {getExpiryLabel(days as ExpiryOption)}
                  </span>
                </label>
              ))}

              <label
                className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  borderColor: selectedExpiry === "custom" ? "#000" : "#e5e5e5",
                  backgroundColor:
                    selectedExpiry === "custom" ? "#f5f5f5" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="expiry"
                  value="custom"
                  checked={selectedExpiry === "custom"}
                  onChange={() => setSelectedExpiry("custom")}
                  className="w-4 h-4 mr-3"
                />
                <div className="flex-1">
                  <span className="font-semibold text-foreground block mb-2">
                    Custom
                  </span>
                  {selectedExpiry === "custom" && (
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      placeholder="Number of days (1-3650)"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-full px-2 py-1 border border-tertiary rounded text-sm"
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-6">
              <p className="text-sm text-yellow-900">
                <strong>Note:</strong> You can revoke this access at any time
                from your active consents.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
                loading={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Confirming..." : "Confirm Approval"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      </main>

      <BottomTabs />
    </div>
  );
}

export default function ConsentApprovalPage() {
  return (
    <ProtectedRoute>
      <ConsentApprovalContent />
    </ProtectedRoute>
  );
}
