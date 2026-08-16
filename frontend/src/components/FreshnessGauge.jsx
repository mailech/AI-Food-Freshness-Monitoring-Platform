export default function FreshnessGauge({ score = 0, size = 140, label = 'Freshness' }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 85 ? '#00d2a0' : score >= 70 ? '#00cec9' : score >= 50 ? '#ffd43b' : score >= 30 ? '#ffa502' : '#ff4757'

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" width={size} height={size}>
        <circle className="gauge-track" cx={size/2} cy={size/2} r={radius} />
        <circle className="gauge-fill" cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div style={{marginTop: -size/2 - 20, display:'flex', flexDirection:'column', alignItems:'center'}}>
        <span className="gauge-text" style={{color}}>{Math.round(score)}%</span>
        <span className="gauge-label">{label}</span>
      </div>
      <div style={{height: size/2 - 10}} />
    </div>
  )
}
