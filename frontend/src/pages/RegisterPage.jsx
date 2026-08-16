import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roles = ['Consumer', 'RetailManager', 'WarehouseOperator', 'FoodQualityInspector', 'Administrator']
const roleLabels = { Consumer: 'Consumer', RetailManager: 'Retail Manager', WarehouseOperator: 'Warehouse Operator', FoodQualityInspector: 'Food Quality Inspector', Administrator: 'Administrator' }

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'Consumer' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name, form.role)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div style={{textAlign:'center',marginBottom:8}}>
          <div style={{fontSize:'3rem',marginBottom:8}}>🌿</div>
        </div>
        <h1>Create Account</h1>
        <p className="subtitle">Join the FreshAI Platform</p>
        {error && <div style={{background:'rgba(255,71,87,0.1)',border:'1px solid var(--red)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:'0.85rem',color:'var(--red-light)'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-group">
              <label>Full Name</label>
              <input className="input-field" placeholder="John Doe" value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input-field" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} />
            </div>
            <div className="input-group">
              <label>Role</label>
              <select className="input-field" value={form.role} onChange={e => update('role', e.target.value)}>
                {roles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" style={{width:'100%'}} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
