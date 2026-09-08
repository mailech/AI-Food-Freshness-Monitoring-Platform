import { api, clearToken, getToken, setToken } from './api'

export const register = payload => api('/api/v1/authentication/register', { method: 'POST', body: payload, authenticated: false })

export async function login({ email, password }) {
  const form = new URLSearchParams({ username: email, password })
  const response = await api('/api/v1/authentication/login', {
    method: 'POST', body: form.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, authenticated: false,
  })
  setToken(response.access_token)
  return response.user
}

export const getCurrentUser = () => api('/api/v1/authentication/me')
export const logout = () => clearToken()
export const hasSession = () => Boolean(getToken())
