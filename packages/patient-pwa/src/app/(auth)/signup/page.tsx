"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel, AuthScreen } from "@/components/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import { FormInput } from "@/components/FormInput";
import { RunActionButton, authActionSteps } from "@/components/RunActionButton";
import { validateSignupForm } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, signup } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [playAnimation, setPlayAnimation] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Redirect if already authenticated (not part of an in-progress submit)
  useEffect(() => {
    if (!authLoading && isAuthenticated && !submitSuccess) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router, submitSuccess]);

  const handleChange = (value: string, name?: string) => {
    if (name) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error for this field when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
      if (submitSuccess) setSubmitSuccess(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPlayAnimation(true);
    setSubmitError(null);

    // Validate form
    const validationErrors = validateSignupForm(formData);
    if (validationErrors.length > 0) {
      const errorMap = validationErrors.reduce(
        (acc, err) => ({ ...acc, [err.field]: err.message }),
        {},
      );
      setErrors(errorMap);
      setIsSubmitting(false);
      setPlayAnimation(false);
      return;
    }

    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      setSubmitSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An error occurred during signup";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <AuthScreen>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading…</p>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen className="py-8">
      <AuthPanel>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Account
          </h1>
          <p className="text-white/60">
            Join CareBridge to manage your healthcare data securely
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {submitError && (
            <div className="p-4 bg-red-50 border-2 border-error rounded-lg">
              <p className="text-sm text-error font-medium">{submitError}</p>
            </div>
          )}

          <FormInput
            label="Full Name"
            name="name"
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            disabled={isSubmitting}
            autoComplete="name"
            required
          />

          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={isSubmitting}
            autoComplete="email"
            required
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isSubmitting}
            autoComplete="new-password"
            helperText="At least 8 characters with uppercase, lowercase, and numbers"
            required
          />

          <FormInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            disabled={isSubmitting}
            autoComplete="new-password"
            required
          />

          <RunActionButton
            type="submit"
            fullWidth
            idleLabel="Create Account"
            ariaLabel="Create Account"
            steps={authActionSteps.signUp}
            isRunning={playAnimation}
            disabled={isSubmitting}
            onDone={() => {
              setPlayAnimation(false);
              if (submitSuccess) router.push('/dashboard');
            }}
          />
        </form>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-white/60 mb-2">Already have an account?</p>
          <a
            href="/login"
            className="text-info font-semibold hover:underline"
          >
            Sign in instead
          </a>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 pt-6 border-t border-tertiary text-center text-xs text-white/45">
          <p>
            By creating an account, you agree to our{" "}
            <a href="/terms" className="text-info hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-info hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </AuthPanel>
    </AuthScreen>
  );
}
