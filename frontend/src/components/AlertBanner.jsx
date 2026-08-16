import { useState, useEffect } from 'react'

export default function AlertBanner({ alerts, onDismiss }) {
  if (!alerts?.length) return null
  return (
    <div className="toast-container">
      {alerts.map((alert, i) => (
        <div key={i} className={`toast ${alert.type || 'info'}`}>
          <span>{alert.type === 'error' ? '❌' : alert.type === 'success' ? '✅' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
          <div style={{flex:1}}>
            {alert.title && <div style={{fontWeight:600,fontSize:'0.88rem'}}>{alert.title}</div>}
            <div style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{alert.message}</div>
          </div>
          {onDismiss && <button className="btn-ghost" onClick={() => onDismiss(i)} style={{padding:4,fontSize:'0.8rem'}}>✕</button>}
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState([])
  const addToast = (message, type = 'info', title = '') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, title }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }
  const dismissToast = idx => setToasts(prev => prev.filter((_, i) => i !== idx))
  return { toasts, addToast, dismissToast }
}
