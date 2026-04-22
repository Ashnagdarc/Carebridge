"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { FormInput } from "@/components/FormInput";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Reset password</h1>
          <p className="text-gray-600 text-sm">
            Enter your email address and we’ll send reset instructions.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 bg-secondary border border-tertiary rounded-lg space-y-3">
            <p className="text-sm text-foreground">
              If an account exists for <span className="font-semibold">{email}</span>, you’ll
              receive an email shortly.
            </p>
            <Link href="/login" className="text-info text-sm font-semibold hover:underline">
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
            <Button type="submit" variant="primary" size="lg" fullWidth>
              Send reset link
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-info text-sm font-semibold hover:underline">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

