import { api } from './api'

export const getHealth = () => api('/api/v1/storage/health')
export const createCondition = payload => api('/api/v1/storage/conditions', { method: 'POST', body: payload })
export const getCondition = conditionId => api(`/api/v1/storage/conditions/${conditionId}`)
export const getBatchConditions = foodBatchId => api(`/api/v1/storage/batches/${foodBatchId}/conditions`)
export const getLatestCondition = foodBatchId => api(`/api/v1/storage/batches/${foodBatchId}/latest`)
export const deleteCondition = conditionId => api(`/api/v1/storage/conditions/${conditionId}`, { method: 'DELETE' })
