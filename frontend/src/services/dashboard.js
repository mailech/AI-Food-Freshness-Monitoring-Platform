import { api } from './api'

export const getSummary = () => api('/api/v1/dashboard/summary')
