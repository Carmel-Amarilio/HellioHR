import { apiClient } from './apiClient';

export interface User {
  id: string;
  email: string;
  role: 'viewer' | 'editor';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await apiClient.post<LoginResponse>('/api/auth/login', {
    email,
    password,
  });

  apiClient.setToken(response.token);
  return response.user;
}

export async function logout(): Promise<void> {
  apiClient.clearToken();
}

export async function getCurrentUser(): Promise<User | null> {
  if (!apiClient.isAuthenticated()) {
    return null;
  }

  try {
    return await apiClient.get<User>('/api/auth/me');
  } catch {
    // Token is invalid or expired
    apiClient.clearToken();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return apiClient.isAuthenticated();
}
