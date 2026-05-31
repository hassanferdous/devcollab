export interface User {
  id: number
  name: string
  email: string
  avatar: string | null
  provider: 'credential' | 'google'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  access_token: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

export interface RegisterResponse {
  id: number
  email: string
  name: string
  avatar: string | null
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ForgotPasswordFormData {
  email: string
}

export interface VerifyOtpFormData {
  email: string
  otp: string
}

export interface ResetPasswordFormData {
  newPassword: string
  confirmPassword: string
  token: string
}
