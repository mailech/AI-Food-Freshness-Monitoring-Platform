import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import * as auth from './services/auth'
import { ApiError } from './services/api'
import * as inventoryApi from './services/inventory'
import * as freshnessApi from './services/freshness'
import * as freshnessScoringApi from './services/freshnessScoring'
import * as shelfLifeApi from './services/shelfLife'
import * as storageApi from './services/storage'
import * as recommendationsApi from './services/recommendations'
import * as alertsApi from './services/alerts'
import * as reportsApi from './services/reports'
import './App.css'
import './Analysis.css'
import './ShelfLife.css'
import './Storage.css'
import './Recommendations.css'
import './Alerts.css'

const allPages = [
  ['dashboard', 'Dashboard', '▦'], ['inventory', 'Inventory', '□'],
  ['analysis', 'Freshness Analysis', '◔'], ['scoring', 'Freshness Scoring', '◎'], ['shelfLife', 'Shelf-Life Prediction', '◷'], ['storage', 'Storage Monitoring', '♧'], ['recommendations', 'Recommendations', '✦'],
  ['alerts', 'Alerts & Notifications', '!'], ['reports', 'Reports & Export', '▤'], ['profile', 'Profile', '◉'],
]
const items = [
  ['Strawberries', 'Fruits', 'ST-2408', '48 kg', 92, 'Cold room A', '🍓'],
  ['Whole milk', 'Dairy', 'ML-1182', '120 L', 77, 'Cold room B', '🥛'],
  ['Atlantic salmon', 'Seafood', 'SF-9014', '36 kg', 61, 'Cold room A', '🐟'],
]
const category = score => score >= 85 ? ['Fresh', 'success'] : score >= 70 ? ['Good', 'success'] : score >= 50 ? ['Acceptable', 'warning'] : score >= 35 ? ['Near Spoilage', 'warning'] : ['Spoiled', 'danger']
const toSession = user => ({ ...user, identity: user.name })
const allowedFor = role => {
  if (role === 'Consumer') return ['dashboard', 'inventory', 'analysis', 'scoring', 'shelfLife', 'storage', 'alerts', 'recommendations', 'reports', 'profile']
  if (role === 'Food Quality Inspector') return ['dashboard', 'inventory', 'analysis', 'scoring', 'shelfLife', 'storage', 'alerts', 'recommendations', 'reports', 'profile']
  return allPages.map(([id]) => id)
}

export default function App() {
  const [session, setSession] = useState(null)
  const [restoringSession, setRestoringSession] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const restore = async () => {
      if (!auth.hasSession()) { setRestoringSession(false); return }
      try {
        setSession(toSession(await auth.getCurrentUser()))
      } catch {
        auth.logout()
      } finally {
        setRestoringSession(false)
      }
    }
    restore()
  }, [])
  useEffect(() => {
    if (!restoringSession && !session) auth.logout()
  }, [restoringSession, session])
  if (restoringSession) return null
  if (!session) return <Auth onAuthenticated={account => { setSession(toSession(account)); setPage('dashboard') }} />

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
        {page === 'inventory' && <Inventory role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'analysis' && <AnalysisPage role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'scoring' && <FreshnessScoring role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'shelfLife' && <ShelfLife role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'storage' && <StorageMonitoring role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'recommendations' && <Recommendations role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'alerts' && <AlertsNotifications role={session.role} onUnauthorized={() => setSession(null)} />}
        {page === 'reports' && <Reports role={session.role} onUnauthorized={() => setSession(null)} />}
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
const itemStatus = expiryDate => {
  if (!expiryDate) return 'Fresh'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(`${expiryDate}T00:00:00`)
  const days = Math.ceil((expiry - today) / 86400000)
  return days < 0 ? 'Expired' : days <= 3 ? 'Near Expiry' : 'Fresh'
}
const emptyInventoryItem = () => ({ name: '', category: 'Fruits', batchId: '', quantity: '', unit: 'kg', location: '', addedDate: dateOffset(0), expiryDate: dateOffset(7) })

const canModifyInventory = role => ['Retail Manager', 'Warehouse Operator', 'Administrator'].includes(role)
const friendlyInventoryError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the inventory request.'
  if (error.status === 403) return 'Access denied. Your account cannot modify inventory.'
  if (error.status === 404) return 'The requested inventory record was not found.'
  if (error.status === 409) return 'A batch with this number already exists for this food item.'
  if (error.status === 422) return error.message || 'Please correct the highlighted inventory details.'
  return error.message
}
const batchToRow = batch => ({ id: `batch-${batch.id}`, batchRecordId: batch.id, itemId: batch.food_item_id, name: batch.food_item.name, category: batch.food_item.category, batchId: batch.batch_number, quantity: String(batch.quantity), unit: batch.unit, location: batch.storage_location, addedDate: batch.purchase_date || '', expiryDate: batch.expiry_date || '', status: batch.expiry_status })
const itemWithoutBatchToRow = item => ({ id: `item-${item.id}`, batchRecordId: null, itemId: item.id, name: item.name, category: item.category, batchId: '', quantity: '', unit: '', location: '', addedDate: '', expiryDate: '', status: 'Fresh' })

function Inventory({ role, onUnauthorized }) {
  const [inventory, setInventory] = useState([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyInventoryItem)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editable = canModifyInventory(role)
  const loadInventory = async () => {
    setLoading(true); setError('')
    try {
      const [items, batches] = await Promise.all([inventoryApi.getItems(), inventoryApi.getBatches()])
      const itemIdsWithBatches = new Set(batches.map(batch => batch.food_item_id))
      setInventory([...batches.map(batchToRow), ...items.filter(item => !itemIdsWithBatches.has(item.id)).map(itemWithoutBatchToRow)])
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { auth.logout(); onUnauthorized(); return }
      setError(friendlyInventoryError(requestError))
    } finally { setLoading(false) }
  }
  useEffect(() => { loadInventory() }, [])
  const openAdd = () => { setEditing(null); setForm(emptyInventoryItem()); setError(''); setFormOpen(true) }
  const openEdit = item => { setEditing(item); setForm({ ...item }); setError(''); setFormOpen(true) }
  const closeForm = () => { setEditing(null); setForm(emptyInventoryItem()); setFormOpen(false) }
  const saveItem = async event => {
    event.preventDefault()
    setSubmitting(true); setError(''); setMessage('')
    const itemPayload = { name: form.name.trim(), category: form.category }
    const batchPayload = { batch_number: form.batchId.trim(), quantity: Number(form.quantity), unit: form.unit, storage_location: form.location.trim(), purchase_date: form.addedDate, expiry_date: form.expiryDate }
    try {
      if (editing) {
        await inventoryApi.updateItem(editing.itemId, itemPayload)
        if (editing.batchRecordId) await inventoryApi.updateBatch(editing.batchRecordId, batchPayload)
        else await inventoryApi.createBatch(editing.itemId, batchPayload)
        setMessage('Food item updated successfully.')
      } else {
        const created = await inventoryApi.createItem(itemPayload)
        await inventoryApi.createBatch(created.id, batchPayload)
        setMessage('Food item and batch added successfully.')
      }
      await loadInventory(); closeForm()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) { auth.logout(); onUnauthorized() }
      else setError(friendlyInventoryError(requestError))
    } finally { setSubmitting(false) }
  }
  const removeItem = async item => {
    if (!window.confirm(`Delete ${item.name} and its batches?`)) return
    setError(''); setMessage('')
    try { await inventoryApi.deleteItem(item.itemId); await loadInventory(); setMessage('Food item deleted successfully.') }
    catch (requestError) { if (requestError instanceof ApiError && requestError.status === 401) { auth.logout(); onUnauthorized() } else setError(friendlyInventoryError(requestError)) }
  }
  const filtered = inventory.filter(item => {
    const matchesQuery = [item.name, item.batchId, item.location].some(value => value.toLowerCase().includes(query.toLowerCase()))
    return matchesQuery && (categoryFilter === 'All categories' || item.category === categoryFilter) && (statusFilter === 'All statuses' || itemStatus(item.expiryDate) === statusFilter)
  })
  return <>
    <div className="heading inventory-heading"><div><small>INVENTORY MANAGEMENT</small><h1>Inventory Management</h1><p>Manage food items, batches, quantities, storage locations and expiry information.</p></div>{editable && <button className="button primary" onClick={openAdd}>+ Add Food Item</button>}</div>
    <div className="tools inventory-tools"><input aria-label="Search inventory" placeholder="Search items, batch ID or location..." value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All categories</option>{FOOD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All statuses</option><option>Fresh</option><option>Near Expiry</option><option>Expired</option></select></div>
    {message && <p className="inventory-note" role="status">{message}</p>}{error && <p className="error inventory-note" role="alert">{error}</p>}
    <Panel title="Food inventory" text={loading ? 'Loading inventory...' : `${filtered.length} item${filtered.length === 1 ? '' : 's'} shown`}><div className="table inventory-table"><table><thead><tr><th>Item Name</th><th>Category</th><th>Batch ID</th><th>Quantity</th><th>Unit</th><th>Storage Location</th><th>Added Date</th><th>Expiry Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loading ? <tr><td className="empty-inventory" colSpan="10">Loading inventory...</td></tr> : filtered.length ? filtered.map(item => { const status = item.status || itemStatus(item.expiryDate); return <tr key={item.id}><td><b>{item.name}</b></td><td>{item.category}</td><td>{item.batchId}</td><td>{item.quantity}</td><td>{item.unit}</td><td>{item.location}</td><td>{item.addedDate}</td><td>{item.expiryDate}</td><td><em className={'badge ' + (status === 'Fresh' ? 'success' : status === 'Near Expiry' ? 'warning' : 'danger')}>{status}</em></td><td className="inventory-actions">{editable && <><button className="link" onClick={() => openEdit(item)}>Edit</button><button className="link delete" onClick={() => removeItem(item)}>Delete</button></>}</td></tr> }) : <tr><td className="empty-inventory" colSpan="10">No inventory items match your search or filters.</td></tr>}</tbody></table></div></Panel>
    {formOpen && <div className="modal-backdrop" onMouseDown={closeForm}><section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="item-form-title" onMouseDown={event => event.stopPropagation()}><div className="modal-title"><div><small>INVENTORY ITEM</small><h2 id="item-form-title">{editing ? 'Edit Food Item' : 'Add Food Item'}</h2></div><button className="modal-close" type="button" onClick={closeForm} aria-label="Close form">×</button></div><form className="inventory-form" onSubmit={saveItem}><FormField label="Item Name"><input required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></FormField><FormField label="Category"><select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))}>{FOOD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></FormField><FormField label="Batch ID"><input required value={form.batchId} onChange={event => setForm(current => ({ ...current, batchId: event.target.value }))} /></FormField><FormField label="Quantity"><input required min="0.001" step="any" type="number" value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))} /></FormField><FormField label="Unit"><select value={form.unit} onChange={event => setForm(current => ({ ...current, unit: event.target.value }))}>{UNITS.map(unit => <option key={unit}>{unit}</option>)}</select></FormField><FormField label="Storage Location"><input required value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} /></FormField><FormField label="Added Date"><input required type="date" value={form.addedDate} onChange={event => setForm(current => ({ ...current, addedDate: event.target.value }))} /></FormField><FormField label="Expiry Date"><input required type="date" value={form.expiryDate} onChange={event => setForm(current => ({ ...current, expiryDate: event.target.value }))} /></FormField><div className="form-actions"><button type="button" className="button secondary" onClick={closeForm} disabled={submitting}>Cancel</button><button className="button primary" disabled={submitting}>{submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}</button></div></form></section></div>}
  </>
}
function FormField({ label, children }) { return <label className="inventory-field"><span>{label}</span>{children}</label> }
const canCreateFreshness = role => ['Consumer', 'Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const canDeleteFreshness = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const freshnessError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the freshness request.'
  if (error.status === 403) return 'Access denied. Your account cannot modify freshness analyses.'
  if (error.status === 404) return 'The selected food batch or analysis was not found.'
  if (error.status === 400) return error.message || 'Please upload a valid JPG, PNG, or WEBP image.'
  if (error.status === 413) return 'The image is larger than the allowed upload size.'
  return error.message || 'Unable to complete the freshness request.'
}
const analysisStatus = analysis => analysis.analysis_result?.status || (analysis.freshness_category ? 'complete' : 'pending_model_integration')
const analysisDate = value => new Date(value).toLocaleString()
const SCORING_WEIGHT_LABELS = [
  ['Visual freshness', '40%'],
  ['Storage conditions', '25%'],
  ['Shelf-life', '20%'],
  ['Product age', '15%'],
]
const canCreateFreshnessScore = role => ['Consumer', 'Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const canDeleteFreshnessScore = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const scoringError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the freshness scoring request.'
  if (error.status === 403) return 'Access denied. Your account cannot modify freshness scores.'
  if (error.status === 404) return error.message || 'The selected food batch or freshness score was not found.'
  if (error.status === 409) return error.message || 'This freshness score conflicts with an existing record.'
  if (error.status === 422) return error.message || 'Please correct the scoring details.'
  return error.message || 'Unable to complete the freshness scoring request.'
}
const isPendingScore = entry => !entry || entry.status === 'pending_model_integration' || entry.freshness_score == null
const scoringValue = value => (value == null || value === '' ? 'Not available' : String(value))
const scoringWeight = value => {
  if (value == null || value === '') return 'Not available'
  const percent = Number(value) * 100
  return Number.isNaN(percent) ? String(value) : `${Number.isInteger(percent) ? percent : percent.toFixed(0)}%`
}

