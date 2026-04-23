"use client";

import React, { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthPanel, AuthScreen } from "@/components/AuthScreen";
import { FormInput } from "@/components/FormInput";
import { RunActionButton, authActionSteps } from "@/components/RunActionButton";
import { authApi } from "@/lib/api";
import { validatePassword, validatePasswordConfirm } from "@/lib/validation";
import { triggerHaptic } from "@/lib/haptics";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playAnimation, setPlayAnimation] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (submitSuccess && !playAnimation && !isSubmitting) {
      triggerHaptic([8, 20, 8]);
      setSubmitted(true);
    }
  }, [isSubmitting, playAnimation, submitSuccess]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    const confirmError = validatePasswordConfirm(password, confirmPassword);
    if (confirmError) {
      setError(confirmError);
      return;
    }

    setIsSubmitting(true);
    setPlayAnimation(true);

    try {
      await authApi.confirmPasswordReset({ token, newPassword: password });
      setSubmitSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password reset failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen>
      <AuthPanel>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-white">Create new password</h1>
            <p className="text-sm text-white/60">
              Choose a strong password for your CareBridge account.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-3 rounded-lg border border-tertiary bg-secondary p-4">
              <p className="text-sm text-foreground">
                Your password has been reset. You can now sign in with the new password.
              </p>
              <Link href="/login" className="text-sm font-semibold text-info hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-error bg-red-50 p-3">
                  <p className="text-sm font-medium text-error">{error}</p>
                </div>
              )}

              <FormInput
                label="New Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(value) => setPassword(value)}
                autoComplete="new-password"
                helperText="At least 8 characters with uppercase, lowercase, and numbers"
                required
                disabled={isSubmitting}
              />

              <FormInput
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(value) => setConfirmPassword(value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />

              <RunActionButton
                type="submit"
                fullWidth
                idleLabel="Reset password"
                ariaLabel="Reset password"
                steps={authActionSteps.reset}
                isRunning={playAnimation}
                disabled={isSubmitting}
                onDone={() => {
                  setPlayAnimation(false);
                }}
              />

              <div className="text-center">
                <Link href="/login" className="text-sm font-semibold text-info hover:underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </AuthPanel>
    </AuthScreen>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthScreen>
          <AuthPanel>
            <div className="text-center">
              <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
              <p className="text-white/70">Loading reset link…</p>
            </div>
          </AuthPanel>
        </AuthScreen>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
