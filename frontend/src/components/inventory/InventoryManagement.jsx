import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  Plus,
  Search,
  Clock,
  Trash2,
  Apple,
  Milk,
  Beef,
  Fish,
  Croissant,
  Package,
  Coffee,
  Salad
} from 'lucide-react';

export const InventoryManagement = () => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'batches'
  const [loading, setLoading] = useState(true);

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('fruits');
  const [newItemQty, setNewItemQty] = useState(10);
  const [newItemFreshness, setNewItemFreshness] = useState(90);

  const categoryIcons = {
    fruits: Apple,
    vegetables: Salad,
    dairy_products: Milk,
    meat_poultry: Beef,
    seafood: Fish,
    bakery_products: Croissant,
    packaged_foods: Package,
    beverages: Coffee
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const [itemsData, catsData, batchesData] = await Promise.all([
        api.getInventory(params),
        api.getCategories(),
        api.getBatches()
      ]);
      setItems(itemsData);
      setCategories(catsData);
      setBatches(batchesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, searchQuery]);

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await api.createInventoryItem({
        name: newItemName,
        category: newItemCategory,
        quantity_kg: parseFloat(newItemQty),
        freshness_score: parseFloat(newItemFreshness),
        storage_location_id: 1,
        packaging_type: 'plastic_wrap'
      }, token);

      setShowAddModal(false);
      setNewItemName('');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Delete this food item from inventory?')) {
      try {
        await api.deleteItem(id, token);
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getFreshnessBadge = (score) => {
    if (score >= 80) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-800 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-rose-800 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
            Food Inventory & Logistics Batches
          </h1>
          <p className="text-xs sm:text-sm text-[#717171] mt-1">
            Tracking produce across all 8 mandatory food categories with automated FEFO rotation priority.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-md self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Produce Item
        </button>
      </div>

      {/* Airbnb-style Horizontal Scrollable Category Filter Bar */}
      <div className="border-b border-[#EBEBEB] pb-4">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
              selectedCategory === ''
                ? 'bg-[#222222] text-white shadow-sm'
                : 'bg-white text-[#717171] border border-[#EBEBEB] hover:border-[#CCCCCC]'
            }`}
          >
            <span>All Categories (8)</span>
          </button>
          {categories.map((c) => {
            const Icon = categoryIcons[c.id] || Package;
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-[#717171] border border-[#EBEBEB] hover:border-[#CCCCCC]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{c.name.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Header / Search & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-[#F0F0F0] rounded-full border border-[#E5E5E5] text-xs font-semibold self-start">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-1.5 rounded-full transition ${
              activeTab === 'items' ? 'bg-white text-[#222222] shadow-sm font-bold' : 'text-[#717171]'
            }`}
          >
            Active Produce ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-4 py-1.5 rounded-full transition ${
              activeTab === 'batches' ? 'bg-white text-[#222222] shadow-sm font-bold' : 'text-[#717171]'
            }`}
          >
            Logistics Batches ({batches.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search produce or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-2xl focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Items View */}
      {activeTab === 'items' ? (
        <div className="bg-white rounded-3xl border border-[#EBEBEB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#717171] uppercase tracking-wider font-bold">
                  <th className="p-4">Produce & SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">Freshness Score</th>
                  <th className="p-4">Expiry Projection</th>
                  <th className="p-4">FEFO Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#999999]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="mt-2 text-xs">Loading items...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#999999]">
                      No produce found matching criteria.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isExpiringSoon = item.freshness_score < 60;
                    return (
                      <tr key={item.id} className="hover:bg-[#F9F9F9] transition">
                        <td className="p-4">
                          <p className="font-bold text-[#222222]">{item.name}</p>
                          <p className="text-[10px] font-mono text-[#999999]">SKU: {item.sku}</p>
                        </td>
                        <td className="p-4">
                          <span className="capitalize text-[#555555] font-semibold">
                            {item.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-[#222222]">{item.quantity_kg} kg</span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full font-extrabold font-mono text-xs border ${getFreshnessBadge(
                              item.freshness_score
                            )}`}
                          >
                            {item.freshness_score}%
                          </span>
                        </td>
                        <td className="p-4 text-[#555555]">
                          {item.expected_expiry_date
                            ? new Date(item.expected_expiry_date).toLocaleDateString()
                            : '7 Days'}
                        </td>
                        <td className="p-4">
                          {isExpiringSoon ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] uppercase flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3" /> Priority FEFO
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold text-[10px] uppercase">
                              Optimal
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-rose-50 rounded-xl text-[#999999] hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Batches View */
        <div className="bg-white rounded-3xl border border-[#EBEBEB] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#717171] uppercase tracking-wider font-bold">
                  <th className="p-4">Batch Lot Number</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Received Date</th>
                  <th className="p-4">Inspection Status</th>
                  <th className="p-4">Inspector Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F9F9F9] transition">
                    <td className="p-4 font-mono font-bold text-[#222222]">{b.batch_number}</td>
                    <td className="p-4 text-[#555555]">{b.supplier_name}</td>
                    <td className="p-4 font-bold text-[#222222]">{b.quantity} {b.unit}</td>
                    <td className="p-4 text-[#717171]">{new Date(b.received_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          b.inspection_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : b.inspection_status === 'quarantined'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : b.inspection_status === 'discarded'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {b.inspection_status}
                      </span>
                    </td>
                    <td className="p-4 text-[#717171] max-w-xs truncate">
                      {b.inspector_notes || 'Pending formal review.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Item Modal (Airbnb Card Style) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 border border-[#EBEBEB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <h3 className="font-bold text-[#222222] text-lg">Register Food Produce Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F0F0F0] text-[#717171] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#222222] font-bold block mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Organic Honeycrisp Apples"
                  className="w-full border border-[#CCCCCC] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="text-[#222222] font-bold block mb-1">Category</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full border border-[#CCCCCC] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-600 capitalize bg-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#222222] font-bold block mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full border border-[#CCCCCC] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[#222222] font-bold block mb-1">Initial Freshness %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newItemFreshness}
                    onChange={(e) => setNewItemFreshness(e.target.value)}
                    className="w-full border border-[#CCCCCC] rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#222222] rounded-xl font-bold transition border border-[#DDDDDD]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
