import api from '../api/client'

export default function ReportExporter({ reportType = 'freshness' }) {
  const exportPdf = async () => {
    const res = await api.get(`/reports/export/pdf?report_type=${reportType}`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${reportType}_report.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportExcel = async () => {
    const res = await api.get(`/reports/export/excel?report_type=${reportType}`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url; a.download = `${reportType}_report.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-8">
      <button className="btn btn-primary btn-sm" onClick={exportPdf}>📄 Export PDF</button>
      <button className="btn btn-success btn-sm" onClick={exportExcel}>📊 Export Excel</button>
    </div>
  )
}
