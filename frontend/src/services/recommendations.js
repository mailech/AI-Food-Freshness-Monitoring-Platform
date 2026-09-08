import { api } from './api'

const query = params => {
  const values = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return values.length ? `?${new URLSearchParams(values)}` : ''
}

export const getHealth = () => api('/api/v1/recommendations/health')
export const createRecommendation = payload => api('/api/v1/recommendations', { method: 'POST', body: payload })
export const getRecommendations = params => api(`/api/v1/recommendations${query(params)}`)
export const getBatchRecommendations = batchId => api(`/api/v1/recommendations/batches/${batchId}`)
export const getRecommendation = recommendationId => api(`/api/v1/recommendations/${recommendationId}`)
export const updateRecommendationStatus = (recommendationId, status) => api(`/api/v1/recommendations/${recommendationId}/status`, { method: 'PATCH', body: { status } })
export const deleteRecommendation = recommendationId => api(`/api/v1/recommendations/${recommendationId}`, { method: 'DELETE' })
