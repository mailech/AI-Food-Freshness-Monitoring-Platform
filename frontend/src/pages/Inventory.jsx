import React, { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  Thermometer,
  Droplets,
  Package,
  CheckCircle2,
  AlertCircle,
  ScanLine
} from "lucide-react";
import { Badge } from "../components/UI/Badge";
import { Modal } from "../components/UI/Modal";
import { Toast } from "../components/UI/Toast";
import { api } from "../services/api";

export const CATEGORIES = [
  "All",
  "Fruits",
  "Vegetables",
  "Dairy Products",
  "Meat & Poultry",
  "Seafood",
  "Bakery Products",
  "Packaged Foods",
  "Beverages",
];

export const STATUSES = [
  "All",
  "Fresh",
  "Good",
  "Acceptable",
  "Near Spoilage",
  "Spoiled",
];

export const Inventory = ({ onSelectFoodItem, initialSearch = "" }) => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState("expiry_date");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State for Add / Edit
  const initialForm = {
    name: "",
    category: "Fruits",
    batch_id: "",
    quantity: 10,
    unit: "kg",
    purchase_date: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    storage_temp: 4.0,
    humidity: 85.0,
    packaging_type: "Perforated Eco-Carton",
    image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
    freshness_status: "Fresh",
    freshness_score: 90,
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const data = await api.getFoods({
        category,
        status,
        search,
        sort_by: sortBy,
      });
      setFoods(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, [category, status, search, sortBy]);

  const handleOpenAdd = () => {
    setFormData({
      ...initialForm,
      batch_id: `BATCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item, e) => {
    e?.stopPropagation();
    setSelectedItem(item);
    setFormData({ ...item });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (item, e) => {
    e?.stopPropagation();
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    try {
      const newItem = await api.createFood(formData);
      setIsAddModalOpen(false);
      setToastMessage({ type: "success", text: `Successfully added ${newItem.name} to inventory!` });
      fetchFoods();
    } catch (err) {
      setToastMessage({ type: "error", text: "Failed to add food item." });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.updateFood(selectedItem.id, formData);
      setIsEditModalOpen(false);
      setToastMessage({ type: "success", text: `Updated ${formData.name} successfully!` });
      fetchFoods();
    } catch (err) {
      setToastMessage({ type: "error", text: "Failed to update food item." });
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteFood(selectedItem.id);
      setIsDeleteModalOpen(false);
      setToastMessage({ type: "success", text: `Deleted ${selectedItem.name} from inventory.` });
      fetchFoods();
    } catch (err) {
      setToastMessage({ type: "error", text: "Failed to delete item." });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            Food Inventory Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time batch tracking, sensory degradation metrics, and storage environment parameters.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Food Item</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name or batch ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Category */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="text-slate-400 hidden sm:inline">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="expiry_date" className="bg-slate-900 text-white">Expiry Date</option>
              <option value="freshness_score" className="bg-slate-900 text-white">Freshness Score</option>
              <option value="name" className="bg-slate-900 text-white">Food Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Food Items Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/70 border-b border-slate-700/70 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="py-3.5 px-4">Food Item</th>
                <th className="py-3.5 px-3">Batch ID</th>
                <th className="py-3.5 px-3">Quantity</th>
                <th className="py-3.5 px-3">Freshness Score</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Shelf Life</th>
                <th className="py-3.5 px-3">Expiry Date</th>
                <th className="py-3.5 px-3">Storage Temp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : foods.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    No food items match the current filters.
                  </td>
                </tr>
              ) : (
                foods.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectFoodItem(item)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Item */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700/80 flex-shrink-0 shadow"
                        />
                        <div>
                          <p className="font-bold text-white text-xs group-hover:text-emerald-400 transition-colors">
                            {item.name}
                          </p>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Batch ID */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                        {item.batch_id}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {item.quantity} {item.unit}
                    </td>

                    {/* Freshness Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-xs">{item.freshness_score}</span>
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                          <div
                            className={`h-full rounded-full ${
                              item.freshness_score >= 80
                                ? "bg-emerald-500"
                                : item.freshness_score >= 65
                                ? "bg-blue-500"
                                : item.freshness_score >= 50
                                ? "bg-amber-500"
                                : item.freshness_score >= 35
                                ? "bg-orange-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${item.freshness_score}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <Badge status={item.freshness_status} />
                    </td>

                    {/* Shelf life */}
                    <td className="py-3 px-3 font-semibold">
                      <span
                        className={
                          item.estimated_shelf_life_days <= 1
                            ? "text-red-400 font-bold"
                            : item.estimated_shelf_life_days <= 3
                            ? "text-amber-400 font-bold"
                            : "text-emerald-400"
                        }
                      >
                        {item.estimated_shelf_life_days} day{item.estimated_shelf_life_days !== 1 ? "s" : ""}
                      </span>
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3 px-3 text-slate-300 font-medium">
                      {item.expiry_date}
                    </td>

                    {/* Storage Temp */}
                    <td className="py-3 px-3 text-slate-300">
                      {item.storage_temp}°C <span className="text-[10px] text-slate-500">({item.humidity}%)</span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectFoodItem(item)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(item, e)}
                          title="Edit Item"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/80 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleOpenDelete(item, e)}
                          title="Delete Item"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/80 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD FOOD MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Food Item to Inventory"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Food Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Fuji Apples"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Batch ID *
              </label>
              <input
                type="text"
                required
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Unit *
                </label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="kg, crates, units"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                required
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Storage Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.storage_temp}
                onChange={(e) => setFormData({ ...formData, storage_temp: parseFloat(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Storage Humidity (% RH)
              </label>
              <input
                type="number"
                step="1"
                required
                value={formData.humidity}
                onChange={(e) => setFormData({ ...formData, humidity: parseFloat(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Packaging Type
            </label>
            <input
              type="text"
              value={formData.packaging_type}
              onChange={(e) => setFormData({ ...formData, packaging_type: e.target.value })}
              placeholder="e.g. Vented Crate, Vacuum Pack"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Image URL / Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Food Item Image URL
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all"
            >
              Save Food Item
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT FOOD MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${selectedItem?.name || "Food Item"}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Food Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Freshness Status
              </label>
              <select
                value={formData.freshness_status}
                onChange={(e) => setFormData({ ...formData, freshness_status: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {STATUSES.filter((s) => s !== "All").map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Inventory Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to remove <strong className="text-white">{selectedItem?.name}</strong> (Batch: {selectedItem?.batch_id}) from the active database? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-lg shadow-red-500/25 transition-all"
            >
              Delete Item
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
