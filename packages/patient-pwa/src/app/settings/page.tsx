"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { FormInput } from "@/components/FormInput";
import { BottomTabs } from "@/components/BottomTabs";
import { useToast } from "@/providers/ToastProvider";
import { authApi } from "@/lib/api";
import { UpdateProfileRequest, ChangePasswordRequest } from "@/types/auth";
import { useNotifications } from "@/hooks/useNotifications";

type SettingsSection = "account" | "notifications" | "security";

function SettingsContent() {
  const router = useRouter();
  const { user } = useAuth();
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

  const [loading, setLoading] = useState(false);

  const handleAccountUpdate = async () => {
    setLoading(true);
    try {
      const updateData: UpdateProfileRequest = {
        firstName: accountForm.firstName,
        lastName: accountForm.lastName,
        dateOfBirth: accountForm.dateOfBirth || undefined,
      };
      await authApi.updateProfile(updateData);
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
      // TODO: API call to sign out all sessions
      addToast("Signed out of all devices", "success");
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
      // TODO: API call to delete account
      addToast("Account deleted", "success");
      router.push("/login");
    } catch (error) {
      addToast("Failed to delete account", "error");
    } finally {
      setLoading(false);
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
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {[
            { key: "account" as const, label: "Account" },
            { key: "notifications" as const, label: "Notifications" },
            { key: "security" as const, label: "Security" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
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
          <div className="space-y-6">
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
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
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
                  <button
                    onClick={async () => {
                      if (pushEnabled) await disablePush();
                      else await enablePush();
                    }}
                    disabled={!pushSupported || pushPermission === "denied"}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      pushEnabled ? "bg-primary" : "bg-gray-200"
                    } ${!pushSupported || pushPermission === "denied" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pushEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {[
                  { key: "newRequests" as const, label: "New Consent Requests", description: "Get notified when hospitals request access to your data" },
                  { key: "accessLogs" as const, label: "Data Access Logs", description: "Receive updates when your data is accessed" },
                  { key: "expiryReminders" as const, label: "Consent Expiry Reminders", description: "Get reminded before your consents expire" },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        notifications[key] ? "bg-primary" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications[key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Security Section */}
        {activeSection === "security" && (
          <div className="space-y-6">
            <Card>
              <CardBody>
                <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-sm text-muted-foreground">This device</p>
                    </div>
                    <span className="text-sm text-green-600">Active</span>
                  </div>
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
