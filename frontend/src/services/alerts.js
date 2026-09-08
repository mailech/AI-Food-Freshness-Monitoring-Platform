import { api } from './api'

const query = params => {
    const values = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    return values.length ? `?${new URLSearchParams(values)}` : ''
}

export const getHealth = () => api('/api/v1/alerts/health')
export const createAlert = payload => api('/api/v1/alerts/', { method: 'POST', body: payload })
export const getAlerts = params => api(`/api/v1/alerts/${query(params)}`)
export const getAlertHistory = () => api('/api/v1/alerts/history')
export const getAlert = alertId => api(`/api/v1/alerts/${alertId}`)
export const markAlertRead = alertId => api(`/api/v1/alerts/${alertId}/read`, { method: 'PATCH' })
export const dismissAlert = alertId => api(`/api/v1/alerts/${alertId}/dismiss`, { method: 'PATCH' })
export const markAllAlertsRead = () => api('/api/v1/alerts/read-all', { method: 'PATCH' })
