import { useState, useEffect } from 'react'
import api from '../api/client'
import ImageUploader from '../components/ImageUploader'
import FreshnessGauge from '../components/FreshnessGauge'
import AlertBanner, { useToast } from '../components/AlertBanner'

const FOOD_NAMES = ['Apple','Banana','Bellpepper','Bitter Gourd','Carrot','Cucumber','Grapes','Guava','Jujube','Kaki','Lime','Mango','Orange','Pomegranate','Potato','Strawberry','Tomato','Watermelon','Milk','Chicken','Salmon','Bread']

export default function AnalysisPage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [foodName, setFoodName] = useState('Apple')
  const [ageDays, setAgeDays] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('analyze')
  const { toasts, addToast, dismissToast } = useToast()

  useEffect(() => { loadHistory() }, [])

  const loadHistory = () => {
    api.get('/analysis/history?limit=20').then(r => setHistory(r.data)).catch(() => {})
  }

  const handleFileSelect = f => {
    if (f) {
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setResult(null)
    } else {
      setFile(null)
      setPreview(null)
    }
  }

  const analyze = async () => {
    if (!file) return addToast('Please upload an image first', 'warning')
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('food_name', foodName)
    form.append('product_age_days', ageDays)
    try {
      const res = await api.post('/analysis/upload', form)
      setResult(res.data)
      addToast('Analysis completed successfully!', 'success')
      loadHistory()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Analysis failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container animate-in">
      <AlertBanner alerts={toasts} onDismiss={dismissToast} />
      <div className="page-header">
        <h1>🔬 Food Analysis</h1>
        <p>Upload a food image for AI-powered freshness detection</p>
      </div>

      <div className="tab-bar">
        <button className={`tab-item${tab === 'analyze' ? ' active' : ''}`} onClick={() => setTab('analyze')}>New Analysis</button>
        <button className={`tab-item${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>History ({history.length})</button>
      </div>

      {tab === 'analyze' && (
        <div className="analysis-result" style={{marginTop:0}}>
          <div className="analysis-left">
            <div className="glass-card">
              <h3 style={{marginBottom:16}}>Upload Food Image</h3>
              <ImageUploader onFileSelect={handleFileSelect} preview={preview} />
              <div style={{marginTop:16}} className="flex-col gap-12">
                <div className="input-group">
                  <label>Food Type</label>
                  <select className="input-field" value={foodName} onChange={e => setFoodName(e.target.value)}>
                    {FOOD_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Product Age (days)</label>
                  <input className="input-field" type="number" min="0" max="365" value={ageDays} onChange={e => setAgeDays(Number(e.target.value))} />
                </div>
                <button className="btn btn-primary btn-lg" onClick={analyze} disabled={loading || !file} style={{width:'100%'}}>
                  {loading ? <><span className="spinner" /> Analyzing...</> : '🔬 Analyze Freshness'}
                </button>
              </div>
            </div>
          </div>

          <div className="analysis-right">
            {result ? (
              <>
                <div className="glass-card" style={{textAlign:'center'}}>
                  <FreshnessGauge score={result.freshness_score} size={160} />
                  <div style={{marginTop:8}}>
                    <span className={`badge badge-${result.quality_class.toLowerCase().replace(' ','-')}`} style={{fontSize:'0.9rem',padding:'6px 16px'}}>
                      {result.quality_class}
                    </span>
                  </div>
                  <div style={{marginTop:8,fontSize:'0.85rem',color:'var(--text-secondary)'}}>
                    Confidence: {result.confidence}% · Risk: <span className={`badge badge-${result.risk_level.toLowerCase()}`}>{result.risk_level}</span>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{marginBottom:12}}>Score Breakdown</h3>
                  <div className="score-breakdown">
                    <ScoreBar label="Color Analysis" value={result.color_score} />
                    <ScoreBar label="Texture Analysis" value={result.texture_score} />
                    <ScoreBar label="Spoilage Probability" value={result.spoilage_probability} invert />
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{marginBottom:12}}>Detection Results</h3>
                  <div className="detection-grid">
                    <DetectionItem label="Mold" detected={result.mold_detected} />
                    <DetectionItem label="Bruising" detected={result.bruising_detected} />
                    <DetectionItem label="Damage" detected={result.damage_detected} />
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{marginBottom:12}}>📦 Shelf Life & Recommendations</h3>
                  <div className="recommendation-card" style={{marginBottom:12}}>
                    <h4>⏱️ Shelf Life</h4>
                    <p style={{fontSize:'1.1rem',fontWeight:700,color:'var(--text-primary)'}}>{result.shelf_life_text}</p>
                  </div>
                  <div className="recommendation-card" style={{marginBottom:12}}>
                    <h4>🌡️ Storage</h4>
                    <p style={{fontSize:'0.88rem',color:'var(--text-secondary)'}}>{result.storage_recommendation}</p>
                  </div>
                  <div className="recommendation-card">
                    <h4>🍽️ Consumption</h4>
                    <p style={{fontSize:'0.88rem',color:'var(--text-secondary)'}}>{result.consumption_recommendation}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card empty-state">
                <div className="empty-icon">📸</div>
                <p>Upload a food image and click Analyze to see results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="glass-card">
          {history.length ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Food</th><th>Category</th><th>Score</th><th>Quality</th><th>Risk</th><th>Shelf Life</th><th>Date</th></tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{fontWeight:600}}>{h.food_name}</td>
                      <td style={{color:'var(--text-secondary)'}}>{h.food_category}</td>
                      <td><span style={{fontWeight:700,color:h.freshness_score >= 70 ? 'var(--green)' : h.freshness_score >= 50 ? 'var(--yellow)' : 'var(--red)'}}>{h.freshness_score}%</span></td>
                      <td><span className={`badge badge-${h.quality_class.toLowerCase().replace(' ','-')}`}>{h.quality_class}</span></td>
                      <td><span className={`badge badge-${h.risk_level.toLowerCase()}`}>{h.risk_level}</span></td>
                      <td style={{fontSize:'0.85rem'}}>{h.shelf_life_text}</td>
                      <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(h.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state"><div className="empty-icon">📋</div><p>No analysis history yet</p></div>}
        </div>
      )}
    </div>
  )
}

function ScoreBar({ label, value, invert = false }) {
  const color = invert
    ? (value < 30 ? 'var(--green)' : value < 60 ? 'var(--yellow)' : 'var(--red)')
    : (value >= 70 ? 'var(--green)' : value >= 50 ? 'var(--yellow)' : 'var(--red)')
  return (
    <div className="score-item">
      <div className="flex-between"><span style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{label}</span><span style={{fontSize:'0.82rem',fontWeight:600}}>{Math.round(value)}%</span></div>
      <div className="score-bar"><div className="score-bar-fill" style={{width:`${value}%`,background:color}} /></div>
    </div>
  )
}

function DetectionItem({ label, detected }) {
  return (
    <div className={`detection-item${detected ? ' detected' : ''}`}>
      <div className="status-icon">{detected ? '⚠️' : '✅'}</div>
      <div className="status-label">{label}</div>
      <div style={{fontSize:'0.72rem',color: detected ? 'var(--red-light)' : 'var(--green)',fontWeight:600,marginTop:2}}>
        {detected ? 'Detected' : 'Clear'}
      </div>
    </div>
  )
}
