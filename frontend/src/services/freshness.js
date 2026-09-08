import { api } from './api'

export const analyze = ({ image, foodBatchId }) => {
  const body = new FormData()
  body.append('image', image)
  body.append('food_batch_id', String(foodBatchId))
  return api('/api/v1/freshness/analyze', { method: 'POST', body })
}

export const getAnalysis = analysisId => api(`/api/v1/freshness/analyses/${analysisId}`)
export const getBatchAnalyses = foodBatchId => api(`/api/v1/freshness/batches/${foodBatchId}/analyses`)
export const deleteAnalysis = analysisId => api(`/api/v1/freshness/analyses/${analysisId}`, { method: 'DELETE' })
