// Authentication types and interfaces

export interface PatientAuthResponse {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  externalId: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ConfirmPasswordResetRequest {
  token: string;
  newPassword: string;
}

export interface PatientSession {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isCurrent: boolean;
}

export interface PatientSessionListResponse {
  sessions: PatientSession[];
  total: number;
  activeCount: number;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: PatientAuthResponse | null;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
