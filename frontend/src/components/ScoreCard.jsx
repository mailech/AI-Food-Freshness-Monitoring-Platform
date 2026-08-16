export default function ScoreCard({ icon, value, label, color = 'accent', trend }) {
  return (
    <div className={`stat-card ${color}`}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trend !== undefined && (
        <div style={{marginTop:8,fontSize:'0.8rem',color: trend >= 0 ? 'var(--green)' : 'var(--red)'}}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}
