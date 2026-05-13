import { useEffect, useMemo, useState } from "react";
import PixelBackground from "./components/PixelBackground";

type EventType =
  | "data_request_created"
  | "consent_request_created"
  | "consent_approved"
  | "consent_denied"
  | "data_request_in_progress"
  | "data_fetch_started"
  | "data_delivery_started"
  | "data_request_completed"
  | "data_request_failed";

type DefenseEvent = {
  type: EventType;
  timestamp: string;
  payload: {
    dataRequestId?: string;
    consentRequestId?: string;
    patientId?: string;
    sourceHospitalId?: string;
    targetHospitalId?: string;
    dataTypes?: string[];
    purpose?: string | null;
    status?: string;
    failureReason?: string;
    [key: string]: unknown;
  };
};

type PatientResolution = {
  found: boolean;
  patient: {
    id: string;
    externalId: string;
    fullName: string;
    email: string;
  } | null;
  hospitals: Array<{
    id: string;
    name: string;
    code: string;
    endpoint: string;
  }>;
};

const wsUrl =
  import.meta.env.VITE_DEFENSE_WS_URL || "ws://localhost:3000/ws/defense";
const wsToken = import.meta.env.VITE_DEFENSE_TOKEN || "carebridge-defense-demo";
const apiBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

const stageLabels = [
  "Request Created",
  "Consent Requested",
  "Consent Approved",
  "Fetch From Hospital A",
  "Deliver To Hospital B",
  "Completed",
];

const eventToStage: Partial<Record<EventType, number>> = {
  data_request_created: 1,
  consent_request_created: 2,
  consent_approved: 3,
  data_fetch_started: 4,
  data_delivery_started: 5,
  data_request_completed: 6,
};

const prettyType = (type: EventType) =>
  type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getEventIcon = (type: EventType): string => {
  const icons: Record<EventType, string> = {
    data_request_created: "📋",
    consent_request_created: "🔒",
    consent_approved: "✅",
    consent_denied: "❌",
    data_request_in_progress: "⏳",
    data_fetch_started: "📥",
    data_delivery_started: "📤",
    data_request_completed: "✨",
    data_request_failed: "⚠️",
  };
  return icons[type] || "•";
};

const getEventSummary = (event: DefenseEvent): string => {
  const { payload } = event;
  switch (event.type) {
    case "data_request_created":
      return `Requested: ${(payload.dataTypes || []).join(", ")}`;
    case "consent_request_created":
      return `Waiting for patient approval`;
    case "consent_approved":
      return `Patient approved data sharing`;
    case "consent_denied":
      return `Patient denied request`;
    case "data_request_in_progress":
      return `Processing data request`;
    case "data_fetch_started":
      return `Retrieving from ${payload.sourceHospitalId?.slice(0, 8) || "hospital"}`;
    case "data_delivery_started":
      return `Delivering to ${payload.targetHospitalId?.slice(0, 8) || "hospital"}`;
    case "data_request_completed":
      return `✓ Complete${payload.latencyMs ? ` (${payload.latencyMs}ms)` : ""}`;
    case "data_request_failed":
      return `Failed: ${payload.failureReason || "Unknown error"}`;
    default:
      return prettyType(event.type);
  }
};

const formatDataAsPlainText = (item: any): string => {
  if (typeof item === "string") return item;
  if (typeof item !== "object" || !item) return String(item);

  const lines: string[] = [];
  Object.entries(item).forEach(([key, value]) => {
    const formattedKey = key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
    const capitalizedKey =
      formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);

    if (typeof value === "object" && value !== null) {
      lines.push(`${capitalizedKey}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${capitalizedKey}: ${String(value)}`);
    }
  });
  return lines.join("\n");
};

const redactPayload = (payload: DefenseEvent["payload"]) => {
  const safe: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    const lower = key.toLowerCase();
    safe[key] =
      lower.includes("name") ||
      lower.includes("email") ||
      lower.includes("phone") ||
      lower.includes("address")
        ? "[REDACTED]"
        : value;
  });
  return safe;
};

