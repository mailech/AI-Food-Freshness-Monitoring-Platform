import { useState } from 'react'
import { ApiError } from '../services/api'
import * as auth from '../services/auth'

const ROLES = ['Consumer', 'Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator']

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
      <Field label={view === 'register' ? 'New Password' : 'Password'} type="password" value={form.password} onChange={update('password')} required />
      {view === 'register' && <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required />}
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
