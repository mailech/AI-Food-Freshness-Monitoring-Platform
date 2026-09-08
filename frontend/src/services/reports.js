import { api, download } from './api'

const query = params => {
  const values = Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return values.length ? `?${new URLSearchParams(values)}` : ''
}

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const getHealth = () => api('/api/v1/reports/health')
export const createReport = payload => {
  const body = { report_type: payload.report_type }
  if (payload.date_from) body.date_from = payload.date_from
  if (payload.date_to) body.date_to = payload.date_to
  return api('/api/v1/reports/', { method: 'POST', body })
}
export const getReports = params => api(`/api/v1/reports/${query(params)}`)
export const getReportHistory = () => api('/api/v1/reports/history')
export const getReport = reportId => api(`/api/v1/reports/${reportId}`)
export const deleteReport = reportId => api(`/api/v1/reports/${reportId}`, { method: 'DELETE' })

export const downloadPdf = async reportId => {
  const file = await download(`/api/v1/reports/${reportId}/export/pdf`)
  saveBlob(file.blob, file.filename || `report-${reportId}.pdf`)
  return file
}

export const downloadExcel = async reportId => {
  const file = await download(`/api/v1/reports/${reportId}/export/excel`)
  saveBlob(file.blob, file.filename || `report-${reportId}.xlsx`)
  return file
}
