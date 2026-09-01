import React, { useState, useEffect } from "react";
import {
  Boxes,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Activity,
  ArrowUpRight,
  ScanLine,
  Clock,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Layers,
  ThermometerSnowflake,
  Package
} from "lucide-react";
import { StatCard } from "../components/UI/StatCard";
import { Badge } from "../components/UI/Badge";
import { FreshnessDistributionChart } from "../components/Charts/FreshnessDistributionChart";
import { CategoryDistributionChart } from "../components/Charts/CategoryDistributionChart";
import { FreshnessTrendChart } from "../components/Charts/FreshnessTrendChart";
import { api } from "../services/api";

export const Dashboard = ({ onNavigateTab, onSelectFoodItem }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-emerald-950/40">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Real-Time Telemetry & AI Inspection
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Food Freshness Command Center
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Automated visual grading, predictive shelf-life degradation modeling, and storage compliance across all active storage vaults.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab("analysis")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
          >
            <ScanLine className="w-4 h-4" />
            <span>Analyze Food Image</span>
          </button>
          <button
            onClick={() => onNavigateTab("inventory")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            <Boxes className="w-4 h-4" />
            <span>View Inventory</span>
          </button>
        </div>
      </div>

      {/* Top 5 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Food Items"
          value={dashboardData?.total_items || 128}
          subtitle="Monitored in 4 zones"
          icon={Boxes}
          color="blue"
          trend="+12 this week"
          trendPositive={true}
        />
        <StatCard
          title="Fresh Items"
          value={dashboardData?.fresh_items || 82}
          subtitle="64.1% of inventory"
          icon={ShieldCheck}
          color="emerald"
          trend="Grade A Quality"
          trendPositive={true}
        />
        <StatCard
          title="Near Spoilage"
          value={dashboardData?.near_spoilage || 18}
          subtitle="Shelf-life <= 2 days"
          icon={AlertTriangle}
          color="amber"
          trend="Priority FIFO"
          trendPositive={false}
        />
        <StatCard
          title="Spoiled Items"
          value={dashboardData?.spoiled || 8}
          subtitle="Disposal pending"
          icon={Flame}
          color="red"
          trend="Quarantine active"
          trendPositive={false}
        />
        <StatCard
          title="Avg Freshness Score"
          value={`${dashboardData?.average_freshness || 84}%`}
          subtitle="Standard baseline > 80%"
          icon={Activity}
          color="purple"
          trend="+2.4% vs last week"
          trendPositive={true}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Freshness Distribution */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Freshness Distribution
              </h3>
              <p className="text-xs text-slate-400">Current batch health spectrum</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              Live
            </span>
          </div>
          <FreshnessDistributionChart data={dashboardData?.freshness_distribution} />
        </div>

        {/* Food Category Distribution */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Category Distribution
              </h3>
              <p className="text-xs text-slate-400">Inventory item count by food type</p>
            </div>
            <button
              onClick={() => onNavigateTab("inventory")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Filter <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <CategoryDistributionChart data={dashboardData?.category_distribution} />
        </div>

        {/* Freshness Trend 7-Days */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                7-Day Freshness Trend
              </h3>
              <p className="text-xs text-slate-400">Rolling aggregate freshness index</p>
            </div>
            <span className="text-xs font-bold text-emerald-400">+2.4%</span>
          </div>
          <FreshnessTrendChart trendData={dashboardData?.freshness_trend} />
        </div>
      </div>

      {/* Bottom Lists: Expiring Soon + Recent Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Expiring Soon (Critical Watchlist)
              </h3>
              <p className="text-xs text-slate-400">Items requiring immediate rotation or consumption</p>
            </div>
            <button
              onClick={() => onNavigateTab("shelflife")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              Shelf-Life Forecast <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {dashboardData?.expiring_soon?.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectFoodItem(item)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-all hover:border-slate-600"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-300">{item.batch_id}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <Badge status={item.freshness_status} />
                    <p className="text-[11px] font-bold text-amber-400 mt-1">
                      {item.estimated_shelf_life_days} day{item.estimated_shelf_life_days !== 1 ? "s" : ""} left
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Food Analyses */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-emerald-400" />
                Recent AI Analyses
              </h3>
              <p className="text-xs text-slate-400">Latest visual spectroscopy evaluations</p>
            </div>
            <button
              onClick={() => onNavigateTab("analysis")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            >
              New Analysis <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {dashboardData?.recent_analyses?.map((ana) => (
              <div
                key={ana.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={ana.image_url}
                    alt={ana.food_name}
                    className="w-10 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{ana.food_name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Confidence: <strong className="text-slate-300">{(ana.confidence * 100).toFixed(0)}%</strong> • {ana.timestamp}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-white">{ana.score}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">/100</span>
                  <div className="mt-0.5">
                    <Badge status={ana.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
