import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import SettingsPage from "@/app/settings/page";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock auth hook
const mockUser = {
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
};

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: jest.fn(),
  }),
}));

// Mock API
jest.mock("@/lib/api", () => ({
  authApi: {
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    getToken: jest.fn(() => "mock-token"),
  },
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderSettings = () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <SettingsPage />
        </ToastProvider>
      </AuthProvider>
    );
  };

  it("renders settings page with account section", () => {
    renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("displays account form with user data", () => {
    renderSettings();
    expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("User")).toBeInTheDocument();
  });

  it("switches between sections", () => {
    renderSettings();

    // Click notifications tab
    fireEvent.click(screen.getByText("Notifications"));
    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();

    // Click security tab
    fireEvent.click(screen.getByText("Security"));
    expect(screen.getByText("Active Sessions")).toBeInTheDocument();
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

    fireEvent.click(screen.getByText("Change Password"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });
});