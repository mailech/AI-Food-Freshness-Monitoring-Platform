'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Allowed Categories
const CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy Products',
  'Meat & Poultry',
  'Seafood',
  'Bakery Products',
  'Packaged Foods',
  'Beverages',
];

interface BatchType {
  id: string;
  batch_number: string;
  supplier_name: string;
  received_date: string;
}

interface InventoryItemType {
  id: string;
  name: string;
  category: string;
  batch_id: string;
  batch?: BatchType;
  quantity: number;
  unit: string;
  packaging_type?: string;
  entry_date: string;
  expiry_date: string;
  status: string;
  storage_location?: string;
}

const INITIAL_BATCHES: BatchType[] = [
  { id: 'b1', batch_number: 'LOT-20260809-01', supplier_name: 'GreenValley Co.', received_date: '2026-08-09T08:00:00Z' },
  { id: 'b2', batch_number: 'LOT-20260809-02', supplier_name: 'Anchor Dairy Ltd.', received_date: '2026-08-08T10:00:00Z' },
  { id: 'b3', batch_number: 'LOT-20260809-03', supplier_name: 'Pacific Catch Farms', received_date: '2026-08-07T11:00:00Z' },
];

const INITIAL_ITEMS: InventoryItemType[] = [
  { id: 'i1', name: 'Organic Red Apples', category: 'Fruits', batch_id: 'b1', batch: INITIAL_BATCHES[0], quantity: 120, unit: 'kg', packaging_type: 'Cartboard Box', entry_date: '2026-08-09T00:00:00Z', expiry_date: '2026-08-25T00:00:00Z', status: 'FRESH', storage_location: 'Cold Storage Room 1' },
  { id: 'i2', name: 'Fresh Whole Milk', category: 'Dairy Products', batch_id: 'b2', batch: INITIAL_BATCHES[1], quantity: 90, unit: 'liters', packaging_type: 'Plastic Jug', entry_date: '2026-08-08T00:00:00Z', expiry_date: '2026-08-11T00:00:00Z', status: 'WARNING', storage_location: 'Cold Storage Room 1' },
  { id: 'i3', name: 'Fresh Atlantic Salmon', category: 'Seafood', batch_id: 'b3', batch: INITIAL_BATCHES[2], quantity: 15, unit: 'kg', packaging_type: 'Vacuum Sealed', entry_date: '2026-08-07T00:00:00Z', expiry_date: '2026-08-08T00:00:00Z', status: 'SPOIRED', storage_location: 'Deep Freezer Unit 3' },
];

// Zone sensor history data
const SENSOR_HISTORY: Record<string, { time: string; temp: number; humidity: number }[]> = {
  'Zone A': [
    { time: '08:00', temp: 2.1, humidity: 85 },
    { time: '09:00', temp: 2.3, humidity: 84 },
    { time: '10:00', temp: 2.5, humidity: 83 },
    { time: '11:00', temp: 2.4, humidity: 84 },
    { time: '12:00', temp: 2.4, humidity: 84 },
  ],
  'Zone B': [
    { time: '08:00', temp: -18.4, humidity: 55 },
    { time: '09:00', temp: -18.2, humidity: 56 },
    { time: '10:00', temp: -18.0, humidity: 55 },
    { time: '11:00', temp: -18.1, humidity: 55 },
    { time: '12:00', temp: -18.1, humidity: 55 },
  ],
  'Zone C': [
    { time: '08:00', temp: 15.1, humidity: 40 },
    { time: '09:00', temp: 16.0, humidity: 41 },
    { time: '10:00', temp: 17.5, humidity: 44 }, // drift alarm!
    { time: '11:00', temp: 16.8, humidity: 43 },
    { time: '12:00', temp: 16.5, humidity: 42 },
  ]
};

