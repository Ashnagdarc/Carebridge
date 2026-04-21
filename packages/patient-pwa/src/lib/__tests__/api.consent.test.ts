import { consentApi } from "@/lib/api";

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Consent API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("getToken", () => {
    it("returns token from localStorage", () => {
      localStorage.setItem("carebridge_access_token", "test-token-123");
      const token = consentApi.getToken();
      expect(token).toBe("test-token-123");
    });

    it("returns empty string if no token in localStorage", () => {
      const token = consentApi.getToken();
      expect(token).toBe("");
    });
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

      localStorage.setItem("carebridge_access_token", "test-token");
      const requests = await consentApi.getPendingRequests();

      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe("req-1");
      expect(requests[0].hospital.name).toBe("Hospital A");
      expect(requests[0].scopes[0].name).toBe("allergies");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/pending"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("throws error if request fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      localStorage.setItem("carebridge_access_token", "test-token");

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

      localStorage.setItem("carebridge_access_token", "test-token");
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

      localStorage.setItem("carebridge_access_token", "test-token");
      const result = await consentApi.approveConsentRequest("req-1", 30);

      expect(result.id).toBe("req-1");
      expect(result.status).toBe("approved");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/req-1/approve"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ expiryDays: 30 }),
        })
      );
    });

    it("throws error if approval fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Request expired" }),
      });

      localStorage.setItem("carebridge_access_token", "test-token");

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

      localStorage.setItem("carebridge_access_token", "test-token");
      await consentApi.denyConsentRequest("req-1", "Not needed right now");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/requests/req-1/deny"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ reason: "Not needed right now" }),
        })
      );
    });

    it("denies without reason if not provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      localStorage.setItem("carebridge_access_token", "test-token");
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

      localStorage.setItem("carebridge_access_token", "test-token");
      await consentApi.revokeConsent("consent-1");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/consent/records/consent-1"),
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("throws error if revocation fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not found" }),
      });

      localStorage.setItem("carebridge_access_token", "test-token");

      await expect(consentApi.revokeConsent("consent-1")).rejects.toThrow();
    });
  });
});
