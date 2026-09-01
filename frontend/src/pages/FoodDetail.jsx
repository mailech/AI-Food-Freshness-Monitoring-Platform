import React from "react";
import {
  ArrowLeft,
  Calendar,
  Thermometer,
  Droplets,
  Hourglass,
  Flame,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  Edit2
} from "lucide-react";
import { Badge } from "../components/UI/Badge";
import { ScoreGauge } from "../components/UI/ScoreGauge";
import { FreshnessTrendChart } from "../components/Charts/FreshnessTrendChart";

export const FoodDetail = ({ item, onBack, onNavigateAnalysis }) => {
  if (!item) return null;

  const trendData = item.freshness_history
    ? item.freshness_history.map((h) => ({
        day: h.date,
        avg_score: h.score,
      }))
    : [];

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Inventory Overview</span>
      </button>

      {/* Main Hero Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row gap-6 items-start">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full md:w-56 h-56 rounded-2xl object-cover border border-slate-700 shadow-xl flex-shrink-0"
        />

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {item.category}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{item.name}</h2>
              <p className="font-mono text-xs text-emerald-400 mt-0.5">Batch ID: {item.batch_id}</p>
            </div>
            <Badge status={item.freshness_status} />
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {item.recommendation || `Maintained at ${item.storage_temp}°C in high-humidity sealed storage.`}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Stock Quantity</span>
              <p className="text-sm font-bold text-white mt-0.5">{item.quantity} {item.unit}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Purchase Date</span>
              <p className="text-sm font-bold text-white mt-0.5">{item.purchase_date}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Expected Expiry</span>
              <p className="text-sm font-bold text-amber-400 mt-0.5">{item.expiry_date}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Packaging</span>
              <p className="text-xs font-bold text-white mt-0.5 truncate">{item.packaging_type}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Score Gauge */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col items-center justify-center">
          <ScoreGauge score={item.freshness_score} size={150} label="Current Freshness Score" />
        </div>

        {/* Spoilage & Shelf Life */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400">Shelf-Life Prediction</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-emerald-400">{item.estimated_shelf_life_days}</span>
              <span className="text-sm font-semibold text-slate-300">Days remaining</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Based on storage duration of {item.storage_duration_days || 3} days.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Spoilage Probability:</span>
              <strong className="text-white">{(item.spoilage_probability * 100).toFixed(0)}%</strong>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  item.spoilage_probability < 0.2 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${item.spoilage_probability * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Storage Conditions */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-slate-400">Preservation Environment</span>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-blue-400" /> Temperature
                </span>
                <span className="font-bold text-white">{item.storage_temp}°C</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-emerald-400" /> Humidity
                </span>
                <span className="font-bold text-white">{item.humidity}% RH</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateAnalysis?.()}
            className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl transition-colors"
          >
            Re-Inspect with AI
          </button>
        </div>
      </div>

      {/* Freshness History Trend */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              7-Day Freshness Degradation Curve
            </h3>
            <p className="text-xs text-slate-400">Historical daily scores for this specific batch</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">Stable Trend</span>
        </div>

        <FreshnessTrendChart trendData={trendData} />
      </div>
    </div>
  );
};
