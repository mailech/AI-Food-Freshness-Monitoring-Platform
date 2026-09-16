'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface InspectionRecord {
  id: string;
  inspector_name?: string;
  product_name: string;
  category: string;
  packaging_type: string;
  storage_location: string;
  storage_temperature: number;
  humidity: number;
  air_circulation: string;
  light_exposure: string;
  storage_duration_days: number;
  image_url?: string;
  ai_predicted_class: string;
  ai_confidence: number;
  freshness_score: number;
  predicted_shelf_life_days: number;
  quality_classification: string;
  mold_detected: boolean;
  bruising_detected: boolean;
  damage_detected: boolean;
  color_degradation: number;
  texture_roughness: number;
  status: string;
  remarks?: string;
  action_taken?: string;
  inspected_at: string;
}

interface DashboardSummary {
  total_inspections: number;
  pending_inspections: number;
  passed_inspections: number;
  warning_inspections: number;
  quarantined_inspections: number;
  fresh_count: number;
  good_count: number;
  acceptable_count: number;
  near_spoilage_count: number;
  spoiled_count: number;
  recent_inspections: InspectionRecord[];
}

export default function InspectorDashboardPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form State for New Quality Inspection Workflow
  const [productName, setProductName] = useState('Gala Apples');
  const [category, setCategory] = useState('Fruits');
  const [packagingType, setPackagingType] = useState('Cartboard Box');
  const [storageLocation, setStorageLocation] = useState('Cold Storage A');
  const [temperature, setTemperature] = useState(4.0);
  const [humidity, setHumidity] = useState(85.0);
  const [airCirculation, setAirCirculation] = useState('Medium');
  const [lightExposure, setLightExposure] = useState('Low');
  const [storageDuration, setStorageDuration] = useState(2.0);
  const [statusDecision, setStatusDecision] = useState('PASSED');
  const [actionTaken, setActionTaken] = useState('APPROVED FOR RETAIL');
  const [remarks, setRemarks] = useState('Visual and environmental parameters meet food safety compliance standards.');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token);
      fetchDashboardData(token);
    }
  }, []);

  const fetchDashboardData = async (token: string) => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [sumRes, listRes] = await Promise.all([
        fetch('/api/v1/inspection/dashboard', { headers }),
        fetch('/api/v1/inspection/list', { headers })
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (listRes.ok) {
        const listData = await listRes.json();
        setInspections(listData);
      }
    } catch (err) {
      console.error('Failed to load inspector dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setMessage({ type: 'error', text: 'Authentication token missing. Please log in as a Food Quality Inspector.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('product_name', productName);
    formData.append('category', category);
    formData.append('packaging_type', packagingType);
    formData.append('storage_location', storageLocation);
    formData.append('storage_temperature', temperature.toString());
    formData.append('humidity', humidity.toString());
    formData.append('air_circulation', airCirculation);
    formData.append('light_exposure', lightExposure);
    formData.append('storage_duration_days', storageDuration.toString());
    formData.append('status_in', statusDecision);
    formData.append('action_taken', actionTaken);
    formData.append('remarks', remarks);

    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const res = await fetch('/api/v1/inspection/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Inspection failed');
      }

      const newRecord: InspectionRecord = await res.json();
      setMessage({ type: 'success', text: `Quality inspection created successfully! Status: ${newRecord.status}` });
      setSelectedInspection(newRecord);
      
      // Refresh dashboard data
      fetchDashboardData(authToken);
      
      // Reset form file
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit quality inspection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInspections = inspections.filter(item => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold rounded-full uppercase tracking-wider">
                Official Audit Portal
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white mt-2 tracking-tight">
              Food Quality Inspector Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Audit food batches, review AI visual detections, verify environmental compliance, and log formal quality decisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
            >
              Main Landing
            </Link>
            <button
              onClick={() => authToken && fetchDashboardData(authToken)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-purple-600/20 transition"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Metrics Summary Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Audits</p>
            <p className="text-2xl font-black text-white mt-1">{summary?.total_inspections ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Formal inspection logs</p>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl shadow-sm">
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Passed / Approved</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{summary?.passed_inspections ?? 0}</p>
            <p className="text-xs text-emerald-500/70 mt-1">Fresh / Compliant lots</p>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-2xl shadow-sm">
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Warnings / Markdown</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{summary?.warning_inspections ?? 0}</p>
            <p className="text-xs text-amber-500/70 mt-1">Near spoilage advisories</p>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl shadow-sm">
            <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">Quarantined / Rejected</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{summary?.quarantined_inspections ?? 0}</p>
            <p className="text-xs text-rose-500/70 mt-1">Mold or severe damage</p>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Quality Breakdown</p>
            <div className="flex items-center justify-between text-xs mt-2 text-slate-300">
              <span>Fresh: <strong className="text-emerald-400">{summary?.fresh_count ?? 0}</strong></span>
              <span>Spoiled: <strong className="text-rose-400">{summary?.spoiled_count ?? 0}</strong></span>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border text-sm font-medium ${
            message.type === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Main Grid: Quality Inspection Form + Selected Inspection Audit Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form: Execute New Quality Inspection */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                Execute New Quality Inspection Audit
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Collect image specimens, enter climate logs, review AI inferences, and log formal quality decisions.
              </p>
            </div>

            <form onSubmit={handleCreateInspection} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="E.g., Gala Apples"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Food Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Fruits">Fruits</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Dairy Products">Dairy Products</option>
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Seafood">Seafood</option>
                    <option value="Bakery Products">Bakery Products</option>
                    <option value="Packaged Foods">Packaged Foods</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Packaging Type</label>
                  <select
                    value={packagingType}
                    onChange={(e) => setPackagingType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Cartboard Box">Cartboard Box</option>
                    <option value="Vacuum Sealed">Vacuum Sealed</option>
                    <option value="Modified Atmosphere Packaging (MAP)">Modified Atmosphere (MAP)</option>
                    <option value="Plastic Wrap">Plastic Wrap</option>
                    <option value="Plastic Jug">Plastic Jug</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="E.g., Cold Storage A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Duration (Days)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={storageDuration}
                    onChange={(e) => setStorageDuration(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Humidity (% RH)</label>
                  <input
                    type="number"
                    step="1"
                    value={humidity}
                    onChange={(e) => setHumidity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Air Circulation</label>
                  <select
                    value={airCirculation}
                    onChange={(e) => setAirCirculation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Light Exposure</label>
                  <select
                    value={lightExposure}
                    onChange={(e) => setLightExposure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Dark">Dark</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Upload Food Image Specimen */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Specimen Image (JPEG/PNG)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                />
                {previewUrl && (
                  <div className="mt-2 w-32 h-32 rounded-xl overflow-hidden border border-slate-700 bg-black">
                    <img src={previewUrl} alt="Specimen Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Inspector Decision & Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Inspector Status Decision</label>
                  <select
                    value={statusDecision}
                    onChange={(e) => setStatusDecision(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="PASSED" className="text-emerald-400 font-bold">PASSED (Approved)</option>
                    <option value="WARNING" className="text-amber-400 font-bold">WARNING (Fast Dispatch / Markdown)</option>
                    <option value="QUARANTINED" className="text-rose-400 font-bold">QUARANTINED (Mold / Severe Damage)</option>
                    <option value="REJECTED" className="text-rose-500 font-bold">REJECTED (Disposal / Composting)</option>
                    <option value="PENDING" className="text-slate-400 font-bold">PENDING (Further Lab Test)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Action Taken Statement</label>
                  <input
                    type="text"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                    placeholder="E.g., APPROVED FOR RETAIL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Inspector Clinical Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  placeholder="Notes on visual quality, defect severity, or environmental compliance..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition duration-150 disabled:opacity-50"
              >
                {isSubmitting ? 'Analyzing Specimen & Filing Audit...' : 'File Quality Inspection Audit'}
              </button>
            </form>
          </div>

          {/* Audit Detail Inspector View */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Inspection Audit Details
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select an inspection from the table below to review multi-factor details.
              </p>
            </div>

            {selectedInspection ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-slate-400">Product</p>
                    <p className="text-sm font-bold text-white">{selectedInspection.product_name}</p>
                    <p className="text-[10px] text-slate-500">{selectedInspection.category}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      selectedInspection.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      selectedInspection.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {selectedInspection.status}
                    </span>
                  </div>
                </div>

                {selectedInspection.image_url && (
                  <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <img src={selectedInspection.image_url} alt="Specimen" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-400">Freshness Score</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{selectedInspection.freshness_score} / 100</p>
                    <p className="text-[10px] text-slate-400">Classification: <strong>{selectedInspection.quality_classification}</strong></p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-slate-400">Remaining Shelf Life</p>
                    <p className="text-xl font-black text-purple-400 mt-1">{selectedInspection.predicted_shelf_life_days} Days</p>
                    <p className="text-[10px] text-slate-400">Packaging: {selectedInspection.packaging_type}</p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <p className="font-bold text-white">AI Detection & Defects Breakdown</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>AI Prediction: <strong className="text-white">{selectedInspection.ai_predicted_class}</strong></div>
                    <div>Confidence: <strong className="text-white">{Math.round(selectedInspection.ai_confidence * 100)}%</strong></div>
                    <div>Mold Detected: <strong className={selectedInspection.mold_detected ? 'text-rose-400' : 'text-slate-400'}>{selectedInspection.mold_detected ? 'YES' : 'NO'}</strong></div>
                    <div>Bruising: <strong className={selectedInspection.bruising_detected ? 'text-amber-400' : 'text-slate-400'}>{selectedInspection.bruising_detected ? 'YES' : 'NO'}</strong></div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <p className="font-bold text-white">Action Taken</p>
                  <p className="text-emerald-400 font-semibold">{selectedInspection.action_taken || 'N/A'}</p>
                  <p className="text-slate-400 mt-1"><strong>Inspector Notes:</strong> {selectedInspection.remarks || 'No additional remarks'}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No inspection selected. Click an inspection row from the history table to view details.
              </div>
            )}
          </div>
        </div>

        {/* Recent Inspection History Table */}
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Inspection History & Quality Audits</h2>
              <p className="text-xs text-slate-400 mt-1">Formal records filed by Food Quality Inspectors.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PASSED">PASSED</option>
                <option value="WARNING">WARNING</option>
                <option value="QUARANTINED">QUARANTINED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Freshness Score</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Shelf Life</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action Taken</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredInspections.length > 0 ? (
                  filteredInspections.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedInspection(item)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition ${
                        selectedInspection?.id === item.id ? 'bg-purple-950/20 border-l-2 border-purple-500' : ''
                      }`}
                    >
                      <td className="p-3 font-bold text-white">{item.product_name}</td>
                      <td className="p-3 text-slate-400">{item.category}</td>
                      <td className="p-3 font-semibold text-emerald-400">{item.freshness_score}</td>
                      <td className="p-3">{item.quality_classification}</td>
                      <td className="p-3 font-semibold text-purple-300">{item.predicted_shelf_life_days} days</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'PASSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          item.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 truncate max-w-[160px]">{item.action_taken || 'N/A'}</td>
                      <td className="p-3 text-slate-500">{new Date(item.inspected_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No inspection audits logged yet. Use the form above to execute your first quality inspection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
