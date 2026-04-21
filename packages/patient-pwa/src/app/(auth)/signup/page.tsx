"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { FormInput } from "@/components/FormInput";
import { Button } from "@/components/Button";
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

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      return;
    }

    try {
      await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Redirect on successful signup
      router.push("/dashboard");
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-2xl mb-4">
            <svg
              className="w-8 h-8 text-foreground"
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Account
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-gray-600 mb-2">Already have an account?</p>
          <Link
            href="/login"
            className="text-info font-semibold hover:underline"
          >
            Sign in instead
          </Link>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 pt-6 border-t border-tertiary text-center text-xs text-gray-600">
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
      </div>
    </div>
  );
}
