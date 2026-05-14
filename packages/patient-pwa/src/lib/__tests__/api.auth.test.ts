// CareBridge: Test coverage for this module behavior.
import { authApi } from "@/lib/api";

global.fetch = jest.fn();

describe("Auth API password reset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests a password reset email", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "If an account exists, reset instructions have been sent." }),
    });

    await authApi.requestPasswordReset({ email: "patient@example.com" });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/patients/password-reset/request"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "patient@example.com" }),
      })
    );
  });

  it("confirms a password reset", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await authApi.confirmPasswordReset({
      token: "reset-token",
      newPassword: "NewPassword123",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/patients/password-reset/confirm"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          token: "reset-token",
          newPassword: "NewPassword123",
        }),
      })
    );
  });
});
