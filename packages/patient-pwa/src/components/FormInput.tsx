"use client";
// CareBridge: Reusable UI component implementation.

import React, { InputHTMLAttributes } from "react";

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  error?: string;
  helperText?: string;
  onChange?: (value: string, name?: string) => void;
}

/**
 * Apple HIG Form Input Component
 * - Clear label above input
 * - Error state with red border and error message
 * - Helper text for guidance
 */
export function FormInput({
  label,
  error,
  helperText,
  onChange,
  id,
  className,
  name,
  inputMode,
  spellCheck,
  ...props
}: FormInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const inputName = name || label.toLowerCase().replace(/\s+/g, "-");
  const isEmail = props.type === "email" || inputName.includes("email");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value, e.target.name);
    }
  };

  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-foreground mb-2"
      >
        {label}
      </label>
      <input
        id={inputId}
        name={inputName}
        inputMode={isEmail ? "email" : inputMode}
        spellCheck={isEmail ? false : spellCheck}
        className={`w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:border-info
          ${
            error
              ? "border-error bg-red-50 text-error placeholder-red-300"
              : "border-tertiary bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:bg-secondary"
          }
          ${className ?? ""}`}
        onChange={handleChange}
        aria-invalid={!!error}
        aria-describedby={
          error
            ? `${inputId}-error`
            : helperText
              ? `${inputId}-helper`
              : undefined
        }
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-2 text-sm text-error font-medium"
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
