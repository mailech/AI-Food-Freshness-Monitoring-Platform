import { useState } from 'react'

const STORAGE_KEY = 'demoAccounts'
const LEGACY_KEYS = ['food-freshness-demo-accounts', 'food-freshness-demo-account']
const ROLES = ['Consumer', 'Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator']

const parseAccounts = value => {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : []
  } catch {
    return []
  }
}
const normalize = account => account && account.email && account.password && ROLES.includes(account.role)
  ? { name: String(account.name || 'Platform User'), email: String(account.email).trim().toLowerCase(), password: String(account.password), role: account.role }
  : null
const readAccounts = () => {
  const current = parseAccounts(localStorage.getItem(STORAGE_KEY)).map(normalize).filter(Boolean)
  if (current.length || localStorage.getItem(STORAGE_KEY) !== null) return current

  const migrated = LEGACY_KEYS.flatMap(key => parseAccounts(localStorage.getItem(key))).map(normalize).filter(Boolean)
  const unique = migrated.filter((account, index, all) => all.findIndex(item => item.email === account.email && item.role === account.role) === index)
  if (unique.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
  return unique
}
const saveAccounts = accounts => localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.map(normalize).filter(Boolean)))
const identityFor = role => role === 'Consumer' ? 'Consumer User' : role

export default function DemoAuth({ onAuthenticated }) {
  const [view, setView] = useState('login')
  const [message, setMessage] = useState('')
  const [foundAccount, setFoundAccount] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'Consumer' })
  const update = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setMessage('') }
  const showLogin = message => { setView('login'); setFoundAccount(null); setForm(current => ({ ...current, password: '', confirmPassword: '' })); setMessage(message || '') }

  const register = () => {
    if (!form.name.trim() || !validEmail(form.email) || !form.password) return setMessage(!validEmail(form.email) ? 'Please enter a valid email address.' : 'Please complete all required fields.')
    if (form.password !== form.confirmPassword) return setMessage('Passwords do not match.')
    const accounts = readAccounts()
    const email = form.email.trim().toLowerCase()
    if (accounts.some(account => account.email === email && account.role === form.role)) return setMessage('An account with this email and role already exists.')
    saveAccounts([...accounts, { name: form.name.trim(), email, password: form.password, role: form.role }])
    showLogin('Account created. Please sign in.')
  }
  const login = () => {
    const email = form.email.trim().toLowerCase()
    const account = readAccounts().find(item => item.email === email && item.role === form.role)
    if (!account) return setMessage('No account found. Please create an account.')
    if (account.password !== form.password) return setMessage('Invalid email, password, or role.')
    onAuthenticated?.({ name: account.name, role: account.role, identity: identityFor(account.role) })
  }
  const findForReset = () => {
    const account = readAccounts().find(item => item.email === form.email.trim().toLowerCase() && item.role === form.role)
    if (!account) return setMessage('No account found. Please check your email and role.')
    setFoundAccount(account); setView('reset'); setMessage('')
  }
  const resetPassword = () => {
    if (!form.password) return setMessage('Please enter a new password.')
    if (form.password !== form.confirmPassword) return setMessage('Passwords do not match.')
    const accounts = readAccounts().map(item => item.email === foundAccount.email && item.role === foundAccount.role ? { ...item, password: form.password } : item)
    saveAccounts(accounts)
    showLogin('Password reset successfully. Please sign in.')
  }
  const submit = event => { event.preventDefault(); if (view === 'register') register(); else if (view === 'forgot') findForReset(); else if (view === 'reset') resetPassword(); else login() }
  const labels = { login: ['WELCOME BACK', 'Sign in to your workspace'], register: ['CREATE WORKSPACE', 'Create your account'], forgot: ['PASSWORD RESET', 'Find your account'], reset: ['PASSWORD RESET', 'Choose a new password'] }

  return <div className="login">
    <section className="login-art"><div className="brand"><i>⌁</i><span><b>Food Freshness</b><small>MONITORING PLATFORM</small></span></div><div><small>SMARTER FOOD OPERATIONS</small><h1>See freshness.<br /><em>Prevent waste.</em></h1><p>Bring inventory quality, storage conditions, and timely action into one clear workspace.</p></div></section>
    <section className="login-form"><form onSubmit={submit}>
      <small>{labels[view][0]}</small><h2>{labels[view][1]}</h2><p className="login-project-title">Food Freshness Monitoring Platform</p>
      {view === 'register' && <Field label="Full Name" value={form.name} onChange={update('name')} />}
      {view !== 'reset' && <Field label="Work email" type="email" value={form.email} onChange={update('email')} />}
      {view === 'login' && <Field label="Password" type="password" value={form.password} onChange={update('password')} />}
      {(view === 'register' || view === 'reset') && <Field label="New Password" type="password" value={form.password} onChange={update('password')} />}
      {(view === 'register' || view === 'reset') && <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} />}
      {view !== 'reset' && <label className="field">Role<select value={form.role} onChange={update('role')}>{ROLES.map(role => <option key={role}>{role}</option>)}</select></label>}
      {view === 'login' && <div className="options"><label><input type="checkbox" /> Remember me</label><button type="button" className="link" onClick={() => { setView('forgot'); setMessage('') }}>Forgot Password?</button></div>}
      {message && <p className="error">{message}</p>}
      <button className="button primary">{view === 'register' ? 'Register' : view === 'forgot' ? 'Find account' : view === 'reset' ? 'Reset password' : 'Sign In'} →</button>
      {view === 'login' && <p className="switch">Don't have an account? <button type="button" onClick={() => { setView('register'); setMessage('') }}>Create an account</button></p>}
      {view === 'register' && <p className="switch">Already have an account? <button type="button" onClick={() => showLogin()}>Sign in</button></p>}
      {(view === 'forgot' || view === 'reset') && <p className="switch"><button type="button" onClick={() => showLogin()}>Back to sign in</button></p>}
      <small className="demo">Frontend authentication is active; platform backend integration is pending.</small>
    </form></section>
  </div>
}

function Field({ label, type = 'text', value, onChange }) {
  return <label className="field">{label}<input type={type} value={value} onChange={onChange} /></label>
}
function validEmail(value) { return /^\S+@\S+\.\S+$/.test(value.trim()) }
