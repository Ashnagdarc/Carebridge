"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { consentApi } from "@/lib/api";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { useToast } from "@/providers/ToastProvider";
import { AccessLogEntry, ConsentRecord, HospitalInfo } from "@/types/consent";

type ConsentSectionKey = "active" | "expired" | "revoked";

const ACCESS_LOG_PAGE_SIZE = 20;

function formatDateTime(value?: string) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

function humanize(value: string) {
  return value.replace(/[_-]/g, " ");
}

function parseDataAccessed(log: AccessLogEntry): string {
  if (!log.details) return `${humanize(log.resourceType)} (${log.resourceId})`;

  try {
    const parsed = JSON.parse(log.details) as Record<string, unknown>;
    if (typeof parsed.dataType === "string") return parsed.dataType;
    if (typeof parsed.scope === "string") return parsed.scope;
    if (typeof parsed.resourceType === "string") return parsed.resourceType;
    return `${humanize(log.resourceType)} (${log.resourceId})`;
  } catch {
    return `${humanize(log.resourceType)} (${log.resourceId})`;
  }
}

function ConsentHistoryContent() {
  const router = useRouter();
  const { addToast } = useToast();

  const [activeConsents, setActiveConsents] = useState<ConsentRecord[]>([]);
  const [revokedConsents, setRevokedConsents] = useState<ConsentRecord[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  const [consentsLoading, setConsentsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [isLoadingMoreLogs, setIsLoadingMoreLogs] = useState(false);
  const [processingRevokeId, setProcessingRevokeId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ConsentRecord | null>(null);

  const [hospitals, setHospitals] = useState<HospitalInfo[]>([]);

  const [logPagination, setLogPagination] = useState({
    skip: 0,
    take: ACCESS_LOG_PAGE_SIZE,
    total: 0,
    hasMore: false,
  });

  const [expandedSections, setExpandedSections] = useState<Record<ConsentSectionKey, boolean>>({
    active: false,
    expired: false,
    revoked: false,
  });

  useEffect(() => {
    const loadConsentsAndLogs = async () => {
      try {
        setConsentsLoading(true);
        setLogsLoading(true);

        const [consents, logResult, hospitalsList] = await Promise.all([
          consentApi.getActiveConsents(),
          consentApi.getPatientAccessLogs(0, ACCESS_LOG_PAGE_SIZE),
          consentApi.getHospitals(),
        ]);

        setActiveConsents(consents);
        setHospitals(hospitalsList);
        setAccessLogs(logResult.logs);
        setLogPagination({
          skip: logResult.skip,
          take: logResult.take,
          total: logResult.total,
          hasMore: logResult.hasMore,
        });
      } catch (error) {
        console.error("Failed to load consent history data:", error);
        addToast("Failed to load consent history", "error");
      } finally {
        setConsentsLoading(false);
        setLogsLoading(false);
      }
    };

    loadConsentsAndLogs();
  }, [addToast]);

  const expiredConsents = useMemo(
    () =>
      activeConsents.filter(
        (consent) => new Date(consent.expiresAt).getTime() <= Date.now()
      ),
    [activeConsents]
  );

  const hospitalMap = useMemo(() => {
    return hospitals.reduce((map, hospital) => {
      map[hospital.id] = hospital.name;
      return map;
    }, {} as Record<string, string>);
  }, [hospitals]);


  const currentActiveConsents = useMemo(
    () =>
      activeConsents.filter(
        (consent) => new Date(consent.expiresAt).getTime() > Date.now()
      ),
    [activeConsents]
  );

  const toggleSection = (section: ConsentSectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const loadMoreLogs = async () => {
    if (!logPagination.hasMore || isLoadingMoreLogs) return;

    try {
      setIsLoadingMoreLogs(true);
      const nextSkip = accessLogs.length;
      const nextPage = await consentApi.getPatientAccessLogs(nextSkip, ACCESS_LOG_PAGE_SIZE);

      setAccessLogs((prev) => [...prev, ...nextPage.logs]);
      setLogPagination({
        skip: nextPage.skip,
        take: nextPage.take,
        total: nextPage.total,
        hasMore: nextPage.hasMore,
      });
    } catch (error) {
      console.error("Failed to load more access logs:", error);
      addToast("Failed to load more access logs", "error");
    } finally {
      setIsLoadingMoreLogs(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!confirmRevoke) return;

    try {
      setProcessingRevokeId(confirmRevoke.id);
      await consentApi.revokeConsent(confirmRevoke.id);

      const revokedRecord: ConsentRecord = {
        ...confirmRevoke,
        status: "revoked",
        revokedAt: new Date().toISOString(),
      };

      setActiveConsents((prev) => prev.filter((consent) => consent.id !== confirmRevoke.id));
      setRevokedConsents((prev) => [revokedRecord, ...prev]);
      setConfirmRevoke(null);
      addToast("Consent revoked successfully", "success");
    } catch (error) {
      console.error("Failed to revoke consent:", error);
      addToast("Failed to revoke consent", "error");
    } finally {
      setProcessingRevokeId(null);
    }
  };

  return (
    <div className="pb-24">
      <Header
        title="Consent History"
        subtitle="Track approvals and healthcare data access"
        backButton
        onBack={() => router.push("/consents")}
      />

      <main className="container-safe max-w-2xl mx-auto py-6 space-y-6">
        <Card>
          <CardBody>
            <h2 className="text-lg font-bold text-foreground">Consent Records</h2>
            <p className="text-sm text-gray-600">
              View your consent states and revoke access anytime.
            </p>

            {consentsLoading ? (
              <p className="text-sm text-gray-600">Loading consent records...</p>
            ) : (
              <div className="space-y-3">
                <ConsentSection
                  title="Active"
                  count={currentActiveConsents.length}
                  expanded={expandedSections.active}
                  onToggle={() => toggleSection("active")}
                >
                  {currentActiveConsents.length === 0 ? (
                    <EmptyState text="No active consents." />
                  ) : (
                    currentActiveConsents.map((consent) => (
                      <ConsentCard
                        key={consent.id}
                        consent={consent}
                        actionLabel="Revoke"
                        actionVariant="danger"
                        onAction={() => setConfirmRevoke(consent)}
                        actionDisabled={processingRevokeId === consent.id}
                      />
                    ))
                  )}
                </ConsentSection>

                <ConsentSection
                  title="Expired"
                  count={expiredConsents.length}
                  expanded={expandedSections.expired}
                  onToggle={() => toggleSection("expired")}
                >
                  {expiredConsents.length === 0 ? (
                    <EmptyState text="No expired consents." />
                  ) : (
                    expiredConsents.map((consent) => (
                      <ConsentCard key={consent.id} consent={consent} />
                    ))
                  )}
                </ConsentSection>

                <ConsentSection
                  title="Revoked"
                  count={revokedConsents.length}
                  expanded={expandedSections.revoked}
                  onToggle={() => toggleSection("revoked")}
                >
                  {revokedConsents.length === 0 ? (
                    <EmptyState text="No revoked consents." />
                  ) : (
                    revokedConsents.map((consent) => (
                      <ConsentCard key={consent.id} consent={consent} />
                    ))
                  )}
                </ConsentSection>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Access Logs</h2>
              <span className="text-xs text-gray-600">{logPagination.total} total</span>
            </div>

            {logsLoading ? (
              <p className="text-sm text-gray-600">Loading access logs...</p>
            ) : accessLogs.length === 0 ? (
              <EmptyState text="No access log entries yet." />
            ) : (
              <>
                <ul className="space-y-2" aria-label="Access log timeline">
                  {accessLogs.map((log) => (
                    <li key={log.id} className="border border-tertiary rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {humanize(log.action)}
                          </p>
                          <p className="text-xs text-gray-600">{parseDataAccessed(log)}</p>
                          <p className="text-xs text-gray-600">
                            Hospital: {hospitalMap[log.hospitalId || ""] || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-600">{formatDateTime(log.createdAt)}</p>
                        </div>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            log.status.toLowerCase() === "success"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {log.status.toLowerCase() === "success" ? "Successful" : log.status.toLowerCase() === "failed" ? "Failed" : humanize(log.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                {logPagination.hasMore && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={loadMoreLogs}
                    loading={isLoadingMoreLogs}
                  >
                    Load More
                  </Button>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </main>

      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-tertiary rounded-lg max-w-md w-full p-5 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Confirm Revocation</h3>
            <p className="text-sm text-gray-700">
              Revoke access for {confirmRevoke.hospital.name}? The hospital will no longer be
              able to access the approved data.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmRevoke(null)}
                disabled={processingRevokeId === confirmRevoke.id}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleConfirmRevoke}
                loading={processingRevokeId === confirmRevoke.id}
              >
                Confirm Revoke
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConsentSectionProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ConsentSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: ConsentSectionProps) {
  return (
    <div className="border border-tertiary rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          {title} ({count})
        </span>
        <span className="text-xs text-gray-600">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

interface ConsentCardProps {
  consent: ConsentRecord;
  actionLabel?: string;
  actionVariant?: "primary" | "secondary" | "ghost" | "danger";
  onAction?: () => void;
  actionDisabled?: boolean;
}

function ConsentCard({
  consent,
  actionLabel,
  actionVariant = "secondary",
  onAction,
  actionDisabled = false,
}: ConsentCardProps) {
  return (
    <div className="border border-tertiary rounded-lg p-3">
      <p className="text-sm font-semibold text-foreground">{consent.hospital.name}</p>
      <p className="text-xs text-gray-600">Scopes: {consent.scopes.map((s) => s.name).join(", ")}</p>
      <p className="text-xs text-gray-600">Granted: {formatDateTime(consent.approvedAt)}</p>
      <p className="text-xs text-gray-600">Expires: {formatDateTime(consent.expiresAt)}</p>
      {consent.revokedAt && (
        <p className="text-xs text-gray-600">Revoked: {formatDateTime(consent.revokedAt)}</p>
      )}

      {actionLabel && onAction && (
        <Button
          variant={actionVariant}
          size="sm"
          className="mt-2"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-600">{text}</p>;
}

export default function ConsentHistoryPage() {
  return (
    <ProtectedRoute>
      <ConsentHistoryContent />
    </ProtectedRoute>
  );
}