function AnalysisPage({ role, onUnauthorized }) {
  const [image, setImage] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [productName, setProductName] = useState('')
  const [foodCategory, setFoodCategory] = useState('Fruits')
  const [batches, setBatches] = useState([])
  const [foodBatchId, setFoodBatchId] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [uploadError, setUploadError] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const canCreate = canCreateFreshness(role)
  const canDelete = canDeleteFreshness(role)
  const handleError = error => {
    if (error instanceof ApiError && error.status === 401) { auth.logout(); onUnauthorized(); return }
    setValidationMessage(freshnessError(error))
  }
  const loadHistory = async batchId => {
    if (!batchId) { setHistory([]); return }
    try { setHistoryLoading(true); setHistory(await freshnessApi.getBatchAnalyses(batchId)) }
    catch (error) { handleError(error) }
    finally { setHistoryLoading(false) }
  }
  useEffect(() => { inventoryApi.getBatches().then(setBatches).catch(handleError) }, [])
  const selectImage = file => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setUploadError('Please select a JPG, PNG, or WEBP image.'); return }
    const reader = new FileReader()
    reader.onload = event => { setImage({ name: file.name, preview: event.target.result }); setImageFile(file); setResult(null); setUploadError(''); setValidationMessage('') }
    reader.readAsDataURL(file)
  }
  const selectBatch = event => {
    const batchId = event.target.value
    setFoodBatchId(batchId); setResult(null); setValidationMessage('')
    const batch = batches.find(entry => String(entry.id) === batchId)
    if (batch) { setProductName(batch.food_item.name); setFoodCategory(batch.food_item.category) }
    loadHistory(batchId)
  }
  const analyze = async () => {
    if (!foodBatchId) { setValidationMessage('Please select a food batch.'); return }
    if (!imageFile) { setValidationMessage('Please select a food image.'); return }
    try { setLoading(true); setValidationMessage(''); const analysis = await freshnessApi.analyze({ image: imageFile, foodBatchId }); setResult(analysis); await loadHistory(foodBatchId) }
    catch (error) { handleError(error) }
    finally { setLoading(false) }
  }
  const removeAnalysis = async analysisId => {
    try { setLoading(true); await freshnessApi.deleteAnalysis(analysisId); if (result?.id === analysisId) setResult(null); await loadHistory(foodBatchId) }
    catch (error) { handleError(error) }
    finally { setLoading(false) }
  }
  const reset = () => { setImage(null); setImageFile(null); setResult(null); setUploadError(''); setValidationMessage('') }
  return <>
    <Title title="Freshness Analysis" text="Analyze food images to assess freshness, quality, and potential spoilage." />
    <div className="analysis-note">Upload a clear, well-lit food image to support a complete freshness assessment.</div>
    <div className="analysis-workspace">
      <Panel title="Food image" text="Upload a clear image for a visual freshness assessment."><div className={'upload-zone ' + (image ? 'has-image' : '')} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); selectImage(event.dataTransfer.files[0]) }}>{image ? <div className="image-preview"><img src={image.preview} alt="Selected food preview" /><div><b>{image.name}</b><small>Image selected and ready for assessment.</small><div><label className="link change-image" htmlFor="food-image">Change image</label><button className="link delete" onClick={() => { setImage(null); setResult(null); setValidationMessage('') }}>Remove image</button></div></div></div> : <><i>↑</i><b>Drag and drop a food image here</b><small>Supported formats: JPG, PNG and WEBP</small><label className="button secondary" htmlFor="food-image">Choose Image</label></>}<input id="food-image" type="file" accept="image/jpeg,image/png,image/webp" onClick={event => { event.currentTarget.value = '' }} onChange={event => selectImage(event.target.files[0])} /></div>{uploadError && <p className="upload-error">{uploadError}</p>}</Panel>
      <Panel title="Food information" text="Select the real inventory batch for this analysis."><div className="analysis-fields"><FormField label="Food batch"><select value={foodBatchId} onChange={selectBatch}><option value="">Select an inventory batch</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}</select></FormField><FormField label="Food/Product Name"><input value={productName} readOnly placeholder="Selected from the batch" /></FormField><FormField label="Category"><input value={foodCategory} readOnly /></FormField></div><button className="button primary analyze-button" disabled={!canCreate || loading || !image || !foodBatchId} onClick={analyze}>{loading ? 'Uploading…' : 'Analyze Freshness'}</button>{validationMessage ? <p className="upload-error">{validationMessage}</p> : (!image || !foodBatchId) && <small className="button-hint">Select an inventory batch and image to begin.</small>}</Panel>
    </div>
    {result && <section className="analysis-results"><div className="analysis-results-heading"><div><small>FRESHNESS ASSESSMENT</small><h2>Freshness Assessment</h2><p>Product: {productName}</p></div><button className="button secondary" onClick={reset}>New Analysis</button></div>{analysisStatus(result) === 'pending_model_integration' ? <div className="analysis-summary"><b>Analysis pending model integration</b><p>{result.analysis_result?.message || 'The image was stored and the analysis record was created. A trained freshness model is not configured yet.'}</p></div> : <div className="result-grid"><article className="result-score"><span>Freshness Score</span><b>{result.freshness_score ?? 'Not available'}</b></article><article className="result-stat"><span>Quality classification</span><b>{result.freshness_category ?? 'Not available'}</b></article><article className="result-stat"><span>Spoilage probability</span><b>{result.spoilage_probability ?? 'Not available'}</b></article></div>}</section>}
    <Panel title="Analysis history" text={foodBatchId ? 'Persisted analyses for the selected inventory batch.' : 'Select an inventory batch to view persisted analyses.'}><div className="analysis-history">{historyLoading ? <p className="button-hint">Loading analysis history…</p> : history.length ? history.map(entry => <div className="history-row" key={entry.id}><div><b>Analysis #{entry.id}</b><small>{analysisDate(entry.analyzed_at)}</small></div><strong>{analysisStatus(entry) === 'pending_model_integration' ? 'Pending' : entry.freshness_score ?? 'N/A'}</strong><em className="badge warning">{analysisStatus(entry) === 'pending_model_integration' ? 'Model pending' : entry.freshness_category ?? 'No category'}</em>{canDelete && <button className="link delete" disabled={loading} onClick={() => removeAnalysis(entry.id)}>Delete</button>}</div>) : <p className="button-hint">No persisted analyses for this batch.</p>}</div></Panel>
  </>
}

function FreshnessScoring({ role, onUnauthorized }) {
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [foodBatchId, setFoodBatchId] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canCreate = canCreateFreshnessScore(role)
  const canDelete = canDeleteFreshnessScore(role)
  const busy = loading || deleting
  const selectedBatch = batches.find(entry => String(entry.id) === String(foodBatchId))
  const pending = result && isPendingScore(result)
  const handleError = caught => {
    if (caught instanceof ApiError && caught.status === 401) { auth.logout(); onUnauthorized(); return }
    setError(scoringError(caught))
  }
  const loadHistory = async batchId => {
    if (!batchId) { setHistory([]); return }
    try { setHistoryLoading(true); setHistory(await freshnessScoringApi.getBatchScores(batchId)) }
    catch (requestError) { handleError(requestError) }
    finally { setHistoryLoading(false) }
  }
  useEffect(() => {
    setBatchesLoading(true)
    inventoryApi.getBatches().then(setBatches).catch(handleError).finally(() => setBatchesLoading(false))
  }, [])
  const selectBatch = event => {
    const batchId = event.target.value
    setFoodBatchId(batchId)
    setResult(null); setError(''); setMessage('')
    loadHistory(batchId)
  }
  const createScore = async () => {
    if (!foodBatchId) { setError('Please select a food batch.'); return }
    if (!canCreate) { setError('Access denied. Your account cannot create freshness scores.'); return }
    try {
      setLoading(true); setError(''); setMessage('')
      const created = await freshnessScoringApi.createScore(foodBatchId)
      setResult(created)
      setMessage('Freshness score record created.')
      await loadHistory(foodBatchId)
    } catch (requestError) { handleError(requestError) }
    finally { setLoading(false) }
  }
  const removeScore = async scoreId => {
    try {
      setDeleting(true); setError(''); setMessage('')
      await freshnessScoringApi.deleteScore(scoreId)
      if (result?.id === scoreId) setResult(null)
      await loadHistory(foodBatchId)
      setMessage('Freshness score deleted.')
    } catch (requestError) { handleError(requestError) }
    finally { setDeleting(false) }
  }
  const reset = () => { setResult(null); setError(''); setMessage('') }
  const components = result ? [
    ['Visual freshness', result.visual_freshness_score, result.visual_weight],
    ['Storage conditions', result.storage_condition_score, result.storage_weight],
    ['Shelf-life', result.shelf_life_score, result.shelf_life_weight],
    ['Product age', result.product_age_score, result.product_age_weight],
  ] : []
  return <>
    <Title title="Freshness Scoring" text="Create a composite freshness-score evaluation for a real inventory batch. Component scores are stored by the backend and are not calculated in the browser." />
    <div className="scoring-note">Documented model weights: Visual freshness 40% · Storage conditions 25% · Shelf-life 20% · Product age 15%. The overall score is returned by the API when component values exist.</div>
    {message && <p className="inventory-note" role="status">{message}</p>}
    {error && <p className="error inventory-note" role="alert">{error}</p>}
    <div className="scoring-workspace">
      <Panel title="Food batch" text="Select a real inventory batch. Scores are created for this batch only.">
        <div className="scoring-fields">
          <FormField label="Food batch">
            <select required value={foodBatchId} onChange={selectBatch} disabled={batchesLoading}>
              <option value="">{batchesLoading ? 'Loading inventory batches…' : batches.length ? 'Select an inventory batch' : 'No inventory batches available'}</option>
              {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
            </select>
          </FormField>
          <FormField label="Food/Product Name"><input value={selectedBatch?.food_item?.name || ''} readOnly placeholder="Selected from the batch" /></FormField>
          <FormField label="Category"><input value={selectedBatch?.food_item?.category || ''} readOnly placeholder="Selected from the batch" /></FormField>
        </div>
        <div className="scoring-actions">
          <button className="button primary" disabled={!canCreate || busy || !foodBatchId || batchesLoading} onClick={createScore}>{loading ? 'Saving…' : 'Generate Score'}</button>
        </div>
        {!canCreate && <small className="button-hint">Your role can view score history but cannot create or delete scores.</small>}
        {canCreate && !foodBatchId && <small className="button-hint">Select an inventory batch to create a score record.</small>}
      </Panel>
      <Panel title="Scoring model" text="Explanatory weights used by the backend scoring model.">
        {SCORING_WEIGHT_LABELS.map(item => <div className="signal" key={item[0]}><span>{item[0]}</span><b>{item[1]} weight</b></div>)}
      </Panel>
    </div>
    {result && <section className="scoring-results">
      <div className="scoring-heading">
        <div>
          <small>FRESHNESS SCORE</small>
          <h2>{selectedBatch?.food_item?.name || 'Selected batch'}</h2>
          <p>{[selectedBatch?.food_item?.category, selectedBatch?.batch_number ? `Batch ${selectedBatch.batch_number}` : '', `Record #${result.id}`].filter(Boolean).join(' · ')}</p>
        </div>
        <button className="button secondary" onClick={reset}>New Score</button>
      </div>
      {pending && <div className="analysis-summary"><b>Score pending model integration</b><p>The evaluation record was created with status {result.status}. Component scores and the overall score are not available until the backend supplies them.</p></div>}
      <div className="scoring-grid">
        <article className="scoring-highlight"><span>Overall freshness score</span><b>{pending ? 'Not available' : scoringValue(result.freshness_score)}</b><small>{pending ? 'Unavailable until component scores exist' : 'Returned by the scoring API'}</small></article>
        <article className="scoring-stat"><span>Status</span><b>{result.status || 'Not available'}</b><small>Backend evaluation status</small></article>
        <article className="scoring-stat"><span>Created</span><b>{result.created_at ? analysisDate(result.created_at) : 'Not available'}</b><small>Recorded timestamp</small></article>
      </div>
      <div className="scoring-components">
        {components.map(item => <div className="signal" key={item[0]}><span>{item[0]}</span><b>{scoringValue(item[1])} · {scoringWeight(item[2])}</b></div>)}
      </div>
    </section>}
    <Panel title="Score history" text={foodBatchId ? 'Persisted scoring evaluations for the selected inventory batch.' : 'Select an inventory batch to view persisted scores.'}>
      <div className="scoring-history">
        {historyLoading ? <p className="button-hint">Loading score history…</p> : history.length ? history.map(entry => {
          const pendingEntry = isPendingScore(entry)
          return <div className="history-row" key={entry.id}>
            <div><b>Score #{entry.id}</b><small>{entry.created_at ? analysisDate(entry.created_at) : 'Timestamp not available'}</small></div>
            <strong>{pendingEntry ? 'Pending' : scoringValue(entry.freshness_score)}</strong>
            <em className={'badge ' + (pendingEntry ? 'warning' : 'success')}>{pendingEntry ? entry.status || 'Pending' : 'Recorded'}</em>
            {canDelete && <button className="link delete" disabled={busy} onClick={() => removeScore(entry.id)}>Delete</button>}
          </div>
        }) : <p className="button-hint">{foodBatchId ? 'No freshness scores have been recorded for this batch.' : 'Select an inventory batch to view persisted scores.'}</p>}
      </div>
    </Panel>
  </>
}
function Indicator({ name, result, tone }) { return <article className="indicator"><i className={tone}>●</i><span><b>{name}</b><small>{result}</small></span></article> }
const emptyShelfLifeForm = () => ({ foodBatchId: '', duration: '', temperature: '', humidity: '', packaging: '' })
const SHELF_LIFE_PACKAGING = ['Open', 'Plastic', 'Paper', 'Vacuum Sealed', 'Airtight Container']
const canCreateShelfLifePrediction = role => ['Consumer', 'Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const canDeleteShelfLifePrediction = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const predictionStatus = entry => entry.prediction_result?.status || (entry.remaining_days != null || entry.predicted_expiry_date ? 'complete' : 'pending_model_integration')
const isPendingPrediction = entry => predictionStatus(entry) === 'pending_model_integration'
const shelfLifeError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the shelf-life request.'
  if (error.status === 403) return 'Access denied. Your account cannot modify shelf-life predictions.'
  if (error.status === 404) return 'The selected food batch or prediction was not found.'
  if (error.status === 422) return error.message || 'Please correct the prediction details.'
  return error.message || 'Unable to complete the shelf-life request.'
}
const remainingDisplay = entry => {
  if (isPendingPrediction(entry) || entry.remaining_days == null) return 'Not available'
  return `${entry.remaining_days} day${Number(entry.remaining_days) === 1 ? '' : 's'}`
}
const expiryDisplay = entry => {
  if (isPendingPrediction(entry) || !entry.predicted_expiry_date) return 'Not available'
  const parsed = new Date(entry.predicted_expiry_date)
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
const confidenceDisplay = entry => (isPendingPrediction(entry) || entry.confidence_score == null || entry.confidence_score === '' ? 'Not available' : String(entry.confidence_score))
const conditionReading = (value, suffix) => (value == null || value === '' ? 'Not available' : `${value}${suffix}`)
const validateShelfLifeForm = form => {
  if (!form.foodBatchId) return 'Please select a food batch.'
  if (form.duration === '' || Number.isNaN(Number(form.duration))) return 'Please enter the storage duration in days.'
  const duration = Number(form.duration)
  if (!Number.isInteger(duration) || duration < 0 || duration > 36500) return 'Storage duration must be a whole number between 0 and 36500 days.'
  if (form.temperature === '' || Number.isNaN(Number(form.temperature))) return 'Please enter the storage temperature.'
  const temperature = Number(form.temperature)
  if (temperature < -50 || temperature > 100) return 'Temperature must be between -50°C and 100°C.'
  if (form.humidity === '' || Number.isNaN(Number(form.humidity))) return 'Please enter the storage humidity.'
  const humidity = Number(form.humidity)
  if (humidity < 0 || humidity > 100) return 'Humidity must be between 0% and 100%.'
  if (!form.packaging.trim()) return 'Please select packaging.'
  if (form.packaging.trim().length > 100) return 'Packaging must be 100 characters or fewer.'
  return ''
}
const emptyStorageForm = () => ({ foodBatchId: '', temperature: '', humidity: '', airCirculation: '', lightLevel: '', duration: '' })
const canManageStorage = role => ['Retail Manager', 'Warehouse Operator', 'Administrator'].includes(role)
const storageError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the storage request.'
  if (error.status === 403) return 'Access denied. Your account cannot modify storage conditions.'
  if (error.status === 404) return error.message || 'The selected food batch or storage record was not found.'
  if (error.status === 409) return error.message || 'This storage record conflicts with an existing record.'
  if (error.status === 422) return error.message || 'Please correct the storage condition details.'
  return error.message || 'Unable to complete the storage request.'
}
const isEmptyLatest = error => error instanceof ApiError && error.status === 404 && /no storage conditions have been recorded/i.test(error.message || '')
const storageReading = (value, suffix) => (value == null || value === '' ? 'Not available' : `${value}${suffix}`)
const validateStorageForm = form => {
  if (!form.foodBatchId) return 'Please select a food batch.'
  if (form.temperature === '' || Number.isNaN(Number(form.temperature))) return 'Please enter the storage temperature.'
  const temperature = Number(form.temperature)
  if (temperature < -50 || temperature > 100) return 'Temperature must be between -50°C and 100°C.'
  if (form.humidity === '' || Number.isNaN(Number(form.humidity))) return 'Please enter the storage humidity.'
  const humidity = Number(form.humidity)
  if (humidity < 0 || humidity > 100) return 'Humidity must be between 0% and 100%.'
  if (form.airCirculation === '' || Number.isNaN(Number(form.airCirculation))) return 'Please enter the air circulation value.'
  const airCirculation = Number(form.airCirculation)
  if (airCirculation < 0 || airCirculation > 10000) return 'Air circulation must be between 0 and 10000.'
  if (form.lightLevel === '' || Number.isNaN(Number(form.lightLevel))) return 'Please enter the light level.'
  const lightLevel = Number(form.lightLevel)
  if (lightLevel < 0 || lightLevel > 1_000_000) return 'Light level must be between 0 and 1000000.'
  if (form.duration === '' || Number.isNaN(Number(form.duration))) return 'Please enter the storage duration in days.'
  const duration = Number(form.duration)
  if (!Number.isInteger(duration) || duration < 0 || duration > 36500) return 'Storage duration must be a whole number between 0 and 36500 days.'
  return ''
}
const priorityTone = priority => priority === 'High' ? 'danger' : priority === 'Medium' ? 'warning' : 'success'
const RECOMMENDATION_TYPES = ['Storage', 'Consumption', 'Inventory Rotation', 'Waste Reduction', 'Quality Improvement']
const RECOMMENDATION_PRIORITIES = ['High', 'Medium', 'Low']
const RECOMMENDATION_STATUSES = ['New', 'In Progress', 'Completed']
const emptyRecommendationForm = () => ({ foodBatchId: '', recommendationType: 'Storage', priority: 'Medium', message: '', status: 'New' })
const canManageRecommendations = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const recommendationError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the recommendation request.'
  if (error.status === 403) return 'Access denied. Your account cannot modify recommendations.'
  if (error.status === 404) return error.message || 'The selected food batch or recommendation was not found.'
  if (error.status === 409) return error.message || 'This recommendation conflicts with an existing record.'
  if (error.status === 422) return error.message || 'Please correct the recommendation details.'
  return error.message || 'Unable to complete the recommendation request.'
}
const batchLabel = (batches, foodBatchId) => {
  const batch = batches.find(entry => Number(entry.id) === Number(foodBatchId))
  return batch ? `${batch.food_item.name} · ${batch.batch_number}` : `Batch #${foodBatchId}`
}
const ALERT_CATEGORIES = ['Freshness', 'Shelf Life', 'Spoilage', 'Storage', 'Inventory']
const ALERT_PRIORITIES = ['High', 'Medium', 'Low']
const emptyAlertForm = () => ({ foodBatchId: '', category: 'Freshness', priority: 'Medium', title: '', message: '' })
const canCreateAlerts = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
const alertError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the alert request.'
  if (error.status === 403) return 'Access denied. Your account cannot create alerts.'
  if (error.status === 404) return error.message || 'The selected food batch or alert was not found.'
  if (error.status === 409) return error.message || 'This alert conflicts with an existing record.'
  if (error.status === 422) return error.message || 'Please correct the alert details.'
  return error.message || 'Unable to complete the alert request.'
}

