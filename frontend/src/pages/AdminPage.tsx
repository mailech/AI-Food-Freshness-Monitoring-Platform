import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Users, 
  Terminal, 
  Cpu, 
  Activity,
  AlertTriangle,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Line } from 'react-chartjs-2';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface ActivityLog {
  user_id: string;
  action: string;
  details: string;
  timestamp: string;
}

interface APIMonitor {
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  timestamp: string;
}

interface ModelPerf {
  model_name: string;
  predicted_category: string;
  freshness_score: number;
  spoilage_probability: number;
  remaining_shelf_life_days: number;
  timestamp: string;
}

const AdminPage: React.FC = () => {
  const { role } = useAuth();
  const { isDark } = useTheme();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [apiLogs, setApiLogs] = useState<APIMonitor[]>([]);
  const [modelLogs, setModelLogs] = useState<ModelPerf[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Current active sub-tab
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'api' | 'model'>('users');

  useEffect(() => {
    if (role === 'admin') {
      fetchAdminData();
    }
  }, [role]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [userRes, logRes, apiRes, modelRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/system-logs'),
        axios.get('/api/admin/api-monitoring'),
        axios.get('/api/admin/model-performance')
      ]);
      setUsers(userRes.data);
      setActivityLogs(logRes.data);
      setApiLogs(apiRes.data);
      setModelLogs(modelRes.data);
    } catch (error) {
      console.error("Failed to load administration telemetry:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await axios.put(`/api/admin/users/${userId}/status?is_active=${!currentStatus}`);
      setUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u)
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update user status.");
    }
  };

  if (role !== 'admin') {
    return (
      <div className="glass-panel p-10 rounded-3xl text-center max-w-lg mx-auto mt-12 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="font-extrabold text-xl">Unauthorized Access</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          The administration portal is restricted. Role 'Admin' is required to view telemetry systems, API charts, or user catalogs.
        </p>
      </div>
    );
  }

  // API Latency Graph Config
  const latencyChartData = {
    labels: apiLogs.slice(0, 15).reverse().map(l => new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})),
    datasets: [
      {
        label: 'API Request Latency (ms)',
        data: apiLogs.slice(0, 15).reverse().map(l => l.latency_ms),
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { ticks: { color: isDark ? '#64748b' : '#475569' } },
      x: { ticks: { color: isDark ? '#64748b' : '#475569' } }
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">System Control Panel</h1>
          <p className="text-xs text-slate-400">Monitor active user databases, API response speeds, and PyTorch model telemetry.</p>
        </div>
        <button 
          onClick={fetchAdminData}
          className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/20 hover:bg-slate-850 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className="w-5 h-5 animate-hover" />
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Controls</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'activity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>

        <button 
          onClick={() => setActiveTab('api')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'api' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>API Speed</span>
        </button>

        <button 
          onClick={() => setActiveTab('model')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'model' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Telemetry</span>
        </button>
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs">Querying system log stores...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* USER CONTROLS PANEL */}
          {activeTab === 'users' && (
            <div className="glass-panel p-5 rounded-3xl space-y-4">
              <h3 className="font-bold text-lg">System Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-xs">
                      <th className="py-2">User Name</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">System Role</th>
                      <th className="py-2">Created At</th>
                      <th className="py-2 text-right">Account Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {users.map(u => (
                      <tr key={u.id} className="text-slate-350">
                        <td className="py-3 font-semibold text-slate-200">{u.name}</td>
                        <td className="py-3">{u.email}</td>
                        <td className="py-3 capitalize text-indigo-400 font-medium">{u.role.replace('_', ' ')}</td>
                        <td className="py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className="p-1 rounded-lg inline-flex"
                          >
                            {u.is_active ? (
                              <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-slate-550 cursor-pointer" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOG PANEL */}
          {activeTab === 'activity' && (
            <div className="glass-panel p-5 rounded-3xl space-y-4">
              <h3 className="font-bold text-lg">Operations Audit Logs (MongoDB)</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar font-mono text-xs">
                {activityLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/30 rounded-xl border border-slate-850 flex flex-col md:flex-row justify-between gap-1">
                    <div>
                      <span className="text-indigo-400 font-bold">[{log.action}]</span>
                      <span className="text-slate-400 ml-2">{log.details}</span>
                    </div>
                    <span className="text-slate-600 text-[10px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API MONITORING PANEL */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="glass-panel p-5 rounded-3xl min-h-[350px] flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg">Request Response Latencies</h3>
                  <p className="text-xs text-slate-500 font-medium">Real-time HTTP requests latency tracking (MongoDB Time Series)</p>
                </div>
                <div className="h-64 mt-4">
                  <Line data={latencyChartData} options={chartOptions} />
                </div>
              </div>

              <div className="glass-panel p-5 rounded-3xl space-y-4">
                <h3 className="font-bold text-lg">Recent Endpoints Hits</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase">
                        <th className="py-2">Method</th>
                        <th className="py-2">Endpoint URL</th>
                        <th className="py-2">Response Code</th>
                        <th className="py-2">Latency</th>
                        <th className="py-2 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30 text-slate-400">
                      {apiLogs.slice(0, 10).map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/10">
                          <td className="py-2 font-bold text-indigo-400">{l.method}</td>
                          <td className="py-2 font-semibold text-slate-200">{l.endpoint}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              l.status_code < 400 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                            }`}>{l.status_code}</span>
                          </td>
                          <td className="py-2 font-medium">{l.latency_ms} ms</td>
                          <td className="py-2 text-right text-slate-650">{new Date(l.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AI MODEL TELEMETRY */}
          {activeTab === 'model' && (
            <div className="glass-panel p-5 rounded-3xl space-y-4">
              <h3 className="font-bold text-lg">PyTorch CNN Diagnostic Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-xs">
                      <th className="py-2">Model Target</th>
                      <th className="py-2">Predicted Classification</th>
                      <th className="py-2">Freshness score</th>
                      <th className="py-2">Decay probability</th>
                      <th className="py-2 text-right">Inference Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-slate-350">
                    {modelLogs.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/10">
                        <td className="py-3 font-semibold text-slate-200">{m.model_name}</td>
                        <td className="py-3 text-indigo-400">{m.predicted_category}</td>
                        <td className="py-3 font-bold">{m.freshness_score}%</td>
                        <td className="py-3">{(m.spoilage_probability * 100).toFixed(1)}%</td>
                        <td className="py-3 text-right text-slate-600">{new Date(m.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default AdminPage;
