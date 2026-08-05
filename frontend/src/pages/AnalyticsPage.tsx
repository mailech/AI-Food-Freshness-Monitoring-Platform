import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart3, 
  Thermometer, 
  Droplets,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Line } from 'react-chartjs-2';

const AnalyticsPage: React.FC = () => {
  const { isDark } = useTheme();
  
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get('/api/inventory');
      setItems(res.data);
      if (res.data.length > 0) {
        setSelectedItemId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error loading inventory items:", err);
    }
  };

  useEffect(() => {
    if (selectedItemId) {
      fetchTrends(selectedItemId);
    }
  }, [selectedItemId]);

  const fetchTrends = async (id: string) => {
    setLoadingTrends(true);
    try {
      const res = await axios.get(`/api/analytics/environmental-trends/${id}`);
      setTrendData(res.data);
    } catch (err) {
      console.error("Error loading environmental trends:", err);
    } finally {
      setLoadingTrends(false);
    }
  };

  // Prepare chart config
  const tempChartData = {
    labels: trendData.map(d => new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: trendData.map(d => d.temperature),
        borderColor: '#6366F1', // Indigo
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const humidChartData = {
    labels: trendData.map(d => new Date(d.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        label: 'Humidity (%)',
        data: trendData.map(d => d.humidity),
        borderColor: '#10B981', // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: isDark ? '#94a3b8' : '#475569',
          font: { family: 'Inter' }
        }
      }
    },
    scales: {
      y: {
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        ticks: { color: isDark ? '#64748b' : '#475569' }
      },
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#64748b' : '#475569' }
      }
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-black tracking-tight">Environmental Analytics</h1>
        <p className="text-xs text-slate-400">Track and visualize historical environmental parameters and shelf life metrics.</p>
      </div>

      {/* Item selector block */}
      <div className="glass-panel p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wide">Select Item to Inspect</h3>
          <p className="text-xs text-slate-500 mt-0.5">Showing sensor trends for selected inventory records.</p>
        </div>

        <select
          value={selectedItemId}
          onChange={e => setSelectedItemId(e.target.value)}
          className="px-4 py-3 rounded-2xl glass-input text-sm appearance-none bg-slate-900 w-full sm:w-64"
        >
          {items.map(item => (
            <option key={item.id} value={item.id}>{item.name} ({item.category.name})</option>
          ))}
        </select>
      </div>

      {/* Graphs list */}
      {selectedItemId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Temperature trend */}
          <div className="glass-panel p-5 rounded-3xl min-h-[380px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Temperature Trend</h3>
                <p className="text-xs text-slate-500">Fluctuations in Celsius degrees</p>
              </div>
              <Thermometer className="w-5 h-5 text-indigo-400" />
            </div>

            {loadingTrends ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-650" />
                <h4 className="font-bold text-slate-400">No Temperature Logs</h4>
                <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                  There are no environmental records logged for this item yet. Use the inventory page log button to record readings.
                </p>
              </div>
            ) : (
              <div className="h-64 mt-4">
                <Line data={tempChartData} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Humidity trend */}
          <div className="glass-panel p-5 rounded-3xl min-h-[380px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Humidity Trend</h3>
                <p className="text-xs text-slate-500">Fluctuations in moisture percentage</p>
              </div>
              <Droplets className="w-5 h-5 text-emerald-400" />
            </div>

            {loadingTrends ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <AlertCircle className="w-10 h-10 text-slate-650" />
                <h4 className="font-bold text-slate-400">No Humidity Logs</h4>
                <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                  There are no environmental records logged for this item yet. Use the inventory page log button to record readings.
                </p>
              </div>
            ) : (
              <div className="h-64 mt-4">
                <Line data={humidChartData} options={chartOptions} />
              </div>
            )}
          </div>

        </div>
      )}

      {/* Overall description */}
      <div className="glass-panel p-5 rounded-3xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-bold">Interpretation Guide</h4>
          <p className="text-slate-400 leading-relaxed">
            AI engines continuously calibrate predictions against ambient storage data. If temperatures consistently hover above guidelines, decay is accelerated, and remaining shelf life is marked down accordingly. Keep sensors calibrated to maintain predictive accuracy.
          </p>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsPage;