const formatElapsed = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function App() {
  const [events, setEvents] = useState<DefenseEvent[]>([]);
  const [socketState, setSocketState] = useState<
    "connecting" | "open" | "closed"
  >("connecting");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [processLocked, setProcessLocked] = useState(false);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [starting, setStarting] = useState(false);
  const [approvingConsent, setApprovingConsent] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [patientRefInput, setPatientRefInput] = useState("");
  const [resolution, setResolution] = useState<PatientResolution | null>(null);
  const [selectedTargetHospitalId, setSelectedTargetHospitalId] = useState("");
  const [lookupPerformed, setLookupPerformed] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [approvalNowTs, setApprovalNowTs] = useState<number>(() => Date.now());
  const [retrievedData, setRetrievedData] = useState<Record<
    string,
    any
  > | null>(null);
  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(wsToken)}`);
    ws.addEventListener("open", () => setSocketState("open"));
    ws.addEventListener("close", () => setSocketState("closed"));
    ws.addEventListener("message", (message) => {
      try {
        const event = JSON.parse(message.data) as DefenseEvent;
        setEvents((previous) => [event, ...previous].slice(0, 400));
        // Capture retrieved data from completed requests
        if (
          event.type === "data_request_completed" &&
          event.payload.responseData
        ) {
          try {
            let data =
              typeof event.payload.responseData === "string"
                ? JSON.parse(event.payload.responseData)
                : event.payload.responseData;

            // Unwrap nested structure to find medical data
            // The structure can be:
            // { retrievedFrom, deliveredTo, deliveryReceipt, data: { patientId, sourceHospital, data: { blood_tests, blood_group, ... } } }
            // OR just the hospital response directly

            // Keep unwrapping "data" fields until we find one with medical data types
            let unwrapped = data;
            let maxDepth = 5; // Prevent infinite loops
            while (maxDepth > 0 && unwrapped && typeof unwrapped === "object") {
              // Check if this level has medical data types
              const keys = Object.keys(unwrapped);
              const hasMedicalData = [
                "blood_tests",
                "blood_group",
                "allergies",
                "medications",
                "diagnoses",
                "lab_results",
              ].some((type) => keys.includes(type));

              if (hasMedicalData) {
                // Found medical data at this level
                data = unwrapped;
                break;
              }

              // Otherwise, if there's a "data" field, unwrap it
              if ("data" in unwrapped) {
                unwrapped = unwrapped.data;
                maxDepth--;
              } else {
                // No "data" field and no medical data - stop unwrapping
                data = unwrapped;
                break;
              }
            }

            // Filter to only medical data types
            const medicalDataTypes = [
              "blood_tests",
              "blood_group",
              "allergies",
              "medications",
              "diagnoses",
              "lab_results",
              "procedures",
              "immunizations",
              "health_history",
              "vital_signs",
            ];
            const filteredData: Record<string, any> = {};
            Object.entries(data || {}).forEach(([key, value]) => {
              if (medicalDataTypes.includes(key)) {
                filteredData[key] = value;
              }
            });
            setRetrievedData(
              Object.keys(filteredData).length > 0 ? filteredData : data,
            );
          } catch {
            // Data might not be JSON
          }
        }
      } catch {
        // ignore malformed payload
      }
    });
    return () => ws.close();
  }, []);

  const resolvedPatientRef = useMemo(() => {
    const raw = patientRefInput.trim();
    if (!raw) return "";

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const extracted =
        (typeof parsed.patientId === "string" && parsed.patientId) ||
        (typeof parsed.externalId === "string" && parsed.externalId) ||
        (typeof parsed.email === "string" && parsed.email) ||
        "";
      return extracted || raw;
    } catch {
      return raw;
    }
  }, [patientRefInput]);

  useEffect(() => {
    setLookupPerformed(false);
    setResolution(null);
    setSelectedTargetHospitalId("");
  }, [resolvedPatientRef]);

  const requestEvents = useMemo(() => {
    const inferredRequestId = events.find(
      (event) => event.payload.dataRequestId,
    )?.payload.dataRequestId;
    const requestId =
      selectedRequestId || (processLocked ? null : inferredRequestId);
    if (!requestId) return [];
    return events
      .filter((event) => event.payload.dataRequestId === requestId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }, [events, processLocked, selectedRequestId]);

  const activeRequestId =
    requestEvents[0]?.payload.dataRequestId || selectedRequestId;

  const stage = useMemo(() => {
    let maxStage = 0;
    for (const event of requestEvents) {
      maxStage = Math.max(maxStage, eventToStage[event.type] || 0);
    }
    return maxStage;
  }, [requestEvents]);

  const failed = requestEvents.some(
    (event) =>
      event.type === "consent_denied" || event.type === "data_request_failed",
  );

  const hasConsentRequested = requestEvents.some(
    (event) => event.type === "consent_request_created",
  );
  const hasConsentApproved = requestEvents.some(
    (event) => event.type === "consent_approved",
  );
  const hasFinalState = requestEvents.some(
    (event) =>
      event.type === "data_request_completed" ||
      event.type === "data_request_failed" ||
      event.type === "consent_denied",
  );
  const canApproveConsent =
    Boolean(activeRequestId) &&
    hasConsentRequested &&
    !hasConsentApproved &&
    !hasFinalState &&
    !approvingConsent;

  const matchedPatient = resolution?.found ? resolution.patient : null;
  const sourceHospitals = resolution?.hospitals || [];
  const hasActiveRun = Boolean(activeRequestId) && !hasFinalState;
  const completedSuccessfully = requestEvents.some(
    (event) => event.type === "data_request_completed",
  );
  const waitingForApproval =
    hasConsentRequested && !hasConsentApproved && !hasFinalState;
  const waitingForRecords = hasConsentApproved && !hasFinalState && !failed;
  const resultsUnlocked = completedSuccessfully;
  const canInitiateRecords =
    lookupPerformed &&
    Boolean(resolvedPatientRef) &&
    Boolean(matchedPatient) &&
    sourceHospitals.length > 0 &&
    Boolean(selectedTargetHospitalId) &&
    !hasActiveRun;

  const consentRequestedAtMs = useMemo(() => {
    const consentEvent = requestEvents.find(
      (event) => event.type === "consent_request_created",
    );
    if (!consentEvent) return null;
    const parsedTs = new Date(consentEvent.timestamp).getTime();
    return Number.isNaN(parsedTs) ? null : parsedTs;
  }, [requestEvents]);

  useEffect(() => {
    if (!waitingForApproval) return;
    setApprovalNowTs(Date.now());
    const interval = window.setInterval(() => {
      setApprovalNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [waitingForApproval]);

  const approvalWaitSeconds = consentRequestedAtMs
    ? Math.floor((approvalNowTs - consentRequestedAtMs) / 1000)
    : 0;

  useEffect(() => {
    if (hasFinalState && activeRequestId) {
      setProcessLocked(true);
    }
  }, [activeRequestId, hasFinalState]);

  const lookupPatient = async () => {
    const patientRef = resolvedPatientRef;
    setStartError(null);
    if (!patientRef) {
      setStartError("Provide a patient ID/QR before lookup.");
      return;
    }

    setLookupLoading(true);
    try {
      const response = await fetch(
        `${apiBase}/defense/resolve-patient?token=${encodeURIComponent(wsToken)}&patientRef=${encodeURIComponent(patientRef)}`,
      );
      if (!response.ok) {
        throw new Error("Could not resolve patient from ID/QR value");
      }

      const data = (await response.json()) as PatientResolution;
      setResolution(data);
      setLookupPerformed(true);
      if (data.hospitals.length) {
        setSelectedTargetHospitalId((current) =>
          current && data.hospitals.some((hospital) => hospital.id === current)
            ? current
            : data.hospitals[0].id,
        );
      } else {
        setSelectedTargetHospitalId("");
      }
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : "Could not resolve patient from ID/QR value",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const startDemo = async () => {
    setStarting(true);
    setStartError(null);
    try {
      if (hasActiveRun) {
        setStartError(
          "Current request is still running. Wait until it finishes before starting a new one.",
        );
        return;
      }

      const patientRef = resolvedPatientRef;
      if (!patientRef) {
        setStartError("Provide a patient ID/QR value.");
        return;
      }

      if (!matchedPatient) {
        setStartError(
          "Patient could not be verified from the provided ID/QR value.",
        );
        return;
      }

      if (!selectedTargetHospitalId) {
        setStartError("Select a source hospital before requesting records.");
        return;
      }

      const response = await fetch(
        `${apiBase}/defense/start?token=${encodeURIComponent(wsToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientRef,
            targetHospitalId: selectedTargetHospitalId || undefined,
            autoApprove: false,
            forceConsent: true,
          }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Could not start demo flow");
      }

      setSelectedRequestId(payload?.request?.id || null);
      setProcessLocked(false);
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "Could not start demo flow",
      );
    } finally {
      setStarting(false);
    }
  };

  const approveConsent = async () => {
    if (!activeRequestId) return;
    setApprovingConsent(true);
    setStartError(null);
    try {
      const response = await fetch(
        `${apiBase}/defense/approve-consent?token=${encodeURIComponent(wsToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataRequestId: activeRequestId }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Could not approve consent");
      }
    } catch (error) {
      setStartError(
        error instanceof Error ? error.message : "Could not approve consent",
      );
    } finally {
      setApprovingConsent(false);
    }
  };

  const clearCompletedProcess = () => {
    setSelectedRequestId(null);
    setProcessLocked(false);
    setStartError(null);
    setRetrievedData(null);
  };

  return (
    <PixelBackground
      className="page-wrap"
      gap={6}
      speed={35}
      pattern="center"
      darkColors="#173327,#25483a,#385f50"
    >
      <main className="page">
        <div className="landing-overlays" />

        <header className="top">
          <div>
            <h1>CareBridge Defense Dashboard</h1>
            <p>
              Realtime hospital-to-hospital flow with patient consent
              enforcement.
            </p>
          </div>

          <div className="top-actions">
            <span className={`ws ${socketState}`}>
              <i /> WS {socketState}
            </span>
          </div>
        </header>

        <section className="control-bar">
          <div className="field">
            <label>Patient ID / QR value</label>
            <input
              value={patientRefInput}
              onChange={(e) => setPatientRefInput(e.target.value)}
              placeholder="Paste scanned QR payload or patient id"
              disabled={waitingForApproval || waitingForRecords}
            />
          </div>

          <button
            className="lookup"
            onClick={lookupPatient}
            disabled={lookupLoading || waitingForApproval || waitingForRecords}
          >
            {lookupLoading ? "Looking up..." : "Lookup Patient"}
          </button>

          <div className="field">
            <label>Data Source Hospital</label>
            <select
              value={selectedTargetHospitalId}
              onChange={(e) => setSelectedTargetHospitalId(e.target.value)}
              disabled={
                !lookupPerformed || waitingForApproval || waitingForRecords
              }
            >
              <option value="">
                {lookupPerformed
                  ? "Select source hospital"
                  : "Lookup patient first"}
              </option>
              {sourceHospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name} ({hospital.code})
                </option>
              ))}
            </select>
          </div>

          <button
            className="start"
            onClick={startDemo}
            disabled={
              !canInitiateRecords ||
              starting ||
              waitingForApproval ||
              waitingForRecords
            }
          >
            {starting ? "Requesting..." : "Request Initial Records"}
          </button>
        </section>

        <section className="journey">
          <article
            className={`journey-step ${matchedPatient ? "done" : lookupPerformed ? "active" : ""}`}
          >
            <h3>1. Identify Patient</h3>
            <p>
              {matchedPatient
                ? `${matchedPatient.fullName} is verified and ready for intake.`
                : lookupPerformed
                  ? "No patient matched this ID/QR value. Try a different ID."
                  : "Enter or scan a patient ID and click Lookup Patient."}
            </p>
          </article>

          <article
            className={`journey-step ${sourceHospitals.length > 0 ? "done" : lookupPerformed && matchedPatient ? "active" : ""}`}
          >
            <h3>2. Confirm Hospital Records</h3>
            <p>
              {sourceHospitals.length > 0
                ? `${sourceHospitals.length} linked hospital${sourceHospitals.length > 1 ? "s are" : " is"} available for records.`
                : "Hospital links will appear after a patient is resolved."}
            </p>
          </article>

          <article
            className={`journey-step ${hasConsentRequested ? "done" : canInitiateRecords ? "active" : ""}`}
          >
            <h3>3. Request Initial Records</h3>
            <p>
              {hasConsentRequested
                ? "Request submitted. Waiting for patient consent approval."
                : "Choose a source hospital and click Request Initial Records."}
            </p>
          </article>

          <article
            className={`journey-step ${resultsUnlocked ? "done" : waitingForApproval || waitingForRecords ? "active" : ""}`}
          >
            <h3>4. Approval and Results</h3>
            <p>
              {resultsUnlocked
                ? "Consent approved and records delivered. Full details are unlocked."
                : waitingForApproval
                  ? "Consent approval required before records can be displayed."
                  : waitingForRecords
                    ? "Consent approved. Waiting for records transfer to complete."
                    : "Results will unlock here after consent and completion."}
            </p>
          </article>
        </section>

        {lookupPerformed && resolution && (
          <section className="patient-preview">
            {resolution.found && resolution.patient ? (
              <>
                <p>
                  <strong>Patient:</strong> {resolution.patient.fullName}
                </p>
                <p>
                  <strong>Hospital Patient ID:</strong>{" "}
                  {resolution.patient.externalId}
                </p>
                <p>
                  <strong>System Patient ID:</strong> {resolution.patient.id} |{" "}
                  <strong>Email:</strong> {resolution.patient.email}
                </p>
                <p>
                  <strong>Data likely available at:</strong>{" "}
                  {resolution.hospitals.length
                    ? resolution.hospitals
                        .map(
                          (hospital) => `${hospital.name} (${hospital.code})`,
                        )
                        .join(", ")
                    : "No hospital links found yet"}
                </p>
              </>
            ) : (
              <p>No patient matched this ID/QR value.</p>
            )}
          </section>
        )}

        <section className="flow">
          <div className="flow-head">
            <h2>Live Process</h2>
            <div className="flow-head-actions">
              <p>{activeRequestId || "No request selected"}</p>
              {processLocked && hasFinalState && (
                <button
                  className="clear-process"
                  onClick={clearCompletedProcess}
                >
                  Start New Process
                </button>
              )}
            </div>
          </div>

          <div className={`track ${failed ? "failed" : ""}`}>
            <span
              className={`beam ${stage > 0 ? "active" : ""}`}
              style={{ ["--stage" as string]: String(stage) }}
            />
            {stageLabels.map((label, index) => {
              const step = index + 1;
              const on = stage >= step;
              return (
                <div
                  key={label}
                  className={`step ${on ? "on" : ""} ${failed ? "failed" : ""}`}
                >
                  <span className="node" />
                  <small>{label}</small>
                </div>
              );
            })}
          </div>

          {startError && <p className="error">{startError}</p>}
          {processLocked && hasFinalState && (
            <p className="process-lock-note">
              This run is complete. Start a new demo flow to continue.
            </p>
          )}
          {waitingForRecords && (
            <p className="process-lock-note">
              Consent approved. Retrieving records now...
            </p>
          )}
        </section>

        <section className="content">
          <article className="panel panel-details">
            <h3>Medical Data Retrieved</h3>
            {resultsUnlocked && retrievedData ? (
              <div className="data-results">
                {Object.entries(retrievedData).map(
                  ([dataType, items]: [string, any]) => (
                    <div key={dataType} className="data-section">
                      <h4>{dataType.replace(/_/g, " ").toUpperCase()}</h4>
                      {Array.isArray(items) && items.length > 0 ? (
                        <div className="data-list">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="data-item">
                              <p>{formatDataAsPlainText(item)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty">No data of this type</p>
                      )}
                    </div>
                  ),
                )}
              </div>
            ) : resultsUnlocked ? (
              <p className="empty">
                Data transfer complete but no data retrieved
              </p>
            ) : (
              <p className="empty">
                Medical records will appear here after successful transfer.
              </p>
            )}
          </article>

          <article className="panel">
            <h3>Timeline</h3>
            <div className="timeline">
              {events.length === 0 && (
                <p className="empty">Waiting for realtime events...</p>
              )}
              {events.map((event, index) => {
                const requestId =
                  event.payload.dataRequestId ||
                  event.payload.consentRequestId ||
                  `event-${index}`;
                return (
                  <button
                    key={`${event.timestamp}-${requestId}-${index}`}
                    className={`timeline-event ${event.payload.dataRequestId === activeRequestId ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedRequestId(event.payload.dataRequestId || null);
                      setProcessLocked(false);
                    }}
                  >
                    <span className="timeline-icon">
                      {getEventIcon(event.type)}
                    </span>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        {prettyType(event.type)}
                      </div>
                      <div className="timeline-summary">
                        {getEventSummary(event)}
                      </div>
                    </div>
                    <time className="timeline-time">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </time>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="panel">
            <div className="details-head">
              <h3>Request Details</h3>
              <label>
                <input
                  type="checkbox"
                  checked={showRawPayload}
                  onChange={(event) => setShowRawPayload(event.target.checked)}
                />
                Raw payload
              </label>
            </div>

            {!requestEvents.length && (
              <p className="empty">Run a flow or select an event.</p>
            )}

            {requestEvents.length > 0 && !resultsUnlocked && !failed && (
              <p className="empty">
                Records are locked until consent is approved and delivery is
                complete.
              </p>
            )}

            {failed && (
              <p className="empty">
                Request failed before records could be delivered.
              </p>
            )}

            {resultsUnlocked &&
              requestEvents.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="event-card">
                  <h4>{prettyType(event.type)}</h4>
                  <time>{new Date(event.timestamp).toLocaleString()}</time>
                  <pre>
                    {JSON.stringify(
                      showRawPayload
                        ? event.payload
                        : redactPayload(event.payload),
                      null,
                      2,
                    )}
                  </pre>
                </div>
              ))}
          </article>
        </section>

        {waitingForApproval && (
          <section className="approval-overlay" aria-live="polite">
            <div className="approval-card">
              <h2>Waiting for Patient Approval</h2>
              <div className="approval-wait-time">
                Waiting {formatElapsed(approvalWaitSeconds)}
              </div>
              <p>
                Initial records request is paused until patient consent is
                approved for request <strong>{activeRequestId}</strong>.
              </p>
              <button
                onClick={approveConsent}
                disabled={!canApproveConsent || approvingConsent}
                className="consent-button"
              >
                {approvingConsent ? "Approving..." : "Approve Consent"}
              </button>
            </div>
          </section>
        )}
      </main>
    </PixelBackground>
  );
}
