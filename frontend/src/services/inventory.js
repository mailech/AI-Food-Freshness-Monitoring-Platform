import { api } from './api'

const query = params => {
  const values = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return values.length ? `?${new URLSearchParams(values)}` : ''
}

export const getItems = params => api(`/api/v1/inventory/items${query(params)}`)
export const createItem = payload => api('/api/v1/inventory/items', { method: 'POST', body: payload })
export const getItem = itemId => api(`/api/v1/inventory/items/${itemId}`)
export const updateItem = (itemId, payload) => api(`/api/v1/inventory/items/${itemId}`, { method: 'PUT', body: payload })
export const deleteItem = itemId => api(`/api/v1/inventory/items/${itemId}`, { method: 'DELETE' })

export const createBatch = (itemId, payload) => api(`/api/v1/inventory/items/${itemId}/batches`, { method: 'POST', body: payload })
export const getBatches = params => api(`/api/v1/inventory/batches${query(params)}`)
export const getBatch = batchId => api(`/api/v1/inventory/batches/${batchId}`)
export const updateBatch = (batchId, payload) => api(`/api/v1/inventory/batches/${batchId}`, { method: 'PUT', body: payload })
export const deleteBatch = batchId => api(`/api/v1/inventory/batches/${batchId}`, { method: 'DELETE' })
