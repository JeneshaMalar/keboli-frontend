import { apiClient } from '../../../services/apiClient'
import type { AuthUser } from './authContext'

export async function loginRequest(email: string, password: string): Promise<{ user: AuthUser }> {
  const res = await apiClient.post<{ user: AuthUser }>('/auth/login', { email, password })
  return res.data
}

export async function meRequest(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser>('/auth/me')
  return res.data
}

export async function logoutRequest(): Promise<{ ok: boolean }> {
  const res = await apiClient.post<{ ok: boolean }>('/auth/logout')
  return res.data
}
