import { api } from './api'

export const createScore = foodBatchId => api(`/api/v1/freshness-scoring/batches/${foodBatchId}`, { method: 'POST' })
export const getScore = scoreId => api(`/api/v1/freshness-scoring/${scoreId}`)
export const getBatchScores = foodBatchId => api(`/api/v1/freshness-scoring/batches/${foodBatchId}`)
export const deleteScore = scoreId => api(`/api/v1/freshness-scoring/${scoreId}`, { method: 'DELETE' })
