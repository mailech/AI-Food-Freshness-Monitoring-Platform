import React, { useState, useEffect } from "react";
import {
  ThermometerSnowflake,
  Wind,
  Sun,
  Clock,
  Droplets,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Badge } from "../components/UI/Badge";
import { StorageConditionChart } from "../components/Charts/StorageConditionChart";
import { api } from "../services/api";

export const StorageMonitoring = () => {
  const [zones, setZones] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [zonesData, trendsData] = await Promise.all([
        api.getStorageConditions(),
        api.getStorageTrends(),
      ]);
      setZones(zonesData);
      setTrends(trendsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> IoT Sensor Telemetry & Cold-Chain Integrity
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ThermometerSnowflake className="w-6 h-6 text-blue-400" />
            Storage Environment Monitoring
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time HVAC microclimate regulation across refrigerated vaults, meat lockers, and ambient depots.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Sensors</span>
        </button>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">{zone.zone_name}</h3>
                <span className="text-[11px] text-slate-400">Updated: {zone.last_updated}</span>
              </div>
              <Badge status={zone.overall_status} />
            </div>

            {/* Metrics 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Temperature */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-blue-400" /> Temperature
                  </span>
                  <Badge status={zone.temperature_status} />
                </div>
                <p className="text-xl font-extrabold text-white">{zone.temperature}°C</p>
                <span className="text-[10px] text-slate-400">Target: 2°C - 4°C</span>
              </div>

              {/* Humidity */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-emerald-400" /> Humidity
                  </span>
                  <Badge status={zone.humidity_status} />
                </div>
                <p className="text-xl font-extrabold text-white">{zone.humidity}%</p>
                <span className="text-[10px] text-slate-400">RH Target: 80% - 90%</span>
              </div>

              {/* Air Circulation */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-teal-400" /> Airflow
                  </span>
                  <Badge status={zone.air_status} />
                </div>
                <p className="text-xs font-bold text-slate-200">{zone.air_circulation}</p>
                <span className="text-[10px] text-slate-400">Continuous Laminar Flow</span>
              </div>

              {/* Light Exposure */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" /> Light Level
                  </span>
                  <Badge status={zone.light_status} />
                </div>
                <p className="text-xs font-bold text-slate-200">{zone.light_exposure}</p>
                <span className="text-[10px] text-slate-400">UV Filtered Enclosure</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 24-Hour Telemetry Trend Chart */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              24-Hour Storage Vault Microclimate Telemetry
            </h3>
            <p className="text-xs text-slate-400">
              Correlating continuous temperature cycles and humidity levels
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-semibold">99.8% Compliance Rate</span>
        </div>

        <StorageConditionChart trends={trends} />
      </div>
    </div>
  );
};
