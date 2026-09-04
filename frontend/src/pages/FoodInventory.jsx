import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Package, Calendar, Tag } from 'lucide-react';

export default function FoodInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fruits',
    quantity: 1
  });

  const fetchItems = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/food-items/');
      setItems(response.data);
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/food-items/', formData);
      setFormData({ name: '', category: 'Fruits', quantity: 1 });
      fetchItems();
    } catch (error) {
      console.error("Failed to add item", error);
    }
  };

  const categories = [
    "Fruits", "Vegetables", "Dairy Products", 
    "Meat & Poultry", "Seafood", "Bakery Products", 
    "Packaged Foods", "Beverages"
  ];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Food Inventory</h2>
        <p className="text-gray-500 mt-1">Manage and track your registered food items and batches.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Item Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-green-600" /> Register New Item
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Organic Apples"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity / Batches</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" 
                  value={formData.quantity} 
                  onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-green-600 text-white font-medium p-3 rounded-lg hover:bg-green-700 transition-colors mt-2"
              >
                Add to Inventory
              </button>
            </form>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-blue-600" /> Current Stock
              </h3>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                {items.length} Items Total
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Product Details</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Qty</th>
                    <th className="p-4 font-medium">Added On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400">Loading inventory...</td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400">No items found. Register your first batch.</td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm text-gray-500 font-mono">#{item.id}</td>
                        <td className="p-4 font-medium text-gray-800">{item.name}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-md font-medium">
                            <Tag size={12} /> {item.category}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{item.quantity}</td>
                        <td className="p-4 text-sm text-gray-500 flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(item.purchase_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}