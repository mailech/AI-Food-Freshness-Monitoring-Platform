import { useState, useEffect } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import ScoreCard from '../components/ScoreCard'
import AlertBanner, { useToast } from '../components/AlertBanner'

export default function AdminPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { toasts, addToast, dismissToast } = useToast()

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/admin').then(r => setStats(r.data)),
      api.get('/auth/users').then(r => setUsers(r.data))
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const deleteUser = async id => {
    if (id === user.id) return addToast('Cannot delete yourself', 'warning')
    try {
      await api.delete(`/auth/users/${id}`)
      addToast('User deleted', 'success')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { addToast('Failed to delete', 'error') }
  }

  const changeRole = async (id, role) => {
    try {
      await api.put(`/auth/users/${id}/role?role=${role}`)
      addToast('Role updated', 'success')
      setUsers(prev => prev.map(u => u.id === id ? {...u, role} : u))
    } catch { addToast('Failed to update role', 'error') }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page-container animate-in">
      <AlertBanner alerts={toasts} onDismiss={dismissToast} />
      <div className="page-header">
        <h1>⚙️ Admin Panel</h1>
        <p>Platform administration and user management</p>
      </div>

      {stats && (
        <div className="grid-4" style={{marginBottom:24}}>
          <ScoreCard icon="👥" value={stats.total_users} label="Users" color="accent" />
          <ScoreCard icon="📦" value={stats.total_items} label="Items" color="blue" />
          <ScoreCard icon="🔬" value={stats.total_analyses} label="Analyses" color="green" />
          <ScoreCard icon="📊" value={`${stats.avg_freshness}%`} label="Avg Freshness" color="orange" />
        </div>
      )}

      <div className="glass-card">
        <h3 style={{marginBottom:16}}>User Management ({users.length} users)</h3>
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.full_name}</td>
                  <td style={{color:'var(--text-secondary)'}}>{u.email}</td>
                  <td>
                    <select className="input-field" style={{padding:'4px 8px',fontSize:'0.82rem'}} value={u.role} onChange={e => changeRole(u.id, e.target.value)}>
                      {['Consumer','RetailManager','WarehouseOperator','FoodQualityInspector','Administrator'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)} disabled={u.id === user.id}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
