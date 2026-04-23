"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { FormInput } from "@/components/FormInput";
import { BottomTabs } from "@/components/BottomTabs";
import { IconSwitch } from "@/components/ui/icon-switch";
import { useToast } from "@/providers/ToastProvider";
import { authApi } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";
import {
  UpdateProfileRequest,
  ChangePasswordRequest,
  PatientSession,
} from "@/types/auth";
import { useNotifications } from "@/hooks/useNotifications";

type SettingsSection = "account" | "notifications" | "security";

function SettingsContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const {
    pushSupported,
    pushPermission,
    pushEnabled,
    enablePush,
    disablePush,
  } = useNotifications();

  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  // Account form state
  const [accountForm, setAccountForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    dateOfBirth: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notifications state
  const [notifications, setNotifications] = useState({
    newRequests: true,
    accessLogs: false,
    expiryReminders: true,
  });

  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [activeSessionCount, setActiveSessionCount] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const result = await authApi.getSessions();
      setSessions(result.sessions);
      setActiveSessionCount(result.activeCount);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sessions";
      setSessionsError(message);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "security") {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const handleAccountUpdate = async () => {
    setLoading(true);
    try {
      const updateData: UpdateProfileRequest = {
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        dateOfBirth: accountForm.dateOfBirth || undefined,
      };
      await authApi.updateProfile(updateData);
      triggerHaptic();
      addToast("Profile updated successfully", "success");
    } catch (error) {
      addToast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const changeData: ChangePasswordRequest = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      };
      await authApi.changePassword(changeData);
      triggerHaptic();
      addToast("Password changed successfully", "success");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      addToast("Failed to change password", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    triggerHaptic(8);
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSignOutAll = async () => {
    if (!confirm("Sign out of all devices? This will log you out everywhere.")) {
      return;
    }

    setLoading(true);
    try {
      await authApi.signOutAll();
      triggerHaptic([12, 28, 12]);
      addToast("Signed out of all devices", "success");
      logout();
      router.push("/login");
    } catch (error) {
      addToast("Failed to sign out", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Delete account? This action cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      await authApi.deleteAccount();
      triggerHaptic([16, 36, 16]);
      addToast("Account deleted", "success");
      logout();
      router.push("/login");
    } catch (error) {
      addToast("Failed to delete account", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutThisDevice = async () => {
    if (!confirm("Sign out of this device?")) {
      return;
    }

    setLoading(true);
    try {
      addToast("Signed out", "success");
      triggerHaptic(10);
      logout();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessionsLoading(true);
    try {
      await authApi.revokeSession(sessionId);
      triggerHaptic();
      addToast("Session signed out", "success");
      await loadSessions();
    } catch (error) {
      addToast("Failed to sign out session", "error");
      setSessionsLoading(false);
    }
  };

  return (
    <div className="pb-24">
      <Header
        title="Settings"
        backButton
        onBack={() => router.back()}
      />

      <main className="px-4 py-6 space-y-6">
        {/* Section Tabs */}
        <div className="flex gap-1 rounded-lg bg-secondary p-1" role="tablist" aria-label="Settings sections">
          {[
            { key: "account" as const, label: "Account" },
            { key: "notifications" as const, label: "Notifications" },
            { key: "security" as const, label: "Security" },
          ].map(({ key, label }) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeSection === key}
              aria-controls={`settings-panel-${key}`}
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info ${
                activeSection === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Account Section */}
        {activeSection === "account" && (
          <div id="settings-panel-account" role="tabpanel" className="space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <FormInput
                    label="First Name"
                    value={accountForm.firstName}
                    onChange={(value) =>
                      setAccountForm(prev => ({ ...prev, firstName: value }))
                    }
                  />
                  <FormInput
                    label="Last Name"
                    value={accountForm.lastName}
                    onChange={(value) =>
                      setAccountForm(prev => ({ ...prev, lastName: value }))
                    }
                  />
                  <FormInput
                    label="Date of Birth"
                    type="date"
                    value={accountForm.dateOfBirth}
                    onChange={(value) =>
                      setAccountForm(prev => ({ ...prev, dateOfBirth: value }))
                    }
                  />
                  <Button
                    onClick={handleAccountUpdate}
                    loading={loading}
                    className="w-full"
                  >
                    Update Profile
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">Change Password</h3>
                <div className="space-y-4">
                  <FormInput
                    label="Current Password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(value) =>
                      setPasswordForm(prev => ({ ...prev, currentPassword: value }))
                    }
                  />
                  <FormInput
                    label="New Password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(value) =>
                      setPasswordForm(prev => ({ ...prev, newPassword: value }))
                    }
                  />
                  <FormInput
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(value) =>
                      setPasswordForm(prev => ({ ...prev, confirmPassword: value }))
                    }
                  />
                  <Button
                    onClick={handlePasswordChange}
                    loading={loading}
                    className="w-full"
                  >
                    Change Password
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <Card id="settings-panel-notifications" role="tabpanel">
            <CardBody>
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">Push Notifications (This Device)</p>
                    <p className="text-sm text-muted-foreground">
                      {pushSupported
                        ? pushPermission === "denied"
                          ? "Permission denied in browser settings"
                          : "Receive alerts even when the app is closed"
                        : "Not supported on this device/browser"}
                    </p>
                  </div>
                  <IconSwitch
                    checked={pushEnabled}
                    onCheckedChange={async (checked) => {
                      triggerHaptic(8);
                      if (checked) await enablePush();
                      else await disablePush();
                    }}
                    disabled={!pushSupported}
                    aria-label="Push Notifications on This Device"
                    className="shrink-0"
                  />
                </div>

                {[
                  {
                    key: "newRequests" as const,
                    label: "New Consent Requests",
                    description: "Get notified when hospitals request access to your data",
                  },
                  {
                    key: "accessLogs" as const,
                    label: "Data Access Logs",
                    description: "Receive updates when your data is accessed",
                  },
                  {
                    key: "expiryReminders" as const,
                    label: "Consent Expiry Reminders",
                    description: "Get reminded before your consents expire",
                  },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <IconSwitch
                      checked={notifications[key]}
                      onCheckedChange={() => handleNotificationToggle(key)}
                      aria-label={label}
                      className="shrink-0"
                    />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Security Section */}
        {activeSection === "security" && (
          <div id="settings-panel-security" role="tabpanel" className="space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Active Sessions: {sessionsLoading ? "…" : activeSessionCount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sessionsError ? sessionsError : "Manage devices signed in to your account"}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setSessionsOpen(true)}
                      loading={sessionsLoading}
                      disabled={Boolean(sessionsError)}
                    >
                      View Sessions
                    </Button>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={handleSignOutThisDevice}
                    loading={loading}
                    className="w-full"
                  >
                    Sign Out (This Device)
                  </Button>

                  <Button
                    variant="danger"
                    onClick={handleSignOutAll}
                    loading={loading}
                    className="w-full"
                  >
                    Sign Out All Devices
                  </Button>
                </div>
              </CardBody>
            </Card>

            {sessionsOpen && (
              <div
                className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sessions-dialog-title"
                onClick={() => setSessionsOpen(false)}
              >
                <div
                  className="w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Card>
                    <CardBody>
                      <div className="flex items-center justify-between mb-4">
                        <h4 id="sessions-dialog-title" className="text-lg font-semibold">Sessions</h4>
                        <button
                          type="button"
                          className="min-h-10 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info"
                          onClick={() => setSessionsOpen(false)}
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-3">
                        {sessions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No sessions found.
                          </p>
                        ) : (
                          sessions.map((session) => (
                            <div
                              key={session.id}
                              className="border border-border rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium truncate">
                                    {session.isCurrent ? "Current device" : "Device session"}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {session.userAgent || "Unknown device"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Created{" "}
                                    {new Date(session.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`text-xs ${
                                      session.isActive ? "text-green-600" : "text-muted-foreground"
                                    }`}
                                  >
                                    {session.isActive ? "Active" : "Inactive"}
                                  </span>
                                  {!session.isCurrent && session.isActive && (
                                    <Button
                                      variant="danger"
                                      onClick={() => handleRevokeSession(session.id)}
                                      loading={sessionsLoading}
                                    >
                                      Sign Out
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}

            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h3>
                <div className="space-y-4">
                  <div className="border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-600 mb-2">Delete Account</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Button
                      variant="danger"
                      onClick={handleDeleteAccount}
                      loading={loading}
                      className="w-full"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </main>

      <BottomTabs />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
