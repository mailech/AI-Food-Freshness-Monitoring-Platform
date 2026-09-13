import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  ScanLine,
  ThermometerSnowflake,
  FileSpreadsheet,
  ArrowUpRight,
  Clock,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export const RoleDashboard = () => {
  const { user } = useAuth();
  const role = user?.role || 'retail_manager';
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await api.getDashboardMetrics(role);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [role]);

  const categoryBreakdownData = [
    { name: 'Fruits', freshness: 88 },
    { name: 'Vegetables', freshness: 79 },
    { name: 'Dairy', freshness: 94 },
    { name: 'Meat & Poultry', freshness: 85 },
    { name: 'Seafood', freshness: 91 },
    { name: 'Bakery', freshness: 72 },
    { name: 'Packaged', freshness: 98 },
    { name: 'Beverages', freshness: 99 }
  ];

  return (
    <div className="space-y-8">
      {/* Airbnb-style Clean Hero Card */}
      <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-100 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="capitalize">{role.replace('_', ' ')} Persona</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
            Welcome back, {user?.full_name || 'Team Member'}
          </h1>
          <p className="text-xs sm:text-sm text-[#717171] mt-1.5 max-w-2xl leading-relaxed">
            {role === 'consumer' && 'Track your household pantry, monitor expiration dates, and reduce food waste with AI vision.'}
            {role === 'retail_manager' && 'Store freshness KPIs, FEFO batch rotation schedules, and automated dynamic markdown triggers.'}
            {role === 'warehouse_operator' && 'Multi-zone cold storage climate telemetry, sensor violation threshold alerts, and batch receiving.'}
            {role === 'food_quality_inspector' && 'Official food safety inspection workbench, batch release authorization, and tamper-evident audit certs.'}
            {role === 'administrator' && 'System configuration, PyTorch CNN model governance (97.11% accuracy), user roles, and audit trail.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/scanner"
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center gap-2"
          >
            <ScanLine className="w-4 h-4" />
            AI Produce Scan
          </NavLink>
          <NavLink
            to="/reports"
            className="px-5 py-3 bg-white hover:bg-[#F7F7F7] text-[#222222] font-semibold rounded-2xl text-xs transition border border-[#DDDDDD] shadow-sm flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            Audit Reports
          </NavLink>
        </div>
      </div>

      {/* KPI Cards Grid (Airbnb Clean Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'consumer' && (
          <>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Fridge Inventory</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">12 Items</p>
              <span className="text-xs font-semibold text-emerald-700 mt-1 block">85% Avg Freshness</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Expiring Today</span>
              <p className="text-3xl font-extrabold text-rose-600 mt-2">2 Items</p>
              <span className="text-xs text-[#717171] mt-1 block">Bananas & Whole Milk</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Scans This Month</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">18 Scans</p>
              <span className="text-xs text-[#717171] mt-1 block">97.1% Classification</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Estimated Savings</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">$46.50</p>
              <span className="text-xs font-semibold text-emerald-600 mt-1 block">Food waste prevented</span>
            </div>
          </>
        )}

        {role === 'retail_manager' && (
          <>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Active Store SKUs</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">142 SKUs</p>
              <span className="text-xs font-semibold text-emerald-700 mt-1 block">8 Categories Active</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Store Freshness KPI</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">84.2%</p>
              <span className="text-xs text-[#717171] mt-1 block">+1.4% vs last week</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">FEFO Markdowns Due</span>
              <p className="text-3xl font-extrabold text-amber-700 mt-2">6 Lots</p>
              <span className="text-xs font-semibold text-amber-700 mt-1 block">Dynamic -20% to -40%</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-rose-200 bg-rose-50/30 shadow-sm">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Critical Spoilage Risk</span>
              <p className="text-3xl font-extrabold text-rose-600 mt-2">1 Lot</p>
              <span className="text-xs text-rose-700 mt-1 block">Immediate action required</span>
            </div>
          </>
        )}

        {role === 'warehouse_operator' && (
          <>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Cold Storage Units</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">4 Units</p>
              <span className="text-xs font-semibold text-emerald-700 mt-1 block">100% Sensors Online</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Climate Compliance</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">98.5%</p>
              <span className="text-xs text-[#717171] mt-1 block">Within temp/RH window</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Telemetry Alerts</span>
              <p className="text-3xl font-extrabold text-amber-700 mt-2">2 Active</p>
              <span className="text-xs text-amber-700 mt-1 block">Cold Room A Ethylene spike</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Batches Received</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">14 Batches</p>
              <span className="text-xs text-[#717171] mt-1 block">2,450 kg in 24h</span>
            </div>
          </>
        )}

        {role === 'food_quality_inspector' && (
          <>
            <div className="p-6 bg-white rounded-2xl border border-purple-200 bg-purple-50/30 shadow-sm">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Pending Inspections</span>
              <p className="text-3xl font-extrabold text-purple-700 mt-2">3 Batches</p>
              <span className="text-xs text-purple-700 mt-1 block">Awaiting sign-off</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Batch Pass Rate</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">94.2%</p>
              <span className="text-xs text-[#717171] mt-1 block">Quality standard compliance</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Quarantine Holds</span>
              <p className="text-3xl font-extrabold text-amber-700 mt-2">1 Lot</p>
              <span className="text-xs text-amber-700 mt-1 block">Lab sampling requested</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">PDF Audits Issued</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">42 Certs</p>
              <span className="text-xs text-[#717171] mt-1 block">Cryptographically signed</span>
            </div>
          </>
        )}

        {role === 'administrator' && (
          <>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">System Users</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">5 Accounts</p>
              <span className="text-xs font-semibold text-emerald-700 mt-1 block">All 5 roles active</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">CNN Test Accuracy</span>
              <p className="text-3xl font-extrabold text-emerald-700 mt-2">97.11%</p>
              <span className="text-xs font-semibold text-emerald-600 mt-1 block">F1-Score: 97.11%</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Kaggle Benchmark</span>
              <p className="text-3xl font-extrabold text-[#222222] mt-2">2,698</p>
              <span className="text-xs text-[#717171] mt-1 block">Evaluated test images</span>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-[#EBEBEB] shadow-sm">
              <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">REST Endpoints</span>
              <p className="text-3xl font-extrabold text-blue-700 mt-2">28 Routes</p>
              <span className="text-xs text-[#717171] mt-1 block">FastAPI production</span>
            </div>
          </>
        )}
      </div>

      {/* Category Breakdown Chart & Quick Operations (Airbnb Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#222222] text-base">8 Food Categories · Freshness Health Index</h3>
              <p className="text-xs text-[#717171] mt-0.5">Real-time aggregate freshness score per category</p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
              Overall: 88.4%
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="name" stroke="#717171" fontSize={11} tickLine={false} />
                <YAxis stroke="#717171" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#222222', borderColor: '#333333', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="freshness" name="Freshness Score" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Operations Module */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#222222] text-base mb-4">Quick Shortcuts</h3>
            <div className="space-y-2.5">
              <NavLink
                to="/scanner"
                className="p-3.5 bg-[#F7F7F7] hover:bg-emerald-50 rounded-2xl border border-[#EBEBEB] hover:border-emerald-200 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center text-emerald-700 shadow-sm">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#222222] block">AI Produce Scanner</span>
                    <span className="text-[11px] text-[#717171]">CNN optical defect analysis</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#999999] group-hover:text-emerald-700 transition" />
              </NavLink>

              <NavLink
                to="/storage"
                className="p-3.5 bg-[#F7F7F7] hover:bg-emerald-50 rounded-2xl border border-[#EBEBEB] hover:border-emerald-200 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center text-emerald-700 shadow-sm">
                    <ThermometerSnowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#222222] block">IoT Telemetry Sandbox</span>
                    <span className="text-[11px] text-[#717171]">Simulate climate sensors</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#999999] group-hover:text-emerald-700 transition" />
              </NavLink>

              <NavLink
                to="/inventory"
                className="p-3.5 bg-[#F7F7F7] hover:bg-emerald-50 rounded-2xl border border-[#EBEBEB] hover:border-emerald-200 flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center text-emerald-700 shadow-sm">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#222222] block">Food Inventory</span>
                    <span className="text-[11px] text-[#717171]">8 Categories & FEFO Batches</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#999999] group-hover:text-emerald-700 transition" />
              </NavLink>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F0F0F0] text-[11px] text-[#717171] flex items-center justify-between">
            <span>Session Secured</span>
            <span className="font-mono text-emerald-700 font-bold">JWT HS256</span>
          </div>
        </div>
      </div>
    </div>
  );
};
