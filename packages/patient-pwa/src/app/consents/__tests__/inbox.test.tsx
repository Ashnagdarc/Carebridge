import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/consents",
}));

jest.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/BottomTabs", () => ({
  BottomTabs: () => null,
}));

jest.mock("@/providers/ToastProvider", () => {
  const addToast = jest.fn();
  return {
    __esModule: true,
    useToast: () => ({
      addToast,
    }),
  };
});

jest.mock("@/hooks/useNotifications", () => {
  const markConsentRequestsRead = jest.fn();
  return {
    __esModule: true,
    useNotifications: () => ({
      markConsentRequestsRead,
    }),
  };
});

jest.mock("@/lib/api", () => ({
  __esModule: true,
  consentApi: {
    getPendingRequests: jest.fn(),
    denyConsentRequest: jest.fn(),
  },
}));

describe("Consent Inbox Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads pending consent requests on mount and shows empty state", async () => {
    const { consentApi } = await import("@/lib/api");
    (consentApi.getPendingRequests as jest.Mock).mockResolvedValue([]);

    const { default: ConsentInboxPage } = await import("@/app/consents/page");
    render(<ConsentInboxPage />);

    await waitFor(() => {
      expect(consentApi.getPendingRequests).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("No Pending Requests")).toBeInTheDocument();
  });

  it("renders a pending request and navigates to approval on Approve", async () => {
    const { consentApi } = await import("@/lib/api");
    (consentApi.getPendingRequests as jest.Mock).mockResolvedValue([
      {
        id: "req-1",
        patientId: "patient-1",
        hospitalId: "hospital-a",
        hospital: { id: "hospital-a", name: "Hospital A" },
        scopes: [{ id: "allergies", name: "allergies", description: "Allergies" }],
        clinicalReason: "Checkup",
        requestedAt: new Date().toISOString(),
        status: "pending",
        dataType: "allergies",
      },
    ]);

    const { default: ConsentInboxPage } = await import("@/app/consents/page");
    render(<ConsentInboxPage />);

    await waitFor(() => {
      expect(screen.getByText("Hospital A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(mockPush).toHaveBeenCalledWith("/consents/approve/req-1");
  });

  it("denies a request when Deny is clicked", async () => {
    const { consentApi } = await import("@/lib/api");
    (consentApi.getPendingRequests as jest.Mock).mockResolvedValue([
      {
        id: "req-1",
        patientId: "patient-1",
        hospitalId: "hospital-a",
        hospital: { id: "hospital-a", name: "Hospital A" },
        scopes: [{ id: "allergies", name: "allergies", description: "Allergies" }],
        clinicalReason: "Checkup",
        requestedAt: new Date().toISOString(),
        status: "pending",
        dataType: "allergies",
      },
    ]);
    (consentApi.denyConsentRequest as jest.Mock).mockResolvedValueOnce(undefined);

    const { default: ConsentInboxPage } = await import("@/app/consents/page");
    render(<ConsentInboxPage />);
    await waitFor(() => {
      expect(screen.getByText("Hospital A")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(screen.getByRole("dialog", { name: "Deny request?" })).toBeInTheDocument();
    expect(consentApi.denyConsentRequest).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Deny" }));

    await waitFor(() => {
      expect(consentApi.denyConsentRequest).toHaveBeenCalledWith(
        "req-1",
        "Patient denied this consent request from the PWA"
      );
    });
  });
});
