import { api } from './api'

export const getHealth = () => api('/api/v1/storage/health')
export const createCondition = payload => api('/api/v1/storage/conditions', { method: 'POST', body: payload })
export const getCondition = conditionId => api(`/api/v1/storage/conditions/${conditionId}`)
export const getBatchConditions = foodBatchId => api(`/api/v1/storage/batches/${foodBatchId}/conditions`)
export const getLatestCondition = foodBatchId => api(`/api/v1/storage/batches/${foodBatchId}/latest`)
export const deleteCondition = conditionId => api(`/api/v1/storage/conditions/${conditionId}`, { method: 'DELETE' })
export const getRules = () => api('/api/v1/storage/rules')
export const createRule = payload => api('/api/v1/storage/rules', { method: 'POST', body: payload })
export const updateRule = (ruleId, payload) => api(`/api/v1/storage/rules/${ruleId}`, { method: 'PUT', body: payload })
export const deleteRule = ruleId => api(`/api/v1/storage/rules/${ruleId}`, { method: 'DELETE' })
export const getCompliance = foodBatchId => api(`/api/v1/storage/batches/${foodBatchId}/compliance`)
export const getOptimization = foodBatchId => api(`/api/v1/storage/batches/${foodBatchId}/optimization`)
