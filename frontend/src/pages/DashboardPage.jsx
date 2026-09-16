import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import ScoreCard from '../components/ScoreCard'
import { FreshnessLineChart, CategoryBarChart, QualityPieChart } from '../components/Charts'

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const endpoint = user?.role === 'RetailManager' ? '/dashboard/retail'
      : user?.role === 'WarehouseOperator' ? '/dashboard/warehouse'
      : user?.role === 'Administrator' ? '/dashboard/admin'
      : '/dashboard/consumer'
    api.get(endpoint).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading dashboard...</p></div>

  const isConsumer = !user?.role || user.role === 'Consumer'
  const isRetail = user?.role === 'RetailManager'
  const isWarehouse = user?.role === 'WarehouseOperator'
  const isAdmin = user?.role === 'Administrator'

  return (
    <div className="page-container animate-in">
      <div className="page-header">
        <h1>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p>{isAdmin ? 'Platform Administration Dashboard' : isRetail ? 'Retail Freshness Analytics' : isWarehouse ? 'Warehouse Monitoring' : 'Your Food Freshness Overview'}</p>
      </div>

      {isConsumer && data && <ConsumerView data={data} />}
      {isRetail && data && <RetailView data={data} />}
      {isWarehouse && data && <WarehouseView data={data} />}
      {isAdmin && data && <AdminView data={data} />}
    </div>
  )
}

function ConsumerView({ data }) {
  return (
    <>
      <div className="grid-4" style={{marginBottom:24}}>
        <ScoreCard icon="📦" value={data.total_items} label="Food Items" color="accent" />
        <ScoreCard icon="🔬" value={data.total_analyses} label="Analyses" color="blue" />
        <ScoreCard icon="✅" value={data.fresh_items} label="Fresh Items" color="green" />
        <ScoreCard icon="⚠️" value={data.spoiled_items} label="Spoiled" color="red" />
      </div>
      <div className="grid-2" style={{marginBottom:24}}>
        <div className="chart-container">
          <h3>Freshness Trend</h3>
          <FreshnessLineChart data={data.freshness_trend} />
        </div>
        <div className="chart-container">
          <h3>Category Distribution</h3>
          <CategoryBarChart data={data.category_distribution} />
        </div>
      </div>
      <div className="glass-card">
        <h3 style={{marginBottom:16}}>Recent Analyses</h3>
        {data.recent_analyses?.length ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Food</th><th>Score</th><th>Quality</th><th>Risk</th><th>Date</th></tr></thead>
              <tbody>
                {data.recent_analyses.map(a => (
                  <tr key={a.id}>
                    <td style={{fontWeight:600}}>{a.food_name}</td>
                    <td><span style={{fontWeight:700,color:a.freshness_score >= 70 ? 'var(--green)' : a.freshness_score >= 50 ? 'var(--yellow)' : 'var(--red)'}}>{a.freshness_score}%</span></td>
                    <td><span className={`badge badge-${a.quality_class.toLowerCase().replace(' ','-')}`}>{a.quality_class}</span></td>
                    <td><span className={`badge badge-${a.risk_level.toLowerCase()}`}>{a.risk_level}</span></td>
                    <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(a.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={{color:'var(--text-muted)'}}>No analyses yet. Upload a food image to get started!</p>}
      </div>
    </>
  )
}

function RetailView({ data }) {
  return (
    <>
      <div className="grid-4" style={{marginBottom:24}}>
        <ScoreCard icon="📦" value={data.total_items} label="Total Products" color="accent" />
        <ScoreCard icon="📊" value={`${data.avg_freshness}%`} label="Avg Freshness" color="green" />
        <ScoreCard icon="🔬" value={data.total_analyses} label="Inspections" color="blue" />
        <ScoreCard icon="⏰" value={data.expiring_soon} label="Expiring Soon" color="orange" />
      </div>
      <div className="grid-2">
        <div className="chart-container">
          <h3>Quality Distribution</h3>
          <QualityPieChart data={data.quality_distribution} />
        </div>
        <div className="chart-container">
          <h3>Daily Analytics</h3>
          <FreshnessLineChart data={data.daily_analytics} dataKey="avg_score" />
        </div>
      </div>
    </>
  )
}

function WarehouseView({ data }) {
  return (
    <>
      <div className="grid-4" style={{marginBottom:24}}>
        <ScoreCard icon="📦" value={data.total_items} label="Items Stored" color="accent" />
        <ScoreCard icon="📋" value={data.total_batches} label="Batches" color="blue" />
        <ScoreCard icon="✅" value={`${data.storage_compliance_rate}%`} label="Compliance Rate" color="green" />
        <ScoreCard icon="❌" value={data.expired_batches} label="Expired Batches" color="red" />
      </div>
      <div className="grid-3">
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'2.5rem',marginBottom:8}}>🌡️</div>
          <div style={{fontSize:'2rem',fontWeight:800}}>{data.avg_temperature}°C</div>
          <div className="stat-label">Avg Temperature</div>
        </div>
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'2.5rem',marginBottom:8}}>💧</div>
          <div style={{fontSize:'2rem',fontWeight:800}}>{data.avg_humidity}%</div>
          <div className="stat-label">Avg Humidity</div>
        </div>
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'2.5rem',marginBottom:8}}>📝</div>
          <div style={{fontSize:'2rem',fontWeight:800}}>{data.total_conditions_logged}</div>
          <div className="stat-label">Readings Logged</div>
        </div>
      </div>
    </>
  )
}

function AdminView({ data }) {
  return (
    <>
      <div className="grid-4" style={{marginBottom:24}}>
        <ScoreCard icon="👥" value={data.total_users} label="Total Users" color="accent" />
        <ScoreCard icon="📦" value={data.total_items} label="Food Items" color="blue" />
        <ScoreCard icon="🔬" value={data.total_analyses} label="Analyses" color="green" />
        <ScoreCard icon="📊" value={`${data.avg_freshness}%`} label="Avg Freshness" color="orange" />
      </div>
      <div className="grid-2">
        <div className="chart-container">
          <h3>User Roles</h3>
          <CategoryBarChart data={data.role_distribution} />
        </div>
        <div className="glass-card">
          <h3 style={{marginBottom:16}}>Recent Users</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {data.recent_users?.map(u => (
                  <tr key={u.id}>
                    <td style={{fontWeight:600}}>{u.full_name}</td>
                    <td style={{color:'var(--text-secondary)'}}>{u.email}</td>
                    <td><span className="badge badge-good">{u.role}</span></td>
                    <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(u.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
