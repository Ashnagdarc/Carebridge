import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/providers/ToastProvider";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/settings",
}));

jest.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/components/BottomTabs", () => ({
  BottomTabs: () => null,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      externalId: "ext123",
      accessToken: "token",
      refreshToken: "refresh",
      expiresIn: 3600,
      tokenType: "Bearer",
    },
    logout: jest.fn(),
  }),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    pushSupported: false,
    pushPermission: "default",
    pushEnabled: false,
    enablePush: jest.fn(),
    disablePush: jest.fn(),
  }),
}));

jest.mock("@/lib/api", () => ({
  authApi: {
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    signOutAll: jest.fn(),
    deleteAccount: jest.fn(),
    getSessions: jest.fn(async () => ({ sessions: [], total: 0, activeCount: 0 })),
    revokeSession: jest.fn(),
    getToken: jest.fn(() => "mock-token"),
  },
}));

import SettingsPage from "@/app/settings/page";

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSettings = () => {
    render(
      <ToastProvider>
        <SettingsPage />
      </ToastProvider>
    );
  };

  it("renders settings page with account section", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("displays account form with user data", () => {
    renderSettings();
    expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("User")).toBeInTheDocument();
  });

  it("switches between sections", async () => {
    renderSettings();

    // Click notifications tab
    fireEvent.click(screen.getByText("Notifications"));
    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();

    // Click security tab
    fireEvent.click(screen.getByText("Security"));
    expect(screen.getByText("Active Sessions")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Active Sessions: 0")).toBeInTheDocument();
    });
  });

  it("validates password confirmation", async () => {
    renderSettings();

    // Fill password form with mismatched passwords
    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newpass123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "different123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });
});
