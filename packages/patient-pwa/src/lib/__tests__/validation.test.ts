import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateName,
  validateSignupForm,
  validateLoginForm,
} from '@/lib/validation';

describe('Form Validation', () => {
  describe('validateEmail', () => {
    it('should return error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('notanemail')).toBe('Please enter a valid email address');
      expect(validateEmail('user@')).toBe('Please enter a valid email address');
    });

    it('should return null for valid email', () => {
      expect(validateEmail('user@example.com')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return error for empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('should return error for password shorter than 8 characters', () => {
      expect(validatePassword('Pass123')).toBe('Password must be at least 8 characters');
    });

    it('should return error for password without uppercase', () => {
      expect(validatePassword('password123')).toBe(
        'Password must contain uppercase, lowercase, and numbers'
      );
    });

    it('should return error for password without lowercase', () => {
      expect(validatePassword('PASSWORD123')).toBe(
        'Password must contain uppercase, lowercase, and numbers'
      );
    });

    it('should return error for password without numbers', () => {
      expect(validatePassword('Password')).toBe(
        'Password must contain uppercase, lowercase, and numbers'
      );
    });

    it('should return null for valid password', () => {
      expect(validatePassword('ValidPass123')).toBeNull();
    });
  });

  describe('validatePasswordConfirm', () => {
    it('should return error if confirm password is empty', () => {
      expect(validatePasswordConfirm('Password123', '')).toBe('Please confirm your password');
    });

    it('should return error if passwords do not match', () => {
      expect(validatePasswordConfirm('Password123', 'Different123')).toBe(
        'Passwords do not match'
      );
    });

    it('should return null if passwords match', () => {
      expect(validatePasswordConfirm('Password123', 'Password123')).toBeNull();
    });
  });

  describe('validateName', () => {
    it('should return error for empty name', () => {
      expect(validateName('')).toBe('Name is required');
    });

    it('should return error for name shorter than 2 characters', () => {
      expect(validateName('A')).toBe('Name must be at least 2 characters');
    });

    it('should return error for name longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(validateName(longName)).toBe('Name must not exceed 100 characters');
    });

    it('should return null for valid name', () => {
      expect(validateName('John Doe')).toBeNull();
    });
  });

  describe('validateSignupForm', () => {
    it('should return error for empty form', () => {
      const errors = validateSignupForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'name')).toBe(true);
      expect(errors.some(e => e.field === 'email')).toBe(true);
      expect(errors.some(e => e.field === 'password')).toBe(true);
    });

    it('should return no errors for valid form', () => {
      const errors = validateSignupForm({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPass123',
        confirmPassword: 'ValidPass123',
      });
      expect(errors.length).toBe(0);
    });

    it('should return specific errors for invalid fields', () => {
      const errors = validateSignupForm({
        name: 'A',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different',
      });
      expect(errors.find(e => e.field === 'name')).toBeDefined();
      expect(errors.find(e => e.field === 'email')).toBeDefined();
      expect(errors.find(e => e.field === 'password')).toBeDefined();
      expect(errors.find(e => e.field === 'confirmPassword')).toBeDefined();
    });
  });

  describe('validateLoginForm', () => {
    it('should return error for empty form', () => {
      const errors = validateLoginForm({
        email: '',
        password: '',
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === 'email')).toBe(true);
      expect(errors.some(e => e.field === 'password')).toBe(true);
    });

    it('should return no errors for valid form', () => {
      const errors = validateLoginForm({
        email: 'user@example.com',
        password: 'anypassword',
      });
      expect(errors.length).toBe(0);
    });

    it('should return error for invalid email', () => {
      const errors = validateLoginForm({
        email: 'not-an-email',
        password: 'password',
      });
      expect(errors.find(e => e.field === 'email')).toBeDefined();
    });
  });
});
