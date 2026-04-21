// Authentication types and interfaces

export interface PatientAuthResponse {
  id: string;
  email: string;
  name: string;
  externalId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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
