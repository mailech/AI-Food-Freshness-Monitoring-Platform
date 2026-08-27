'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface GroceryItem {
  id: string;
  name: string;
  category: string;
  daysLeft: number;
  score: number;
  status: string;
  packaging: string;
  storage: string;
}

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

const INITIAL_GROCERIES: GroceryItem[] = [
  { id: '1', name: 'Organic Bananas', category: 'Fruits', daysLeft: 3, score: 75, status: 'Good', packaging: 'None', storage: 'Pantry' },
  { id: '2', name: 'Fresh Strawberries', category: 'Fruits', daysLeft: 1, score: 48, status: 'Near Spoilage', packaging: 'Plastic Wrap', storage: 'Fridge' },
  { id: '3', name: 'Whole Milk Jug', category: 'Dairy Products', daysLeft: 4, score: 86, status: 'Fresh', packaging: 'Plastic Jug', storage: 'Fridge' },
  { id: '4', name: 'Spinach Bunches', category: 'Vegetables', daysLeft: 2, score: 62, status: 'Acceptable', packaging: 'None', storage: 'Crisper Drawer' },
  { id: '5', name: 'Eggs Carton', category: 'Dairy Products', daysLeft: 12, score: 95, status: 'Fresh', packaging: 'Cartboard Box', storage: 'Fridge' },
];

