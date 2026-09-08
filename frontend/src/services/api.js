const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const TOKEN_KEY = 'food-freshness-auth-token'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = token => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function errorMessage(response) {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return body.detail.map(item => item.msg).filter(Boolean).join(' ')
  } catch {
    // A safe status-based message is returned below for non-JSON errors.
  }
  return response.status === 401 ? 'Your session is no longer valid. Please sign in again.' : 'Unable to complete this request.'
}

export async function api(path, { method = 'GET', body, headers = {}, authenticated = true } = {}) {
  const requestHeaders = { Accept: 'application/json', ...headers }
  const token = getToken()
  if (authenticated && token) requestHeaders.Authorization = `Bearer ${token}`
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders['Content-Type']) requestHeaders['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined || body instanceof FormData || typeof body === 'string' ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Unable to connect to server. Please check that the backend is running.')
  }
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  return JSON.parse(text)
}

function filenameFromDisposition(header) {
  if (!header) return ''
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) return decodeURIComponent(encoded[1].trim())
  const basic = header.match(/filename="?([^";]+)"?/i)
  return basic ? basic[1].trim() : ''
}

export async function download(path) {
  const requestHeaders = {}
  const token = getToken()
  if (token) requestHeaders.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: requestHeaders })
  } catch {
    throw new ApiError(0, 'Unable to connect to server. Please check that the backend is running.')
  }
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
  const blob = await response.blob()
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'))
  return { blob, filename: filename || 'download', mediaType: response.headers.get('Content-Type') }
}
