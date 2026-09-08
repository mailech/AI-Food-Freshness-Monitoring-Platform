import { api } from './api'

export const predict = payload => api('/api/v1/shelf-life/predict', { method: 'POST', body: payload })
export const getPrediction = predictionId => api(`/api/v1/shelf-life/predictions/${predictionId}`)
export const getBatchPredictions = foodBatchId => api(`/api/v1/shelf-life/batches/${foodBatchId}/predictions`)
export const deletePrediction = predictionId => api(`/api/v1/shelf-life/predictions/${predictionId}`, { method: 'DELETE' })
