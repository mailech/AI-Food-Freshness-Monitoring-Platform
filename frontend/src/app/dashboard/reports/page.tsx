'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Allowed Categories matching backend database
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

// Allowed Storage Locations
const LOCATIONS = [
  'Cold Storage Room 1',
  'Deep Freezer Unit 3',
  'Dry Storage Hall A',
  'Pantry Shelf B',
  'Counter Basket',
];

interface ReportItemType {
  id: string;
  name: string;
  category: string;
  storage_location: string;
  entry_date: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  freshness_score: number;
  remaining_shelf_life_days: number;
  status: string;
}

// Sandbox local mock data representing database state
const MOCK_ITEMS: ReportItemType[] = [
  { id: 'i1', name: 'Organic Red Apples', category: 'Fruits', storage_location: 'Cold Storage Room 1', entry_date: '2026-08-09T00:00:00Z', expiry_date: '2026-08-25T00:00:00Z', quantity: 120, unit: 'kg', freshness_score: 92.5, remaining_shelf_life_days: 15.0, status: 'Fresh' },
  { id: 'i2', name: 'Fresh Whole Milk', category: 'Dairy Products', storage_location: 'Cold Storage Room 1', entry_date: '2026-08-08T00:00:00Z', expiry_date: '2026-08-12T00:00:00Z', quantity: 90, unit: 'liters', freshness_score: 72.0, remaining_shelf_life_days: 3.5, status: 'Good' },
  { id: 'i3', name: 'Fresh Atlantic Salmon', category: 'Seafood', storage_location: 'Deep Freezer Unit 3', entry_date: '2026-08-07T00:00:00Z', expiry_date: '2026-08-10T00:00:00Z', quantity: 15, unit: 'kg', freshness_score: 25.0, remaining_shelf_life_days: 0.5, status: 'Spoiled' },
  { id: 'i4', name: 'Romaine Lettuce', category: 'Vegetables', storage_location: 'Cold Storage Room 1', entry_date: '2026-08-09T00:00:00Z', expiry_date: '2026-08-14T00:00:00Z', quantity: 45, unit: 'kg', freshness_score: 84.0, remaining_shelf_life_days: 4.8, status: 'Good' },
  { id: 'i5', name: 'Ribeye Steak', category: 'Meat & Poultry', storage_location: 'Cold Storage Room 1', entry_date: '2026-08-06T00:00:00Z', expiry_date: '2026-08-09T00:00:00Z', quantity: 20, unit: 'kg', freshness_score: 42.0, remaining_shelf_life_days: 1.2, status: 'Near Spoilage' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('freshness');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  // Preview data state
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReportPreview = async () => {
    setLoading(true);
    
    // Construct query parameters
    const params = new URLSearchParams({
      report_type: reportType,
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedLocation !== 'All') params.append('storage_location', selectedLocation);

    try {
      const res = await fetch(`/api/v1/report/preview?${params.toString()}`);
      if (!res.ok) throw new Error('Backend server offline');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      // Offline fallback: compute statistics in memory using local mock items
      console.log('Generating sandbox preview report metrics...');
      
      // Filter mock items in memory
      let filtered = [...MOCK_ITEMS];
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(item => item.category === selectedCategory);
      }
      if (selectedLocation !== 'All') {
        filtered = filtered.filter(item => item.storage_location === selectedLocation);
      }
      if (startDate) {
        const start = new Date(startDate).getTime();
        filtered = filtered.filter(item => new Date(item.entry_date).getTime() >= start);
      }
      if (endDate) {
        const end = new Date(endDate).getTime();
        filtered = filtered.filter(item => new Date(item.entry_date).getTime() <= end);
      }

      // Calculate stats based on report type
      let stats: any = {};
      const count = filtered.length;
      
      const totalFreshness = filtered.reduce((acc, c) => acc + c.freshness_score, 0);
      const avgFreshness = count > 0 ? totalFreshness / count : 100.0;
      
      const totalRemainingDays = filtered.reduce((acc, c) => acc + c.remaining_shelf_life_days, 0);
      const avgRemainingDays = count > 0 ? totalRemainingDays / count : 0.0;

      const totalQty = filtered.reduce((acc, c) => acc + c.quantity, 0);
      
      const classifications = { Fresh: 0, Good: 0, Acceptable: 0, 'Near Spoilage': 0, Spoiled: 0 };
      filtered.forEach(item => {
        if (item.status === 'Fresh') classifications.Fresh++;
        else if (item.status === 'Good') classifications.Good++;
        else if (item.status === 'Acceptable') classifications.Acceptable++;
        else if (item.status === 'Near Spoilage') classifications['Near Spoilage']++;
        else classifications.Spoiled++;
      });

      if (reportType === 'freshness') {
        stats = {
          total_items: count,
          average_freshness_score: parseFloat(avgFreshness.toFixed(1)),
          distribution: classifications,
          fresh_percentage: count > 0 ? parseFloat(((classifications.Fresh + classifications.Good) / count * 100).toFixed(1)) : 100.0,
        };
      } else if (reportType === 'shelf-life') {
        const warnings = filtered.filter(item => item.remaining_shelf_life_days <= 3.0).length;
        stats = {
          total_items: count,
          average_remaining_days: parseFloat(avgRemainingDays.toFixed(1)),
          shelf_life_warnings: warnings,
          fefo_overruns: filtered.filter(item => item.status === 'Near Spoilage').length,
        };
      } else if (reportType === 'quality') {
        stats = {
          total_items: count,
          average_visual_condition: parseFloat(avgFreshness.toFixed(1)),
          potential_mold_alerts: filtered.filter(item => item.status === 'Spoiled').length,
          critical_quality_warnings: classifications['Near Spoilage'] + classifications.Spoiled,
        };
      } else if (reportType === 'waste') {
        const wasteQty = filtered.filter(item => item.status === 'Spoiled' || item.status === 'Near Spoilage').reduce((acc, c) => acc + c.quantity, 0);
        stats = {
          total_items: count,
          potential_waste_qty: wasteQty,
          use_soon_count: filtered.filter(item => item.remaining_shelf_life_days <= 3.0).length,
          risk_items_count: classifications['Near Spoilage'] + classifications.Spoiled,
        };
      } else if (reportType === 'storage') {
        const compliant = filtered.filter(item => item.status === 'Fresh' || item.status === 'Good' || item.status === 'Acceptable').length;
        const rate = count > 0 ? (compliant / count) * 100 : 100.0;
        stats = {
          total_items: count,
          storage_compliance_rate: parseFloat(rate.toFixed(1)),
          non_compliant_count: count - compliant,
          ideal_rate_achieved: rate >= 90.0,
        };
      }

      setReportData({
        report_type: reportType,
        generated_at: new Date().toISOString(),
        summary_stats: stats,
        items: filtered,
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate initial preview on mount
  useEffect(() => {
    fetchReportPreview();
  }, [reportType]);

  const getExportUrl = (format: 'pdf' | 'excel') => {
    const params = new URLSearchParams({
      report_type: reportType,
      format,
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedLocation !== 'All') params.append('storage_location', selectedLocation);
    return `/api/v1/report/export?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 p-6 selection:bg-emerald-500 selection:text-slate-950">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-900 gap-4">
        <div>
          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Reports & Auditing</span>
          <h1 className="text-3xl font-black tracking-tight text-white mt-1">Analytics Report Hub</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Generate, preview, and export visual freshness indexes, shelf-life forecasts, and storage climate compliance logs.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/retail" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium">
            🏪 Retail Portal
          </Link>
          <Link href="/dashboard/warehouse" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium">
            🏭 Warehouse Portal
          </Link>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Report Filters</h3>
            
            <div className="space-y-4">
              {/* Report Type */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="freshness">Freshness Report</option>
                  <option value="shelf-life">Shelf-Life Predictor</option>
                  <option value="quality">Visual Quality Logs</option>
                  <option value="waste">Waste Reduction Analytics</option>
                  <option value="storage">Storage Zone Compliance</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Start Entry Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">End Entry Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Storage Location</label>
                <select
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Locations</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={fetchReportPreview}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition duration-150"
          >
            Generate Preview
          </button>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-400">
              <span className="inline-block animate-spin text-2xl mb-4">🔄</span>
              <p>Analyzing database logs and generating report preview</p>
            </div>
          ) : reportData ? (
            <>
              {/* Export Controls Toolbar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">Report Preview: {reportType.toUpperCase()}</h3>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    Generated: {new Date(reportData.generated_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={getExportUrl('pdf')}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold transition text-slate-200"
                  >
                    📄 Export PDF
                  </a>
                  <a
                    href={getExportUrl('excel')}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-bold text-slate-950 transition"
                  >
                    📊 Export Excel
                  </a>
                </div>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {reportType === 'freshness' && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Items</span>
                      <p className="text-3xl font-black text-white font-mono">{reportData.summary_stats.total_items}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Avg. Freshness</span>
                      <p className="text-3xl font-black text-emerald-400 font-mono">{reportData.summary_stats.average_freshness_score}%</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Fresh/Good Ratio</span>
                      <p className="text-3xl font-black text-emerald-400 font-mono">{reportData.summary_stats.fresh_percentage}%</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Spoiled count</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.distribution.Spoiled > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.distribution.Spoiled}
                      </p>
                    </div>
                  </>
                )}

                {reportType === 'shelf-life' && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Items</span>
                      <p className="text-3xl font-black text-white font-mono">{reportData.summary_stats.total_items}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Avg. Shelf Life</span>
                      <p className="text-3xl font-black text-emerald-400 font-mono">{reportData.summary_stats.average_remaining_days} days</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Expiry Warnings</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.shelf_life_warnings > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.shelf_life_warnings}
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">FEFO Overruns</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.fefo_overruns > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.fefo_overruns}
                      </p>
                    </div>
                  </>
                )}

                {reportType === 'quality' && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Items</span>
                      <p className="text-3xl font-black text-white font-mono">{reportData.summary_stats.total_items}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Avg. Visual Score</span>
                      <p className="text-3xl font-black text-emerald-400 font-mono">{reportData.summary_stats.average_visual_condition}%</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mold Alerts</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.potential_mold_alerts > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.potential_mold_alerts}
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Quality Warns</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.critical_quality_warnings > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.critical_quality_warnings}
                      </p>
                    </div>
                  </>
                )}

                {reportType === 'waste' && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Items</span>
                      <p className="text-3xl font-black text-white font-mono">{reportData.summary_stats.total_items}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Potential Waste</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.potential_waste_qty > 0 ? 'text-rose-400 font-black' : 'text-slate-400'}`}>
                        {reportData.summary_stats.potential_waste_qty} units
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Use Soon Counts</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.use_soon_count > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.use_soon_count}
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Risk Items</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.risk_items_count > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.risk_items_count}
                      </p>
                    </div>
                  </>
                )}

                {reportType === 'storage' && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Items</span>
                      <p className="text-3xl font-black text-white font-mono">{reportData.summary_stats.total_items}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Compliance Rate</span>
                      <p className="text-3xl font-black text-emerald-400 font-mono">{reportData.summary_stats.storage_compliance_rate}%</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Non-Compliant</span>
                      <p className={`text-3xl font-black font-mono ${reportData.summary_stats.non_compliant_count > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                        {reportData.summary_stats.non_compliant_count}
                      </p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Met</span>
                      <p className="text-3xl font-black font-mono text-emerald-400">
                        {reportData.summary_stats.ideal_rate_achieved ? 'YES' : 'NO'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-bold text-slate-400">
                        <th className="pb-3">Item Name</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Location</th>
                        <th className="pb-3 text-right">Quantity</th>
                        <th className="pb-3 text-right">Freshness</th>
                        <th className="pb-3 text-right">Remaining Life</th>
                        <th className="pb-3 pl-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {reportData.items.map((item: any) => (
                        <tr key={item.id} className="text-xs text-slate-300 hover:bg-slate-850/30 transition">
                          <td className="py-3 font-semibold text-white">{item.name}</td>
                          <td className="py-3">{item.category}</td>
                          <td className="py-3">{item.storage_location}</td>
                          <td className="py-3 text-right font-mono">{item.quantity} {item.unit}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-100">{item.freshness_score}%</td>
                          <td className="py-3 text-right font-mono">{item.remaining_shelf_life_days} days</td>
                          <td className="py-3 pl-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.status === 'Fresh' || item.status === 'Good' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              item.status === 'Acceptable' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-400">
              No preview data matches current filters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
