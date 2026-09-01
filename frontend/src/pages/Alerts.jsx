import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Flame,
  ThermometerSnowflake,
  Boxes,
  ShieldCheck,
  Info,
  CheckCircle2,
  Trash2
} from "lucide-react";
import { Toast } from "../components/UI/Toast";
import { api } from "../services/api";

export const ALERT_TYPES = [
  "All",
  "Freshness Alert",
  "Shelf-Life Warning",
  "Spoilage Alert",
  "Storage Condition Alert",
  "Inventory Alert",
];

export const Alerts = ({ onSelectFoodItem }) => {
  const [alerts, setAlerts] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchAlerts = async () => {
    try {
      const data = await api.getAlerts(selectedType, unreadOnly);
      setAlerts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedType, unreadOnly]);

  const handleMarkRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.markAlertRead(id);
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead();
      setToastMessage({ type: "success", text: "All alerts marked as read!" });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const getAlertIcon = (type, severity) => {
    if (severity === "critical" || type === "Spoilage Alert") {
      return <Flame className="w-5 h-5 text-red-400" />;
    }
    if (type === "Shelf-Life Warning") {
      return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
    if (type === "Storage Condition Alert") {
      return <ThermometerSnowflake className="w-5 h-5 text-blue-400" />;
    }
    if (type === "Inventory Alert") {
      return <Boxes className="w-5 h-5 text-teal-400" />;
    }
    return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Alerts & Anomaly Notifications
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time triggers for critical degradation, sensor deviations, and urgent inventory dispatches.
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="glass-card p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {ALERT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedType === t
                  ? "bg-emerald-500 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer pr-2">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/30 bg-slate-800"
          />
          <span>Unread Only</span>
        </label>
      </div>

      {/* Alert items list */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm font-bold text-white">No Active Alerts</p>
            <p className="text-xs text-slate-400 mt-1">All food batches and storage zones are within safe parameters.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`glass-card rounded-2xl p-4 sm:p-5 border transition-all flex items-start justify-between gap-4 ${
                !alert.is_read
                  ? "border-amber-500/40 bg-slate-900/90 shadow-lg shadow-amber-500/5"
                  : "border-slate-800/80 opacity-80"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                    alert.severity === "critical"
                      ? "bg-red-500/15 border-red-500/30"
                      : alert.severity === "warning"
                      ? "bg-amber-500/15 border-amber-500/30"
                      : "bg-blue-500/15 border-blue-500/30"
                  }`}
                >
                  {getAlertIcon(alert.type, alert.severity)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{alert.title}</h4>
                    {!alert.is_read && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{alert.message}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 font-medium">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {alert.type}
                    </span>
                    <span>•</span>
                    <span>{alert.timestamp}</span>
                  </div>
                </div>
              </div>

              {!alert.is_read && (
                <button
                  onClick={(e) => handleMarkRead(alert.id, e)}
                  title="Mark as Read"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
