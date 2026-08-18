import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Trash2, 
  Thermometer, 
  Droplets,
  Calendar,
  AlertTriangle,
  Info,
  X,
  FileCheck2,
  Warehouse
} from 'lucide-react';

interface FoodCategory {
  id: string;
  name: string;
  ideal_temp_min: number;
  ideal_temp_max: number;
  ideal_humidity_min: number;
  ideal_humidity_max: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category_id: string;
  quantity: number;
  unit: string;
  added_at: string;
  expiry_date: string;
  status: string;
  freshness_score: number;
  storage_temp: number | null;
  storage_humidity: number | null;
  category: FoodCategory;
  recommendations?: string[];
}

const InventoryPage: React.FC = () => {
  
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Add item form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [temp, setTemp] = useState(20);
  const [humidity, setHumidity] = useState(60);
  
  // Details Modal state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Log telemetry state
  const [logItem, setLogItem] = useState<InventoryItem | null>(null);
  const [logTemp, setLogTemp] = useState(20);
  const [logHumid, setLogHumid] = useState(60);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Categories triggers auto-seed on backend if empty
      const catRes = await axios.get('/api/batches/categories');
      setCategories(catRes.data);
      if (catRes.data.length > 0) {
        setCategoryId(catRes.data[0].id);
      }
      
      const invRes = await axios.get('/api/inventory');
      setItems(invRes.data);
    } catch (error) {
      console.error("Error loading inventory setup:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredInventory = async () => {
    try {
      const params: any = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (search) params.search = search;
      
      const res = await axios.get('/api/inventory', { params });
      setItems(res.data);
    } catch (err) {
      console.error("Error applying filters:", err);
    }
  };

  useEffect(() => {
    fetchFilteredInventory();
  }, [selectedCategory, selectedStatus, search]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/inventory', {
        name,
        category_id: categoryId,
        quantity,
        unit,
        expiry_date: new Date(expiryDate).toISOString(),
        storage_temp: temp,
        storage_humidity: humidity
      });
      
      setItems(prev => [res.data, ...prev]);
      setShowAddModal(false);
      // Reset form
      setName('');
      setQuantity(1);
      setExpiryDate('');
    } catch (error) {
      alert("Failed to create inventory item. Ensure expiry date is in the future.");
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await axios.delete(`/api/inventory/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleShowDetails = async (item: InventoryItem) => {
    try {
      const res = await axios.get(`/api/inventory/${item.id}`);
      setSelectedItem(res.data);
    } catch (err) {
      setSelectedItem(item); // Fallback
    }
  };

  const handleLogTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logItem) return;
    try {
      await axios.post(`/api/inventory/${logItem.id}/logs`, {
        inventory_item_id: logItem.id,
        temperature: logTemp,
        humidity: logHumid
      });
      
      // Update local state
      setItems(prev => 
        prev.map(i => i.id === logItem.id ? { ...i, storage_temp: logTemp, storage_humidity: logHumid } : i)
      );
      setLogItem(null);
    } catch (error) {
      alert("Failed to submit logs.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Active Inventory</h1>
          <p className="text-xs text-slate-400">Scan produce, view decay status, and optimize storage parameters.</p>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-glow"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* Filters Panel */}
      <div className="glass-panel p-4 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        
        {/* Search bar input */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
          <input 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items by name..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl glass-input text-sm"
          />
        </div>

        {/* Categories select */}
        <div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none bg-slate-900"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status select */}
        <div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="Fresh">Fresh</option>
            <option value="Decaying">Decaying</option>
            <option value="Spoiled">Spoiled</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Accessing inventories...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center">
          <Warehouse className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-slate-300">Inventory Empty</h3>
          <p className="text-slate-500 text-xs mt-1">There are no items matching the query. Add an item to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => {
            let freshnessColor = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
            if (item.status === 'Spoiled' || item.status === 'Expired') {
              freshnessColor = 'text-red-400 bg-red-500/10 border border-red-500/20';
            } else if (item.status === 'Decaying') {
              freshnessColor = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
            }
            
            return (
              <div 
                key={item.id}
                onClick={() => handleShowDetails(item)}
                className="glass-panel p-5 rounded-3xl hover:border-slate-550 transition-all cursor-pointer flex flex-col justify-between group relative"
              >
                {/* Trash button */}
                <button 
                  onClick={(e) => handleDeleteItem(item.id, e)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/10 hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                        {item.category.name}
                      </span>
                      <h3 className="font-extrabold text-lg truncate pr-8">{item.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-850 pt-3">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-indigo-400" />
                      <span>{item.quantity} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>Exp: {new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-800/20 px-2.5 py-1 rounded-xl">
                      <Thermometer className="w-3.5 h-3.5" />
                      <span>{item.storage_temp !== null ? `${item.storage_temp}°C` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-800/20 px-2.5 py-1 rounded-xl">
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      <span>{item.storage_humidity !== null ? `${item.storage_humidity}%` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-850 pt-3 mt-4">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${freshnessColor}`}>
                    {item.status}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogItem(item);
                        setLogTemp(item.storage_temp || 20);
                        setLogHumid(item.storage_humidity || 60);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800/40 text-[10px] text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors border border-transparent hover:border-indigo-500/35"
                    >
                      Log Environmental Values
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg glass-panel p-6 rounded-3xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-xl">Create Inventory Record</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">Produce Item Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="Fresh Bananas, Pork Loin..."
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Food Category</label>
                  <select 
                    value={categoryId} 
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none bg-slate-900"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Expiry Date</label>
                  <input 
                    type="date" 
                    required 
                    value={expiryDate} 
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Quantity</label>
                  <input 
                    type="number" 
                    required 
                    min="0.1" 
                    step="0.1"
                    value={quantity} 
                    onChange={e => setQuantity(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Quantity Unit</label>
                  <input 
                    type="text" 
                    required 
                    value={unit} 
                    onChange={e => setUnit(e.target.value)}
                    placeholder="pcs, kg, liters"
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Ambient Storage Temp (°C)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={temp} 
                    onChange={e => setTemp(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">Ambient Humidity (%)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={humidity} 
                    onChange={e => setHumidity(parseFloat(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:opacity-90 text-white rounded-2xl font-bold shadow-lg"
              >
                Record Produce
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Log Telemetry Modal */}
      {logItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm glass-panel p-6 rounded-3xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg">Log Storage Conditions</h3>
              <button onClick={() => setLogItem(null)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">Log environmental sensor metrics for <strong>{logItem.name}</strong>.</p>

            <form onSubmit={handleLogTelemetry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Temperature (°C)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={logTemp} 
                  onChange={e => setLogTemp(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Humidity (%)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  value={logHumid} 
                  onChange={e => setLogHumid(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg"
              >
                Submit Sensor Reading
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Details & Recommendation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl glass-panel p-6 rounded-3xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  {selectedItem.category.name} Details
                </span>
                <h3 className="font-extrabold text-xl">{selectedItem.name}</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Properties */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wide">Freshness Score</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-3xl font-black text-slate-100">{selectedItem.freshness_score}%</span>
                    <span className="text-xs text-slate-400">Score of composite visual indicators</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-800/20 rounded-2xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Ambient Temp</span>
                    <p className="font-bold text-sm mt-0.5">{selectedItem.storage_temp !== null ? `${selectedItem.storage_temp}°C` : 'N/A'}</p>
                  </div>
                  <div className="p-3 bg-slate-800/20 rounded-2xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Ambient Humidity</span>
                    <p className="font-bold text-sm mt-0.5">{selectedItem.storage_humidity !== null ? `${selectedItem.storage_humidity}%` : 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-500 font-bold uppercase">Expected Expiry Date</span>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold">{new Date(selectedItem.expiry_date).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Recommendations */}
              <div className="space-y-3">
                <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>Storage Optimization Tips</span>
                </h4>
                
                <div className="space-y-2">
                  {selectedItem.recommendations && selectedItem.recommendations.length > 0 ? (
                    selectedItem.recommendations.map((rec, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-2xl text-xs leading-relaxed flex items-start gap-2.5 ${
                          rec.startsWith('WARNING') || rec.includes('Mold') 
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                            : 'bg-indigo-500/10 border border-indigo-500/20 text-slate-300'
                        }`}
                      >
                        {rec.startsWith('WARNING') ? (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                        ) : (
                          <FileCheck2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
                        )}
                        <span>{rec}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No recommendations calculated.</p>
                  )}
                </div>
              </div>

            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
};

export default InventoryPage;
