import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  Bell, 
  ShieldCheck, 
  HelpCircle,
  Thermometer,
  Droplets,
  AlertCircle
} from 'lucide-react';

interface FoodCategory {
  id: string;
  name: string;
  ideal_temp_min: number;
  ideal_temp_max: number;
  ideal_humidity_min: number;
  ideal_humidity_max: number;
  base_shelf_life_days: number;
}

const SettingsPage: React.FC = () => {
  const { userName, role } = useAuth();
  
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [spoilageNotifs, setSpoilageNotifs] = useState(true);
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/batches/categories');
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to load category references:", err);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Preferences saved successfully (local simulation).");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("Password changed successfully (mock).");
    setOldPassword('');
    setNewPassword('');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-black tracking-tight">Configuration Settings</h1>
        <p className="text-xs text-slate-400">Configure notifications rules, check ideal category thresholds, and manage credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Preferences */}
        <div className="space-y-6">
          
          {/* Notifications config */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <span>Alert Notifications</span>
            </h3>

            <form onSubmit={handleSavePreferences} className="space-y-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Email Expiry Warnings</p>
                  <p className="text-slate-500 text-xs mt-0.5">Send summaries when produce nears expiry.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={emailAlerts}
                  onChange={e => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">SMS Spoilage Alerts</p>
                  <p className="text-slate-500 text-xs mt-0.5">Alert operators immediately when mold is detected.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={smsAlerts}
                  onChange={e => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Desktop Push Alarms</p>
                  <p className="text-slate-500 text-xs mt-0.5">Show notifications in header list.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={spoilageNotifs}
                  onChange={e => setSpoilageNotifs(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-700 bg-slate-900 focus:ring-indigo-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg mt-2"
              >
                Save Preferences
              </button>
            </form>
          </div>

          {/* Password Reset */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Update Security Credentials</span>
            </h3>

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">Current Password</label>
                <input 
                  type="password" 
                  required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase">New Password</label>
                <input 
                  type="password" 
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-2xl glass-input text-xs"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-2xl font-bold text-xs"
              >
                Change Password
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Ideal Threshold Matrix */}
        <div className="glass-panel p-5 rounded-3xl space-y-4 max-h-[580px] overflow-y-auto no-scrollbar">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              <span>Target Preservation Matrix</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Ideal temperature & humidity calibration guidelines per category.</p>
          </div>

          <div className="space-y-3 pt-2">
            {categories.map(c => (
              <div key={c.id} className="p-3.5 bg-slate-900/30 rounded-2xl border border-slate-850 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-850 pb-1.5">
                  <h4 className="font-bold text-slate-200">{c.name}</h4>
                  <span className="text-[10px] text-slate-500 font-medium">Shelf: {c.base_shelf_life_days} days</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-indigo-400" />
                    <span>Temp: {c.ideal_temp_min}°C to {c.ideal_temp_max}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-emerald-400" />
                    <span>Humidity: {c.ideal_humidity_min}% to {c.ideal_humidity_max}%</span>
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

export default SettingsPage;
