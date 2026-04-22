"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthPanel, AuthScreen } from "@/components/AuthScreen";
import { FormInput } from "@/components/FormInput";
import { RunActionButton, authActionSteps } from "@/components/RunActionButton";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [playAnimation, setPlayAnimation] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPlayAnimation(true);

    // keep the simulated request; actual API will set submitted on success
    window.setTimeout(() => {
      setIsSubmitting(false);
      // wait for animation to call onDone to reveal submitted state
    }, 1600);
  };

  return (
    <AuthScreen>
      <AuthPanel>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">Reset password</h1>
            <p className="text-white/60 text-sm">
              Enter your email address and we’ll send reset instructions.
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
                runningLabel="Sending reset link..."
                disabled={isSubmitting}
                onDone={() => {
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
