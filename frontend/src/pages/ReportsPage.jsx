import { useState, useEffect } from 'react'
import api from '../api/client'
import ReportExporter from '../components/ReportExporter'

export default function ReportsPage() {
  const [tab, setTab] = useState('freshness')
  const [freshnessData, setFreshnessData] = useState([])
  const [inventoryData, setInventoryData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/reports/freshness').then(r => setFreshnessData(r.data)),
      api.get('/reports/inventory').then(r => setInventoryData(r.data))
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page-container animate-in">
      <div className="flex-between" style={{marginBottom:24}}>
        <div className="page-header" style={{marginBottom:0}}>
          <h1>📄 Reports</h1>
          <p>Generate and export freshness and inventory reports</p>
        </div>
        <ReportExporter reportType={tab} />
      </div>

      <div className="tab-bar">
        <button className={`tab-item${tab === 'freshness' ? ' active' : ''}`} onClick={() => setTab('freshness')}>Freshness Reports</button>
        <button className={`tab-item${tab === 'inventory' ? ' active' : ''}`} onClick={() => setTab('inventory')}>Inventory Reports</button>
      </div>

      {tab === 'freshness' && (
        <div className="glass-card">
          {freshnessData.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Food</th><th>Category</th><th>Score</th><th>Quality</th><th>Risk</th><th>Shelf Life</th><th>Date</th></tr></thead>
                <tbody>
                  {freshnessData.map((r, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{r.food_name}</td>
                      <td style={{color:'var(--text-secondary)'}}>{r.category}</td>
                      <td><span style={{fontWeight:700,color:r.freshness_score >= 70 ? 'var(--green)' : r.freshness_score >= 50 ? 'var(--yellow)' : 'var(--red)'}}>{r.freshness_score}%</span></td>
                      <td><span className={`badge badge-${r.quality_class.toLowerCase().replace(' ','-')}`}>{r.quality_class}</span></td>
                      <td><span className={`badge badge-${r.risk_level.toLowerCase()}`}>{r.risk_level}</span></td>
                      <td style={{fontSize:'0.85rem'}}>{r.shelf_life}</td>
                      <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(r.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><div className="empty-icon">📊</div><p>No freshness data yet. Run some analyses first.</p></div>}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="glass-card">
          {inventoryData.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Name</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Added</th></tr></thead>
                <tbody>
                  {inventoryData.map((r, i) => (
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{r.name}</td>
                      <td><span className="badge badge-good">{r.category}</span></td>
                      <td>{r.quantity}</td>
                      <td>{r.unit}</td>
                      <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(r.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><div className="empty-icon">📦</div><p>No inventory data yet</p></div>}
        </div>
      )}
    </div>
  )
}
