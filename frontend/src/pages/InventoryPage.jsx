import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import InventoryTable from '../components/InventoryTable'
import AlertBanner, { useToast } from '../components/AlertBanner'

const categories = ['Fruits','Vegetables','Dairy Products','Meat & Poultry','Seafood','Bakery Products','Packaged Foods','Beverages']

export default function InventoryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ name: '', category: 'Fruits', quantity: 1, unit: 'pieces', barcode: '', description: '' })
  const { toasts, addToast, dismissToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => { loadItems() }, [filter])

  const loadItems = () => {
    const params = filter ? `?category=${filter}` : ''
    api.get(`/inventory/items${params}`).then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  const addItem = async e => {
    e.preventDefault()
    try {
      await api.post('/inventory/items', form)
      addToast('Item added successfully!', 'success')
      setShowForm(false)
      setForm({ name: '', category: 'Fruits', quantity: 1, unit: 'pieces', barcode: '', description: '' })
      loadItems()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to add item', 'error')
    }
  }

  const deleteItem = async id => {
    try {
      await api.delete(`/inventory/items/${id}`)
      addToast('Item removed', 'success')
      loadItems()
    } catch { addToast('Failed to delete', 'error') }
  }

  const analyzeItem = item => navigate('/analysis')

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="page-container animate-in">
      <AlertBanner alerts={toasts} onDismiss={dismissToast} />
      <div className="flex-between" style={{marginBottom:24}}>
        <div className="page-header" style={{marginBottom:0}}>
          <h1>📦 Inventory</h1>
          <p>Manage your food items and batches</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Item'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card animate-in" style={{marginBottom:24}}>
          <h3 style={{marginBottom:16}}>Add New Food Item</h3>
          <form onSubmit={addItem}>
            <div className="grid-3" style={{gap:16,marginBottom:16}}>
              <div className="input-group">
                <label>Name</label>
                <input className="input-field" placeholder="e.g. Red Apples" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Category</label>
                <select className="input-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Quantity</label>
                <input className="input-field" type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>Unit</label>
                <select className="input-field" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                  {['pieces','kg','lbs','liters','packs','boxes','bunches'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Barcode</label>
                <input className="input-field" placeholder="Optional" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Description</label>
                <input className="input-field" placeholder="Optional" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Add Item</button>
          </form>
        </div>
      )}

      <div className="flex gap-8" style={{marginBottom:20,flexWrap:'wrap'}}>
        <button className={`btn ${!filter ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter('')}>All</button>
        {categories.map(c => (
          <button key={c} className={`btn ${filter === c ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      <InventoryTable items={items} onDelete={deleteItem} onAnalyze={analyzeItem} />
    </div>
  )
}
