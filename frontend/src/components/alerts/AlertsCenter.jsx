import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  CheckCheck,
  Clock,
  ShieldAlert,
  Flame,
  Package
} from 'lucide-react';

export const AlertsCenter = () => {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total_active: 0, critical: 0, warning: 0, info: 0 });
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterSeverity) params.severity = filterSeverity;
      if (filterStatus === 'active') params.is_resolved = false;
      if (filterStatus === 'resolved') params.is_resolved = true;
      if (filterStatus === 'unread') params.is_read = false;

      const [alertsData, summaryData] = await Promise.all([
        api.getAlerts(params),
        api.getAlertSummary()
      ]);
      setAlerts(alertsData);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterSeverity, filterStatus]);

  const handleMarkRead = async (alertId) => {
    try {
      await api.markAlertRead(alertId, token);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.resolveAlert(alertId, token);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllAlertsRead(token);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
            Spoilage Alerts & Anomaly Center
          </h1>
          <p className="text-xs sm:text-sm text-[#717171] mt-1">
            Real-time threshold breaches, rapid degradation warnings, and critical shelf-life expirations.
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-2xl text-xs font-bold text-[#222222] hover:bg-[#F7F7F7] shadow-sm self-start md:self-auto"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          Mark All As Read
        </button>
      </div>

      {/* KPI Summary Cards (Airbnb Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm">
          <span className="text-xs font-bold text-[#717171] uppercase tracking-wider">Active Alerts</span>
          <p className="text-3xl font-extrabold text-[#222222] mt-2">{summary.total_active}</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-rose-200 bg-rose-50/30 shadow-sm">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Critical Severity
          </span>
          <p className="text-3xl font-extrabold text-rose-600 mt-2">{summary.critical}</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Warning Severity</span>
          <p className="text-3xl font-extrabold text-amber-700 mt-2">{summary.warning}</p>
        </div>
        <div className="p-6 bg-white rounded-3xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Informational</span>
          <p className="text-3xl font-extrabold text-blue-700 mt-2">{summary.info}</p>
        </div>
      </div>

      {/* Filter Tabs & Severity Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#717171]" />
          <span className="text-xs font-bold text-[#222222]">Status:</span>
          <div className="flex bg-[#F0F0F0] p-1 rounded-full text-xs font-semibold">
            {['active', 'unread', 'resolved', 'all'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3.5 py-1 rounded-full capitalize transition ${
                  filterStatus === st ? 'bg-white text-[#222222] shadow-sm font-bold' : 'text-[#717171]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-xs font-bold border border-[#CCCCCC] rounded-xl px-3.5 py-2 bg-white text-[#222222] focus:outline-none focus:border-emerald-600"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical Only</option>
          <option value="warning">Warning Only</option>
          <option value="info">Info Only</option>
        </select>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#EBEBEB]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-xs text-[#717171] mt-2 font-medium">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#EBEBEB] text-[#717171]">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#222222]">All Systems Normal</p>
            <p className="text-xs text-[#717171] mt-0.5">No active alerts matching your filter criteria.</p>
          </div>
        ) : (
          alerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-6 rounded-3xl border bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                !alt.is_read ? 'border-l-4 border-l-rose-500 bg-rose-50/10' : 'border-[#EBEBEB]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    alt.severity === 'critical'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : alt.severity === 'warning'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        alt.severity === 'critical'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : alt.severity === 'warning'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-xs font-mono text-[#717171] capitalize">
                      {alt.alert_type.replace('_', ' ')}
                    </span>
                    {alt.is_resolved && (
                      <span className="text-[10px] font-bold bg-[#F0F0F0] text-[#717171] px-2 py-0.5 rounded-full">
                        Resolved
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-[#222222]">{alt.title}</h4>
                  <p className="text-xs text-[#555555] mt-1 leading-relaxed">{alt.message}</p>
                  <div className="flex items-center gap-4 text-[11px] text-[#717171] mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(alt.created_at).toLocaleString()}
                    </span>
                    {alt.food_item_id && (
                      <span className="flex items-center gap-1 text-[#222222] font-semibold">
                        <Package className="w-3.5 h-3.5" /> Item #{alt.food_item_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {!alt.is_read && (
                  <button
                    onClick={() => handleMarkRead(alt.id)}
                    className="px-4 py-2 bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#222222] rounded-xl text-xs font-bold transition border border-[#DDDDDD]"
                  >
                    Mark Read
                  </button>
                )}
                {!alt.is_resolved && (
                  <button
                    onClick={() => handleResolve(alt.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Resolve Alert
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
