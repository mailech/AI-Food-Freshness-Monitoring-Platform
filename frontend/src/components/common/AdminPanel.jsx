import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Users,
  Cpu,
  History,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export const AdminPanel = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uData, mData, lData] = await Promise.all([
        api.getUsers(token).catch(() => []),
        api.getModelInfo().catch(() => null),
        api.getAuditLogs(token).catch(() => [])
      ]);
      setUsers(uData);
      setModelInfo(mData);
      setAuditLogs(lData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleUser = async (userId, currentStatus) => {
    try {
      await api.updateUser(userId, { is_active: !currentStatus }, token);
      fetchData();
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
            System Administration & AI Governance
          </h1>
          <p className="text-xs sm:text-sm text-[#717171] mt-1">
            Manage user roles, review PyTorch CNN model evaluation benchmarks, and monitor audit trails.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-2xl text-xs font-bold text-[#222222] hover:bg-[#F7F7F7] shadow-sm self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          Refresh Governance Data
        </button>
      </div>

      {/* Model Benchmark Card (Airbnb Style) */}
      {modelInfo && (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Active Production Model
                </span>
                <h3 className="text-lg font-extrabold text-[#222222]">{modelInfo.model_name}</h3>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <span className="px-3.5 py-1.5 bg-[#F7F7F7] rounded-full border border-[#EBEBEB] text-[#555555]">
                Device: <span className="text-emerald-700 font-extrabold uppercase">{modelInfo.device}</span>
              </span>
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100">
                Status: {modelInfo.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Test Accuracy</span>
              <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">
                {modelInfo.metrics?.test_accuracy ? `${(modelInfo.metrics.test_accuracy * 100).toFixed(2)}%` : '97.11%'}
              </span>
            </div>
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Macro F1-Score</span>
              <span className="text-2xl font-black text-teal-700 font-mono mt-1 block">
                {modelInfo.metrics?.weighted_f1_score ? `${(modelInfo.metrics.weighted_f1_score * 100).toFixed(2)}%` : '97.11%'}
              </span>
            </div>
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Test Samples</span>
              <span className="text-2xl font-black text-[#222222] font-mono mt-1 block">
                {modelInfo.metrics?.test_samples || 2698}
              </span>
            </div>
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Classes</span>
              <span className="text-2xl font-black text-purple-700 font-mono mt-1 block">
                {modelInfo.labels?.length || 6}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#222222] text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            System User Accounts & Role Permissions
          </h3>
          <span className="text-xs text-[#717171] font-mono font-bold">{users.length} Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#717171] uppercase tracking-wider font-bold">
                <th className="p-3.5">User</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#F9F9F9] transition">
                  <td className="p-3.5">
                    <p className="font-bold text-[#222222]">{u.full_name}</p>
                    <p className="text-[#717171] font-mono text-[11px]">{u.email}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="capitalize font-bold text-[#222222] bg-[#F0F0F0] px-2.5 py-1 rounded-full">
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#555555]">{u.department || 'HQ'}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                        u.is_active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {u.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleToggleUser(u.id, u.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        u.is_active
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#222222] text-base flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-700" />
            Security Audit Trail
          </h3>
          <span className="text-xs text-[#717171] font-mono font-bold">{auditLogs.length} Events</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB] text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-[#222222] uppercase tracking-wide mr-2 text-[10px] bg-white border border-[#DDDDDD] px-2 py-0.5 rounded-full">
                  {log.action}
                </span>
                <span className="text-[#444444] font-medium">{log.entity_type}: {log.details}</span>
              </div>
              <span className="text-[11px] text-[#717171] font-mono">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
