export default function StorageMonitor({ conditions }) {
  if (!conditions?.length) return <div className="empty-state"><div className="empty-icon">🌡️</div><p>No storage data recorded</p></div>

  const latest = conditions[0]
  const gaugeColor = v => v ? 'var(--green)' : 'var(--red)'

  return (
    <div className="flex-col gap-16">
      <div className="grid-3">
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem',marginBottom:4}}>🌡️</div>
          <div style={{fontSize:'1.8rem',fontWeight:800}}>{latest.temperature}°C</div>
          <div style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Temperature</div>
          <div style={{marginTop:6}}>
            <span className={`badge ${latest.is_compliant ? 'badge-fresh' : 'badge-spoiled'}`}>
              {latest.is_compliant ? '✓ Compliant' : '✕ Non-compliant'}
            </span>
          </div>
        </div>
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem',marginBottom:4}}>💧</div>
          <div style={{fontSize:'1.8rem',fontWeight:800}}>{latest.humidity}%</div>
          <div style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Humidity</div>
        </div>
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:'2rem',marginBottom:4}}>📦</div>
          <div style={{fontSize:'1.1rem',fontWeight:600,marginTop:8}}>{latest.packaging_type}</div>
          <div style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>Packaging</div>
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead><tr><th>Date</th><th>Temp</th><th>Humidity</th><th>Packaging</th><th>Status</th></tr></thead>
          <tbody>
            {conditions.map(c => (
              <tr key={c.id}>
                <td style={{fontSize:'0.85rem'}}>{new Date(c.recorded_at).toLocaleString()}</td>
                <td>{c.temperature}°C</td>
                <td>{c.humidity}%</td>
                <td>{c.packaging_type}</td>
                <td><span className={`badge ${c.is_compliant ? 'badge-fresh' : 'badge-spoiled'}`}>{c.is_compliant ? 'Compliant' : 'Non-compliant'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
