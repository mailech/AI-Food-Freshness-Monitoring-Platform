import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AlertBanner, { useToast } from '../components/AlertBanner'

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth()
  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)
  const { toasts, addToast, dismissToast } = useToast()

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ full_name: name })
      addToast('Profile updated!', 'success')
    } catch { addToast('Failed to update', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="page-container animate-in">
      <AlertBanner alerts={toasts} onDismiss={dismissToast} />
      <div className="page-header">
        <h1>👤 Profile</h1>
        <p>Manage your account settings</p>
      </div>

      <div className="grid-2" style={{alignItems:'start'}}>
        <div className="glass-card">
          <div style={{textAlign:'center',marginBottom:24}}>
            <div style={{width:80,height:80,borderRadius:20,background:'linear-gradient(135deg,var(--accent),var(--green))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',fontWeight:800,color:'white',margin:'0 auto 12px'}}>
              {user?.full_name?.[0] || 'U'}
            </div>
            <h2>{user?.full_name}</h2>
            <p style={{color:'var(--text-secondary)'}}>{user?.email}</p>
            <span className="badge badge-good" style={{marginTop:8}}>{user?.role}</span>
          </div>

          <form onSubmit={save} className="flex-col gap-16">
            <div className="input-group">
              <label>Full Name</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input-field" value={user?.email || ''} disabled />
            </div>
            <div className="input-group">
              <label>Role</label>
              <input className="input-field" value={user?.role || ''} disabled />
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="flex-col gap-16">
          <div className="glass-card">
            <h3 style={{marginBottom:12}}>Account Info</h3>
            <div className="flex-col gap-8">
              <div className="flex-between"><span style={{color:'var(--text-secondary)'}}>Member Since</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span></div>
              <div className="flex-between"><span style={{color:'var(--text-secondary)'}}>Account Status</span><span className="badge badge-fresh">Active</span></div>
              <div className="flex-between"><span style={{color:'var(--text-secondary)'}}>Role</span><span>{user?.role}</span></div>
            </div>
          </div>
          <div className="glass-card">
            <h3 style={{marginBottom:12}}>Quick Actions</h3>
            <div className="flex-col gap-8">
              <button className="btn btn-danger" onClick={logout} style={{width:'100%'}}>Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
