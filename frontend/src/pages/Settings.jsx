import React, { useState } from "react";
import {
  Settings as SettingsIcon,
  Shield,
  User,
  Bell,
  Cpu,
  Save,
  CheckCircle2,
  Sliders,
  Database
} from "lucide-react";
import { useAuth, ROLES } from "../context/AuthContext";
import { Toast } from "../components/UI/Toast";

export const Settings = () => {
  const { user, setRole } = useAuth();
  const [activeRole, setActiveRole] = useState(user?.role || "Food Quality Inspector");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [expiryThreshold, setExpiryThreshold] = useState("3");
  const [spoilageThreshold, setSpoilageThreshold] = useState("40");
  const [toastMessage, setToastMessage] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setRole(activeRole);
    setToastMessage({ type: "success", text: "Settings and preferences saved successfully!" });
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-emerald-400" />
          Platform Settings & Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure inspection sensitivity thresholds, role permissions, and active telemetry integration parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Profile & Role Section */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            User Profile & Role Authorization
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                disabled
                value={user?.name || "Dr. Elena Rostova"}
                className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-xs text-slate-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Active Organization Role
              </label>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AI & Alert Thresholds */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Freshness & Expiry Sensitivity Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Shelf-Life Warning Trigger (Days)
              </label>
              <input
                type="number"
                value={expiryThreshold}
                onChange={(e) => setExpiryThreshold(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Trigger alert when remaining shelf life &lt;= X days</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Critical Spoilage Score Cutoff (0-100)
              </label>
              <input
                type="number"
                value={spoilageThreshold}
                onChange={(e) => setSpoilageThreshold(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400">Mark item as Critical Spoiled when score &lt;= X</span>
            </div>
          </div>
        </div>

        {/* System & Architecture Info */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            AI Pipeline & Engine Status
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Inference Core</span>
              <p className="font-bold text-emerald-400 mt-0.5">Modular AI Service (Ready for YOLO/PyTorch)</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Database Layer</span>
              <p className="font-bold text-white mt-0.5">In-Memory Seeded (17 Batches)</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Backend API</span>
              <p className="font-bold text-white mt-0.5">FastAPI v0.141 / Uvicorn</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400">Frontend UI</span>
              <p className="font-bold text-white mt-0.5">React 18 + Tailwind + Chart.js</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
