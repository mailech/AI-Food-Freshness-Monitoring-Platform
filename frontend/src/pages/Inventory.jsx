import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Fruits', 'Vegetables', 'Dairy Products', 'Meat & Poultry', 'Seafood', 'Bakery Products', 'Packaged Foods', 'Beverages'];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function ExpiryBadge({ expiryDate }) {
  const days = daysUntil(expiryDate);
  if (days === null) return <span className="text-ink-muted text-sm">No expiry set</span>;
  if (days < 0) return <span className="text-accent font-medium text-sm">Expired {Math.abs(days)}d ago</span>;
  if (days <= 3) return <span className="text-accent font-medium text-sm">{days}d left</span>;
  return <span className="text-primary font-medium text-sm">{days}d left</span>;
}

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'Fruits', quantity: 1, unit: 'units', batch_number: '', expiry_date: '', storage_location: ''
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadItems = () => {
    fetch('http://localhost:8000/food-items', { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => navigate('/login'));
  };

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    loadItems();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
    };
    await fetch('http://localhost:8000/food-items', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    setFormData({ name: '', category: 'Fruits', quantity: 1, unit: 'units', batch_number: '', expiry_date: '', storage_location: '' });
    setShowForm(false);
    loadItems();
  };

  const handleDelete = async (id) => {
    await fetch(`http://localhost:8000/food-items/${id}`, { method: 'DELETE', headers: authHeaders });
    loadItems();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Food Inventory</h1>
          <p className="text-ink-muted mt-1">{items.length} item{items.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary hover:bg-primary-hover text-white font-medium px-5 py-2.5 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 mb-8 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
            <input name="name" value={formData.name} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Category</label>
            <select name="category" value={formData.category} onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Quantity</label>
            <input name="quantity" type="number" step="0.01" value={formData.quantity} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Unit</label>
            <input name="unit" value={formData.unit} onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Batch number</label>
            <input name="batch_number" value={formData.batch_number} onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Expiry date</label>
            <input name="expiry_date" type="date" value={formData.expiry_date} onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1.5">Storage location</label>
            <input name="storage_location" value={formData.storage_location} onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition" />
          </div>
          <button type="submit" className="sm:col-span-2 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-lg transition">
            Save item
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-ink-muted">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-ink-muted">No items yet. Add your first one above.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-surface border-l-4 border-primary border-t border-r border-b border-border rounded-r-lg p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-display font-semibold text-ink">{item.name}</p>
                  <p className="text-sm text-ink-muted">{item.category}</p>
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-ink-muted hover:text-accent text-sm transition">
                  Delete
                </button>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-ink-muted">{item.quantity} {item.unit}{item.storage_location ? ` · ${item.storage_location}` : ''}</p>
                <ExpiryBadge expiryDate={item.expiry_date} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Inventory;