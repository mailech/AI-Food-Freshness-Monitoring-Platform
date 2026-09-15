import { useId, useState } from 'react'
import { ApiError } from '../services/api'
import * as auth from '../services/auth'

const ROLES = ['Consumer', 'Retail Manager', 'Warehouse Operator', 'Food Quality Inspector']

const friendlyError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete this request. Please try again.'
  if (error.status === 401) return 'Invalid email or password.'
  if (error.status === 403) return 'Access denied for this account.'
  return error.message
}

export default function Auth({ onAuthenticated }) {
  const [view, setView] = useState('login')
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'Consumer' })
  const update = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setMessage(''); setSuccess('') }
  const showLogin = successMessage => {
    setView('login')
    setForm(current => ({ ...current, password: '', confirmPassword: '' }))
    setMessage('')
    setSuccess(successMessage || '')
  }

  const submit = async event => {
    event.preventDefault()
    if (view === 'register' && form.password !== form.confirmPassword) return setMessage('Passwords do not match.')
    setSubmitting(true)
    setMessage('')
    setSuccess('')
    try {
      if (view === 'register') {
        await auth.register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role })
        showLogin('Registration successful. Please sign in.')
        return
      }
      await auth.login({ email: form.email.trim(), password: form.password })
      const user = await auth.getCurrentUser()
      if (user.role !== form.role) {
        auth.logout()
        setMessage('The selected role does not match this account.')
        return
      }
      onAuthenticated(user)
    } catch (error) {
      auth.logout()
      setMessage(friendlyError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const labels = { login: ['WELCOME BACK', 'Sign in to your workspace'], register: ['CREATE WORKSPACE', 'Create your account'] }
  return <div className="login">
    <section className="login-art"><div className="brand"><i>⌁</i><span><b>Food Freshness</b><small>MONITORING PLATFORM</small></span></div><div><small>SMARTER FOOD OPERATIONS</small><h1>See freshness.<br /><em>Prevent waste.</em></h1><p>Bring inventory quality, storage conditions, and timely action into one clear workspace.</p></div></section>
    <section className="login-form"><form onSubmit={submit}>
      <small>{labels[view][0]}</small><h2>{labels[view][1]}</h2><p className="login-project-title">Food Freshness Monitoring Platform</p>
      {view === 'register' && <Field label="Full Name" value={form.name} onChange={update('name')} required />}
      <Field label="Work email" type="email" value={form.email} onChange={update('email')} required />
      <PasswordField label={view === 'register' ? 'New Password' : 'Password'} value={form.password} onChange={update('password')} required />
      {view === 'register' && <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={update('confirmPassword')} required />}
      <label className="field">Role<select value={form.role} onChange={update('role')}>{ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
      {message && <p className="error" role="alert">{message}</p>}
      {success && <p className="success-message" role="status">{success}</p>}
      <button className="button primary" disabled={submitting}>{submitting ? 'Please wait…' : view === 'register' ? 'Register' : 'Sign In'} →</button>
      {view === 'login' && <p className="switch">Don't have an account? <button type="button" onClick={() => { setView('register'); setMessage(''); setSuccess('') }}>Create an account</button></p>}
      {view === 'register' && <p className="switch">Already have an account? <button type="button" onClick={() => showLogin()}>Sign in</button></p>}
    </form></section>
  </div>
}

function Field({ label, type = 'text', value, onChange, required = false }) {
  return <label className="field">{label}<input type={type} value={value} onChange={onChange} required={required} /></label>
}

function PasswordField({ label, value, onChange, required = false }) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  return <div className="field"><label htmlFor={inputId}>{label}</label><div className="password-input"><input id={inputId} type={visible ? 'text' : 'password'} value={value} onChange={onChange} required={required} /><button type="button" className="password-toggle" onClick={() => setVisible(current => !current)} aria-label={`${visible ? 'Hide' : 'Show'} ${label}`} aria-pressed={visible}>{visible ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.3 4.1 9.3 6.1a1.9 1.9 0 0 1 0 1.8 17.8 17.8 0 0 1-3.1 4.1M6.2 6.2A17.8 17.8 0 0 0 2.7 10a1.9 1.9 0 0 0 0 1.8C3.7 13.9 7 18 12 18c1 0 1.9-.2 2.8-.5" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.7 10.1C3.7 8.1 7 4 12 4s8.3 4.1 9.3 6.1a1.9 1.9 0 0 1 0 1.8C20.3 13.9 17 18 12 18S3.7 13.9 2.7 11.9a1.9 1.9 0 0 1 0-1.8Z" /><circle cx="12" cy="11" r="3" /></svg>}</button></div></div>
}