export default function WarehouseDashboard() {
  const [currentRole, setCurrentRole] = useState('WAREHOUSE_OPERATOR');
  const [items, setItems] = useState<InventoryItemType[]>(INITIAL_ITEMS);
  const [batches, setBatches] = useState<BatchType[]>(INITIAL_BATCHES);

  // Search/Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedZone, setSelectedZone] = useState<'Zone A' | 'Zone B' | 'Zone C'>('Zone A');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Fruits',
    batch_id: '',
    quantity: 1,
    unit: 'kg',
    packaging_type: 'None',
    expiry_date: '',
    storage_location: 'Cold Storage Room 1',
  });

  const zones = [
    { id: 'Zone A' as const, name: 'Cold Storage Room 1', temp: '2.4°C', humidity: '84%', sensorStatus: 'ONLINE', target: 'Fruits & Veg', idealTemp: '0°C to 4°C' },
    { id: 'Zone B' as const, name: 'Deep Freezer Unit 3', temp: '-18.1°C', humidity: '55%', sensorStatus: 'ONLINE', target: 'Meat & Seafood', idealTemp: '-20°C to -15°C' },
    { id: 'Zone C' as const, name: 'Dry Storage Hall A', temp: '16.5°C', humidity: '42%', sensorStatus: 'ALERT', target: 'Grains & Pantry', idealTemp: '15°C to 20°C' },
  ];

  const canWrite = () => {
    return currentRole === 'WAREHOUSE_OPERATOR' || currentRole === 'RETAIL_MANAGER' || currentRole === 'ADMIN';
  };

  const getDaysLeft = (expiryDateStr: string) => {
    const exp = new Date(expiryDateStr);
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDynamicStatus = (expiryDateStr: string) => {
    const daysLeft = getDaysLeft(expiryDateStr);
    if (daysLeft < 0) return 'SPOILED';
    if (daysLeft <= 3) return 'WARNING';
    return 'FRESH';
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert('Action Denied: You do not have permissions to modify items.');
      return;
    }

    const matchedBatch = batches.find(b => b.id === itemForm.batch_id);
    const itemStatus = getDynamicStatus(itemForm.expiry_date + 'T12:00:00Z');

    if (editingItem) {
      setItems(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            ...itemForm,
            batch: matchedBatch,
            status: itemStatus,
            expiry_date: itemForm.expiry_date + 'T12:00:00Z',
          };
        }
        return item;
      }));
    } else {
      const newItem = {
        id: 'i_' + Date.now(),
        ...itemForm,
        batch: matchedBatch,
        entry_date: new Date().toISOString(),
        expiry_date: itemForm.expiry_date + 'T12:00:00Z',
        status: itemStatus,
      };
      setItems(prev => [newItem, ...prev]);
    }
    setIsItemModalOpen(false);
  };

  const openAddModal = () => {
    if (!canWrite()) {
      alert('Action Denied: Read-only guest rights restrict edits.');
      return;
    }
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Fruits',
      batch_id: batches[0]?.id || '',
      quantity: 1,
      unit: 'kg',
      packaging_type: 'None',
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      storage_location: 'Cold Storage Room 1',
    });
    setIsItemModalOpen(true);
  };

  const openEditModal = (item: any) => {
    if (!canWrite()) {
      alert('Action Denied: Read-only guest rights restrict edits.');
      return;
    }
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      batch_id: item.batch_id || '',
      quantity: item.quantity,
      unit: item.unit,
      packaging_type: item.packaging_type || 'None',
      expiry_date: item.expiry_date.split('T')[0],
      storage_location: item.storage_location || 'Cold Storage Room 1',
    });
    setIsItemModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canWrite()) {
      alert('Action Denied: You do not have permissions to delete items.');
      return;
    }
    if (confirm('Are you sure you want to remove this item?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.batch?.batch_number.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate coordinates for Temperature drift SVG polyline
  const getTempCoords = (zone: 'Zone A' | 'Zone B' | 'Zone C') => {
    const data = SENSOR_HISTORY[zone] || [];
    const min = zone === 'Zone B' ? -25 : 0;
    const max = zone === 'Zone B' ? -10 : 25;
    const range = max - min;
    
    return data.map((d, i) => {
      const x = 50 + i * 110;
      const pct = (d.temp - min) / range;
      const y = 160 - pct * 120;
      return `${x},${y}`;
    }).join(' ');
  };

  // Calculate coordinates for Humidity drift SVG polyline
  const getHumCoords = (zone: 'Zone A' | 'Zone B' | 'Zone C') => {
    const data = SENSOR_HISTORY[zone] || [];
    return data.map((d, i) => {
      const x = 50 + i * 110;
      const pct = d.humidity / 100.0;
      const y = 160 - pct * 120;
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 p-6 selection:bg-amber-500 selection:text-slate-955">
      {/* Role Toggle Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <h4 className="font-bold text-white text-sm">Sandbox Role Simulator</h4>
            <p className="text-xs text-slate-400">Simulate active session context to evaluate role-based access policies (RBAC).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentRole('CONSUMER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentRole === 'CONSUMER' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Consumer (Read-Only)
          </button>
          <button
            onClick={() => setCurrentRole('WAREHOUSE_OPERATOR')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentRole === 'WAREHOUSE_OPERATOR' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Warehouse Operator (Write Allowed)
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-900 gap-4">
        <div>
          <span className="text-amber-500 text-xs font-semibold uppercase tracking-wider">Role: Warehouse Operations</span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">Industrial Storage Monitoring</h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time IoT sensors, climate compliance monitoring, and environmental diagnostics.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/reports" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium text-amber-500">
            📊 Reports Hub
          </Link>
          <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium">
            Portal Hub
          </Link>
          {canWrite() && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-xl text-sm text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition duration-150"
            >
              + Register Bulk Item
            </button>
          )}
        </div>
      </header>

      {/* Storage Zones Gird Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {zones.map((zone) => (
          <div
            key={zone.id}
            onClick={() => setSelectedZone(zone.id)}
            className={`cursor-pointer bg-slate-900 border rounded-3xl p-6 transition duration-200 relative overflow-hidden ${
              selectedZone === zone.id ? 'border-amber-500/80 shadow-lg shadow-amber-500/5' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{zone.id}</span>
                <h3 className="text-base font-extrabold text-white mt-0.5">{zone.name}</h3>
                <p className="text-[11px] text-slate-400 mt-1">Ideal limits: {zone.idealTemp}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                zone.sensorStatus === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
              }`}>
                {zone.sensorStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
              <div>
                <span className="text-slate-500 text-xs">Temperature</span>
                <p className="text-2xl font-black text-white font-mono mt-1">{zone.temp}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Relative Humidity</span>
                <p className="text-2xl font-black text-white font-mono mt-1">{zone.humidity}</p>
              </div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-indigo-500"></div>
          </div>
        ))}
      </div>

      {/* ENVIRONMENTAL ANALYTICS SENSOR CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Temperature Drift SVG chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-sm">Temperature drift analytics ({selectedZone})</h3>
            <span className="text-xs font-mono text-slate-400">Unit: °C</span>
          </div>

          <div className="w-full aspect-[21/9] relative">
            <svg className="w-full h-full" viewBox="0 0 500 180">
              <line x1="40" y1="40" x2="480" y2="40" stroke="#1e293b" strokeDasharray="3" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="#1e293b" strokeDasharray="3" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#1e293b" strokeDasharray="3" />
              
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                points={getTempCoords(selectedZone)}
              />

              {(SENSOR_HISTORY[selectedZone] || []).map((pt, index) => {
                const x = 50 + index * 110;
                const min = selectedZone === 'Zone B' ? -25 : 0;
                const max = selectedZone === 'Zone B' ? -10 : 25;
                const range = max - min;
                const pct = (pt.temp - min) / range;
                const y = 160 - pct * 120;
                return (
                  <g key={index} className="group cursor-pointer">
                    <circle cx={x} cy={y} r="4.5" className="fill-amber-400 stroke-slate-950 stroke-2" />
                    <text x={x} y={y - 12} textAnchor="middle" className="fill-white font-mono text-[9px] font-bold opacity-0 group-hover:opacity-100 transition">
                      {pt.temp}°C
                    </text>
                  </g>
                );
              })}
            </svg>
            
            <div className="absolute bottom-1 left-12 right-12 flex justify-between text-[9px] text-slate-500 font-mono">
              {(SENSOR_HISTORY[selectedZone] || []).map((d, i) => <span key={i}>{d.time}</span>)}
            </div>
          </div>
        </div>

        {/* Humidity Drift SVG chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-sm">Humidity drift analytics ({selectedZone})</h3>
            <span className="text-xs font-mono text-slate-400">Unit: % RH</span>
          </div>

          <div className="w-full aspect-[21/9] relative">
            <svg className="w-full h-full" viewBox="0 0 500 180">
              <line x1="40" y1="40" x2="480" y2="40" stroke="#1e293b" strokeDasharray="3" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="#1e293b" strokeDasharray="3" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#1e293b" strokeDasharray="3" />
              
              <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                points={getHumCoords(selectedZone)}
              />

              {(SENSOR_HISTORY[selectedZone] || []).map((pt, index) => {
                const x = 50 + index * 110;
                const pct = pt.humidity / 100.0;
                const y = 160 - pct * 120;
                return (
                  <g key={index} className="group cursor-pointer">
                    <circle cx={x} cy={y} r="4.5" className="fill-indigo-400 stroke-slate-950 stroke-2" />
                    <text x={x} y={y - 12} textAnchor="middle" className="fill-white font-mono text-[9px] font-bold opacity-0 group-hover:opacity-100 transition">
                      {pt.humidity}%
                    </text>
                  </g>
                );
              })}
            </svg>
            
            <div className="absolute bottom-1 left-12 right-12 flex justify-between text-[9px] text-slate-500 font-mono">
              {(SENSOR_HISTORY[selectedZone] || []).map((d, i) => <span key={i}>{d.time}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Inventory Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-white">Stored Bulk Goods</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search goods..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-950/20">
                <th className="py-3 pl-4">Item Name</th>
                <th className="py-3">Category</th>
                <th className="py-3">Lot/Batch</th>
                <th className="py-3">Quantity</th>
                <th className="py-3">Zone Storage</th>
                <th className="py-3">Expiry Date</th>
                <th className="py-3 text-center">Status</th>
                {canWrite() && <th className="py-3 text-right pr-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-850/25 transition">
                  <td className="py-3.5 pl-4 font-semibold text-white">{item.name}</td>
                  <td className="py-3.5 text-slate-300">{item.category}</td>
                  <td className="py-3.5 font-mono text-xs text-amber-500">{item.batch ? item.batch.batch_number : 'Unassigned'}</td>
                  <td className="py-3.5 text-white font-bold">{item.quantity} {item.unit}</td>
                  <td className="py-3.5 text-slate-300">{item.storage_location}</td>
                  <td className="py-3.5 font-mono text-xs text-slate-400">{new Date(item.expiry_date).toLocaleDateString()}</td>
                  <td className="py-3.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      item.status === 'FRESH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      item.status === 'WARNING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  {canWrite() && (
                    <td className="py-3.5 text-right pr-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2 py-0.5 bg-rose-950/25 text-rose-400 hover:bg-rose-900/30 text-xs rounded border border-rose-900/20 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Telemetry Feed (MQTT) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Live Telemetry Feed (MQTT Broker)</h2>
        <div className="font-mono text-xs text-slate-400 space-y-2 bg-black/40 p-4 rounded-xl max-h-40 overflow-y-auto border border-slate-900">
          <p><span className="text-indigo-400">[12:30:12]</span> PUBLISH topic=sensors/temp/coldroom1 payload=&#123;&quot;value&quot;: 2.4, &quot;unit&quot;: &quot;C&quot;&#125;</p>
          <p><span className="text-indigo-400">[12:30:08]</span> PUBLISH topic=sensors/humidity/coldroom1 payload=&#123;&quot;value&quot;: 84.1, &quot;unit&quot;: &quot;%&quot;&#125;</p>
          <p><span className="text-indigo-400">[12:29:45]</span> PUBLISH topic=sensors/circulation/coldroom1 payload=&#123;&quot;status&quot;: &quot;Medium&quot;, &quot;speed&quot;: &quot;1200rpm&quot;&#125;</p>
        </div>
      </div>

      {/* --- ADD / EDIT ITEM MODAL --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Bulk Item Parameters' : 'Register Bulk Good'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="E.g., Frozen Beef Patties"
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Batch / Lot</label>
                  <select
                    value={itemForm.batch_id}
                    onChange={(e) => setItemForm(prev => ({ ...prev, batch_id: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Unassigned</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batch_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="E.g., kg, pallets"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Packaging Type</label>
                  <input
                    type="text"
                    value={itemForm.packaging_type}
                    onChange={(e) => setItemForm(prev => ({ ...prev, packaging_type: e.target.value }))}
                    placeholder="E.g., Wooden Pallet"
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={itemForm.expiry_date}
                    onChange={(e) => setItemForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Warehouse Storage Zone</label>
                <select
                  value={itemForm.storage_location}
                  onChange={(e) => setItemForm(prev => ({ ...prev, storage_location: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Cold Storage Room 1">Cold Storage Room 1 (Zone A)</option>
                  <option value="Deep Freezer Unit 3">Deep Freezer Unit 3 (Zone B)</option>
                  <option value="Dry Storage Hall A">Dry Storage Hall A (Zone C)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition"
                >
                  {editingItem ? 'Save Changes' : 'Register Good'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
