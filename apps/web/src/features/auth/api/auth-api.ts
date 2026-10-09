import { authResponseSchema, loginSchema, registerSchema, type AuthResponse } from "@plana/shared";
import { apiClient } from "@/shared/api/client";

export function apiRegister(input: typeof registerSchema._input): Promise<AuthResponse> {
  return apiClient.post("/v1/auth/register", authResponseSchema, input);
}

export function apiLogin(input: typeof loginSchema._input): Promise<AuthResponse> {
  return apiClient.post("/v1/auth/login", authResponseSchema, input);
}

export function apiLogout(refreshToken: string): Promise<void> {
  return apiClient.postVoid("/v1/auth/logout", { refreshToken });
}
