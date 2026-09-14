import { useState, useEffect } from 'react'
import api from '../api/client'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  const load = () => {
    api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  const markRead = async id => {
    await api.put(`/notifications/${id}/read`)
    load()
  }

  const markAllRead = async () => {
    await api.put('/notifications/read-all')
    load()
  }

  const deleteNotif = async id => {
    await api.delete(`/notifications/${id}`)
    load()
  }

  const filtered = filter === 'all' ? notifications : filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications.filter(n => n.type === filter)

  const typeIcon = t => {
    const map = { spoilage_alert: '🚨', freshness_alert: '⚠️', shelf_life_warning: '⏰', storage_alert: '🌡️', inventory_alert: '📦' }
    return map[t] || 'ℹ️'
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page-container animate-in">
      <div className="flex-between" style={{marginBottom:24}}>
        <div className="page-header" style={{marginBottom:0}}>
          <h1>🔔 Notifications</h1>
          <p>{notifications.filter(n => !n.is_read).length} unread notifications</p>
        </div>
        <button className="btn btn-secondary" onClick={markAllRead}>Mark All Read</button>
      </div>

      <div className="flex gap-8" style={{marginBottom:20,flexWrap:'wrap'}}>
        {['all','unread','spoilage_alert','freshness_alert','shelf_life_warning'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="flex-col gap-8">
        {filtered.length ? filtered.map(n => (
          <div key={n.id} className={`notification-item${!n.is_read ? ' unread' : ''}`} onClick={() => !n.is_read && markRead(n.id)}>
            {!n.is_read && <div className="notification-dot" />}
            <div style={{fontSize:'1.5rem'}}>{typeIcon(n.type)}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:'0.92rem',marginBottom:2}}>{n.title}</div>
              <div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>{n.message}</div>
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-8">
              <span className={`badge badge-${n.priority === 'high' ? 'high' : n.priority === 'medium' ? 'medium' : 'low'}`}>{n.priority}</span>
              <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}>🗑️</button>
            </div>
          </div>
        )) : (
          <div className="empty-state"><div className="empty-icon">🔔</div><p>No notifications</p></div>
        )}
      </div>
    </div>
  )
}
