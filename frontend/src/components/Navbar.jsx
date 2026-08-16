import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [unread, setUnread] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) {
      api.get('/notifications/count').then(r => setUnread(r.data.unread_count)).catch(() => {})
    }
    const interval = setInterval(() => {
      if (user) api.get('/notifications/count').then(r => setUnread(r.data.unread_count)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input placeholder="Search food items, reports..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="navbar-right">
        <button className="notif-btn" onClick={() => navigate('/notifications')} title="Notifications">
          🔔
          {unread > 0 && <span className="notif-count">{unread}</span>}
        </button>
        <button className="notif-btn" onClick={() => navigate('/profile')} title="Profile">
          👤
        </button>
      </div>
    </header>
  )
}
