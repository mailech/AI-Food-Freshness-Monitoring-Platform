import { useEffect, useState } from 'react'
import Auth from './components/Auth'
import * as auth from './services/auth'
import { ApiError } from './services/api'
import * as inventoryApi from './services/inventory'
import * as freshnessApi from './services/freshness'
import * as shelfLifeApi from './services/shelfLife'
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
const toSession = user => ({ ...user, identity: user.name })
const allowedFor = role => {
  if (role === 'Consumer') return ['dashboard', 'inventory', 'analysis', 'shelfLife', 'alerts', 'recommendations', 'profile']
  if (role === 'Food Quality Inspector') return ['dashboard', 'inventory', 'analysis', 'shelfLife', 'alerts', 'recommendations', 'reports', 'profile']
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
        {page === 'shelfLife' && <ShelfLife role={session.role} onUnauthorized={() => setSession(null)} />}
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
const canManageFreshness = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
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
  const editable = canManageFreshness(role)
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
      <Panel title="Food information" text="Select the real inventory batch for this analysis."><div className="analysis-fields"><FormField label="Food batch"><select value={foodBatchId} onChange={selectBatch}><option value="">Select an inventory batch</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.food_item.name} · {batch.batch_number}</option>)}</select></FormField><FormField label="Food/Product Name"><input value={productName} readOnly placeholder="Selected from the batch" /></FormField><FormField label="Category"><input value={foodCategory} readOnly /></FormField></div><button className="button primary analyze-button" disabled={!editable || loading || !image || !foodBatchId} onClick={analyze}>{loading ? 'Uploading…' : 'Analyze Freshness'}</button>{!editable && <small className="button-hint">Your role can view analysis history but cannot create or delete analyses.</small>}{validationMessage ? <p className="upload-error">{validationMessage}</p> : (!image || !foodBatchId) && <small className="button-hint">Select an inventory batch and image to begin.</small>}</Panel>
    </div>
    {result && <section className="analysis-results"><div className="analysis-results-heading"><div><small>FRESHNESS ASSESSMENT</small><h2>Freshness Assessment</h2><p>Product: {productName}</p></div><button className="button secondary" onClick={reset}>New Analysis</button></div>{analysisStatus(result) === 'pending_model_integration' ? <div className="analysis-summary"><b>Analysis pending model integration</b><p>{result.analysis_result?.message || 'The image was stored and the analysis record was created. A trained freshness model is not configured yet.'}</p></div> : <div className="result-grid"><article className="result-score"><span>Freshness Score</span><b>{result.freshness_score ?? 'Not available'}</b></article><article className="result-stat"><span>Quality classification</span><b>{result.freshness_category ?? 'Not available'}</b></article><article className="result-stat"><span>Spoilage probability</span><b>{result.spoilage_probability ?? 'Not available'}</b></article></div>}</section>}
    <Panel title="Analysis history" text={foodBatchId ? 'Persisted analyses for the selected inventory batch.' : 'Select an inventory batch to view persisted analyses.'}><div className="analysis-history">{historyLoading ? <p className="button-hint">Loading analysis history…</p> : history.length ? history.map(entry => <div className="history-row" key={entry.id}><div><b>Analysis #{entry.id}</b><small>{analysisDate(entry.analyzed_at)}</small></div><strong>{analysisStatus(entry) === 'pending_model_integration' ? 'Pending' : entry.freshness_score ?? 'N/A'}</strong><em className="badge warning">{analysisStatus(entry) === 'pending_model_integration' ? 'Model pending' : entry.freshness_category ?? 'No category'}</em>{editable && <button className="link delete" disabled={loading} onClick={() => removeAnalysis(entry.id)}>Delete</button>}</div>) : <p className="button-hint">No persisted analyses for this batch.</p>}</div></Panel>
  </>
}
function Indicator({ name, result, tone }) { return <article className="indicator"><i className={tone}>●</i><span><b>{name}</b><small>{result}</small></span></article> }
const emptyShelfLifeForm = () => ({ foodBatchId: '', duration: '', temperature: '', humidity: '', packaging: '' })
const SHELF_LIFE_PACKAGING = ['Open', 'Plastic', 'Paper', 'Vacuum Sealed', 'Airtight Container']
const canManageShelfLife = role => ['Retail Manager', 'Warehouse Operator', 'Food Quality Inspector', 'Administrator'].includes(role)
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
  const editable = canManageShelfLife(role)
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
      <button className="button primary" disabled={!editable || busy || !complete || batchesLoading} onClick={predict}>{creating ? 'Saving…' : 'Predict Shelf Life'}</button>
      {!editable && <small className="button-hint">Your role can view prediction history but cannot create or delete predictions.</small>}
      {validationMessage ? <p className="upload-error">{validationMessage}</p> : editable && !complete && <small className="button-hint">Select an inventory batch and complete the required storage fields to continue.</small>}
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
            {editable && <button className="link delete" disabled={busy} onClick={() => removePrediction(entry.id)}>Delete</button>}
          </div>
        }) : <p className="button-hint">{form.foodBatchId ? 'No persisted predictions for this batch.' : 'Select an inventory batch to view persisted predictions.'}</p>}
      </div>
    </Panel>
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