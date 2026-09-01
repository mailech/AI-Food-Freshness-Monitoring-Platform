import React, { useState, useEffect } from "react";
import {
  Hourglass,
  Calendar,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { Badge } from "../components/UI/Badge";
import { api } from "../services/api";

export const ShelfLife = ({ onSelectFoodItem }) => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.getFoods({ sort_by: "expiry_date" });
        setFoods(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Predictive Degradation Models
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Hourglass className="w-6 h-6 text-emerald-400" />
            Shelf-Life Intelligence & Horizon Forecast
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Calibrated predictive curves combining visual respiration indexes, Arrhenius temperature factors, and relative humidity.
          </p>
        </div>
      </div>

      {/* Grid of Shelf Life Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {foods.map((item) => {
          const daysLeft = item.estimated_shelf_life_days;
          const isCritical = daysLeft <= 1;
          const isWarning = daysLeft > 1 && daysLeft <= 3;

          return (
            <div
              key={item.id}
              onClick={() => onSelectFoodItem(item)}
              className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{item.batch_id}</p>
                    </div>
                  </div>
                  <Badge status={item.freshness_status} />
                </div>

                {/* Main Shelf Life Highlight */}
                <div className="my-4 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Estimated Remaining Life
                    </span>
                    <p
                      className={`text-2xl font-extrabold tracking-tight ${
                        isCritical
                          ? "text-red-400"
                          : isWarning
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {daysLeft} {daysLeft === 1 ? "Day" : "Days"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Risk Profile</span>
                    <p className="text-xs font-bold text-slate-200 mt-1">
                      {isCritical ? "Critical High" : isWarning ? "Moderate" : "Nominal Low"}
                    </p>
                  </div>
                </div>

                {/* Storage parameter details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Exp: {item.expiry_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                    <span>{item.storage_temp}°C ({item.humidity}%)</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Confidence: <strong className="text-slate-300">{(item.confidence * 100).toFixed(0)}%</strong>
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                  Deep Dive <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
