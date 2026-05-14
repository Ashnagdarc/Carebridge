// CareBridge: Client-side API and utility logic.
/**
 * Form Validation Utilities
 * Apple HIG compliant validation with clear error messages
 */

export interface ValidationError {
  field: string;
  message: string;
}

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!PASSWORD_STRENGTH_REGEX.test(password)) {
    return 'Password must contain uppercase, lowercase, and numbers';
  }
  return null;
};

export const validatePasswordConfirm = (
  password: string,
  confirm: string
): string | null => {
  if (!confirm) {
    return 'Please confirm your password';
  }
  if (password !== confirm) {
    return 'Passwords do not match';
  }
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.trim().length > 100) {
    return 'Name must not exceed 100 characters';
  }
  return null;
};

export const validateSignupForm = (data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const nameError = validateName(data.name);
  if (nameError) errors.push({ field: 'name', message: nameError });

  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.push({ field: 'password', message: passwordError });

  const confirmError = validatePasswordConfirm(data.password, data.confirmPassword);
  if (confirmError) errors.push({ field: 'confirmPassword', message: confirmError });

  return errors;
};

export const validateLoginForm = (data: {
  email: string;
  password: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push({ field: 'email', message: emailError });

  if (!data.password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  return errors;
};
