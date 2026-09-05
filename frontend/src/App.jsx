import { useState } from 'react'
import DemoAuth from './components/DemoAuth'
import './App.css'
import './Analysis.css'
import './ShelfLife.css'
import './Storage.css'
import './Recommendations.css'
import './Alerts.css'

const allPages = [
  ['dashboard', 'Dashboard', '▦'], ['inventory', 'Inventory', '□'],
  ['analysis', 'Freshness Analysis', '◔'], ['shelfLife', 'Shelf-Life Prediction', '◷'], ['storage', 'Storage Monitoring', '♧'], ['recommendations', 'Recommendations', '✦'],
  ['alerts', 'Alerts & Notifications', '!'], ['reports', 'Reports & Export', '▤'], ['profile', 'Profile', '◉'],
]
const items = [
  ['Strawberries', 'Fruits', 'ST-2408', '48 kg', 92, 'Cold room A', '🍓'],
  ['Whole milk', 'Dairy', 'ML-1182', '120 L', 77, 'Cold room B', '🥛'],
  ['Atlantic salmon', 'Seafood', 'SF-9014', '36 kg', 61, 'Cold room A', '🐟'],
]
const alerts = [['Critical', 'Shelf-life warning: chicken batch', '12 min ago'], ['Warning', 'Cold room A needs review', '34 min ago'], ['Normal', 'Fresh batch ready for dispatch', '1 hour ago']]
const category = score => score >= 85 ? ['Fresh', 'success'] : score >= 70 ? ['Good', 'success'] : score >= 50 ? ['Acceptable', 'warning'] : score >= 35 ? ['Near Spoilage', 'warning'] : ['Spoiled', 'danger']
const allowedFor = role => {
  if (role === 'Consumer') return ['dashboard', 'inventory', 'analysis', 'shelfLife', 'alerts', 'recommendations', 'profile']
  if (role === 'Food Quality Inspector') return ['dashboard', 'inventory', 'analysis', 'shelfLife', 'alerts', 'recommendations', 'reports', 'profile']
  return allPages.map(([id]) => id)
}

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [open, setOpen] = useState(false)
  if (!session) return <DemoAuth onAuthenticated={account => { setSession(account); setPage('dashboard') }} />

  const visible = allPages.filter(([id]) => allowedFor(session.role).includes(id))
  const current = allPages.find(([id]) => id === page)?.[1] || 'Dashboard'
  const navigate = id => { setPage(id); setOpen(false) }
  return <div className="shell">
    <aside className={open ? 'open' : ''}>
      <div className="sidebrand"><Brand /><button onClick={() => setOpen(false)}>×</button></div>
      <small className="navlabel">{session.role} WORKSPACE</small>
      <nav>{visible.map(([id, label, icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><b>{icon}</b>{label}</button>)}</nav>
      <div className="sidefoot"><button onClick={() => setSession(null)}>↪ Sign out</button></div>
    </aside>
    {open && <button className="overlay" onClick={() => setOpen(false)} />}
    <main><header><button className="hamb" onClick={() => setOpen(true)}>☰</button><div><p>Food Freshness Monitoring Platform / {current}</p><h2>{current}</h2></div><div className="person"><span>{session.identity[0]}</span><b>{session.identity}<small>{session.role}</small></b></div></header>
      <div className="content">
        {page === 'dashboard' && <Dashboard role={session.role} />}
        {page === 'inventory' && <Inventory />}
        {page === 'analysis' && <AnalysisPage />}
        {page === 'shelfLife' && <ShelfLife />}
        {page === 'storage' && <StorageMonitoring />}
        {page === 'recommendations' && <Recommendations />}
        {page === 'alerts' && <AlertsNotifications />}
        {page === 'reports' && <Reports />}
        {page === 'profile' && <Profile identity={session.identity} role={session.role} />}
      </div>
    </main>
  </div>
}

function Brand() { return <div className="brand"><i>⌁</i><span><b>Food Freshness</b><small>MONITORING PLATFORM</small></span></div> }
function Panel({ title, text, children }) { return <section className="panel"><div className="panel-head"><div><h3>{title}</h3><p>{text}</p></div></div>{children}</section> }
function Badge({ score }) { const [label, tone] = category(score); return <em className={'badge ' + tone}>{label}</em> }
function Title({ title, text }) { return <div className="heading"><div><small>FOOD FRESHNESS MONITORING PLATFORM</small><h1>{title}</h1><p>{text}</p></div></div> }
function Line({ item }) { return <div className="line"><i>{item[6]}</i><span><b>{item[0]}</b><small>{item[2]} · {item[3]}</small></span><Badge score={item[4]} /></div> }

function Dashboard({ role }) {
  const roleCopy = {
    Consumer: 'Freshness reports, shelf-life estimates, inventory and storage recommendations.',
    'Retail Manager': 'Inventory quality, freshness trends, shelf-life alerts and waste-reduction insights.',
    'Warehouse Operator': 'Storage compliance, environmental analytics and batch freshness health.',
    'Food Quality Inspector': 'Image freshness assessment, quality classification and spoilage indicators.',
    Administrator: 'Platform analytics, reporting management and platform-level alerts.',
  }
  return <><div className="heading"><div><small>{role.toUpperCase()}</small><h1>Food freshness overview</h1><p>{roleCopy[role]}</p></div></div>
    <div className="metrics">{[['⌁', 'Overall freshness', '86.4%'], ['□', 'Inventory health', '248'], ['!', 'Open alerts', '18'], ['♧', 'Storage zones', '6 / 6']].map(entry => <article className="metric" key={entry[1]}><i>{entry[0]}</i><div><p>{entry[1]}</p><h3>{entry[2]}</h3><small>Current overview</small></div></article>)}</div>
    <div className="grid"><Panel title="Freshness distribution" text="Freshness scoring: Visual 40% · Storage 25% · Shelf-life 20% · Product age 15%"><div className="fresh"><div className="ring"><b>86</b><small>out of 100</small></div><div className="signal"><span>Freshness trend</span><b>Improving</b></div></div></Panel><Panel title="Recent inventory" text="Latest batches">{items.map(item => <Line item={item} key={item[2]} />)}</Panel></div>
  </>
}
const FOOD_CATEGORIES = ['Fruits', 'Vegetables', 'Dairy', 'Meat & Poultry', 'Seafood', 'Bakery', 'Packaged Foods', 'Beverages']
const UNITS = ['kg', 'g', 'L', 'mL', 'Units', 'Packs', 'Boxes']
const dateOffset = days => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10) }
const inventorySeed = () => [
  { id: 1, name: 'Strawberries', category: 'Fruits', batchId: 'FR-2408', quantity: '48', unit: 'kg', location: 'Cold Room A', addedDate: dateOffset(-2), expiryDate: dateOffset(4) },
  { id: 2, name: 'Whole Milk', category: 'Dairy', batchId: 'DY-1182', quantity: '120', unit: 'L', location: 'Cold Room B', addedDate: dateOffset(-3), expiryDate: dateOffset(2) },
  { id: 3, name: 'Atlantic Salmon', category: 'Seafood', batchId: 'SF-9014', quantity: '36', unit: 'kg', location: 'Cold Room A', addedDate: dateOffset(-1), expiryDate: dateOffset(-1) },
  { id: 4, name: 'Wholegrain Bread', category: 'Bakery', batchId: 'BK-3610', quantity: '24', unit: 'Packs', location: 'Dry Store', addedDate: dateOffset(0), expiryDate: dateOffset(5) },
]
const itemStatus = expiryDate => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${expiryDate}T00:00:00`)
  const days = Math.ceil((expiry - today) / 86400000)
  return days < 0 ? 'Expired' : days <= 3 ? 'Near Expiry' : 'Fresh'
}
const emptyInventoryItem = () => ({ name: '', category: 'Fruits', batchId: '', quantity: '', unit: 'kg', location: '', addedDate: dateOffset(0), expiryDate: dateOffset(7) })

function Inventory() {
  const [inventory, setInventory] = useState(inventorySeed)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyInventoryItem)
  const openAdd = () => { setEditing(null); setForm(emptyInventoryItem()); setFormOpen(true) }
  const openEdit = item => { setEditing(item.id); setForm({ ...item }); setFormOpen(true) }
  const closeForm = () => { setEditing(null); setForm(emptyInventoryItem()); setFormOpen(false) }
  const saveItem = event => {
    event.preventDefault()
    if (editing) setInventory(current => current.map(item => item.id === editing ? { ...form, id: editing } : item))
    else setInventory(current => [...current, { ...form, id: Date.now() }])
    closeForm()
  }
  const filtered = inventory.filter(item => {
    const matchesQuery = [item.name, item.batchId, item.location].some(value => value.toLowerCase().includes(query.toLowerCase()))
    return matchesQuery && (categoryFilter === 'All categories' || item.category === categoryFilter) && (statusFilter === 'All statuses' || itemStatus(item.expiryDate) === statusFilter)
  })
  return <>
    <div className="heading inventory-heading"><div><small>INVENTORY MANAGEMENT</small><h1>Inventory Management</h1><p>Manage food items, batches, quantities, storage locations and expiry information.</p></div><button className="button primary" onClick={openAdd}>+ Add Food Item</button></div>
    <div className="tools inventory-tools"><input aria-label="Search inventory" placeholder="Search items, batch ID or location..." value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All categories</option>{FOOD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All statuses</option><option>Fresh</option><option>Near Expiry</option><option>Expired</option></select></div>
    <Panel title="Food inventory" text={`${filtered.length} item${filtered.length === 1 ? '' : 's'} shown`}><div className="table inventory-table"><table><thead><tr><th>Item Name</th><th>Category</th><th>Batch ID</th><th>Quantity</th><th>Unit</th><th>Storage Location</th><th>Added Date</th><th>Expiry Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.length ? filtered.map(item => { const status = itemStatus(item.expiryDate); return <tr key={item.id}><td><b>{item.name}</b></td><td>{item.category}</td><td>{item.batchId}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{item.location}</td><td>{item.addedDate}</td><td>{item.expiryDate}</td><td><em className={'badge ' + (status === 'Fresh' ? 'success' : status === 'Near Expiry' ? 'warning' : 'danger')}>{status}</em></td><td className="inventory-actions"><button className="link" onClick={() => openEdit(item)}>Edit</button><button className="link delete" onClick={() => setInventory(current => current.filter(entry => entry.id !== item.id))}>Delete</button></td></tr> }) : <tr><td className="empty-inventory" colSpan="10">No inventory items match your search or filters.</td></tr>}</tbody></table></div></Panel>
    {formOpen && <div className="modal-backdrop" onMouseDown={closeForm}><section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="item-form-title" onMouseDown={event => event.stopPropagation()}><div className="modal-title"><div><small>INVENTORY ITEM</small><h2 id="item-form-title">{editing ? 'Edit Food Item' : 'Add Food Item'}</h2></div><button className="modal-close" type="button" onClick={closeForm} aria-label="Close form">×</button></div><form className="inventory-form" onSubmit={saveItem}><FormField label="Item Name"><input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></FormField><FormField label="Category"><select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))}>{FOOD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></FormField><FormField label="Batch ID"><input required value={form.batchId} onChange={event => setForm(current => ({ ...current, batchId: event.target.value }))} /></FormField><FormField label="Quantity"><input required min="0" step="any" type="number" value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))} /></FormField><FormField label="Unit"><select value={form.unit} onChange={event => setForm(current => ({ ...current, unit: event.target.value }))}>{UNITS.map(unit => <option key={unit}>{unit}</option>)}</select></FormField><FormField label="Storage Location"><input required value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} /></FormField><FormField label="Added Date"><input required type="date" value={form.addedDate} onChange={event => setForm(current => ({ ...current, addedDate: event.target.value }))} /></FormField><FormField label="Expiry Date"><input required type="date" value={form.expiryDate} onChange={event => setForm(current => ({ ...current, expiryDate: event.target.value }))} /></FormField><div className="form-actions"><button type="button" className="button secondary" onClick={closeForm}>Cancel</button><button className="button primary">{editing ? 'Save Changes' : 'Add Item'}</button></div></form></section></div>}
  </>
}
function FormField({ label, children }) { return <label className="inventory-field"><span>{label}</span>{children}</label> }
const initialAnalysisHistory = [
  { id: 1, name: 'Strawberries', category: 'Fruits', score: '91%', classification: 'Fresh', time: 'Earlier today' },
  { id: 2, name: 'Whole Milk', category: 'Dairy', score: '72%', classification: 'Good', time: 'Yesterday' },
  { id: 3, name: 'Atlantic Salmon', category: 'Seafood', score: '43%', classification: 'Near Spoilage', time: '2 days ago' },
]
const analysisTone = classification => classification === 'Fresh' || classification === 'Good' ? 'success' : classification === 'Acceptable' || classification === 'Near Spoilage' ? 'warning' : 'danger'

function AnalysisPage() {
  const [image, setImage] = useState(null)
  const [productName, setProductName] = useState('')
  const [foodCategory, setFoodCategory] = useState('Fruits')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(initialAnalysisHistory)
  const [uploadError, setUploadError] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const selectImage = file => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setUploadError('Please select a supported image file.'); return }
    const reader = new FileReader()
    reader.onload = event => { setImage({ name: file.name, preview: event.target.result }); setResult(null); setUploadError(''); setValidationMessage('') }
    reader.readAsDataURL(file)
  }
  const analyze = () => {
    if (!productName.trim()) { setValidationMessage('Please enter the food or product name.'); return }
    if (!image) { setValidationMessage('Please select a food image.'); return }
    const mockResult = { score: '87%', classification: 'Fresh', probability: '8%', quality: 'Good' }
    setValidationMessage('')
    setResult(mockResult)
    setHistory(current => [{ id: Date.now(), name: productName.trim() || image.name.replace(/\.[^/.]+$/, ''), category: foodCategory, score: mockResult.score, classification: mockResult.classification, time: 'Just now' }, ...current])
  }
  const reset = () => { setImage(null); setProductName(''); setFoodCategory('Fruits'); setResult(null); setUploadError(''); setValidationMessage('') }
  return <>
    <Title title="Freshness Analysis" text="Analyze food images to assess freshness, quality, and potential spoilage." />
    <div className="analysis-note">Upload a clear, well-lit food image to support a complete freshness assessment.</div>
    <div className="analysis-workspace">
      <Panel title="Food image" text="Upload a clear image for a visual freshness assessment."><div className={'upload-zone ' + (image ? 'has-image' : '')} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); selectImage(event.dataTransfer.files[0]) }}>{image ? <div className="image-preview"><img src={image.preview} alt="Selected food preview" /><div><b>{image.name}</b><small>Image selected and ready for assessment.</small><div><label className="link change-image" htmlFor="food-image">Change image</label><button className="link delete" onClick={() => { setImage(null); setResult(null); setValidationMessage('') }}>Remove image</button></div></div></div> : <><i>↑</i><b>Drag and drop a food image here</b><small>Supported formats: JPG, PNG and WEBP</small><label className="button secondary" htmlFor="food-image">Choose Image</label></>}<input id="food-image" type="file" accept="image/jpeg,image/png,image/webp" onClick={event => { event.currentTarget.value = '' }} onChange={event => selectImage(event.target.files[0])} /></div>{uploadError && <p className="upload-error">{uploadError}</p>}</Panel>
      <Panel title="Food information" text="Add details to identify this analysis."><div className="analysis-fields"><FormField label="Food/Product Name"><input placeholder="e.g. Strawberries" value={productName} onChange={event => { setProductName(event.target.value); setValidationMessage('') }} /></FormField><FormField label="Category"><select value={foodCategory} onChange={event => setFoodCategory(event.target.value)}>{FOOD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></FormField></div><button className="button primary analyze-button" disabled={!image || !productName.trim()} onClick={analyze}>Analyze Freshness</button>{validationMessage ? <p className="upload-error">{validationMessage}</p> : (!image || !productName.trim()) && <small className="button-hint">Enter a product name and select an image to begin.</small>}</Panel>
    </div>
    {result && <section className="analysis-results"><div className="analysis-results-heading"><div><small>FRESHNESS ASSESSMENT</small><h2>Freshness Assessment</h2><p>Product: {productName.trim()}</p></div><button className="button secondary" onClick={reset}>New Analysis</button></div><div className="result-grid"><article className="result-score"><span>Freshness Score</span><b>{result.score}</b><em className={'badge ' + analysisTone(result.classification)}>{result.classification}</em></article><article className="result-stat"><span>Quality classification</span><b>{result.classification}</b><small>Quality: {result.quality}</small></article><article className="result-stat"><span>Spoilage probability</span><b>{result.probability}</b><small>Low risk</small></article></div><div className="visual-indicators"><h3>Visual analysis indicators</h3><div className="indicator-grid"><Indicator name="Colour condition" result="Vibrant and consistent" tone="success" /><Indicator name="Surface texture" result="Firm, even texture" tone="success" /><Indicator name="Mold/spoilage indicators" result="No visible indicators" tone="success" /><Indicator name="Bruising" result="No significant marks" tone="warning" /><Indicator name="Physical damage" result="No visible damage" tone="success" /></div></div><div className="analysis-summary"><b>Assessment summary</b><p>The visual profile indicates a fresh item with consistent colour and surface texture.</p></div></section>}
    <Panel title="Analysis history" text="Recent food image assessments."><div className="analysis-history">{history.slice(0, 4).map(entry => <div className="history-row" key={entry.id}><div><b>{entry.name}</b><small>{entry.category} · {entry.time}</small></div><strong>{entry.score}</strong><em className={'badge ' + analysisTone(entry.classification)}>{entry.classification}</em></div>)}</div></Panel>
  </>
}
function Indicator({ name, result, tone }) { return <article className="indicator"><i className={tone}>●</i><span><b>{name}</b><small>{result}</small></span></article> }
const initialShelfLifeHistory = [
  { id: 1, name: 'Strawberries', batch: 'FR-2408', remaining: '4 days', risk: 'Medium Risk', time: 'Today' },
  { id: 2, name: 'Whole Milk', batch: 'DY-1182', remaining: '6 days', risk: 'Low Risk', time: 'Yesterday' },
  { id: 3, name: 'Atlantic Salmon', batch: 'SF-9014', remaining: '2 days', risk: 'High Risk', time: '2 days ago' },
]
const emptyShelfLifeForm = () => ({ name: '', category: '', batch: '', duration: '', temperature: '', humidity: '', packaging: '', freshnessScore: '', freshnessClassification: '', spoilageProbability: '' })
const riskTone = risk => risk === 'Low Risk' ? 'success' : risk === 'Medium Risk' ? 'warning' : 'danger'
const forecastDate = days => { const date = new Date(); date.setDate(date.getDate() + days); return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) }
const storageCondition = ({ temperature, humidity, air, light }) => {
  const temperatureAlert = Number(temperature) > 5 || Number(temperature) < 2
  const humidityAlert = Number(humidity) > 70 || Number(humidity) < 50
  const airAlert = air === 'Limited' || air === 'Poor'
  const lightAlert = light === 'Moderate' || light === 'High'
  const issues = [temperatureAlert, humidityAlert, airAlert, lightAlert].filter(Boolean).length
  const status = issues >= 3 ? 'Critical' : issues >= 2 ? 'Warning' : issues === 1 ? 'Acceptable' : 'Optimal'
  return { temperature: temperatureAlert ? 'Review required' : 'Within range', humidity: humidityAlert ? 'Review required' : 'Within range', air: airAlert ? 'Review required' : 'Good', light: lightAlert ? 'Review required' : 'Low', status, issues }
}
const initialStorageForm = () => ({ temperature: '4', humidity: '65', air: 'Good', light: 'Low', duration: '3' })
const storageTone = status => status === 'Optimal' || status === 'Within range' || status === 'Good' || status === 'Low' ? 'success' : status === 'Acceptable' || status === 'Warning' ? 'warning' : 'danger'
const initialRecommendations = [
  { id: 1, area: 'Storage', title: 'Review storage conditions for Atlantic Salmon', text: 'Review environmental conditions that may affect freshness and shelf life.', priority: 'High', status: 'New', context: 'Storage' },
  { id: 2, area: 'Consumption', title: 'Prioritize whole milk for consumption', text: 'Consume products with shorter remaining shelf life first.', priority: 'High', status: 'In Progress', context: 'Expiry' },
  { id: 3, area: 'Inventory Rotation', title: 'Rotate the dairy inventory', text: 'Move older batches ahead of newer inventory during the next stock review.', priority: 'Medium', status: 'New', context: 'Inventory' },
  { id: 4, area: 'Waste Reduction', title: 'Review items approaching spoilage', text: 'Identify items requiring timely action to reduce avoidable food waste.', priority: 'Medium', status: 'New', context: 'Freshness' },
  { id: 5, area: 'Quality Improvement', title: 'Maintain regular freshness checks', text: 'Monitor freshness regularly and review visible spoilage indicators.', priority: 'Low', status: 'Completed', context: 'Freshness' },
]
const priorityTone = priority => priority === 'High' ? 'danger' : priority === 'Medium' ? 'warning' : 'success'
const initialAlerts = [
  { id: 1, category: 'Freshness', title: 'Freshness review required', description: 'Review the latest freshness assessment for the affected product.', related: 'Strawberries · Batch FR-2408', priority: 'High', time: 'Today, 10:24 AM', read: false, dismissed: false, action: 'Review freshness' },
  { id: 2, category: 'Shelf Life', title: 'Shelf life approaching', description: 'Review the remaining shelf life and prioritize the affected item.', related: 'Whole Milk · Batch DY-1182', priority: 'High', time: 'Today, 9:12 AM', read: false, dismissed: false, action: 'Review shelf life' },
  { id: 3, category: 'Spoilage', title: 'Possible spoilage risk', description: 'Inspect the affected food item for spoilage indicators.', related: 'Atlantic Salmon · Batch SF-9014', priority: 'Medium', time: 'Yesterday, 4:35 PM', read: false, dismissed: false, action: 'Inspect product' },
  { id: 4, category: 'Storage', title: 'Storage condition requires attention', description: 'Review the current storage conditions for the affected area.', related: 'Cold Room A', priority: 'Medium', time: 'Yesterday, 2:18 PM', read: true, dismissed: false, action: 'Review storage conditions' },
  { id: 5, category: 'Inventory', title: 'Inventory requires attention', description: 'Review items approaching expiry and plan inventory rotation.', related: 'Bakery inventory', priority: 'Low', time: '02 Sep 2026, 11:05 AM', read: true, dismissed: false, action: 'Review inventory' },
]

function AlertsNotifications() {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [readFilter, setReadFilter] = useState('All')
  const [showDismissed, setShowDismissed] = useState(false)
  const [selected, setSelected] = useState(null)
  const activeAlerts = alerts.filter(alert => !alert.dismissed)
  const summary = { total: activeAlerts.length, high: activeAlerts.filter(alert => alert.priority === 'High').length, medium: activeAlerts.filter(alert => alert.priority === 'Medium').length, low: activeAlerts.filter(alert => alert.priority === 'Low').length, unread: activeAlerts.filter(alert => !alert.read).length }
  const filtered = alerts.filter(alert => {
    const matchesSearch = [alert.title, alert.description, alert.related, alert.category].some(value => value.toLowerCase().includes(search.toLowerCase()))
    return alert.dismissed === showDismissed && matchesSearch && (categoryFilter === 'All' || alert.category === categoryFilter) && (priorityFilter === 'All' || alert.priority === priorityFilter) && (readFilter === 'All' || (readFilter === 'Read' ? alert.read : !alert.read))
  })
  const updateAlert = (id, changes) => setAlerts(current => current.map(alert => alert.id === id ? { ...alert, ...changes } : alert))
  const markAllRead = () => setAlerts(current => current.map(alert => alert.dismissed ? alert : { ...alert, read: true }))
  const clearFilters = () => { setSearch(''); setCategoryFilter('All'); setPriorityFilter('All'); setReadFilter('All') }
  return <>
    <div className="alerts-heading"><Title title="Alerts & Notifications" text="Review freshness, shelf-life, spoilage, storage, and inventory alerts that require attention." /><button className="button secondary" onClick={markAllRead} disabled={!summary.unread}>Mark all as read</button></div>
    <section className="alert-summary"><AlertSummary label="Total Alerts" value={summary.total} tone="green" /><AlertSummary label="High Priority" value={summary.high} tone="red" /><AlertSummary label="Medium Priority" value={summary.medium} tone="amber" /><AlertSummary label="Low Priority" value={summary.low} tone="blue" /><AlertSummary label="Unread Alerts" value={summary.unread} tone="purple" /></section>
    <section className="alert-controls"><input aria-label="Search alerts" placeholder="Search alerts, products or batches..." value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All</option>{['Freshness', 'Shelf Life', 'Spoilage', 'Storage', 'Inventory'].map(category => <option key={category}>{category}</option>)}</select><select aria-label="Filter by priority" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select><select aria-label="Filter by read state" value={readFilter} onChange={event => setReadFilter(event.target.value)}><option>All</option><option>Unread</option><option>Read</option></select><button className="button secondary" onClick={clearFilters}>Reset filters</button><button className="link dismissed-toggle" onClick={() => { setShowDismissed(current => !current); setSelected(null) }}>{showDismissed ? 'View active alerts' : 'View dismissed alerts'}</button></section>
    <section className="alerts-list">{filtered.length ? filtered.map(alert => <article key={alert.id} className={'alert-card ' + (!alert.read ? 'unread' : '') + (selected === alert.id ? ' selected' : '')} onClick={() => { setSelected(current => current === alert.id ? null : alert.id); if (!alert.read) updateAlert(alert.id, { read: true }) }}><div className="alert-card-top"><div className="alert-category"><span>{alert.category}</span>{!alert.read && <i>Unread</i>}</div><div className="alert-badges"><em className={'badge ' + priorityTone(alert.priority)}>{alert.priority}</em><time>{alert.time}</time></div></div><h3>{alert.title}</h3><p>{alert.description}</p><div className="alert-card-footer"><span>{alert.related}</span><div><button className="link" onClick={event => { event.stopPropagation(); updateAlert(alert.id, { read: !alert.read }) }}>{alert.read ? 'Mark unread' : 'Mark read'}</button><button className="link delete" onClick={event => { event.stopPropagation(); updateAlert(alert.id, { dismissed: !alert.dismissed }); setSelected(null) }}>{alert.dismissed ? 'Restore' : 'Dismiss'}</button></div></div>{selected === alert.id && <div className="alert-detail"><div><span>Alert category</span><b>{alert.category}</b></div><div><span>Priority</span><b>{alert.priority}</b></div><div><span>Related item</span><b>{alert.related}</b></div><div><span>Date and time</span><b>{alert.time}</b></div><div className="detail-action"><span>Recommended action</span><button className="button primary" onClick={event => event.stopPropagation()}>{alert.action}</button></div></div>}</article>) : <div className="no-alerts">No alerts match your current filters.</div>}</section>
  </>
}
function AlertSummary({ label, value, tone }) { return <article className={'alert-summary-card ' + tone}><small>{label}</small><b>{value}</b></article> }

function Recommendations() {
  const [recommendations, setRecommendations] = useState(initialRecommendations)
  const [filter, setFilter] = useState('All')
  const filtered = recommendations.filter(item => filter === 'All' || item.priority === filter)
  const activeCount = recommendations.filter(item => item.status !== 'Completed').length
  const toggleComplete = id => setRecommendations(current => current.map(item => item.id === id ? { ...item, status: item.status === 'Completed' ? 'New' : 'Completed' } : item))
  const overview = [['Storage', 'Maintain suitable storage conditions.', 'Storage'], ['Consumption', 'Prioritize products requiring earlier consumption.', 'Expiry'], ['Inventory Rotation', 'Rotate older inventory before newer batches.', 'Inventory'], ['Waste Reduction', 'Identify items requiring timely action.', 'Freshness'], ['Quality Improvement', 'Monitor freshness and handling practices.', 'Quality']]
  return <>
    <Title title="Recommendations" text="Get actionable recommendations to help maintain food quality, improve storage, reduce waste, and manage inventory effectively." />
    <section className="recommendation-overview"><div className="overview-heading"><div><small>CURRENT PRIORITIES</small><h2>{activeCount} active recommendation{activeCount === 1 ? '' : 's'}</h2></div><span>Review priority actions across food quality operations.</span></div><div className="overview-grid">{overview.map(item => <article key={item[0]}><small>{item[0]}</small><b>{item[1]}</b><em>{item[2]}</em></article>)}</div></section>
    <div className="recommendation-toolbar"><div className="priority-filters">{['All', 'High', 'Medium', 'Low'].map(level => <button key={level} className={filter === level ? 'active' : ''} onClick={() => setFilter(level)}>{level === 'All' ? 'All' : `${level} Priority`}</button>)}</div>{filter !== 'All' && <button className="link clear-filter" onClick={() => setFilter('All')}>Clear filters</button>}</div>
    <section className="recommendation-list">{filtered.length ? filtered.map(item => <article className={'recommendation-card ' + (item.status === 'Completed' ? 'completed' : '')} key={item.id}><div className="recommendation-top"><div><small>{item.area}</small><h3>{item.title}</h3></div><em className={'badge ' + priorityTone(item.priority)}>{item.priority}</em></div><p>{item.text}</p><div className="recommendation-footer"><div><span className="context-label">{item.context}</span><span className={'recommendation-status ' + (item.status === 'Completed' ? 'complete' : '')}>{item.status}</span></div><button className={'button ' + (item.status === 'Completed' ? 'secondary' : 'primary')} onClick={() => toggleComplete(item.id)}>{item.status === 'Completed' ? 'Restore' : 'Mark Completed'}</button></div></article>) : <div className="no-recommendations">No recommendations match the selected priority.</div>}</section>
  </>
}

function StorageMonitoring() {
  const [form, setForm] = useState(initialStorageForm)
  const [display, setDisplay] = useState(initialStorageForm)
  const [message, setMessage] = useState('')
  const update = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setMessage('') }
  const complete = form.temperature !== '' && form.humidity !== '' && form.air && form.light && form.duration !== ''
  const condition = storageCondition(display)
  const alerts = [condition.temperature === 'Review required' && 'Temperature requires review', condition.humidity === 'Review required' && 'Humidity requires review', condition.air === 'Review required' && 'Air circulation requires review', condition.light === 'Review required' && 'Light exposure requires review'].filter(Boolean)
  const updateConditions = () => { if (!complete) return setMessage('Please complete all storage condition fields.'); setDisplay({ ...form }); setMessage('') }
  const details = [['Temperature Status', `${display.temperature}°C`, condition.temperature], ['Humidity Status', `${display.humidity}%`, condition.humidity], ['Air Circulation Status', display.air, condition.air], ['Light Exposure Status', display.light, condition.light]]
  return <>
    <Title title="Storage Monitoring" text="Monitor storage conditions and identify environmental risks that may affect food freshness." />
    <section className="storage-overview"><article className={'storage-status ' + storageTone(condition.status)}><small>OVERALL STORAGE CONDITION</small><b>{condition.status}</b><span>{condition.status === 'Optimal' ? 'Conditions are stable.' : condition.status === 'Acceptable' ? 'Conditions should be monitored.' : 'Conditions require attention.'}</span></article><div className="storage-metrics">{[['Temperature', `${display.temperature}°C`, 'Temperature'], ['Humidity', `${display.humidity}%`, 'Humidity'], ['Air Circulation', display.air, 'Air'], ['Light Exposure', display.light, 'Light'], ['Storage Duration', `${display.duration} days`, 'Duration']].map(metric => <article className="storage-metric" key={metric[0]}><small>{metric[0]}</small><b>{metric[1]}</b><span>{metric[2]}</span></article>)}</div></section>
    <div className="storage-main-grid"><Panel title="Storage condition details" text="Current condition review."><div className="storage-details">{details.map(detail => <div className="storage-detail" key={detail[0]}><div><b>{detail[0]}</b><small>{detail[1]}</small></div><em className={'badge ' + storageTone(detail[2])}>{detail[2]}</em></div>)}</div></Panel><Panel title="Storage compliance" text="Environmental condition summary."><div className="compliance-list"><div><span>Temperature</span><b>{condition.temperature}</b></div><div><span>Humidity</span><b>{condition.humidity}</b></div><div><span>Air Circulation</span><b>{condition.air}</b></div><div><span>Light Exposure</span><b>{condition.light}</b></div></div><div className={'compliance-status ' + storageTone(condition.status)}><span>Storage Compliance</span><b>{condition.status}</b></div></Panel></div>
    <Panel title="Update storage conditions" text="Enter the latest environmental conditions."><div className="storage-form"><FormField label="Temperature (°C)"><input required type="number" step="0.1" value={form.temperature} onChange={update('temperature')} /></FormField><FormField label="Humidity (%)"><input required type="number" min="0" max="100" value={form.humidity} onChange={update('humidity')} /></FormField><FormField label="Air Circulation"><select value={form.air} onChange={update('air')}><option>Good</option><option>Limited</option><option>Poor</option></select></FormField><FormField label="Light Exposure"><select value={form.light} onChange={update('light')}><option>Low</option><option>Moderate</option><option>High</option></select></FormField><FormField label="Storage Duration (days)"><input required type="number" min="0" value={form.duration} onChange={update('duration')} /></FormField><div className="storage-update"><button className="button primary" disabled={!complete} onClick={updateConditions}>Update Conditions</button>{message && <p className="upload-error">{message}</p>}</div></div></Panel>
    <div className="storage-main-grid"><Panel title="Storage impact" text="How the current environment may affect food freshness."><div className="storage-impact-copy"><b>{condition.status === 'Optimal' ? 'Current storage conditions are stable.' : 'Current storage conditions need closer attention.'}</b><p>{condition.status === 'Optimal' ? 'Maintaining consistent environmental conditions can help preserve freshness and shelf life.' : 'Review the highlighted conditions to help protect freshness and expected shelf life.'}</p></div></Panel><Panel title="Storage alerts" text="Current storage-related notifications."><div className="storage-alerts">{alerts.length ? alerts.map(alert => <div className="storage-alert" key={alert}><i>!</i><span>{alert}</span></div>) : <div className="storage-alert clear"><i>✓</i><span>No active storage alerts</span></div>}</div></Panel></div>
    <Panel title="Storage trend" text="Temperature and humidity readings over recent storage checks."><div className="storage-trend"><div className="trend-legend"><span><i className="temperature-dot"></i>Temperature</span><span><i className="humidity-dot"></i>Humidity</span></div><div className="storage-chart"><div className="chart-line temperature-line"><i></i><i></i><i></i><i></i><i></i></div><div className="chart-line humidity-line"><i></i><i></i><i></i><i></i><i></i></div><div className="chart-dates"><span>Day 1</span><span>Day 2</span><span>Day 3</span><span>Day 4</span><span>Today</span></div></div></div></Panel>
  </>
}

function ShelfLife() {
  const [form, setForm] = useState(emptyShelfLifeForm)
  const [prediction, setPrediction] = useState(null)
  const [history, setHistory] = useState(initialShelfLifeHistory)
  const [validationMessage, setValidationMessage] = useState('')
  const update = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setValidationMessage('') }
  const complete = form.name.trim() && form.category && form.duration !== '' && form.temperature !== '' && form.humidity !== '' && form.packaging
  const predict = () => {
    if (!form.name.trim()) return setValidationMessage('Please enter the food or product name.')
    if (!complete) return setValidationMessage('Please complete all required product and storage information.')
    const temperature = Number(form.temperature); const humidity = Number(form.humidity)
    const risk = temperature > 5 || humidity > 75 ? 'High Risk' : temperature > 3 || humidity > 65 ? 'Medium Risk' : 'Low Risk'
    const days = risk === 'High Risk' ? 2 : risk === 'Medium Risk' ? 4 : 6
    const result = { remaining: `${days} days`, expiry: forecastDate(days), risk, impact: risk === 'Low Risk' ? 'Current temperature and humidity support a stable storage environment.' : risk === 'Medium Risk' ? 'Current temperature and humidity may reduce expected shelf life.' : 'Current storage conditions may substantially reduce expected shelf life.' }
    setPrediction(result); setValidationMessage('')
    setHistory(current => [{ id: Date.now(), name: form.name.trim(), batch: form.batch || 'No batch ID', remaining: result.remaining, risk: result.risk, time: 'Just now' }, ...current])
  }
  const reset = () => { setForm(emptyShelfLifeForm()); setPrediction(null); setValidationMessage('') }
  return <>
    <Title title="Shelf-Life Prediction" text="Estimate remaining shelf life and expiry risk using product and storage information." />
    <div className="shelf-life-layout"><Panel title="Product information" text="Fields marked required are needed to calculate a prediction."><div className="shelf-life-fields"><FormField label="Food/Product Name"><input required value={form.name} onChange={update('name')} placeholder="e.g. Strawberries" /></FormField><FormField label="Product Category"><select required value={form.category} onChange={update('category')}><option value="">Select category</option>{FOOD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></FormField><FormField label="Batch ID (optional)"><input value={form.batch} onChange={update('batch')} placeholder="e.g. FR-2408" /></FormField><FormField label="Storage Duration (days)"><input required type="number" min="0" value={form.duration} onChange={update('duration')} placeholder="e.g. 2" /></FormField></div></Panel><Panel title="Storage conditions" text="Enter the current conditions for this product."><div className="shelf-life-fields"><FormField label="Temperature (°C)"><input required type="number" step="0.1" value={form.temperature} onChange={update('temperature')} placeholder="e.g. 4" /></FormField><FormField label="Humidity (%)"><input required type="number" min="0" max="100" value={form.humidity} onChange={update('humidity')} placeholder="e.g. 68" /></FormField><FormField label="Packaging"><select required value={form.packaging} onChange={update('packaging')}><option value="">Select packaging</option><option>Open</option><option>Plastic</option><option>Paper</option><option>Vacuum Sealed</option><option>Airtight Container</option></select></FormField></div></Panel></div>
    <Panel title="Freshness information" text="Optional assessment details that can support shelf-life planning."><div className="freshness-fields"><FormField label="Freshness Score"><input value={form.freshnessScore} onChange={update('freshnessScore')} placeholder="e.g. 87%" /></FormField><FormField label="Freshness Classification"><select value={form.freshnessClassification} onChange={update('freshnessClassification')}><option value="">Select classification</option><option>Fresh</option><option>Good</option><option>Acceptable</option><option>Near Spoilage</option><option>Spoiled</option></select></FormField><FormField label="Spoilage Probability"><input value={form.spoilageProbability} onChange={update('spoilageProbability')} placeholder="e.g. 8%" /></FormField></div></Panel>
    <div className="predict-actions"><button className="button primary" disabled={!complete} onClick={predict}>Predict Shelf Life</button>{validationMessage ? <p className="upload-error">{validationMessage}</p> : !complete && <small className="button-hint">Complete all required product and storage fields to continue.</small>}</div>
    {prediction && <section className="prediction-results"><div className="prediction-heading"><div><small>SHELF-LIFE PREDICTION</small><h2>{form.name}</h2><p>{form.category}{form.batch ? ` · Batch ${form.batch}` : ''}</p></div><button className="button secondary" onClick={reset}>New Prediction</button></div><div className="prediction-grid"><article className="prediction-highlight"><span>Remaining Shelf Life</span><b>{prediction.remaining}</b><small>Estimated from current product and storage information</small></article><article className="prediction-stat"><span>Expiry Forecast</span><b>{prediction.expiry}</b><small>Expected expiry date</small></article><article className="prediction-stat"><span>Risk Level</span><em className={'badge ' + riskTone(prediction.risk)}>{prediction.risk}</em><small>Storage condition risk</small></article></div><div className="storage-impact"><div><small>STORAGE IMPACT</small><h3>Current conditions</h3><p>{prediction.impact}</p></div><div className="storage-readings"><span>Temperature<b>{form.temperature}°C</b></span><span>Humidity<b>{form.humidity}%</b></span><span>Packaging<b>{form.packaging}</b></span></div></div><div className="shelf-trend"><div><h3>Shelf-life trend</h3><p>Projected product condition through the remaining shelf-life period.</p></div><div className="trend-chart"><span className="trend-start">Today</span><i style={{ height: '88%' }}></i><i style={{ height: '71%' }}></i><i style={{ height: '54%' }}></i><i style={{ height: '36%' }}></i><span className="trend-end">Expiry</span></div></div></section>}
    <Panel title="Prediction history" text="Recent shelf-life predictions."><div className="shelf-history">{history.slice(0, 4).map(entry => <div className="history-row" key={entry.id}><div><b>{entry.name}</b><small>{entry.batch} · {entry.time}</small></div><strong>{entry.remaining}</strong><em className={'badge ' + riskTone(entry.risk)}>{entry.risk}</em></div>)}</div></Panel>
  </>
}
function Analysis() { return <><Title title="Freshness analysis" text="Image-based assessment workflow." /><div className="grid"><Panel title="Image freshness analysis" text="Upload and AI integration will be connected later."><div className="signal"><span>Visual condition</span><b>40% weight</b></div><div className="signal"><span>Storage conditions</span><b>25% weight</b></div><div className="signal"><span>Shelf-life prediction</span><b>20% weight</b></div><div className="signal"><span>Product age</span><b>15% weight</b></div></Panel><Panel title="Freshness assessment" text="Analysis service integration is pending."><div className="signal"><span>Freshness category</span><b>Fresh</b></div><div className="signal"><span>Spoilage probability</span><b>8%</b></div><div className="signal"><span>Visual indicators</span><b>Color · Texture · Mold · Bruising</b></div></Panel></div></> }
function Storage() { return <><Title title="Storage monitoring" text="Storage condition readings; sensor integration is pending." /><div className="cards">{['Cold room A', 'Cold room B', 'Produce bay'].map(name => <Panel key={name} title={name} text="Current sensor reading"><div className="reading"><span>Temperature<b>3.8°C</b></span><span>Humidity<b>68%</b></span></div><div className="signal"><span>Compliance</span><b>Normal</b></div></Panel>)}</div></> }
function Alerts() { return <><Title title="Alerts" text="Freshness, shelf-life, storage and inventory notifications." /><Panel title="Open alerts" text="Current notifications">{alerts.map(alert => <div className="alert" key={alert[1]}><i>{alert[0][0]}</i><span><b>{alert[1]}</b><p>{alert[0]} notification</p></span><time>{alert[2]}</time></div>)}</Panel></> }
const REPORTS = {
  Freshness: { label: 'Freshness Report', chart: 'Freshness distribution', metrics: [['Average freshness score', '84%', 'success'], ['Fresh items', '18', 'success'], ['Near-spoilage items', '4', 'warning'], ['Spoiled items', '1', 'danger']], rows: [['Strawberries', 'Fruits', 'FR-2408', 'Fresh', '92%', -1, 'Low'], ['Whole Milk', 'Dairy', 'DY-1182', 'Good', '77%', -2, 'Medium'], ['Atlantic Salmon', 'Seafood', 'SF-9014', 'Near Spoilage', '43%', -3, 'High'], ['Spinach', 'Vegetables', 'VG-5521', 'Fresh', '89%', -5, 'Low']] },
  ShelfLife: { label: 'Shelf-Life Report', chart: 'Remaining shelf-life distribution', metrics: [['Average remaining shelf life', '5.6 days', 'success'], ['Items approaching expiry', '6', 'warning'], ['High-risk items', '2', 'danger'], ['On-track items', '15', 'success']], rows: [['Whole Milk', 'Dairy', 'DY-1182', 'Approaching Expiry', '2 days', -1, 'Medium'], ['Atlantic Salmon', 'Seafood', 'SF-9014', 'Expired', '0 days', -2, 'High'], ['Wholegrain Bread', 'Bakery', 'BK-3610', 'On Track', '5 days', -4, 'Low'], ['Strawberries', 'Fruits', 'FR-2408', 'On Track', '4 days', -6, 'Low']] },
  Inventory: { label: 'Inventory Quality Report', chart: 'Inventory quality distribution', metrics: [['Fresh items', '18', 'success'], ['Near-expiry items', '6', 'warning'], ['Expired items', '2', 'danger'], ['Inventory health', '82%', 'success']], rows: [['Strawberries', 'Fruits', 'FR-2408', 'Fresh', '92 score', -1, 'Low'], ['Chicken Breast', 'Meat & Poultry', 'MP-4407', 'Near Expiry', '64 score', -3, 'High'], ['Whole Milk', 'Dairy', 'DY-1182', 'Near Expiry', '77 score', -4, 'Medium'], ['Atlantic Salmon', 'Seafood', 'SF-9014', 'Expired', '43 score', -6, 'High']] },
  Waste: { label: 'Waste Reduction Report', chart: 'Waste-risk summary', metrics: [['Items requiring attention', '8', 'warning'], ['Near-expiry items', '6', 'warning'], ['Waste-risk items', '3', 'danger'], ['Potential waste reduction', '31 kg', 'success']], rows: [['Chicken Breast', 'Meat & Poultry', 'MP-4407', 'Prioritize', '12 kg', -1, 'High'], ['Atlantic Salmon', 'Seafood', 'SF-9014', 'Immediate review', '8 kg', -2, 'High'], ['Whole Milk', 'Dairy', 'DY-1182', 'Prioritize', '15 L', -4, 'Medium'], ['Spinach', 'Vegetables', 'VG-5521', 'Monitor', '6 kg', -6, 'Low']] },
  Storage: { label: 'Storage Compliance Report', chart: 'Storage compliance summary', metrics: [['Compliant conditions', '21', 'success'], ['Conditions requiring review', '3', 'warning'], ['Compliance status', '87%', 'success'], ['Critical conditions', '1', 'danger']], rows: [['Cold Room A', 'Seafood', 'SF-9014', 'Review required', '5.8°C', -1, 'High'], ['Cold Room B', 'Dairy', 'DY-1182', 'Compliant', '3.6°C', -2, 'Low'], ['Produce Bay', 'Vegetables', 'VG-5521', 'Review required', '76% humidity', -4, 'Medium'], ['Dry Store', 'Bakery', 'BK-3610', 'Compliant', '20°C', -6, 'Low']] },
}
const reportTone = text => /High|Expired|Spoilage|Immediate/.test(text) ? 'danger' : /Medium|Near|Approaching|Prioritize|Review/.test(text) ? 'warning' : 'success'
const reportDate = offset => dateOffset(offset)
const prettyDate = date => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
function Reports() {
  const [type, setType] = useState('Freshness'), [start, setStart] = useState(''), [end, setEnd] = useState(''), [categoryFilter, setCategoryFilter] = useState('All categories'), [statusFilter, setStatusFilter] = useState('All statuses'), [generated, setGenerated] = useState(new Date()), [applied, setApplied] = useState({ type: 'Freshness', start: '', end: '', category: 'All categories', status: 'All statuses' }), [generating, setGenerating] = useState(false), [message, setMessage] = useState('')
  const report = REPORTS[applied.type], rows = report.rows.map(row => ({ product: row[0], category: row[1], batch: row[2], status: row[3], detail: row[4], date: reportDate(row[5]), risk: row[6] }))
  const filtered = rows.filter(row => (applied.category === 'All categories' || row.category === applied.category) && (applied.status === 'All statuses' || row.status === applied.status) && (!applied.start || row.date >= applied.start) && (!applied.end || row.date <= applied.end))
  const reset = () => { setType('Freshness'); setStart(''); setEnd(''); setCategoryFilter('All categories'); setStatusFilter('All statuses') }
  const exportExcel = () => { const data = [['Product', 'Category', 'Batch ID', 'Status', 'Score / Detail', 'Date', 'Risk'], ...filtered.map(row => [row.product, row.category, row.batch, row.status, row.detail, row.date, row.risk])].map(row => row.join(',')).join('\n'), url = URL.createObjectURL(new Blob([data], { type: 'text/csv' })), link = document.createElement('a'); link.href = url; link.download = `${report.label.replaceAll(' ', '-').toLowerCase()}.csv`; link.click(); URL.revokeObjectURL(url) }
  const statuses = [...new Set(rows.map(row => row.status))], range = start || end ? `${start ? prettyDate(start) : 'Beginning'} – ${end ? prettyDate(end) : 'Present'}` : 'All available dates'
  const primaryLabel = type === 'Inventory' ? 'Total inventory items' : type === 'ShelfLife' ? 'Items monitored' : type === 'Storage' ? 'Storage checks' : type === 'Waste' ? 'Items requiring attention' : 'Items analyzed'
  const appliedRange = applied.start || applied.end ? `${applied.start ? prettyDate(applied.start) : 'Beginning'} – ${applied.end ? prettyDate(applied.end) : 'Present'}` : 'All available dates'
  const appliedPrimaryLabel = applied.type === 'Inventory' ? 'Total inventory items' : applied.type === 'ShelfLife' ? 'Items monitored' : applied.type === 'Storage' ? 'Storage checks' : applied.type === 'Waste' ? 'Items requiring attention' : 'Items analyzed'
  const generate = () => { setGenerating(true); setMessage(''); window.setTimeout(() => { setApplied({ type, start, end, category: categoryFilter, status: statusFilter }); setGenerated(new Date()); setGenerating(false); setMessage('Report generated successfully.') }, 450) }
  return <><div className="heading reports-heading"><div><small>REPORTING & EXPORT</small><h1>Reports & Export</h1><p>Generate and export food quality, freshness, shelf-life, inventory, waste, and storage reports.</p></div><div className="report-actions"><button className="button secondary" onClick={() => window.print()}>Export PDF</button><button className="button secondary" onClick={exportExcel}>Export Spreadsheet</button><button className="button primary" disabled={generating} onClick={generate}>{generating ? 'Generating...' : 'Generate Report'}</button></div></div>
    <Panel title="Report filters" text="Select a report and refine the period or records to include."><div className="report-filters"><FormField label="Report Type"><select value={type} onChange={event => setType(event.target.value)}>{Object.entries(REPORTS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></FormField><FormField label="Start Date"><input type="date" value={start} onChange={event => setStart(event.target.value)} /></FormField><FormField label="End Date"><input type="date" value={end} onChange={event => setEnd(event.target.value)} /></FormField><FormField label="Category"><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All categories</option>{FOOD_CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></FormField><FormField label="Status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></FormField><button className="button secondary report-reset" onClick={reset}>Reset Filters</button></div></Panel>
    {message && <div className="report-success" role="status">{message}</div>}<section className="report-information"><span><b>Selected report</b>{report.label}</span><span><b>Date range</b>{appliedRange}</span><span><b>Generated</b>{generated.toLocaleString()}</span><span><b>Records</b>{filtered.length}</span></section>
    <div className="report-metrics"><article className="report-metric"><small>{appliedPrimaryLabel}</small><b>{filtered.length}</b><span>In selected report</span></article>{report.metrics.map(metric => <article className="report-metric" key={metric[0]}><small>{metric[0]}</small><b>{metric[1]}</b><span className={metric[2]} /></article>)}</div>
    <div className="report-grid"><Panel title={report.chart} text="Distribution across the records included in this report."><div className="report-chart">{report.metrics.map((metric, index) => <div className="report-bar" key={metric[0]}><div><span>{metric[0]}</span><b>{metric[1]}</b></div><i><em className={metric[2]} style={{ width: `${[84, 62, 38, 24][index]}%` }} /></i></div>)}</div></Panel><Panel title="Report insight" text="Key operational focus for the current selection."><div className="report-insight"><b>{filtered.length ? `${filtered.filter(row => row.risk !== 'Low').length} record${filtered.filter(row => row.risk !== 'Low').length === 1 ? '' : 's'} need closer attention.` : 'Adjust the filters to include report records.'}</b><p>{type === 'Waste' ? 'Prioritize high-risk batches to help reduce avoidable waste.' : type === 'Storage' ? 'Review conditions marked for attention to maintain compliant storage.' : 'Use the report details to prioritize daily quality actions.'}</p></div></Panel></div>
    <Panel title={report.label} text={`${filtered.length} record${filtered.length === 1 ? '' : 's'} matching the selected filters.`}><div className="table report-table"><table><thead><tr><th>Product</th><th>Category</th><th>Batch ID</th><th>Status</th><th>{type === 'ShelfLife' ? 'Remaining Shelf Life' : 'Score / Detail'}</th><th>Date</th><th>Risk</th></tr></thead><tbody>{filtered.length ? filtered.map(row => <tr key={`${row.batch}-${row.date}`}><td><b>{row.product}</b></td><td>{row.category}</td><td>{row.batch}</td><td><em className={'badge ' + reportTone(row.status)}>{row.status}</em></td><td>{row.detail}</td><td>{prettyDate(row.date)}</td><td><em className={'badge ' + reportTone(row.risk)}>{row.risk}</em></td></tr>) : <tr><td className="report-empty" colSpan="7">No report data matches your selected filters.</td></tr>}</tbody></table></div></Panel>
    <PrintReport report={report} type={applied.type} range={appliedRange} generated={generated} rows={filtered} primaryLabel={appliedPrimaryLabel} />
  </>
}
function PrintReport({ report, type, range, generated, rows, primaryLabel }) {
  const attentionCount = rows.filter(row => row.risk !== 'Low').length
  const insight = type === 'Waste' ? 'Prioritize high-risk batches to help reduce avoidable waste.' : type === 'Storage' ? 'Review conditions marked for attention to maintain compliant storage.' : 'Use the report details to prioritize daily quality actions.'
  return <section className="print-report" aria-hidden="true">
    <div className="print-report-header"><small>FOOD FRESHNESS MONITORING PLATFORM</small><h1>{report.label}</h1><p>Operational food quality report</p></div>
    <section className="print-report-meta"><div><b>Report type</b><span>{type}</span></div><div><b>Date range</b><span>{range}</span></div><div><b>Generated</b><span>{generated.toLocaleString()}</span></div><div><b>Number of records</b><span>{rows.length}</span></div></section>
    <section className="print-report-section"><h2>Summary</h2><div className="print-report-metrics"><article><small>{primaryLabel}</small><b>{rows.length}</b><span>In selected report</span></article>{report.metrics.map(metric => <article key={metric[0]}><small>{metric[0]}</small><b>{metric[1]}</b></article>)}</div></section>
    <section className="print-report-section print-report-overview"><div><h2>{report.chart}</h2><div className="print-report-chart">{report.metrics.map((metric, index) => <div key={metric[0]}><span>{metric[0]}</span><b>{metric[1]}</b><i><em className={metric[2]} style={{ width: `${[84, 62, 38, 24][index]}%` }} /></i></div>)}</div></div><div className="print-report-insight"><h2>Report insight</h2><b>{rows.length ? `${attentionCount} record${attentionCount === 1 ? '' : 's'} need closer attention.` : 'No records match the selected filters.'}</b><p>{insight}</p></div></section>
    <section className="print-report-section print-report-data"><h2>Complete report data</h2><table><thead><tr><th>Product</th><th>Category</th><th>Batch ID</th><th>Status</th><th>{type === 'ShelfLife' ? 'Remaining Shelf Life' : 'Score / Detail'}</th><th>Date</th><th>Risk</th></tr></thead><tbody>{rows.length ? rows.map(row => <tr key={`${row.batch}-${row.date}`}><td>{row.product}</td><td>{row.category}</td><td>{row.batch}</td><td>{row.status}</td><td>{row.detail}</td><td>{prettyDate(row.date)}</td><td>{row.risk}</td></tr>) : <tr><td colSpan="7">No report data matches the selected filters.</td></tr>}</tbody></table></section>
  </section>
}
function Profile({ identity, role }) { return <><Title title="Profile" text="Workspace account." /><Panel title={identity} text={role}><div className="signal"><span>Access role</span><b>{role}</b></div></Panel></> }