function AlertsNotifications({ role, onUnauthorized }) {
  const [alerts, setAlerts] = useState([])
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [readFilter, setReadFilter] = useState('All')
  const [batchFilter, setBatchFilter] = useState('')
  const [showDismissed, setShowDismissed] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyAlertForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canCreate = canCreateAlerts(role)
  const busy = submitting || Boolean(updatingId)
  const handleError = caught => {
    if (caught instanceof ApiError && caught.status === 401) { auth.logout(); onUnauthorized(); return }
    setError(alertError(caught))
  }
  const loadAlerts = async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      setAlerts(await alertsApi.getAlerts({
        category: categoryFilter === 'All' ? undefined : categoryFilter,
        priority: priorityFilter === 'All' ? undefined : priorityFilter,
        is_read: readFilter === 'All' ? undefined : readFilter === 'Read',
        is_dismissed: showDismissed,
        food_batch_id: batchFilter || undefined,
      }))
    } catch (requestError) { setAlerts([]); handleError(requestError) }
    finally { if (!silent) setLoading(false) }
  }
  useEffect(() => {
    setBatchesLoading(true)
    inventoryApi.getBatches().then(setBatches).catch(handleError).finally(() => setBatchesLoading(false))
  }, [])
  useEffect(() => { loadAlerts() }, [categoryFilter, priorityFilter, readFilter, batchFilter, showDismissed])
  const updateForm = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setError(''); setMessage('') }
  const relatedBatch = alert => batchLabel(batches, alert.food_batch_id)
  const displayed = alerts.filter(alert => {
    const related = relatedBatch(alert)
    const haystack = [alert.title, alert.message, alert.category, related].join(' ').toLowerCase()
    return !search.trim() || haystack.includes(search.trim().toLowerCase())
  })
  const summary = {
    total: alerts.length,
    high: alerts.filter(alert => alert.priority === 'High').length,
    medium: alerts.filter(alert => alert.priority === 'Medium').length,
    low: alerts.filter(alert => alert.priority === 'Low').length,
    unread: alerts.filter(alert => !alert.is_read).length,
  }
  const selectAlert = async alert => {
    setSelected(current => current === alert.id ? null : alert.id)
    if (alert.is_read || updatingId) return
    try {
      setUpdatingId(alert.id); setError('')
      await alertsApi.markAlertRead(alert.id)
      await loadAlerts(true)
    } catch (requestError) { handleError(requestError) }
    finally { setUpdatingId(null) }
  }
  const markRead = async (event, alertId) => {
    event.stopPropagation()
    try {
      setUpdatingId(alertId); setError(''); setMessage('')
      await alertsApi.markAlertRead(alertId)
      setMessage('Alert marked as read.')
      await loadAlerts(true)
    } catch (requestError) { handleError(requestError) }
    finally { setUpdatingId(null) }
  }
  const dismiss = async (event, alertId) => {
    event.stopPropagation()
    try {
      setUpdatingId(alertId); setError(''); setMessage('')
      await alertsApi.dismissAlert(alertId)
      setSelected(current => current === alertId ? null : current)
      setMessage('Alert dismissed.')
      await loadAlerts(true)
    } catch (requestError) { handleError(requestError) }
    finally { setUpdatingId(null) }
  }
  const markAllRead = async () => {
    try {
      setUpdatingId('all'); setError(''); setMessage('')
      await alertsApi.markAllAlertsRead()
      setMessage('All alerts marked as read.')
      await loadAlerts(true)
    } catch (requestError) { handleError(requestError) }
    finally { setUpdatingId(null) }
  }
  const createAlert = async event => {
    event.preventDefault()
    if (!canCreate) { setError('Access denied. Your account cannot create alerts.'); return }
    if (!form.foodBatchId) { setError('Please select a food batch.'); return }
    if (!form.title.trim() || !form.message.trim()) { setError('Please enter an alert title and message.'); return }
    try {
      setSubmitting(true); setError(''); setMessage('')
      await alertsApi.createAlert({
        food_batch_id: Number(form.foodBatchId),
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        message: form.message.trim(),
      })
      setForm(emptyAlertForm())
      setMessage('Alert recorded.')
      await loadAlerts(true)
    } catch (requestError) { handleError(requestError) }
    finally { setSubmitting(false) }
  }
  const clearFilters = () => { setSearch(''); setCategoryFilter('All'); setPriorityFilter('All'); setReadFilter('All'); setBatchFilter('') }
  return <>
    <div className="alerts-heading">
      <Title title="Alerts & Notifications" text="Review persisted freshness, shelf-life, spoilage, storage, and inventory alerts for your account." />
      <button className="button secondary" onClick={markAllRead} disabled={busy || loading || !summary.unread}>Mark all as read</button>
    </div>
    {message && <p className="inventory-note" role="status">{message}</p>}
    {error && <p className="error inventory-note" role="alert">{error}</p>}
    <section className="alert-summary">
      <AlertSummary label="Total Alerts" value={loading ? '…' : summary.total} tone="green" />
      <AlertSummary label="High Priority" value={loading ? '…' : summary.high} tone="red" />
      <AlertSummary label="Medium Priority" value={loading ? '…' : summary.medium} tone="amber" />
      <AlertSummary label="Low Priority" value={loading ? '…' : summary.low} tone="blue" />
      <AlertSummary label="Unread Alerts" value={loading ? '…' : summary.unread} tone="purple" />
    </section>
    <section className="alert-controls">
      <input aria-label="Search alerts" placeholder="Search alerts, products or batches..." value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All</option>{ALERT_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>
      <select aria-label="Filter by priority" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}><option>All</option>{ALERT_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select>
      <select aria-label="Filter by read state" value={readFilter} onChange={event => setReadFilter(event.target.value)}><option>All</option><option>Unread</option><option>Read</option></select>
      <select aria-label="Filter by batch" value={batchFilter} onChange={event => setBatchFilter(event.target.value)} disabled={batchesLoading}>
        <option value="">{batchesLoading ? 'Loading batches…' : 'All batches'}</option>
        {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
      </select>
      <button className="button secondary" onClick={clearFilters}>Reset filters</button>
      <button className="link dismissed-toggle" onClick={() => { setShowDismissed(current => !current); setSelected(null) }}>{showDismissed ? 'View active alerts' : 'View dismissed alerts'}</button>
    </section>
    {canCreate && <Panel title="Add alert" text="Create a persisted alert for a real inventory batch. Alerts belong to your account.">
      <form className="storage-form" onSubmit={createAlert}>
        <FormField label="Food batch">
          <select required value={form.foodBatchId} onChange={updateForm('foodBatchId')} disabled={batchesLoading || busy}>
            <option value="">{batchesLoading ? 'Loading inventory batches…' : batches.length ? 'Select an inventory batch' : 'No inventory batches available'}</option>
            {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
          </select>
        </FormField>
        <FormField label="Category"><select value={form.category} onChange={updateForm('category')} disabled={busy}>{ALERT_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></FormField>
        <FormField label="Priority"><select value={form.priority} onChange={updateForm('priority')} disabled={busy}>{ALERT_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select></FormField>
        <FormField label="Title"><input required value={form.title} onChange={updateForm('title')} disabled={busy} maxLength="255" /></FormField>
        <label className="inventory-field recommendation-message-field"><span>Message</span><textarea required value={form.message} onChange={updateForm('message')} disabled={busy} rows="3" /></label>
        <div className="storage-update"><button className="button primary" disabled={busy || batchesLoading || !form.foodBatchId || !form.title.trim() || !form.message.trim()}>{submitting ? 'Saving…' : 'Add Alert'}</button></div>
      </form>
    </Panel>}
    <section className="alerts-list">
      {loading ? <div className="no-alerts">Loading alerts…</div> : displayed.length ? displayed.map(alert => <article key={alert.id} className={'alert-card ' + (!alert.is_read ? 'unread' : '') + (selected === alert.id ? ' selected' : '')} onClick={() => selectAlert(alert)}>
        <div className="alert-card-top">
          <div className="alert-category"><span>{alert.category}</span>{!alert.is_read && <i>Unread</i>}</div>
          <div className="alert-badges"><em className={'badge ' + priorityTone(alert.priority)}>{alert.priority}</em><time>{alert.created_at ? analysisDate(alert.created_at) : 'Not available'}</time></div>
        </div>
        <h3>{alert.title}</h3>
        <p>{alert.message}</p>
        <div className="alert-card-footer">
          <span>{relatedBatch(alert)}</span>
          <div>
            {!alert.is_read && <button className="link" disabled={busy} onClick={event => markRead(event, alert.id)}>{updatingId === alert.id ? 'Saving…' : 'Mark read'}</button>}
            {!alert.is_dismissed && <button className="link delete" disabled={busy} onClick={event => dismiss(event, alert.id)}>{updatingId === alert.id ? 'Saving…' : 'Dismiss'}</button>}
          </div>
        </div>
        {selected === alert.id && <div className="alert-detail">
          <div><span>Alert category</span><b>{alert.category}</b></div>
          <div><span>Priority</span><b>{alert.priority}</b></div>
          <div><span>Related batch</span><b>{relatedBatch(alert)}</b></div>
          <div><span>Date and time</span><b>{alert.created_at ? analysisDate(alert.created_at) : 'Not available'}</b></div>
          <div><span>Read</span><b>{alert.is_read ? 'Yes' : 'No'}</b></div>
          <div><span>Dismissed</span><b>{alert.is_dismissed ? 'Yes' : 'No'}</b></div>
        </div>}
      </article>) : <div className="no-alerts">{search || categoryFilter !== 'All' || priorityFilter !== 'All' || readFilter !== 'All' || batchFilter ? 'No alerts match your current filters.' : (showDismissed ? 'No dismissed alerts have been recorded.' : 'No alerts have been recorded.')}</div>}
    </section>
  </>
}
function AlertSummary({ label, value, tone }) { return <article className={'alert-summary-card ' + tone}><small>{label}</small><b>{value}</b></article> }

function Recommendations({ role, onUnauthorized }) {
  const [recommendations, setRecommendations] = useState([])
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [form, setForm] = useState(emptyRecommendationForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editable = canManageRecommendations(role)
  const busy = submitting || Boolean(updatingId)
  const handleError = caught => {
    if (caught instanceof ApiError && caught.status === 401) { auth.logout(); onUnauthorized(); return }
    setError(recommendationError(caught))
  }
  const loadRecommendations = async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      setRecommendations(await recommendationsApi.getRecommendations({
        food_batch_id: batchFilter || undefined,
        recommendation_type: typeFilter || undefined,
        priority: priorityFilter === 'All' ? undefined : priorityFilter,
        status: statusFilter || undefined,
      }))
    } catch (requestError) { setRecommendations([]); handleError(requestError) }
    finally { if (!silent) setLoading(false) }
  }
  useEffect(() => {
    setBatchesLoading(true)
    inventoryApi.getBatches().then(setBatches).catch(handleError).finally(() => setBatchesLoading(false))
  }, [])
  useEffect(() => { loadRecommendations() }, [priorityFilter, typeFilter, statusFilter, batchFilter])
  const updateForm = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setError(''); setMessage('') }
  const setStatus = async (recommendationId, status) => {
    if (!editable) { setError('Access denied. Your account cannot modify recommendations.'); return }
    try {
      setUpdatingId(recommendationId); setError(''); setMessage('')
      const updated = await recommendationsApi.updateRecommendationStatus(recommendationId, status)
      setMessage(`Recommendation #${recommendationId} status updated to ${updated.status}.`)
      await loadRecommendations(true)
    } catch (requestError) { handleError(requestError) }
    finally { setUpdatingId(null) }
  }
  const removeRecommendation = async recommendationId => {
    if (!editable) { setError('Access denied. Your account cannot modify recommendations.'); return }
    try {
      setUpdatingId(recommendationId); setError(''); setMessage('')
      await recommendationsApi.deleteRecommendation(recommendationId)
      setRecommendations(current => current.filter(item => item.id !== recommendationId))
      setMessage('Recommendation deleted.')
    } catch (requestError) { handleError(requestError) }
    finally { setUpdatingId(null) }
  }
  const createRecommendation = async event => {
    event.preventDefault()
    if (!editable) { setError('Access denied. Your account cannot modify recommendations.'); return }
    if (!form.foodBatchId) { setError('Please select a food batch.'); return }
    if (!form.message.trim()) { setError('Please enter a recommendation message.'); return }
    try {
      setSubmitting(true); setError(''); setMessage('')
      await recommendationsApi.createRecommendation({
        food_batch_id: Number(form.foodBatchId),
        recommendation_type: form.recommendationType,
        priority: form.priority,
        message: form.message.trim(),
        status: form.status,
      })
      setForm(emptyRecommendationForm())
      setMessage('Recommendation recorded.')
      await loadRecommendations(true)
    } catch (requestError) { handleError(requestError) }
    finally { setSubmitting(false) }
  }
  const clearFilters = () => { setPriorityFilter('All'); setTypeFilter(''); setStatusFilter(''); setBatchFilter('') }
  const typeCounts = Object.fromEntries(RECOMMENDATION_TYPES.map(type => [type, recommendations.filter(item => item.recommendation_type === type).length]))
  const activeCount = recommendations.filter(item => item.status !== 'Completed').length
  const hasFilters = priorityFilter !== 'All' || typeFilter || statusFilter || batchFilter
  return <>
    <Title title="Recommendations" text="Review persisted recommendations for inventory batches. Status changes are saved through the recommendations API." />
    {message && <p className="inventory-note" role="status">{message}</p>}
    {error && <p className="error inventory-note" role="alert">{error}</p>}
    <section className="recommendation-overview">
      <div className="overview-heading">
        <div><small>CURRENT PRIORITIES</small><h2>{loading ? 'Loading recommendations…' : `${activeCount} active recommendation${activeCount === 1 ? '' : 's'}`}</h2></div>
        <span>{loading ? 'Loading recorded recommendations.' : hasFilters ? 'Counts reflect the current API filters.' : 'Recorded recommendation types from the API.'}</span>
      </div>
      <div className="overview-grid">{RECOMMENDATION_TYPES.map(type => <article key={type}><small>{type}</small><b>{loading ? 'Loading…' : `${typeCounts[type]} recorded`}</b><em>Recommendation type</em></article>)}</div>
    </section>
    <div className="recommendation-toolbar">
      <div className="priority-filters">{['All', ...RECOMMENDATION_PRIORITIES].map(level => <button key={level} className={priorityFilter === level ? 'active' : ''} onClick={() => setPriorityFilter(level)}>{level === 'All' ? 'All' : `${level} Priority`}</button>)}</div>
      <div className="recommendation-filter-fields">
        <select aria-label="Filter by type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
          <option value="">All types</option>
          {RECOMMENDATION_TYPES.map(type => <option key={type}>{type}</option>)}
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          {RECOMMENDATION_STATUSES.map(status => <option key={status}>{status}</option>)}
        </select>
        <select aria-label="Filter by batch" value={batchFilter} onChange={event => setBatchFilter(event.target.value)} disabled={batchesLoading}>
          <option value="">{batchesLoading ? 'Loading batches…' : 'All batches'}</option>
          {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
        </select>
        {hasFilters && <button className="link clear-filter" onClick={clearFilters}>Clear filters</button>}
      </div>
    </div>
    {editable && <Panel title="Add recommendation" text="Create a persisted recommendation for a real inventory batch.">
      <form className="storage-form" onSubmit={createRecommendation}>
        <FormField label="Food batch">
          <select required value={form.foodBatchId} onChange={updateForm('foodBatchId')} disabled={batchesLoading || busy}>
            <option value="">{batchesLoading ? 'Loading inventory batches…' : batches.length ? 'Select an inventory batch' : 'No inventory batches available'}</option>
            {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
          </select>
        </FormField>
        <FormField label="Recommendation type">
          <select value={form.recommendationType} onChange={updateForm('recommendationType')} disabled={busy}>{RECOMMENDATION_TYPES.map(type => <option key={type}>{type}</option>)}</select>
        </FormField>
        <FormField label="Priority">
          <select value={form.priority} onChange={updateForm('priority')} disabled={busy}>{RECOMMENDATION_PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select>
        </FormField>
        <FormField label="Status">
          <select value={form.status} onChange={updateForm('status')} disabled={busy}>{RECOMMENDATION_STATUSES.map(status => <option key={status}>{status}</option>)}</select>
        </FormField>
        <label className="inventory-field recommendation-message-field"><span>Message</span><textarea required value={form.message} onChange={updateForm('message')} disabled={busy} rows="3" placeholder="Enter the recommendation to persist." /></label>
        <div className="storage-update"><button className="button primary" disabled={busy || batchesLoading || !form.foodBatchId || !form.message.trim()}>{submitting ? 'Saving…' : 'Add Recommendation'}</button></div>
      </form>
    </Panel>}
    {!editable && <small className="button-hint">Your role can view recommendations but cannot create, update, or delete them.</small>}
    <section className="recommendation-list">
      {loading ? <div className="no-recommendations">Loading recommendations…</div> : recommendations.length ? recommendations.map(item => {
        const completed = item.status === 'Completed'
        return <article className={'recommendation-card ' + (completed ? 'completed' : '')} key={item.id}>
          <div className="recommendation-top">
            <div>
              <small>{item.recommendation_type}</small>
              <h3>{batchLabel(batches, item.food_batch_id)}</h3>
            </div>
            <em className={'badge ' + priorityTone(item.priority)}>{item.priority}</em>
          </div>
          <p>{item.message}</p>
          <div className="recommendation-meta">
            <span>Created {item.created_at ? analysisDate(item.created_at) : 'Not available'}</span>
            <span>Updated {item.updated_at ? analysisDate(item.updated_at) : 'Not available'}</span>
            <span>Completed {item.completed_at ? analysisDate(item.completed_at) : 'Not completed'}</span>
          </div>
          <div className="recommendation-footer">
            <div>
              <span className="context-label">{item.recommendation_type}</span>
              <span className={'recommendation-status ' + (completed ? 'complete' : '')}>{item.status}</span>
            </div>
            {editable && <div className="recommendation-actions">
              {item.status === 'New' && <button className="button secondary" disabled={busy} onClick={() => setStatus(item.id, 'In Progress')}>{updatingId === item.id ? 'Saving…' : 'Mark In Progress'}</button>}
              <button className={'button ' + (completed ? 'secondary' : 'primary')} disabled={busy} onClick={() => setStatus(item.id, completed ? 'New' : 'Completed')}>{updatingId === item.id ? 'Saving…' : completed ? 'Restore' : 'Mark Completed'}</button>
              <button className="link delete" disabled={busy} onClick={() => removeRecommendation(item.id)}>Delete</button>
            </div>}
          </div>
        </article>
      }) : <div className="no-recommendations">{hasFilters ? 'No recommendations match the selected filters.' : 'No recommendations have been recorded.'}</div>}
    </section>
  </>
}

function StorageMonitoring({ role, onUnauthorized }) {
  const [form, setForm] = useState(emptyStorageForm)
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editable = canManageStorage(role)
  const selectedBatch = batches.find(entry => String(entry.id) === String(form.foodBatchId))
  const complete = Boolean(form.foodBatchId && form.temperature !== '' && form.humidity !== '' && form.airCirculation !== '' && form.lightLevel !== '' && form.duration !== '')
  const handleError = caught => {
    if (caught instanceof ApiError && caught.status === 401) { auth.logout(); onUnauthorized(); return true }
    setError(storageError(caught))
    return false
  }
  const loadConditions = async batchId => {
    if (!batchId) { setLatest(null); setHistory([]); return }
    setLoading(true); setError('')
    try {
      const records = await storageApi.getBatchConditions(batchId)
      setHistory(records)
      try { setLatest(await storageApi.getLatestCondition(batchId)) }
      catch (latestError) {
        if (isEmptyLatest(latestError)) setLatest(null)
        else throw latestError
      }
    } catch (requestError) {
      setLatest(null); setHistory([])
      handleError(requestError)
    } finally { setLoading(false) }
  }
  useEffect(() => {
    setBatchesLoading(true)
    inventoryApi.getBatches().then(setBatches).catch(handleError).finally(() => setBatchesLoading(false))
  }, [])
  const update = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setError(''); setMessage('') }
  const selectBatch = event => {
    const batchId = event.target.value
    setForm(current => ({ ...current, foodBatchId: batchId }))
    setLatest(null); setHistory([]); setError(''); setMessage('')
    loadConditions(batchId)
  }
  const submitConditions = async event => {
    event.preventDefault()
    const invalid = validateStorageForm(form)
    if (invalid) { setError(invalid); return }
    if (!editable) { setError('Access denied. Your account cannot modify storage conditions.'); return }
    try {
      setSubmitting(true); setError(''); setMessage('')
      const created = await storageApi.createCondition({
        food_batch_id: Number(form.foodBatchId),
        temperature: Number(form.temperature),
        humidity: Number(form.humidity),
        air_circulation: Number(form.airCirculation),
        light_level: Number(form.lightLevel),
        storage_duration: Number(form.duration),
      })
      setLatest(created)
      setMessage('Storage conditions recorded.')
      await loadConditions(form.foodBatchId)
    } catch (requestError) { handleError(requestError) }
    finally { setSubmitting(false) }
  }
  const removeCondition = async conditionId => {
    try {
      setDeleting(true); setError(''); setMessage('')
      await storageApi.deleteCondition(conditionId)
      if (latest?.id === conditionId) setLatest(null)
      await loadConditions(form.foodBatchId)
      setMessage('Storage record deleted.')
    } catch (requestError) { handleError(requestError) }
    finally { setDeleting(false) }
  }
  const details = latest ? [
    ['Temperature', storageReading(latest.temperature, '°C')],
    ['Humidity', storageReading(latest.humidity, '%')],
    ['Air circulation', storageReading(latest.air_circulation, '')],
    ['Light level', storageReading(latest.light_level, '')],
    ['Recorded at', latest.recorded_at ? analysisDate(latest.recorded_at) : 'Not available'],
  ] : []
  const metrics = [
    ['Temperature', latest ? storageReading(latest.temperature, '°C') : 'Not available', 'From latest record'],
    ['Humidity', latest ? storageReading(latest.humidity, '%') : 'Not available', 'From latest record'],
    ['Air circulation', latest ? storageReading(latest.air_circulation, '') : 'Not available', 'From latest record'],
    ['Light level', latest ? storageReading(latest.light_level, '') : 'Not available', 'From latest record'],
    ['Recorded at', latest?.recorded_at ? analysisDate(latest.recorded_at) : 'Not available', 'Backend timestamp'],
  ]
  return <>
    <Title title="Storage Monitoring" text="Monitor recorded storage conditions for a real inventory batch. Compliance and optimization remain unknown until backend rules are configured." />
    {message && <p className="inventory-note" role="status">{message}</p>}
    {error && <p className="error inventory-note" role="alert">{error}</p>}
    <Panel title="Food batch" text="Select a real inventory batch to load persisted storage records.">
      <div className="storage-form">
        <FormField label="Food batch">
          <select required value={form.foodBatchId} onChange={selectBatch} disabled={batchesLoading}>
            <option value="">{batchesLoading ? 'Loading inventory batches…' : batches.length ? 'Select an inventory batch' : 'No inventory batches available'}</option>
            {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
          </select>
        </FormField>
        <FormField label="Food/Product Name"><input value={selectedBatch?.food_item?.name || ''} readOnly placeholder="Selected from the batch" /></FormField>
        <FormField label="Storage location"><input value={selectedBatch?.storage_location || ''} readOnly placeholder="Selected from the batch" /></FormField>
      </div>
    </Panel>
    <section className="storage-overview">
      <article className="storage-status unknown">
        <small>OVERALL STORAGE CONDITION</small>
        <b>unknown</b>
        <span>No configured storage thresholds exist for this batch category.</span>
      </article>
      <div className="storage-metrics">{metrics.map(metric => <article className="storage-metric" key={metric[0]}><small>{metric[0]}</small><b>{loading ? 'Loading…' : metric[1]}</b><span>{metric[2]}</span></article>)}</div>
    </section>
    <div className="storage-main-grid">
      <Panel title="Storage condition details" text={form.foodBatchId ? (loading ? 'Loading latest storage record…' : latest ? `Latest persisted record #${latest.id}.` : 'No storage conditions have been recorded for this batch.') : 'Select an inventory batch to view recorded conditions.'}>
        {loading ? <p className="button-hint">Loading latest storage record…</p> : latest ? <div className="storage-details">{details.map(detail => <div className="storage-detail" key={detail[0]}><div><b>{detail[0]}</b><small>{detail[1]}</small></div></div>)}</div> : <p className="button-hint">{form.foodBatchId ? 'No storage conditions have been recorded for this batch.' : 'Select an inventory batch to view recorded conditions.'}</p>}
      </Panel>
      <Panel title="Storage compliance" text="Compliance is returned as unknown until storage thresholds are configured.">
        <div className="compliance-list">
          <div><span>Temperature</span><b>unknown</b></div>
          <div><span>Humidity</span><b>unknown</b></div>
          <div><span>Air circulation</span><b>unknown</b></div>
          <div><span>Light level</span><b>unknown</b></div>
        </div>
        <div className="compliance-status unknown"><span>Storage Compliance</span><b>unknown</b></div>
        <p className="button-hint">No configured storage thresholds exist for this batch category.</p>
      </Panel>
    </div>
    <Panel title="Update storage conditions" text="Submit a new storage-condition record. Air circulation and light level are numeric values required by the API.">
      <form className="storage-form" onSubmit={submitConditions}>
        <FormField label="Temperature (°C)"><input required type="number" step="0.1" min="-50" max="100" value={form.temperature} onChange={update('temperature')} disabled={!editable} placeholder="e.g. 4" /></FormField>
        <FormField label="Humidity (%)"><input required type="number" step="0.1" min="0" max="100" value={form.humidity} onChange={update('humidity')} disabled={!editable} placeholder="e.g. 65" /></FormField>
        <FormField label="Air circulation"><input required type="number" step="0.1" min="0" max="10000" value={form.airCirculation} onChange={update('airCirculation')} disabled={!editable} placeholder="0 to 10000" /></FormField>
        <FormField label="Light level"><input required type="number" step="0.1" min="0" max="1000000" value={form.lightLevel} onChange={update('lightLevel')} disabled={!editable} placeholder="0 to 1000000" /></FormField>
        <FormField label="Storage duration (days)"><input required type="number" min="0" max="36500" step="1" value={form.duration} onChange={update('duration')} disabled={!editable} placeholder="e.g. 3" /></FormField>
        <div className="storage-update">
          <button className="button primary" disabled={!editable || submitting || deleting || !complete || batchesLoading}>{submitting ? 'Saving…' : 'Update Conditions'}</button>
        </div>
      </form>
      {!editable && <small className="button-hint">Your role can view storage records but cannot create or delete them.</small>}
      {editable && !complete && <small className="button-hint">Select an inventory batch and complete the required storage fields to continue.</small>}
    </Panel>
    <div className="storage-main-grid">
      <Panel title="Storage optimization" text="Optimization is pending until backend rules are configured.">
        <div className="storage-impact-copy">
          <b>pending_optimization_rules</b>
          <p>No storage optimization rules are configured.</p>
        </div>
      </Panel>
      <Panel title="Storage alerts" text="This page does not generate storage alerts locally.">
        <div className="storage-alerts"><div className="storage-alert clear"><i>✓</i><span>No storage alerts are returned by the storage API.</span></div></div>
      </Panel>
    </div>
    <Panel title="Storage history" text={form.foodBatchId ? 'Persisted storage-condition records for the selected inventory batch.' : 'Select an inventory batch to view persisted storage records.'}>
      <div className="storage-history">
        {loading ? <p className="button-hint">Loading storage history…</p> : history.length ? history.map(entry => <div className="history-row" key={entry.id}>
          <div><b>Record #{entry.id}</b><small>{entry.recorded_at ? analysisDate(entry.recorded_at) : 'Timestamp not available'} · Air {storageReading(entry.air_circulation, '')} · Light {storageReading(entry.light_level, '')}</small></div>
          <strong>{storageReading(entry.temperature, '°C')} · {storageReading(entry.humidity, '%')}</strong>
          <em className="badge">Recorded</em>
          {editable && <button className="link delete" disabled={submitting || deleting} onClick={() => removeCondition(entry.id)}>Delete</button>}
        </div>) : <p className="button-hint">{form.foodBatchId ? 'No storage conditions have been recorded for this batch.' : 'Select an inventory batch to view persisted storage records.'}</p>}
      </div>
    </Panel>
  </>
}

function ShelfLife({ role, onUnauthorized }) {
  const [form, setForm] = useState(emptyShelfLifeForm)
  const [batches, setBatches] = useState([])
  const [batchesLoading, setBatchesLoading] = useState(true)
  const [prediction, setPrediction] = useState(null)
  const [history, setHistory] = useState([])
  const [validationMessage, setValidationMessage] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canCreate = canCreateShelfLifePrediction(role)
  const canDelete = canDeleteShelfLifePrediction(role)
  const busy = creating || deleting
  const selectedBatch = batches.find(entry => String(entry.id) === String(form.foodBatchId))
  const productName = selectedBatch?.food_item?.name || ''
  const foodCategory = selectedBatch?.food_item?.category || ''
  const batchNumber = selectedBatch?.batch_number || ''
  const complete = Boolean(form.foodBatchId && form.duration !== '' && form.temperature !== '' && form.humidity !== '' && form.packaging)
  const pending = prediction && isPendingPrediction(prediction)
  const handleError = error => {
    if (error instanceof ApiError && error.status === 401) { auth.logout(); onUnauthorized(); return }
    setValidationMessage(shelfLifeError(error))
  }
  const loadHistory = async batchId => {
    if (!batchId) { setHistory([]); return }
    try { setHistoryLoading(true); setHistory(await shelfLifeApi.getBatchPredictions(batchId)) }
    catch (error) { handleError(error) }
    finally { setHistoryLoading(false) }
  }
  useEffect(() => {
    setBatchesLoading(true)
    inventoryApi.getBatches().then(setBatches).catch(handleError).finally(() => setBatchesLoading(false))
  }, [])
  const update = key => event => { setForm(current => ({ ...current, [key]: event.target.value })); setValidationMessage(''); setMessage('') }
  const selectBatch = event => {
    const batchId = event.target.value
    setForm(current => ({ ...current, foodBatchId: batchId }))
    setPrediction(null); setValidationMessage(''); setMessage('')
    loadHistory(batchId)
  }
  const predict = async () => {
    const invalid = validateShelfLifeForm(form)
    if (invalid) { setValidationMessage(invalid); return }
    try {
      setCreating(true); setValidationMessage(''); setMessage('')
      const created = await shelfLifeApi.predict({
        food_batch_id: Number(form.foodBatchId),
        storage_duration: Number(form.duration),
        temperature: Number(form.temperature),
        humidity: Number(form.humidity),
        packaging: form.packaging.trim(),
      })
      setPrediction(created)
      await loadHistory(form.foodBatchId)
    } catch (error) { handleError(error) }
    finally { setCreating(false) }
  }
  const removePrediction = async predictionId => {
    try {
      setDeleting(true); setValidationMessage(''); setMessage('')
      await shelfLifeApi.deletePrediction(predictionId)
      if (prediction?.id === predictionId) setPrediction(null)
      await loadHistory(form.foodBatchId)
      setMessage('Prediction deleted.')
    } catch (error) { handleError(error) }
    finally { setDeleting(false) }
  }
  const reset = () => { setPrediction(null); setValidationMessage(''); setMessage('') }
  return <>
    <Title title="Shelf-Life Prediction" text="Estimate remaining shelf life and expiry risk using product and storage information." />
    {message && <p className="shelf-life-message" role="status">{message}</p>}
    <div className="shelf-life-layout">
      <Panel title="Product information" text="Select a real inventory batch and enter the storage duration.">
        <div className="shelf-life-fields">
          <FormField label="Food batch">
            <select required value={form.foodBatchId} onChange={selectBatch} disabled={batchesLoading}>
              <option value="">{batchesLoading ? 'Loading inventory batches…' : batches.length ? 'Select an inventory batch' : 'No inventory batches available'}</option>
              {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}
            </select>
          </FormField>
          <FormField label="Food/Product Name"><input value={productName} readOnly placeholder="Selected from the batch" /></FormField>
          <FormField label="Product Category"><input value={foodCategory} readOnly placeholder="Selected from the batch" /></FormField>
          <FormField label="Storage Duration (days)"><input required type="number" min="0" max="36500" step="1" value={form.duration} onChange={update('duration')} placeholder="e.g. 2" /></FormField>
        </div>
      </Panel>
      <Panel title="Storage conditions" text="Enter the current conditions for this product.">
        <div className="shelf-life-fields">
          <FormField label="Temperature (°C)"><input required type="number" step="0.1" min="-50" max="100" value={form.temperature} onChange={update('temperature')} placeholder="e.g. 4" /></FormField>
          <FormField label="Humidity (%)"><input required type="number" step="0.1" min="0" max="100" value={form.humidity} onChange={update('humidity')} placeholder="e.g. 68" /></FormField>
          <FormField label="Packaging">
            <select required value={form.packaging} onChange={update('packaging')}>
              <option value="">Select packaging</option>
              {SHELF_LIFE_PACKAGING.map(option => <option key={option}>{option}</option>)}
            </select>
          </FormField>
        </div>
      </Panel>
    </div>
    <div className="predict-actions">
      <button className="button primary" disabled={!canCreate || busy || !complete || batchesLoading} onClick={predict}>{creating ? 'Saving…' : 'Predict Shelf Life'}</button>
      {!canCreate && <small className="button-hint">Your role can view prediction history but cannot create or delete predictions.</small>}
      {validationMessage ? <p className="upload-error">{validationMessage}</p> : canCreate && !complete && <small className="button-hint">Select an inventory batch and complete the required storage fields to continue.</small>}
    </div>
    {prediction && <section className="prediction-results">
      <div className="prediction-heading">
        <div>
          <small>SHELF-LIFE PREDICTION</small>
          <h2>{productName || 'Selected batch'}</h2>
          <p>{[foodCategory, batchNumber ? `Batch ${batchNumber}` : ''].filter(Boolean).join(' · ')}</p>
        </div>
        <button className="button secondary" onClick={reset}>New Prediction</button>
      </div>
      {pending && <div className="prediction-summary"><b>Prediction pending model integration</b><p>{prediction.prediction_result?.message || 'The prediction record was created. A trained shelf-life model is not configured yet.'}</p></div>}
      <div className="prediction-grid">
        <article className="prediction-highlight"><span>Remaining Shelf Life</span><b>{remainingDisplay(prediction)}</b><small>{pending ? 'Unavailable until a trained model is configured' : 'Estimated remaining shelf life'}</small></article>
        <article className="prediction-stat"><span>Expiry Forecast</span><b>{expiryDisplay(prediction)}</b><small>Expected expiry date</small></article>
        <article className="prediction-stat"><span>Confidence Score</span><b>{confidenceDisplay(prediction)}</b><small>Model confidence</small></article>
      </div>
      <div className="storage-impact">
        <div>
          <small>STORAGE IMPACT</small>
          <h3>Current conditions</h3>
          <p>{pending ? 'Storage impact is not available until a trained shelf-life model is configured.' : (prediction.prediction_result?.message || 'Not available')}</p>
        </div>
        <div className="storage-readings">
          <span>Temperature<b>{conditionReading(prediction.temperature, '°C')}</b></span>
          <span>Humidity<b>{conditionReading(prediction.humidity, '%')}</b></span>
          <span>Packaging<b>{prediction.packaging || 'Not available'}</b></span>
        </div>
      </div>
    </section>}
    <Panel title="Prediction history" text={form.foodBatchId ? 'Persisted predictions for the selected inventory batch.' : 'Select an inventory batch to view persisted predictions.'}>
      <div className="shelf-history">
        {historyLoading ? <p className="button-hint">Loading prediction history…</p> : history.length ? history.map(entry => {
          const pendingEntry = isPendingPrediction(entry)
          return <div className="history-row" key={entry.id}>
            <div><b>Prediction #{entry.id}</b><small>{analysisDate(entry.predicted_at)}</small></div>
            <strong>{pendingEntry ? 'Pending' : remainingDisplay(entry)}</strong>
            <em className={'badge ' + (pendingEntry ? 'warning' : 'success')}>{pendingEntry ? 'Model pending' : 'Recorded'}</em>
            {canDelete && <button className="link delete" disabled={busy} onClick={() => removePrediction(entry.id)}>Delete</button>}
          </div>
        }) : <p className="button-hint">{form.foodBatchId ? 'No persisted predictions for this batch.' : 'Select an inventory batch to view persisted predictions.'}</p>}
      </div>
    </Panel>
  </>
}
function Analysis() { return <><Title title="Freshness analysis" text="Image-based assessment workflow." /><div className="grid"><Panel title="Image freshness analysis" text="Upload and AI integration will be connected later."><div className="signal"><span>Visual condition</span><b>40% weight</b></div><div className="signal"><span>Storage conditions</span><b>25% weight</b></div><div className="signal"><span>Shelf-life prediction</span><b>20% weight</b></div><div className="signal"><span>Product age</span><b>15% weight</b></div></Panel><Panel title="Freshness assessment" text="Analysis service integration is pending."><div className="signal"><span>Freshness category</span><b>Fresh</b></div><div className="signal"><span>Spoilage probability</span><b>8%</b></div><div className="signal"><span>Visual indicators</span><b>Color · Texture · Mold · Bruising</b></div></Panel></div></> }
const REPORT_TYPES = ['Freshness Report', 'Shelf-Life Report', 'Inventory Quality Report', 'Waste Reduction Report', 'Storage Compliance Report']
const reportError = error => {
  if (!(error instanceof ApiError)) return 'Unable to complete the report request.'
  if (error.status === 403) return 'Access denied. Your account cannot access this report.'
  if (error.status === 404) return error.message || 'The requested report was not found.'
  if (error.status === 409) return error.message || 'This report is not ready for export.'
  if (error.status === 422) return error.message || 'Please correct the report details.'
  return error.message || 'Unable to complete the report request.'
}
const reportCell = value => {
  if (value == null || value === '') return 'Not available'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map(item => reportCell(item)).join(', ')
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${reportCell(item)}`).join('; ')
  return String(value)
}
const flattenReportRecord = (value, prefix = '') => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return { [prefix || 'value']: reportCell(value) }
  return Object.entries(value).reduce((columns, [key, item]) => {
    const column = prefix ? `${prefix}.${key}` : key
    if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(columns, flattenReportRecord(item, column))
    else columns[column] = reportCell(item)
    return columns
  }, {})
}
const reportRecords = report => Array.isArray(report?.report_data?.records) ? report.report_data.records.filter(item => item && typeof item === 'object') : []
const reportSummary = report => (report?.report_data?.summary && typeof report.report_data.summary === 'object') ? report.report_data.summary : {}
const reportFilters = report => (report?.report_data?.filters && typeof report.report_data.filters === 'object') ? report.report_data.filters : {}
const prettyDate = date => {
  if (!date) return 'Not specified'
  const parsed = new Date(date.length <= 10 ? `${date}T00:00:00` : date)
  return Number.isNaN(parsed.getTime()) ? String(date) : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
const reportRange = report => (report?.date_from || report?.date_to) ? `${prettyDate(report.date_from)} – ${prettyDate(report.date_to)}` : 'Not specified'
const exportReady = report => report?.status === 'generated' && report?.report_data && typeof report.report_data === 'object' && !Array.isArray(report.report_data)

function Reports({ onUnauthorized }) {
  const [type, setType] = useState(REPORT_TYPES[0])
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [historyType, setHistoryType] = useState('')
  const [historyStatus, setHistoryStatus] = useState('')
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [generating, setGenerating] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [openingId, setOpeningId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const busy = generating || Boolean(exporting) || Boolean(openingId) || Boolean(deletingId)
  const handleError = caught => {
    if (caught instanceof ApiError && caught.status === 401) { auth.logout(); onUnauthorized(); return }
    setError(reportError(caught))
  }
  const loadHistory = async (silent = false) => {
    if (!silent) setHistoryLoading(true)
    try {
      setHistory(await reportsApi.getReports({
        report_type: historyType || undefined,
        status: historyStatus || undefined,
      }))
    } catch (requestError) { setHistory([]); handleError(requestError) }
    finally { if (!silent) setHistoryLoading(false) }
  }
  useEffect(() => { loadHistory() }, [historyType, historyStatus])
  const generate = async () => {
    if (start && end && start > end) { setError('Start date cannot be after end date.'); return }
    try {
      setGenerating(true); setError(''); setMessage('')
      const created = await reportsApi.createReport({
        report_type: type,
        date_from: start || undefined,
        date_to: end || undefined,
      })
      setCurrent(created)
      setMessage(`Report #${created.id} generated.`)
      await loadHistory(true)
    } catch (requestError) { handleError(requestError) }
    finally { setGenerating(false) }
  }
  const exportFile = async format => {
    if (!current?.id) { setError('Generate or select a report before exporting.'); return }
    if (!exportReady(current)) { setError('This report is not ready for export.'); return }
    try {
      setExporting(format); setError(''); setMessage('')
      if (format === 'pdf') await reportsApi.downloadPdf(current.id)
      else await reportsApi.downloadExcel(current.id)
      const refreshed = await reportsApi.getReport(current.id)
      setCurrent(refreshed)
      setHistory(currentHistory => currentHistory.map(item => item.id === refreshed.id ? refreshed : item))
      setMessage(`${format === 'pdf' ? 'PDF' : 'Excel'} export downloaded.`)
    } catch (requestError) { handleError(requestError) }
    finally { setExporting('') }
  }
  const openReport = async reportId => {
    try {
      setOpeningId(reportId); setError(''); setMessage('')
      setCurrent(await reportsApi.getReport(reportId))
    } catch (requestError) { handleError(requestError) }
    finally { setOpeningId(null) }
  }
  const removeReport = async reportId => {
    try {
      setDeletingId(reportId); setError(''); setMessage('')
      await reportsApi.deleteReport(reportId)
      if (current?.id === reportId) setCurrent(null)
      setMessage('Report deleted.')
      await loadHistory(true)
    } catch (requestError) { handleError(requestError) }
    finally { setDeletingId(null) }
  }
  const reset = () => { setType(REPORT_TYPES[0]); setStart(''); setEnd(''); setHistoryType(''); setHistoryStatus(''); setError(''); setMessage('') }
  const records = reportRecords(current)
  const flattened = records.map(record => flattenReportRecord(record))
  const columns = [...new Set(flattened.flatMap(record => Object.keys(record)))]
  const summary = reportSummary(current)
  const filters = reportFilters(current)
  const summaryEntries = Object.entries(summary)
  return <>
    <div className="heading reports-heading">
      <div>
        <small>REPORTING & EXPORT</small>
        <h1>Reports & Export</h1>
        <p>Generate and export food quality, freshness, shelf-life, inventory, waste, and storage reports.</p>
      </div>
      <div className="report-actions">
        <button className="button secondary" disabled={busy || !exportReady(current)} onClick={() => exportFile('pdf')}>{exporting === 'pdf' ? 'Downloading…' : 'Export PDF'}</button>
        <button className="button secondary" disabled={busy || !exportReady(current)} onClick={() => exportFile('excel')}>{exporting === 'excel' ? 'Downloading…' : 'Export Spreadsheet'}</button>
        <button className="button primary" disabled={busy} onClick={generate}>{generating ? 'Generating...' : 'Generate Report'}</button>
      </div>
    </div>
    <Panel title="Report filters" text="Choose a backend report type and optional source-data date range. History can also be filtered by type and status.">
      <div className="report-filters">
        <FormField label="Report Type"><select value={type} onChange={event => setType(event.target.value)}>{REPORT_TYPES.map(value => <option key={value}>{value}</option>)}</select></FormField>
        <FormField label="Start Date"><input type="date" value={start} onChange={event => setStart(event.target.value)} /></FormField>
        <FormField label="End Date"><input type="date" value={end} onChange={event => setEnd(event.target.value)} /></FormField>
        <FormField label="History type"><select value={historyType} onChange={event => setHistoryType(event.target.value)}><option value="">All types</option>{REPORT_TYPES.map(value => <option key={value}>{value}</option>)}</select></FormField>
        <FormField label="History status"><select value={historyStatus} onChange={event => setHistoryStatus(event.target.value)}><option value="">All statuses</option><option>generated</option><option>pending</option></select></FormField>
        <button className="button secondary report-reset" onClick={reset}>Reset Filters</button>
      </div>
    </Panel>
    {message && <div className="report-success" role="status">{message}</div>}
    {error && <p className="error inventory-note" role="alert">{error}</p>}
    <section className="report-information">
      <span><b>Selected report</b>{current ? current.report_type : 'None generated yet'}</span>
      <span><b>Report ID</b>{current ? `#${current.id}` : 'Not available'}</span>
      <span><b>Report status</b>{current?.status || 'Not available'}</span>
      <span><b>Generated</b>{current?.generated_at ? analysisDate(current.generated_at) : 'Not available'}</span>
    </section>
    <div className="report-metrics">
      <article className="report-metric"><small>Record count</small><b>{current ? current.record_count : '—'}</b><span>Returned by the API</span></article>
      <article className="report-metric"><small>Date range</small><b>{current ? reportRange(current) : '—'}</b><span>Source-data filter</span></article>
      <article className="report-metric"><small>PDF export</small><b>{current?.pdf_file_reference ? 'Available' : (exportReady(current) ? 'Ready to create' : 'Unavailable')}</b><span>Backend file reference</span></article>
      <article className="report-metric"><small>Excel export</small><b>{current?.excel_file_reference ? 'Available' : (exportReady(current) ? 'Ready to create' : 'Unavailable')}</b><span>Backend file reference</span></article>
      <article className="report-metric"><small>History</small><b>{historyLoading ? '…' : history.length}</b><span>Stored snapshots</span></article>
    </div>
    <div className="report-grid">
      <Panel title="Report summary" text="Values from the stored snapshot summary. No additional statistics are calculated in the browser.">
        {current ? (summaryEntries.length ? <div className="report-chart">{summaryEntries.map(([key, value]) => <div className="report-bar" key={key}><div><span>{key.replaceAll('_', ' ')}</span><b>{reportCell(value)}</b></div></div>)}</div> : <p className="button-hint">No summary values are present in this snapshot.</p>) : <p className="button-hint">Generate or select a report to view its stored summary.</p>}
      </Panel>
      <Panel title="Snapshot filters" text="Date filters stored with the generated report.">
        <div className="report-insight">
          {current ? <>
            <b>Status: {current.status}</b>
            <p>date_from: {reportCell(filters.date_from)} · date_to: {reportCell(filters.date_to)}</p>
            {!exportReady(current) && <p>Export is unavailable until the report status is generated and snapshot data is present.</p>}
          </> : <p>No report is selected.</p>}
        </div>
      </Panel>
    </div>
    <Panel title="Report data" text={current ? `${records.length} record${records.length === 1 ? '' : 's'} in the stored snapshot.` : 'Generate or select a report to view stored records.'}>
      <div className="table report-table">
        <table>
          <thead><tr>{columns.length ? columns.map(column => <th key={column}>{column}</th>) : <th>Records</th>}</tr></thead>
          <tbody>
            {current ? (flattened.length ? flattened.map((row, index) => <tr key={current.id + '-' + index}>{columns.map(column => <td key={column}>{row[column] || 'Not available'}</td>)}</tr>) : <tr><td className="report-empty" colSpan={Math.max(columns.length, 1)}>No records are present in this snapshot.</td></tr>) : <tr><td className="report-empty" colSpan="1">No report is selected.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
    <Panel title="Report history" text="Persisted report snapshots for the signed-in account, newest first.">
      <div className="table report-table">
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Records</th><th>Generated</th><th>PDF</th><th>Excel</th><th>Actions</th></tr></thead>
          <tbody>
            {historyLoading ? <tr><td className="report-empty" colSpan="8">Loading report history…</td></tr> : history.length ? history.map(item => <tr key={item.id} className={current?.id === item.id ? 'selected-report' : ''}>
              <td><b>#{item.id}</b></td>
              <td>{item.report_type}</td>
              <td><em className={'badge ' + (item.status === 'generated' ? 'success' : 'warning')}>{item.status}</em></td>
              <td>{item.record_count}</td>
              <td>{item.generated_at ? analysisDate(item.generated_at) : 'Not available'}</td>
              <td>{item.pdf_file_reference ? 'Saved' : 'Not exported'}</td>
              <td>{item.excel_file_reference ? 'Saved' : 'Not exported'}</td>
              <td className="inventory-actions">
                <button className="link" disabled={busy} onClick={() => openReport(item.id)}>{openingId === item.id ? 'Opening…' : 'View'}</button>
                <button className="link delete" disabled={busy} onClick={() => removeReport(item.id)}>{deletingId === item.id ? 'Deleting…' : 'Delete'}</button>
              </td>
            </tr>) : <tr><td className="report-empty" colSpan="8">No reports have been generated.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  </>
}
function Profile({ identity, role }) { return <><Title title="Profile" text="Workspace account." /><Panel title={identity} text={role}><div className="signal"><span>Access role</span><b>{role}</b></div></Panel></> }
