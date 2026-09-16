import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/analysis', icon: '🔬', label: 'Food Analysis' },
  ]},
  { section: 'Management', items: [
    { path: '/inventory', icon: '📦', label: 'Inventory' },
    { path: '/storage', icon: '🌡️', label: 'Storage' },
  ]},
  { section: 'Insights', items: [
    { path: '/reports', icon: '📄', label: 'Reports' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
  ]},
  { section: 'Account', items: [
    { path: '/profile', icon: '👤', label: 'Profile' },
  ]},
]

const adminItems = { path: '/admin', icon: '⚙️', label: 'Admin Panel' }

export default function Sidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">F</div>
        <span>FreshAI</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => (
              <Link key={item.path} to={item.path} className={`nav-item${pathname === item.path ? ' active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
        {user?.role === 'Administrator' && (
          <div className="nav-section">
            <div className="nav-section-title">System</div>
            <Link to={adminItems.path} className={`nav-item${pathname === adminItems.path ? ' active' : ''}`}>
              <span className="nav-icon">{adminItems.icon}</span>
              {adminItems.label}
            </Link>
          </div>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-card" onClick={logout} title="Click to logout">
          <div className="user-avatar">{user?.full_name?.[0] || 'U'}</div>
          <div className="user-info">
            <div className="name">{user?.full_name || 'User'}</div>
            <div className="role">{user?.role || 'Consumer'}</div>
          </div>
          <span style={{color:'var(--text-muted)',fontSize:'0.9rem'}}>↗</span>
        </div>
      </div>
    </aside>
  )
}
