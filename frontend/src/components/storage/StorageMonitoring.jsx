import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ThermometerSnowflake,
  Activity,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Wind,
  Droplets
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const StorageMonitoring = () => {
  const { token } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simSuccess, setSimSuccess] = useState('');

  // Simulation state
  const [tempSim, setTempSim] = useState(4.0);
  const [humSim, setHumSim] = useState(85.0);
  const [ethSim, setEthSim] = useState(0.8);
  const [co2Sim, setCo2Sim] = useState(400);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await api.getStorageLocations();
      setLocations(data);
      if (data.length > 0 && !selectedLocation) {
        setSelectedLocation(data[0]);
        loadReadings(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReadings = async (locId) => {
    try {
      const data = await api.getReadings(locId);
      const formatted = data.map(r => ({
        ...r,
        time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setReadings(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc);
    loadReadings(loc.id);
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    if (!selectedLocation) return;
    try {
      setSimulating(true);
      const res = await api.simulateTelemetry({
        storage_location_id: selectedLocation.id,
        temperature: parseFloat(tempSim),
        humidity: parseFloat(humSim),
        ethylene: parseFloat(ethSim),
        co2_level: parseFloat(co2Sim)
      }, token);

      setSimSuccess(`IoT Telemetry Emitted! Compliance Status: ${res.compliance_status.toUpperCase()}`);
      loadReadings(selectedLocation.id);
      fetchLocations();
      setTimeout(() => setSimSuccess(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
            Cold Chain & IoT Climate Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-[#717171] mt-1">
            Real-time environmental telemetry across cold storage rooms, refrigerators, and warehouse bays.
          </p>
        </div>
        <button
          onClick={fetchLocations}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-2xl text-xs font-bold text-[#222222] hover:bg-[#F7F7F7] shadow-sm self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600" />
          Refresh Sensors
        </button>
      </div>

      {/* Climate Zones Grid (Airbnb Property Card Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {locations.map((loc) => {
          const isSelected = selectedLocation?.id === loc.id;
          const isCompliant = loc.latest_reading?.is_compliant ?? true;
          return (
            <div
              key={loc.id}
              onClick={() => handleSelectLocation(loc)}
              className={`p-5 rounded-3xl border-2 transition cursor-pointer shadow-sm ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                  : 'border-[#EBEBEB] bg-white hover:border-[#CCCCCC]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-[#222222] text-sm truncate">{loc.name}</span>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                    isCompliant
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                  }`}
                >
                  {isCompliant ? 'COMPLIANT' : 'VIOLATION'}
                </span>
              </div>
              <p className="text-xs text-[#717171] capitalize mb-4">{loc.location_type.replace('_', ' ')}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                  <span className="text-[#717171] block text-[10px]">Temperature</span>
                  <span className="font-extrabold text-[#222222] text-sm font-mono mt-0.5 block">
                    {loc.latest_reading?.temperature ?? '--'} °C
                  </span>
                </div>
                <div className="p-2.5 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                  <span className="text-[#717171] block text-[10px]">Humidity</span>
                  <span className="font-extrabold text-[#222222] text-sm font-mono mt-0.5 block">
                    {loc.latest_reading?.humidity ?? '--'} %
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Telemetry Charts & Simulation Sandbox */}
      {selectedLocation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#222222] text-base">
                  {selectedLocation.name} · 24h Sensor History
                </h3>
                <p className="text-xs text-[#717171] mt-0.5">
                  Safe Target Window: {selectedLocation.target_temp_min}°C - {selectedLocation.target_temp_max}°C | {selectedLocation.target_humidity_min}% - {selectedLocation.target_humidity_max}% RH
                </p>
              </div>
              <span className="text-xs font-mono font-bold bg-[#F0F0F0] px-3 py-1 rounded-full text-[#555555]">
                {readings.length} Points
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="time" stroke="#717171" fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#059669" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#0284c7" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#222222', borderColor: '#333333', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#059669" strokeWidth={2.5} dot={{ r: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 2 }} />
                  <Line yAxisId="left" type="monotone" dataKey="ethylene" name="Ethylene (ppm)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Threshold Limits Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#F0F0F0] text-xs">
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium text-[10px]">Optimal Temp</span>
                <span className="font-extrabold text-[#222222] mt-0.5 block">
                  {selectedLocation.target_temp_min}°C - {selectedLocation.target_temp_max}°C
                </span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium text-[10px]">Optimal Humidity</span>
                <span className="font-extrabold text-[#222222] mt-0.5 block">
                  {selectedLocation.target_humidity_min}% - {selectedLocation.target_humidity_max}%
                </span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium text-[10px]">Ethylene Ceiling</span>
                <span className="font-extrabold text-[#222222] mt-0.5 block">
                  {selectedLocation.max_ethylene_ppm} ppm
                </span>
              </div>
              <div className="p-3 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium text-[10px]">Max CO2 Ceiling</span>
                <span className="font-extrabold text-[#222222] mt-0.5 block">
                  {selectedLocation.max_co2_ppm} ppm
                </span>
              </div>
            </div>
          </div>

          {/* Interactive IoT Sandbox (1 col) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-[#222222] text-base">IoT Simulation Sandbox</h3>
              </div>
              <p className="text-xs text-[#717171] mb-6">
                Adjust sensor sliders to test automatic threshold violation detection and Arrhenius recalculation.
              </p>

              {simSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{simSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSimulate} className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-bold text-[#222222] mb-1">
                    <span>Temperature (°C)</span>
                    <span className="font-mono text-emerald-700">{tempSim}°C</span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="35"
                    step="0.5"
                    value={tempSim}
                    onChange={(e) => setTempSim(e.target.value)}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-[#222222] mb-1">
                    <span>Relative Humidity (%)</span>
                    <span className="font-mono text-blue-700">{humSim}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="1"
                    value={humSim}
                    onChange={(e) => setHumSim(e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-[#222222] mb-1">
                    <span>Ethylene Gas (ppm)</span>
                    <span className="font-mono text-amber-700">{ethSim} ppm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.2"
                    value={ethSim}
                    onChange={(e) => setEthSim(e.target.value)}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-bold text-[#222222] mb-1">
                    <span>CO2 Level (ppm)</span>
                    <span className="font-mono text-purple-700">{co2Sim} ppm</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="2000"
                    step="50"
                    value={co2Sim}
                    onChange={(e) => setCo2Sim(e.target.value)}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {simulating ? 'Transmitting...' : 'Inject IoT Telemetry Packet'}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-[#F0F0F0] text-[11px] text-[#717171]">
              Breaching bounds triggers instant high-priority alerts in the Alerts Center.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
