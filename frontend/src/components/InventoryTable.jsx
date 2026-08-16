const qualityBadge = q => {
  const map = { Fresh:'badge-fresh', Good:'badge-good', Acceptable:'badge-acceptable', 'Near Spoilage':'badge-near-spoilage', Spoiled:'badge-spoiled' }
  return map[q] || 'badge-good'
}

const riskBadge = r => {
  const map = { Low:'badge-low', Medium:'badge-medium', High:'badge-high', Critical:'badge-critical' }
  return map[r] || 'badge-low'
}

export default function InventoryTable({ items, onDelete, onAnalyze }) {
  if (!items?.length) return <div className="empty-state"><div className="empty-icon">📦</div><p>No items in inventory yet</p></div>

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Quantity</th><th>Added</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td style={{fontWeight:600}}>{item.name}</td>
              <td><span className="badge badge-good">{item.category}</span></td>
              <td>{item.quantity} {item.unit}</td>
              <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{new Date(item.created_at).toLocaleDateString()}</td>
              <td>
                <div className="flex gap-8">
                  {onAnalyze && <button className="btn btn-primary btn-sm" onClick={() => onAnalyze(item)}>🔬 Analyze</button>}
                  {onDelete && <button className="btn btn-danger btn-sm" onClick={() => onDelete(item.id)}>🗑️</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { qualityBadge, riskBadge }
