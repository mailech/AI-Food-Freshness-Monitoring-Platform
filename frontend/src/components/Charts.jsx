import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6c5ce7','#00d2a0','#ffd43b','#ffa502','#ff4757','#00cec9','#3498db','#a29bfe']

const customTooltipStyle = { backgroundColor: '#16163a', border: '1px solid rgba(108,92,231,0.3)', borderRadius: '8px', color: '#e8e8f0', fontSize: '0.85rem' }

export function FreshnessLineChart({ data, dataKey = 'score', xKey = 'date', height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={xKey} stroke="#6868a0" fontSize={12} />
        <YAxis stroke="#6868a0" fontSize={12} domain={[0,100]} />
        <Tooltip contentStyle={customTooltipStyle} />
        <Line type="monotone" dataKey={dataKey} stroke="#6c5ce7" strokeWidth={2} dot={{fill:'#6c5ce7',r:4}} activeDot={{r:6}} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function CategoryBarChart({ data, height = 300 }) {
  const chartData = Object.entries(data || {}).map(([name, value]) => ({ name, value }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" stroke="#6868a0" fontSize={11} />
        <YAxis stroke="#6868a0" fontSize={12} />
        <Tooltip contentStyle={customTooltipStyle} />
        <Bar dataKey="value" radius={[4,4,0,0]}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function QualityPieChart({ data, height = 300 }) {
  const chartData = Object.entries(data || {}).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
  const colorMap = { Fresh:'#00d2a0', Good:'#00cec9', Acceptable:'#ffd43b', 'Near Spoilage':'#ffa502', Spoiled:'#ff4757' }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
          {chartData.map((d, i) => <Cell key={i} fill={colorMap[d.name] || COLORS[i]} />)}
        </Pie>
        <Tooltip contentStyle={customTooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{fontSize:'0.82rem',color:'#9898b8'}} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TrendAreaChart({ data, dataKey = 'avg_score', xKey = 'date', height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={xKey} stroke="#6868a0" fontSize={12} />
        <YAxis stroke="#6868a0" fontSize={12} />
        <Tooltip contentStyle={customTooltipStyle} />
        <Area type="monotone" dataKey={dataKey} stroke="#6c5ce7" fill="rgba(108,92,231,0.15)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
