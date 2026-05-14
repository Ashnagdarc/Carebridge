"use client";
// CareBridge: Patient PWA route/layout implementation.

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthPanel, AuthScreen } from "@/components/AuthScreen";
import { FormInput } from "@/components/FormInput";
import { RunActionButton, authActionSteps } from "@/components/RunActionButton";
import { authApi } from "@/lib/api";
import { triggerHaptic } from "@/lib/haptics";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playAnimation, setPlayAnimation] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPlayAnimation(true);

    try {
      await authApi.requestPasswordReset({ email });
    } catch (error) {
      console.error("Password reset request failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen>
      <AuthPanel>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">Reset password</h1>
            <p className="text-white/60 text-sm">
              Enter your email address to request password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 bg-secondary border border-tertiary rounded-lg space-y-3">
              <p className="text-sm text-foreground">
                If an account exists for{" "}
                <span className="font-semibold">{email}</span>, you’ll
                receive an email shortly.
              </p>
              <Link
                href="/login"
                className="text-info text-sm font-semibold hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(value) => setEmail(value)}
                autoComplete="email"
                required
              />
              <RunActionButton
                type="submit"
                fullWidth
                idleLabel="Send reset link"
                ariaLabel="Send reset link"
                steps={authActionSteps.reset}
                isRunning={playAnimation}
                disabled={isSubmitting}
                onDone={() => {
                  triggerHaptic([8, 20, 8]);
                  setPlayAnimation(false);
                  setSubmitted(true);
                }}
              />
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-info text-sm font-semibold hover:underline"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </AuthPanel>
    </AuthScreen>
  );
}
