"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthPanel, AuthScreen } from "@/components/AuthScreen";
import { useAuth } from "@/hooks/useAuth";
import { FormInput } from "@/components/FormInput";
import { RunActionButton, authActionSteps } from "@/components/RunActionButton";
import { validateLoginForm } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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
    const validationErrors = validateLoginForm(formData);
    if (validationErrors.length > 0) {
      const errorMap = validationErrors.reduce(
        (acc, err) => ({ ...acc, [err.field]: err.message }),
        {},
      );
      setErrors(errorMap);
      setIsSubmitting(false);
      return;
    }

    try {
      await login(formData);
      setSubmitSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
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
          <p className="text-white/70">Loading...</p>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-white/60">Sign in to your CareBridge account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {submitError && (
            <div className="p-4 bg-red-50 border-2 border-error rounded-lg">
              <p className="text-sm text-error font-medium">{submitError}</p>
            </div>
          )}

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
            autoComplete="current-password"
            required
          />

          <RunActionButton
            type="submit"
            fullWidth
            idleLabel="Sign In"
            ariaLabel="Sign In"
            steps={authActionSteps.signIn}
            isRunning={playAnimation}
            runningLabel="Logging in..."
            disabled={isSubmitting}
            onDone={() => {
              setPlayAnimation(false);
              if (submitSuccess) router.push('/dashboard');
            }}
          />
        </form>

        {/* Links */}
        <div className="space-y-3 text-center">
          <Link
            href="/forgot-password"
            className="block text-info text-sm font-semibold hover:underline"
          >
            Forgot your password?
          </Link>

          <div className="border-t border-tertiary pt-3">
            <p className="text-white/60 mb-2">Don&apos;t have an account?</p>
            <Link
              href="/signup"
              className="text-info font-semibold hover:underline"
            >
              Create one now
            </Link>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 pt-6 border-t border-tertiary text-center text-xs text-white/45">
          <p>
            By signing in, you agree to our{" "}
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
