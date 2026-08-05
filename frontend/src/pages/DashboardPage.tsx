import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sparkles, 
  Warehouse, 
  AlertTriangle, 
  ShieldCheck, 
  Trash2, 
  Clock, 
  Thermometer, 
  Droplets,
  ArrowRight
} from 'lucide-react';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface KPIStats {
  total_items: number;
  fresh_items: number;
  decaying_items: number;
  spoiled_items: number;
  expired_items: number;
  average_freshness: number;
  total_waste_saved_kg: number;
}

interface CategoryDist {
  category: string;
  count: number;
  avg_freshness: number;
}

interface DecayRate {
  date: string;
  Fruits: number;
  Vegetables: number;
  Meat: number;
  Seafood: number;
}

const DashboardPage: React.FC = () => {
  const { role, userName } = useAuth();
  const { isDark } = useTheme();
  
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [categories, setCategories] = useState<CategoryDist[]>([]);
  const [decayRates, setDecayRates] = useState<DecayRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiRes, catRes, decayRes] = await Promise.all([
        axios.get('/api/analytics/kpis'),
        axios.get('/api/analytics/category-distribution'),
        axios.get('/api/analytics/decay-rates')
      ]);
      setKpis(kpiRes.data);
      setCategories(catRes.data);
      setDecayRates(decayRes.data);
    } catch (error) {
      console.error("Error loading dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Parsing freshness metrics...</p>
      </div>
    );
  }

  // 1. Chart Configs
  const doughnutData = {
    labels: ['Fresh', 'Decaying', 'Spoiled', 'Expired'],
    datasets: [{
      data: [kpis.fresh_items, kpis.decaying_items, kpis.spoiled_items, kpis.expired_items],
      backgroundColor: [
        'rgba(16, 185, 129, 0.75)',  // Emerald
        'rgba(245, 158, 11, 0.75)',  // Amber
        'rgba(239, 68, 68, 0.75)',   // Red
        'rgba(100, 116, 139, 0.75)'  // Slate
      ],
      borderColor: isDark ? '#1e293b' : '#ffffff',
      borderWidth: 2,
    }]
  };

  const barData = {
    labels: categories.map(c => c.category),
    datasets: [
      {
        label: 'Items Count',
        data: categories.map(c => c.count),
        backgroundColor: 'rgba(99, 102, 241, 0.7)', // Indigo
        borderRadius: 8,
      },
      {
        label: 'Avg Freshness (%)',
        data: categories.map(c => c.avg_freshness),
        backgroundColor: 'rgba(16, 185, 129, 0.6)', // Emerald
        borderRadius: 8,
      }
    ]
  };

  const lineData = {
    labels: decayRates.map(d => d.date),
    datasets: [
      { label: 'Fruits', data: decayRates.map(d => d.Fruits), borderColor: '#10b981', tension: 0.3 },
      { label: 'Vegetables', data: decayRates.map(d => d.Vegetables), borderColor: '#34d399', tension: 0.3 },
      { label: 'Meat', data: decayRates.map(d => d.Meat), borderColor: '#ef4444', tension: 0.3 },
      { label: 'Seafood', data: decayRates.map(d => d.Seafood), borderColor: '#60a5fa', tension: 0.3 },
    ]
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Inter' }
        }
      }
    },
    scales: {
      y: {
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        ticks: { color: isDark ? '#64748b' : '#475569' }
      },
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#64748b' : '#475569' }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">{userName}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 capitalize">
            Role: <strong>{role?.replace('_', ' ')}</strong> | Real-time monitoring operations active.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-slate-800/50 rounded-2xl border border-slate-700/30 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>All Systems Nominal</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="glass-panel p-5 rounded-3xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Items</p>
            <h3 className="text-3xl font-extrabold">{kpis.total_items}</h3>
            <p className="text-[11px] text-slate-400">Tracked in inventory</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Warehouse className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-5 rounded-3xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Freshness</p>
            <h3 className="text-3xl font-extrabold text-emerald-400">{kpis.average_freshness}%</h3>
            <p className="text-[11px] text-slate-400">Overall product score</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-5 rounded-3xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alerts Pending</p>
            <h3 className="text-3xl font-extrabold text-amber-500">
              {kpis.decaying_items + kpis.spoiled_items}
            </h3>
            <p className="text-[11px] text-slate-400">Decaying or spoiled items</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-5 rounded-3xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Waste Prevented</p>
            <h3 className="text-3xl font-extrabold text-indigo-400">{kpis.total_waste_saved_kg} kg</h3>
            <p className="text-[11px] text-slate-400">Prevented from disposal</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Trash2 className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card - Freshness breakdown Doughnut */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-bold text-lg">Freshness Allocation</h3>
            <p className="text-xs text-slate-500">Breakdown of active inventory status</p>
          </div>
          <div className="h-56 relative flex items-center justify-center mt-4">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-100">{kpis.total_items}</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500">Total</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-slate-400 mt-2">
            <div>
              <span className="block w-2.5 h-2.5 bg-emerald-500 rounded-full mx-auto mb-1"></span>
              <span>Fresh</span>
            </div>
            <div>
              <span className="block w-2.5 h-2.5 bg-amber-500 rounded-full mx-auto mb-1"></span>
              <span>Decay</span>
            </div>
            <div>
              <span className="block w-2.5 h-2.5 bg-red-500 rounded-full mx-auto mb-1"></span>
              <span>Spoil</span>
            </div>
            <div>
              <span className="block w-2.5 h-2.5 bg-slate-500 rounded-full mx-auto mb-1"></span>
              <span>Exp</span>
            </div>
          </div>
        </div>

        {/* Center Card - Category Distribution Bar */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col justify-between lg:col-span-2 min-h-[350px]">
          <div>
            <h3 className="font-bold text-lg">Category Breakdown</h3>
            <p className="text-xs text-slate-500">Counts and freshness averages by food category</p>
          </div>
          <div className="h-64 mt-4">
            <Bar data={barData} options={commonChartOptions} />
          </div>
        </div>

      </div>

      {/* Role Specialized Dashboard Panels */}
      {role === 'warehouse_operator' && (
        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">Warehouse Ambient Environmental Monitor</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/20 flex items-center gap-3">
              <Thermometer className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-xs text-slate-500">Bulk Storage Temp</p>
                <h4 className="font-bold text-lg">4.2 °C</h4>
                <span className="text-[10px] text-emerald-400 font-semibold">Nominal Range (-2 to 6°C)</span>
              </div>
            </div>
            <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/20 flex items-center gap-3">
              <Droplets className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-500">Cold Vault Humidity</p>
                <h4 className="font-bold text-lg">82.5 %</h4>
                <span className="text-[10px] text-emerald-400 font-semibold">Nominal Range (80 to 90%)</span>
              </div>
            </div>
            <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/20 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              <div>
                <p className="text-xs text-slate-500">Zone Ventilation</p>
                <h4 className="font-bold text-lg">Active</h4>
                <span className="text-[10px] text-indigo-400 font-semibold">CO2 levels low</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'retail_manager' && (
        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Suggested Retail Markdowns</h3>
            <span className="text-xs text-indigo-400 flex items-center gap-1 cursor-pointer hover:underline">
              <span>View Markdown Manager</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500">
                  <th className="py-2">Item Name</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Freshness Score</th>
                  <th className="py-2">Days Left</th>
                  <th className="py-2 text-right">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                <tr className="text-slate-300">
                  <td className="py-3 font-semibold">Organic Bananas</td>
                  <td className="py-3">Fruits</td>
                  <td className="py-3 text-amber-400">45%</td>
                  <td className="py-3">1.5 days</td>
                  <td className="py-3 text-right">
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-semibold">
                      Mark down 50%
                    </span>
                  </td>
                </tr>
                <tr className="text-slate-300">
                  <td className="py-3 font-semibold">Fresh Salmon Fillets</td>
                  <td className="py-3">Seafood</td>
                  <td className="py-3 text-amber-400">52%</td>
                  <td className="py-3">0.8 days</td>
                  <td className="py-3 text-right">
                    <span className="px-2.5 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs font-semibold">
                      Markdown 70% / Ready to Eat
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical Decay Rates Line Chart */}
      <div className="glass-panel p-5 rounded-3xl flex flex-col justify-between min-h-[350px]">
        <div>
          <h3 className="font-bold text-lg">Inventory Decay Rates</h3>
          <p className="text-xs text-slate-500">Historical freshness metrics decay curves over recent days</p>
        </div>
        <div className="h-64 mt-4">
          <Line data={lineData} options={commonChartOptions} />
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
