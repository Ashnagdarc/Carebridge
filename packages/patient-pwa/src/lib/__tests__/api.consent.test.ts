// CareBridge: Test coverage for this module behavior.
import { consentApi } from "@/lib/api";

// Mock fetch
global.fetch = jest.fn();

describe("Consent API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPendingRequests", () => {
    it("fetches pending consent requests", async () => {
      const mockResponse = {
        requests: [
          {
            id: "req-1",
            patientId: "patient-1",
            requestingHospitalId: "hospital-1",
            requestingHospital: { id: "hospital-1", name: "Hospital A" },
            dataType: "allergies",
            description: "Checkup",
            createdAt: "2026-04-20T00:00:00Z",
            status: "pending",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const requests = await consentApi.getPendingRequests();

      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe("req-1");
      expect(requests[0].hospital.name).toBe("Hospital A");
      expect(requests[0].scopes[0].name).toBe("allergies");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/pending"),
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        })
      );
    });

    it("throws error if request fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      await expect(consentApi.getPendingRequests()).rejects.toThrow();
    });
  });

  describe("getActiveConsents", () => {
    it("fetches active consent records", async () => {
      const mockResponse = {
        consents: [
          {
            id: "consent-1",
            consentRequestId: "req-1",
            patientId: "patient-1",
            requestingHospitalId: "hospital-1",
            sourceHospitalId: "hospital-1",
            dataType: "allergies",
            accessCount: 0,
            expiresAt: "2026-12-31T00:00:00Z",
            createdAt: "2026-04-20T00:00:00Z",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const consents = await consentApi.getActiveConsents();

      expect(consents).toHaveLength(1);
      expect(consents[0].id).toBe("consent-1");
    });
  });

  describe("approveConsentRequest", () => {
    it("approves consent request with expiry days", async () => {
      const mockResponse = {
        id: "req-1",
        patientId: "patient-1",
        requestingHospitalId: "hospital-1",
        requestingHospital: { id: "hospital-1", name: "Hospital A" },
        dataType: "allergies",
        description: "Checkup",
        status: "approved",
        createdAt: "2026-04-20T00:00:00Z",
        expiresAt: "2026-12-31T00:00:00Z",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await consentApi.approveConsentRequest("req-1", 30);

      expect(result.id).toBe("req-1");
      expect(result.status).toBe("approved");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/req-1/approve"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ expiryDays: 30 }),
        })
      );
    });

    it("approves consent request until revoked", async () => {
      const mockResponse = {
        id: "req-1",
        patientId: "patient-1",
        requestingHospitalId: "hospital-1",
        requestingHospital: { id: "hospital-1", name: "Hospital A" },
        dataType: "allergies",
        description: "Ongoing care",
        status: "approved",
        createdAt: "2026-04-20T00:00:00Z",
        expiresAt: null,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await consentApi.approveConsentRequest("req-1", "indefinite");

      expect(result.id).toBe("req-1");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/req-1/approve"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ indefinite: true }),
        })
      );
    });

    it("throws error if approval fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Request expired" }),
      });

      await expect(
        consentApi.approveConsentRequest("req-1", 30)
      ).rejects.toThrow();
    });
  });

  describe("denyConsentRequest", () => {
    it("denies consent request with optional reason", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await consentApi.denyConsentRequest("req-1", "Not needed right now");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/req-1/deny"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ reason: "Not needed right now" }),
        })
      );
    });

    it("denies without reason if not provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await consentApi.denyConsentRequest("req-1");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/req-1/deny"),
        expect.any(Object)
      );
    });
  });

  describe("revokeConsent", () => {
    it("revokes active consent record", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await consentApi.revokeConsent("consent-1");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/records/consent-1"),
        expect.objectContaining({
          method: "DELETE",
          credentials: "include",
        })
      );
    });

    it("throws error if revocation fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      await expect(consentApi.revokeConsent("consent-1")).rejects.toThrow();
    });
  });

  describe("getPatientAccessLogs", () => {
    it("fetches paginated access logs", async () => {
      const mockResponse = {
        logs: [
          {
            id: "audit-1",
            action: "data_request",
            resourceType: "consent_record",
            resourceId: "consent-1",
            hospitalId: "hospital-1",
            status: "success",
            details: "{\"dataType\":\"allergies\"}",
            createdAt: "2026-04-20T00:00:00Z",
          },
        ],
        total: 25,
        skip: 0,
        take: 20,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await consentApi.getPatientAccessLogs(0, 20);

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/audit/patient-logs?skip=0&take=20"),
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        })
      );
    });

    it("throws error if fetching access logs fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      });

      await expect(consentApi.getPatientAccessLogs()).rejects.toThrow();
    });
  });
});