export default function ConsumerDashboard() {
  const [role, setRole] = useState('CONSUMER');
  const [groceries, setGroceries] = useState<GroceryItem[]>(INITIAL_GROCERIES);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Auto-login consumer session on mount
  useEffect(() => {
    const loginConsumer = async () => {
      const email = 'consumer@freshlens.com';
      const password = 'Password123!';
      
      try {
        await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: 'Consumer Simulator',
            role: 'CONSUMER'
          })
        });
      } catch (e) {
        // Ignore registration failures
      }

      try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch('/api/v1/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });

        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.access_token);
        }
      } catch (e) {
        console.error('Consumer auth failed:', e);
      }
    };
    loginConsumer();
  }, []);

  // Form states for adding items
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Fruits',
    daysLeft: 7,
    score: 95,
    storage: 'Fridge',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setScanResult(null);
    }
  };

  const runRealScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      
      const res = await fetch('/api/v1/image-analysis/scan', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Scan failed');
      }

      const data = await res.json();
      
      let classification = 'Fresh';
      const score = data.freshness_score;
      if (score < 30) classification = 'Spoiled';
      else if (score < 50) classification = 'Near Spoilage';
      else if (score < 70) classification = 'Acceptable';
      else if (score < 85) classification = 'Good';

      const days = Math.floor(score / 12);

      setScanResult({
        name: selectedFile.name.split('.')[0],
        score,
        classification,
        daysRemaining: days,
        mold: data.mold_detected,
        bruising: data.bruising_detected || data.damage_detected,
      });
    } catch (err) {
      alert("AI scan failed: " + (err instanceof Error ? err.message : "AI model is currently unavailable."));
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const addToGroceries = () => {
    if (!scanResult) return;
    const newItem: GroceryItem = {
      id: 'g_' + Date.now(),
      name: scanResult.name.charAt(0).toUpperCase() + scanResult.name.slice(1),
      category: 'Fruits',
      daysLeft: scanResult.daysRemaining,
      score: scanResult.score,
      status: scanResult.classification,
      packaging: 'None',
      storage: 'Fridge',
    };
    setGroceries(prev => [newItem, ...prev]);
    setSelectedFile(null);
    setPreview(null);
    setScanResult(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let status = 'Fresh';
    if (itemForm.score < 60) status = 'Near Spoilage';
    else if (itemForm.score < 75) status = 'Acceptable';
    else if (itemForm.score < 88) status = 'Good';

    const newItem: GroceryItem = {
      id: 'g_' + Date.now(),
      name: itemForm.name,
      category: itemForm.category,
      daysLeft: itemForm.daysLeft,
      score: itemForm.score,
      status,
      packaging: 'None',
      storage: itemForm.storage,
    };
    setGroceries(prev => [newItem, ...prev]);
    setItemForm({
      name: '',
      category: 'Fruits',
      daysLeft: 7,
      score: 95,
      storage: 'Fridge',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 selection:bg-emerald-500 selection:text-slate-950">
      {/* Role Toggle Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🍳</span>
          <div>
            <h4 className="font-bold text-white text-sm">Sandbox Role Simulator</h4>
            <p className="text-xs text-slate-400">Simulate active session context to evaluate role-based access policies (RBAC).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRole('CONSUMER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              role === 'CONSUMER' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Consumer (Read-Only)
          </button>
          <button
            onClick={() => setRole('RETAIL_MANAGER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              role === 'RETAIL_MANAGER' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Retail Manager
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-900 gap-4">
        <div>
          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Role: Consumer Portal</span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">My FreshLens Kitchen</h1>
          <p className="text-slate-400 mt-1 text-sm">Track grocery quality index scores and get dynamic storage alerts.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium">
            Portal Hub
          </Link>
          <Link href="/dashboard/retail" className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-sm transition font-semibold">
            Retail Hub
          </Link>
        </div>
      </header>

      {/* Kitchen Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pantry Inventory</span>
          <p className="text-3xl font-extrabold text-white mt-1">{groceries.length} items</p>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Average Freshness</span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-extrabold text-emerald-400">
              {(groceries.reduce((acc, curr) => acc + curr.score, 0) / (groceries.length || 1)).toFixed(0)}%
            </p>
            <span className="text-xs text-slate-400 font-mono">Good Quality</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Critical Expiry (48h)</span>
          <p className="text-3xl font-extrabold text-rose-500 mt-1">
            {groceries.filter(g => g.daysLeft <= 2).length} items
          </p>
        </div>
      </div>

      {/* Split Screens - Groceries list vs scan camera */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Left Screen: Groceries List */}
        <div className="bg-slate-905 border border-slate-900 rounded-3xl p-6 space-y-6">
          <h3 className="text-white font-bold text-lg">Groceries Shelf Status</h3>
          
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {groceries.map((item) => (
              <div key={item.id} className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex justify-between items-center hover:border-slate-800 transition">
                <div>
                  <h4 className="font-extrabold text-white text-sm">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span className="text-indigo-400">{item.storage}</span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black border ${
                      item.daysLeft <= 2 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      item.daysLeft <= 4 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {item.daysLeft} days left
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">Score: {item.score}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add item form manually */}
          <form onSubmit={handleAddSubmit} className="bg-slate-950 border border-slate-900 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Grocery manually</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Item name (e.g. Tomatoes)"
                value={itemForm.name}
                onChange={e => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              
              <select
                value={itemForm.category}
                onChange={e => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                {CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={itemForm.storage}
                onChange={e => setItemForm(prev => ({ ...prev, storage: e.target.value }))}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="Fridge">Fridge</option>
                <option value="Crisper Drawer">Crisper Drawer</option>
                <option value="Pantry">Pantry</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Days Left</label>
                <input
                  type="number"
                  min="1"
                  value={itemForm.daysLeft}
                  onChange={e => setItemForm(prev => ({ ...prev, daysLeft: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] text-slate-500 uppercase block mb-1">Quality Index (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={itemForm.score}
                  onChange={e => setItemForm(prev => ({ ...prev, score: parseInt(e.target.value) || 100 }))}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Add Item
            </button>
          </form>
        </div>

        {/* Right Screen: Groceries Analytics Charts & CV Scan Simulator */}
        <div className="space-y-8">
          
          {/* Quality Estimates SVG Bars Chart */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6">
            <h4 className="text-white font-bold text-sm mb-4">Estimated Freshness index Breakdown</h4>
            
            <div className="space-y-4">
              {groceries.map((g) => (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">{g.name}</span>
                    <span className="text-emerald-400 font-bold">{g.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-955 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        g.score >= 85 ? 'bg-emerald-400' :
                        g.score >= 70 ? 'bg-green-400' :
                        g.score >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${g.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scanner Simulator */}
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-4">
            <h4 className="text-white font-bold text-sm">📷 Consumer Freshness Scan Simulator</h4>
            <p className="text-xs text-slate-400">
              Take a photo of your fresh produce to instantly check its quality rating and remaining shelf life.
            </p>

            <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center bg-slate-950/40">
              <input
                type="file"
                id="camera-sim-file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {preview ? (
                <div className="space-y-3">
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-850">
                    <img src={preview} alt="Scan preview" className="object-contain w-full h-full" />
                  </div>
                  {!scanResult && (
                    <button
                      onClick={runRealScan}
                      disabled={isScanning}
                      className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition"
                    >
                      {isScanning ? 'Processing AI model' : 'Run Scan'}
                    </button>
                  )}
                </div>
              ) : (
                <label htmlFor="camera-sim-file" className="cursor-pointer block py-6">
                  <span className="text-3xl block">📷</span>
                  <span className="text-xs font-semibold text-white mt-2 block">Upload Fresh produce photo</span>
                  <span className="text-[10px] text-slate-500 block">PNG, JPG formats supported</span>
                </label>
              )}

              {scanResult && (
                <div className="mt-4 p-4 border border-slate-800 bg-slate-900 text-left rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h5 className="font-bold text-white text-xs">Scan analysis results:</h5>
                    <span className="text-[10px] font-black text-emerald-400">{scanResult.classification}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400">Freshness Score</span>
                      <p className="font-bold text-white mt-0.5">{scanResult.score}%</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Est. Shelf Life</span>
                      <p className="font-bold text-indigo-400 mt-0.5">{scanResult.daysRemaining} days left</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Mold detected?</span>
                      <p className={`font-bold mt-0.5 ${scanResult.mold ? 'text-rose-400' : 'text-slate-500'}`}>
                        {scanResult.mold ? 'YES (Critical)' : 'No mold detected'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Surface Bruises</span>
                      <p className={`font-bold mt-0.5 ${scanResult.bruising ? 'text-amber-400' : 'text-slate-500'}`}>
                        {scanResult.bruising ? 'Detected' : 'Clear'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={addToGroceries}
                    className="w-full mt-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition"
                  >
                    Add to Pantry Grocery List
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Recommendations */}
      <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Smart Storage recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-xl flex gap-3">
            <span className="text-emerald-400 text-lg mt-0.5">💡</span>
            <div>
              <h4 className="font-bold text-emerald-300 text-sm">Isolate Ethylene release items</h4>
              <p className="text-xs text-slate-400 mt-1">
                Apples and pears release ripening hormone gases. Keep them away from sensitive greens (bananas, spinach) to delay yellowing.
              </p>
            </div>
          </div>

          <div className="p-4 bg-sky-950/10 border border-sky-900/20 rounded-xl flex gap-3">
            <span className="text-sky-400 text-lg mt-0.5">❄️</span>
            <div>
              <h4 className="font-bold text-sky-300 text-sm">Crisper Humidity tuning</h4>
              <p className="text-xs text-slate-400 mt-1">
                Set crisper drawers to high humidity for leafy greens (spinach) and low humidity for thin-skinned berries (strawberries).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
