import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ScanLine,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  Package
} from 'lucide-react';

export const FreshnessScanner = () => {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [samples, setSamples] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [sampleName, setSampleName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Contextual inputs
  const [storageLocationId, setStorageLocationId] = useState(1);
  const [packagingType, setPackagingType] = useState('plastic_wrap');
  const [productAgeDays, setProductAgeDays] = useState(2);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const initData = async () => {
      try {
        const [sampleData, locs] = await Promise.all([
          api.getSampleImages(),
          api.getStorageLocations()
        ]);
        setSamples(sampleData);
        setLocations(locs);
        if (sampleData.length > 0) {
          handleSelectSample(sampleData[0]);
        }
      } catch (err) {
        console.error('Failed to load initial scanner data:', err);
      }
    };
    initData();
  }, []);

  const handleSelectSample = (sample) => {
    setIsSample(true);
    setSampleName(sample.filename);
    setSelectedImage(null);
    setPreviewUrl(sample.url);
    setResult(null);
    setErrorMsg('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsSample(false);
      setSampleName('');
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setErrorMsg('');
    }
  };

  const handleExecuteScan = async () => {
    if (!previewUrl) {
      setErrorMsg('Please select a sample produce photo or upload an image.');
      return;
    }

    try {
      setScanning(true);
      setErrorMsg('');

      const formData = new FormData();
      if (isSample) {
        formData.append('sample_name', sampleName);
      } else if (selectedImage) {
        formData.append('file', selectedImage);
      }
      formData.append('storage_location_id', storageLocationId);
      formData.append('packaging_type', packagingType);
      formData.append('product_age_days', productAgeDays);

      const res = await api.scanImage(formData, token);
      setResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Scanning analysis failed. Ensure backend AI service is online.');
    } finally {
      setScanning(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-blue-800 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-rose-800 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-8">
      {/* Airbnb-style Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-100 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>PyTorch CNN · ResNet & Squeeze-and-Excitation Architecture (97.11% Accuracy)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          Produce Freshness & Optical Defect Scanner
        </h1>
        <p className="text-xs sm:text-sm text-[#717171] mt-1 max-w-2xl">
          Instantly evaluate visual degradation, Laplacian texture roughness, surface mold segmentation, and kinetic shelf-life remaining.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Selection & Context Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Inspection Photo Canvas */}
          <div className="bg-white p-6 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#222222]">1. Produce Image</h3>

            <div className="relative aspect-video rounded-2xl bg-[#F7F7F7] overflow-hidden border border-[#EBEBEB] flex items-center justify-center group">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Inspection Target"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-[#999999]">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Select a produce photo</p>
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-3"></div>
                  <span className="text-white text-xs font-bold">
                    Running CNN Classification & Defect Extraction...
                  </span>
                </div>
              )}
            </div>

            {/* Custom Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#222222] rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border border-[#DDDDDD]"
            >
              <UploadCloud className="w-4 h-4 text-[#717171]" />
              Upload Custom Photo
            </button>

            {/* Kaggle Test Produce Gallery (Airbnb Listing Style) */}
            <div className="pt-2">
              <p className="text-xs font-bold text-[#222222] mb-3">Or choose a verified Kaggle benchmark sample:</p>
              <div className="grid grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {samples.map((s) => {
                  const isCur = isSample && sampleName === s.filename;
                  return (
                    <button
                      key={s.filename}
                      onClick={() => handleSelectSample(s)}
                      className={`relative rounded-2xl border p-1.5 text-left transition overflow-hidden ${
                        isCur
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50'
                          : 'border-[#EBEBEB] hover:border-[#CCCCCC] bg-white'
                      }`}
                    >
                      <img src={s.url} alt={s.label} className="w-full h-16 object-cover rounded-xl" />
                      <div className="mt-1.5 px-0.5">
                        <span className="block text-[10px] font-bold text-[#222222] truncate">
                          {s.label}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md block w-max mt-0.5 ${
                            s.is_fresh ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                          }`}
                        >
                          {s.is_fresh ? 'FRESH' : 'ROTTEN'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contextual Environmental Inputs */}
          <div className="bg-white p-6 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-[#222222]">2. Environmental Context</h3>

            <div>
              <label className="text-[#222222] font-bold block mb-1">Target Storage Location:</label>
              <select
                value={storageLocationId}
                onChange={(e) => setStorageLocationId(parseInt(e.target.value))}
                className="w-full border border-[#CCCCCC] rounded-xl px-3.5 py-2.5 bg-white text-[#222222] focus:outline-none focus:border-emerald-600 font-medium"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.location_type.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#222222] font-bold block mb-1">Packaging Barrier:</label>
                <select
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value)}
                  className="w-full border border-[#CCCCCC] rounded-xl px-3 py-2.5 bg-white text-[#222222] focus:outline-none focus:border-emerald-600 font-medium"
                >
                  <option value="unpackaged">Unpackaged (1.0x)</option>
                  <option value="paper_bag">Paper Bag (1.08x)</option>
                  <option value="plastic_wrap">Plastic Wrap (1.25x)</option>
                  <option value="sealed_container">Sealed Container (1.45x)</option>
                  <option value="vacuum_sealed">Vacuum Sealed (1.90x)</option>
                </select>
              </div>

              <div>
                <label className="text-[#222222] font-bold block mb-1">Age in Days:</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={productAgeDays}
                  onChange={(e) => setProductAgeDays(parseInt(e.target.value) || 0)}
                  className="w-full border border-[#CCCCCC] rounded-xl px-3 py-2.5 bg-white text-[#222222] focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            <button
              onClick={handleExecuteScan}
              disabled={scanning}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              {scanning ? 'Running Neural Grading...' : 'Run Complete Freshness Assessment'}
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis Output (7 cols) */}
        <div className="lg:col-span-7">
          {result ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-6">
              {/* Assessment Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F0F0F0]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    Quality Assessment Report
                  </span>
                  <h2 className="text-2xl font-extrabold text-[#222222] mt-0.5 capitalize">
                    {result.classification.predicted_class.replace('fresh', 'Fresh ').replace('rotten', 'Rotten ')}
                  </h2>
                  <p className="text-xs text-[#717171] mt-0.5">
                    Model Confidence: {(result.classification.confidence * 100).toFixed(1)}% · Category: {result.category}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${getScoreBadge(result.overall_freshness_score)}`}>
                  <div className="text-center">
                    <span className="text-[10px] font-extrabold uppercase block tracking-wider">Freshness Index</span>
                    <span className="text-3xl font-black font-mono leading-none">
                      {result.overall_freshness_score}
                    </span>
                  </div>
                  <div className="text-xs font-bold uppercase border-l pl-3 border-current">
                    {result.quality_grade}
                  </div>
                </div>
              </div>

              {/* 4-Factor Weighted Scoring Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-[#222222] mb-3 uppercase tracking-wider">
                  4-Factor Weighted Quality Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                    <div className="flex justify-between font-bold text-[#222222] mb-1.5">
                      <span>Visual Quality (40%)</span>
                      <span className="font-mono text-emerald-700 font-extrabold">{result.scoring_breakdown.visual_condition_score}%</span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${result.scoring_breakdown.visual_condition_score}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                    <div className="flex justify-between font-bold text-[#222222] mb-1.5">
                      <span>Storage Compliance (25%)</span>
                      <span className="font-mono text-blue-700 font-extrabold">{result.scoring_breakdown.storage_condition_score}%</span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${result.scoring_breakdown.storage_condition_score}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                    <div className="flex justify-between font-bold text-[#222222] mb-1.5">
                      <span>Shelf Life Remaining (20%)</span>
                      <span className="font-mono text-purple-700 font-extrabold">{result.scoring_breakdown.shelf_life_remaining_score}%</span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${result.scoring_breakdown.shelf_life_remaining_score}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                    <div className="flex justify-between font-bold text-[#222222] mb-1.5">
                      <span>Product Age Factor (15%)</span>
                      <span className="font-mono text-amber-700 font-extrabold">{result.scoring_breakdown.product_age_score}%</span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${result.scoring_breakdown.product_age_score}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OpenCV Optical Defect Extraction */}
              <div>
                <h4 className="text-xs font-bold text-[#222222] mb-3 uppercase tracking-wider">
                  OpenCV Defect Segmentation
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB] text-center">
                    <span className="text-[#717171] block text-[11px]">Color Loss</span>
                    <span className="font-extrabold text-[#222222] font-mono mt-1 block">
                      {result.opencv_features.color_degradation_pct}%
                    </span>
                  </div>
                  <div className="p-3 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB] text-center">
                    <span className="text-[#717171] block text-[11px]">Laplacian Texture</span>
                    <span className="font-extrabold text-[#222222] font-mono mt-1 block">
                      {result.opencv_features.texture_roughness_score}
                    </span>
                  </div>
                  <div className="p-3 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB] text-center">
                    <span className="text-[#717171] block text-[11px]">Mold Coverage</span>
                    <span className="font-extrabold text-[#222222] font-mono mt-1 block">
                      {result.opencv_features.mold_coverage_pct}%
                    </span>
                  </div>
                  <div className="p-3 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB] text-center">
                    <span className="text-[#717171] block text-[11px]">Bruising Defect</span>
                    <span className="font-extrabold text-[#222222] font-mono mt-1 block">
                      {result.opencv_features.bruising_pct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Kinetic Shelf-Life Prediction */}
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                    Arrhenius Kinetic Shelf-Life Forecast (Q10 = 2.1)
                  </span>
                  <p className="text-sm font-bold text-[#222222] mt-0.5">
                    Estimated Remaining: <span className="text-emerald-700 font-extrabold">{result.shelf_life_prediction.remaining_hours.toFixed(1)} Hours</span> ({result.shelf_life_prediction.remaining_days.toFixed(1)} Days)
                  </p>
                  <p className="text-[11px] text-[#717171]">
                    Projected Expiry: {new Date(result.shelf_life_prediction.projected_expiry).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Auto-synced Item Pill */}
              {result.saved_item && (
                <div className="p-3.5 bg-[#222222] text-white rounded-2xl text-xs flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Synchronized to Master Inventory ({result.saved_item.sku})
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">Qty: {result.saved_item.quantity_kg} kg</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[420px] bg-white rounded-3xl border border-[#EBEBEB] p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <ScanLine className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#222222]">Awaiting Produce Scan</h3>
              <p className="text-xs text-[#717171] max-w-sm mt-1.5 leading-relaxed">
                Select a sample produce item or upload a custom image on the left to run neural network classification and 4-factor freshness grading.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
