import { useState, useEffect } from 'react'
import api from '../api/client'
import StorageMonitor from '../components/StorageMonitor'
import AlertBanner, { useToast } from '../components/AlertBanner'

export default function StoragePage() {
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [conditions, setConditions] = useState([])
  const [compliance, setCompliance] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [form, setForm] = useState({ temperature: 4, humidity: 60, packaging_type: 'Open', air_circulation: 'Normal', light_exposure: 'Dark' })
  const [tab, setTab] = useState('monitor')
  const { toasts, addToast, dismissToast } = useToast()

  useEffect(() => {
    api.get('/inventory/items').then(r => setItems(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedItem) {
      api.get(`/storage/conditions/${selectedItem}`).then(r => setConditions(r.data)).catch(() => {})
      api.get(`/storage/compliance/${selectedItem}`).then(r => setCompliance(r.data)).catch(() => {})
      api.get(`/storage/recommendations/${selectedItem}`).then(r => setRecommendations(r.data)).catch(() => {})
    }
  }, [selectedItem])

  const logCondition = async e => {
    e.preventDefault()
    if (!selectedItem) return addToast('Select a food item first', 'warning')
    try {
      await api.post('/storage/conditions', { ...form, food_item_id: selectedItem, storage_duration_hours: 0 })
      addToast('Storage condition logged!', 'success')
      const r = await api.get(`/storage/conditions/${selectedItem}`)
      setConditions(r.data)
      const c = await api.get(`/storage/compliance/${selectedItem}`)
      setCompliance(c.data)
    } catch (err) { addToast('Failed to log condition', 'error') }
  }

  return (
    <div className="page-container animate-in">
      <AlertBanner alerts={toasts} onDismiss={dismissToast} />
      <div className="page-header">
        <h1>🌡️ Storage Monitoring</h1>
        <p>Track and optimize storage conditions for your food items</p>
      </div>

      <div className="grid-2" style={{marginBottom:24,alignItems:'start'}}>
        <div className="glass-card">
          <h3 style={{marginBottom:12}}>Select Food Item</h3>
          <select className="input-field" style={{width:'100%',marginBottom:16}} value={selectedItem || ''} onChange={e => setSelectedItem(Number(e.target.value))}>
            <option value="">Choose an item...</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.category})</option>)}
          </select>

          <h3 style={{marginBottom:12}}>Log Storage Condition</h3>
          <form onSubmit={logCondition} className="flex-col gap-12">
            <div className="grid-2" style={{gap:12}}>
              <div className="input-group">
                <label>Temperature (°C)</label>
                <input className="input-field" type="number" step="0.1" value={form.temperature} onChange={e => setForm({...form, temperature: Number(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>Humidity (%)</label>
                <input className="input-field" type="number" step="0.1" min="0" max="100" value={form.humidity} onChange={e => setForm({...form, humidity: Number(e.target.value)})} />
              </div>
            </div>
            <div className="input-group">
              <label>Packaging Type</label>
              <select className="input-field" value={form.packaging_type} onChange={e => setForm({...form, packaging_type: e.target.value})}>
                {['Open','Wrapped','Sealed','Vacuum','Modified Atmosphere'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="grid-2" style={{gap:12}}>
              <div className="input-group">
                <label>Air Circulation</label>
                <select className="input-field" value={form.air_circulation} onChange={e => setForm({...form, air_circulation: e.target.value})}>
                  {['Poor','Normal','Good','Excellent'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Light Exposure</label>
                <select className="input-field" value={form.light_exposure} onChange={e => setForm({...form, light_exposure: e.target.value})}>
                  {['Dark','Low','Medium','High','Direct Sunlight'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Log Condition</button>
          </form>
        </div>

        <div className="flex-col gap-16">
          {compliance && compliance.is_compliant !== undefined && (
            <div className={`glass-card`} style={{borderLeft: `3px solid ${compliance.is_compliant ? 'var(--green)' : 'var(--red)'}`}}>
              <h3 style={{marginBottom:8}}>{compliance.is_compliant ? '✅ Storage Compliant' : '⚠️ Non-Compliant'}</h3>
              <div className="grid-2" style={{gap:8}}>
                <div><span style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Current Temp:</span> <strong>{compliance.current_temp}°C</strong></div>
                <div><span style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Optimal:</span> <strong>{compliance.optimal_temp}°C</strong></div>
                <div><span style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Current Humidity:</span> <strong>{compliance.current_humidity}%</strong></div>
                <div><span style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Optimal:</span> <strong>{compliance.optimal_humidity}%</strong></div>
              </div>
            </div>
          )}

          {recommendations && (
            <div className="glass-card">
              <h3 style={{marginBottom:12}}>💡 Recommendations</h3>
              <div className="flex-col gap-8">
                {recommendations.recommendations?.map((r, i) => (
                  <div key={i} className="recommendation-card"><p style={{fontSize:'0.88rem',color:'var(--text-secondary)',margin:0}}>{r}</p></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedItem && <StorageMonitor conditions={conditions} />}
    </div>
  )
}
