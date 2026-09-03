'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Allowed Categories
const CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy Products',
  'Meat & Poultry',
  'Seafood',
  'Bakery Products',
  'Packaged Foods',
  'Beverages',
];

// Food Kinetic Constants
const FOOD_CATEGORY_CONSTANTS: Record<string, {
  ideal_temp: number;
  ideal_humidity: number;
  base_shelf_life: number;
  temp_sensitivity: number;
  humidity_sensitivity: number;
}> = {
  "Fruits": { ideal_temp: 4.0, ideal_humidity: 90.0, base_shelf_life: 14.0, temp_sensitivity: 1.08, humidity_sensitivity: 1.02 },
  "Vegetables": { ideal_temp: 4.0, ideal_humidity: 95.0, base_shelf_life: 10.0, temp_sensitivity: 1.09, humidity_sensitivity: 1.02 },
  "Dairy Products": { ideal_temp: 3.0, ideal_humidity: 50.0, base_shelf_life: 7.0, temp_sensitivity: 1.15, humidity_sensitivity: 1.01 },
  "Meat & Poultry": { ideal_temp: 0.0, ideal_humidity: 85.0, base_shelf_life: 5.0, temp_sensitivity: 1.18, humidity_sensitivity: 1.02 },
  "Seafood": { ideal_temp: -1.0, ideal_humidity: 90.0, base_shelf_life: 3.0, temp_sensitivity: 1.22, humidity_sensitivity: 1.02 },
  "Bakery Products": { ideal_temp: 20.0, ideal_humidity: 40.0, base_shelf_life: 5.0, temp_sensitivity: 1.05, humidity_sensitivity: 1.08 },
  "Packaged Foods": { ideal_temp: 20.0, ideal_humidity: 45.0, base_shelf_life: 180.0, temp_sensitivity: 1.02, humidity_sensitivity: 1.01 },
  "Beverages": { ideal_temp: 8.0, ideal_humidity: 50.0, base_shelf_life: 90.0, temp_sensitivity: 1.03, humidity_sensitivity: 1.00 },
};

const PACKAGING_MODIFIERS: Record<string, number> = {
  "Vacuum Sealed": 2.5,
  "Modified Atmosphere Packaging (MAP)": 2.0,
  "Plastic Wrap": 1.2,
  "Plastic Jug": 1.1,
  "Cartboard Box": 1.0,
  "None": 1.0,
};

const getEnvironmentalDefaultsByLocation = (location: string | undefined): [number, number] => {
  const loc = (location || "").toLowerCase();
  if (loc.includes("freezer")) return [-18.0, 90.0];
  if (loc.includes("fridge") || loc.includes("cold") || loc.includes("refrigerat")) return [4.0, 85.0];
  if (loc.includes("cooler")) return [10.0, 80.0];
  return [20.0, 50.0];
};

const runShelfLifePredictionKinetics = (
  category: string,
  packaging: string,
  temperature: number,
  humidity: number,
  storageDurationDays: number,
  visualFreshnessScore: number = 100.0
) => {
  const consts = FOOD_CATEGORY_CONSTANTS[category] || FOOD_CATEGORY_CONSTANTS["Fruits"];
  const k_base = 70.0 / consts.base_shelf_life;
  const pkg_mod = PACKAGING_MODIFIERS[packaging] || 1.0;
  
  const temp_diff = temperature - consts.ideal_temp;
  const temp_factor = Math.pow(consts.temp_sensitivity, temp_diff);
  
  const hum_diff = Math.abs(humidity - consts.ideal_humidity);
  const hum_factor = Math.pow(consts.humidity_sensitivity, hum_diff);
  
  const k_effective = Math.max(0.1, (k_base * temp_factor * hum_factor) / pkg_mod);
  
  const total_life_current = 70.0 / k_effective;
  const starting_quality = Math.min(100.0, Math.max(30.0, visualFreshnessScore));
  let remaining_days = Math.max(0.0, (starting_quality - 30.0) / k_effective) - storageDurationDays;
  remaining_days = Math.max(0.0, remaining_days);
  
  let risk = "LOW";
  if (remaining_days < 2.0) risk = "HIGH";
  else if (remaining_days < 5.0) risk = "MEDIUM";
  
  let temp_impact = "";
  if (Math.abs(temp_diff) <= 1.0) {
    temp_impact = "Optimal temperature maintenance.";
  } else if (temp_diff > 0) {
    temp_impact = `Temp is ${temp_diff.toFixed(1)}°C above ideal (${consts.ideal_temp}°C). Accelerates decay by ${((temp_factor - 1.0) * 100).toFixed(0)}%.`;
  } else {
    temp_impact = `Temp is ${Math.abs(temp_diff).toFixed(1)}°C below ideal. Slows decay.`;
  }

  let hum_impact = "";
  if (hum_diff <= 5.0) {
    hum_impact = "Optimal humidity levels.";
  } else {
    hum_impact = `Humidity is ${hum_diff.toFixed(1)}% off from ideal (${consts.ideal_humidity}%). Accelerates decay by ${((hum_factor - 1.0) * 100).toFixed(0)}%.`;
  }

  return {
    remainingDays: parseFloat(remaining_days.toFixed(1)),
    risk,
    recommendedTemp: consts.ideal_temp,
    recommendedHumidity: consts.ideal_humidity,
    temp_impact,
    hum_impact,
    total_life_ideal: consts.base_shelf_life * pkg_mod,
    total_life_current: parseFloat(total_life_current.toFixed(1)),
  };
};

// TypeScript Interfaces
interface BatchType {
  id: string;
  batch_number: string;
  supplier_name: string;
  received_date: string;
}

interface InventoryItemType {
  id: string;
  name: string;
  category: string;
  batch_id: string;
  batch?: BatchType;
  quantity: number;
  unit: string;
  packaging_type?: string;
  entry_date: string;
  expiry_date: string;
  status: string;
  storage_location?: string;
}

interface ImageAnalysisType {
  id: string;
  item_id: string;
  filename: string;
  file_url: string;
  freshness_score: number;
  color_degradation: number;
  texture_roughness: number;
  mold_detected: boolean;
  mold_confidence: number;
  bruising_detected: boolean;
  bruising_confidence: number;
  damage_detected: boolean;
  damage_confidence: number;
  analyzed_at: string;
}

interface TrendPointType {
  timestamp: string;
  freshness_score: number;
  quality_classification: string;
}

// Mock Initial Batches (Lots)
const INITIAL_BATCHES: BatchType[] = [
  { id: 'b1', batch_number: 'LOT-20260809-01', supplier_name: 'GreenValley Co.', received_date: '2026-08-09T08:00:00Z' },
  { id: 'b2', batch_number: 'LOT-20260809-02', supplier_name: 'Anchor Dairy Ltd.', received_date: '2026-08-08T10:00:00Z' },
  { id: 'b3', batch_number: 'LOT-20260809-03', supplier_name: 'Pacific Catch Farms', received_date: '2026-08-07T11:00:00Z' },
];

// Mock Initial Items
const INITIAL_ITEMS: InventoryItemType[] = [
  { id: 'i1', name: 'Organic Red Apples', category: 'Fruits', batch_id: 'b1', batch: INITIAL_BATCHES[0], quantity: 120, unit: 'kg', packaging_type: 'Cartboard Box', entry_date: '2026-08-01T00:00:00Z', expiry_date: '2026-08-25T00:00:00Z', status: 'FRESH', storage_location: 'Aisle A' },
  { id: 'i2', name: 'Fresh Whole Milk', category: 'Dairy Products', batch_id: 'b2', batch: INITIAL_BATCHES[1], quantity: 90, unit: 'liters', packaging_type: 'Plastic Jug', entry_date: '2026-08-07T00:00:00Z', expiry_date: '2026-08-11T00:00:00Z', status: 'WARNING', storage_location: 'Fridge Unit A' },
  { id: 'i3', name: 'Fresh Atlantic Salmon', category: 'Seafood', batch_id: 'b3', batch: INITIAL_BATCHES[2], quantity: 15, unit: 'kg', packaging_type: 'Vacuum Sealed', entry_date: '2026-08-06T00:00:00Z', expiry_date: '2026-08-08T00:00:00Z', status: 'SPOIRED', storage_location: 'Freezer C' },
];

// Initial Image Analysis Reports
const INITIAL_ANALYSES: ImageAnalysisType[] = [
  {
    id: 'a1',
    item_id: 'i1',
    filename: 'apples_batch1.jpg',
    file_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
    freshness_score: 92.4,
    color_degradation: 0.08,
    texture_roughness: 0.12,
    mold_detected: false,
    mold_confidence: 0.0,
    bruising_detected: false,
    bruising_confidence: 0.0,
    damage_detected: false,
    damage_confidence: 0.0,
    analyzed_at: '2026-08-09T08:30:00Z',
  },
  {
    id: 'a2',
    item_id: 'i2',
    filename: 'milk_jug.jpg',
    file_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    freshness_score: 58.0,
    color_degradation: 0.38,
    texture_roughness: 0.28,
    mold_detected: false,
    mold_confidence: 0.0,
    bruising_detected: true,
    bruising_confidence: 0.48,
    damage_detected: false,
    damage_confidence: 0.0,
    analyzed_at: '2026-08-08T11:20:00Z',
  },
  {
    id: 'a3',
    item_id: 'i3',
    filename: 'spoiled_salmon.jpg',
    file_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    freshness_score: 18.2,
    color_degradation: 0.85,
    texture_roughness: 0.78,
    mold_detected: true,
    mold_confidence: 0.89,
    bruising_detected: true,
    bruising_confidence: 0.95,
    damage_detected: true,
    damage_confidence: 0.88,
    analyzed_at: '2026-08-07T12:00:00Z',
  }
];

export default function RetailDashboard() {
  const roles = [
    { code: 'CONSUMER', name: 'Consumer (Read-Only)' },
    { code: 'RETAIL_MANAGER', name: 'Retail Manager (Write Allowed)' },
    { code: 'WAREHOUSE_OPERATOR', name: 'Warehouse Operator (Write Allowed)' },
  ];

  // Global State
  const [currentRole, setCurrentRole] = useState('RETAIL_MANAGER');
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const loginUserForRole = async () => {
      const email = `${currentRole.toLowerCase()}@freshlens.com`;
      const password = 'Password123!';
      const fullName = `${currentRole.replace('_', ' ')} Simulator`;

      try {
        await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role: currentRole === 'ROOT_ADMIN' ? 'ADMIN' : (currentRole === 'QUALITY_INSPECTOR' ? 'QUALITY_INSPECTOR' : currentRole)
          })
        });
      } catch (e) {
        // Ignore registration failures
      }

      try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const res = await fetch('/api/v1/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        });

        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.access_token);
        }
      } catch (e) {
        console.error('Failed to authenticate role:', e);
      }
    };

    loginUserForRole();
  }, [currentRole]);

  const [items, setItems] = useState<InventoryItemType[]>(INITIAL_ITEMS);
  const [batches, setBatches] = useState<BatchType[]>(INITIAL_BATCHES);
  const [mockAnalyses, setMockAnalyses] = useState<ImageAnalysisType[]>(INITIAL_ANALYSES);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modals State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [activeItemForAnalysis, setActiveItemForAnalysis] = useState<InventoryItemType | null>(null);
  
  // Freshness & Trend data State
  const [itemAnalyses, setItemAnalyses] = useState<ImageAnalysisType[]>([]);
  const [freshnessTrend, setFreshnessTrend] = useState<TrendPointType[]>([]);
  const [spoilageProbability, setSpoilageProbability] = useState(0.0);
  const [blendedScore, setBlendedScore] = useState(100.0);

  // Simulation telemetry state
  const [simTemp, setSimTemp] = useState<number>(20.0);
  const [simHumidity, setSimHumidity] = useState<number>(50.0);
  const [simPrediction, setSimPrediction] = useState<any>(null);

  // Storage Compliance state
  const [storageReport, setStorageReport] = useState<any>(null);
  const [storageHistory, setStorageHistory] = useState<any[]>([]);

  // Multi-Factor Scoring state
  const [scoringReport, setScoringReport] = useState<any>(null);

  // Phase 8: Recommendations State
  const [recommendationsReport, setRecommendationsReport] = useState<any>(null);
  const [activeRecTab, setActiveRecTab] = useState<'storage' | 'consumption' | 'rotation' | 'waste' | 'quality'>('storage');

  // Manual Storage Form Ingestion Inputs
  const [storageForm, setStorageForm] = useState({
    temperature: 4.0,
    humidity: 85.0,
    air_circulation: 'Medium',
    light_exposure: 'Low'
  });

  // Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Form inputs state
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Fruits',
    batch_id: '',
    quantity: 1,
    unit: 'kg',
    packaging_type: 'None',
    expiry_date: '',
    storage_location: '',
  });

  const [batchForm, setBatchForm] = useState({
    batch_number: '',
    supplier_name: '',
  });

  // Phase 10: Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifPref, setNotifPref] = useState({
    email_enabled: true,
    push_enabled: true,
    min_freshness_threshold: 50.0,
    storage_alerts_enabled: true
  });

  const loadNotifications = async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`/api/v1/notification/?role=${currentRole}`, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(data);
      setUnreadNotifCount(data.filter((n: any) => !n.is_read).length);
    } catch {
      // Offline fallback: generate mock alerts if empty!
      const mockAlerts = [
        { id: 'n_1', title: '⚠️ Climate Deviation Alert', message: 'Zone Cold Storage Room 1 reports temp=5.2°C (target is below 4.0°C).', type: 'storage', is_read: false, created_at: new Date().toISOString() },
        { id: 'n_2', title: '🚨 Spoilage Alarm: Salmon', message: 'Visual analysis detected mold on Salmon batches.', type: 'spoilage', is_read: false, created_at: new Date(Date.now() - 3600 * 1000).toISOString() },
        { id: 'n_3', title: '🔄 FEFO Override prioritised', message: 'Milk cartons shelf-life is decaying faster than time limits. Prioritize dispatch.', type: 'shelf-life', is_read: true, created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
      ];
      setNotifications(mockAlerts);
      setUnreadNotifCount(mockAlerts.filter(a => !a.is_read).length);
    }
  };

  const markNotifRead = async (id: string) => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      await fetch(`/api/v1/notification/${id}/read`, { method: 'PATCH', headers });
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadNotifCount(c => Math.max(0, c - 1));
  };

  const markAllNotifRead = async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      await fetch(`/api/v1/notification/read-all?role=${currentRole}`, { method: 'POST', headers });
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadNotifCount(0);
  };

  useEffect(() => {
    loadNotifications();
    // Poll for notifications every 10 seconds for real-time sandbox updates
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentRole]);

  // Calculate days left
  const getDaysLeft = (expiryDateStr: string) => {
    const exp = new Date(expiryDateStr);
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDynamicStatus = (expiryDateStr: string) => {
    const daysLeft = getDaysLeft(expiryDateStr);
    if (daysLeft < 0) return 'SPOILED';
    if (daysLeft <= 3) return 'WARNING';
    return 'FRESH';
  };

  const getDecayFactor = (entryDateStr: string, expiryDateStr: string, targetDate: Date) => {
    const entry = new Date(entryDateStr).getTime();
    const expiry = new Date(expiryDateStr).getTime();
    const target = targetDate.getTime();

    const total = expiry - entry;
    if (total <= 0) return 0.0;

    const remaining = expiry - target;
    const factor = (remaining / total) * 100.0;
    return Math.max(0.0, Math.min(100.0, factor));
  };

  // Blended Freshness Index calculation
  const getBlendedFreshnessInfo = (item: InventoryItemType) => {
    const decay = getDecayFactor(item.entry_date, item.expiry_date, new Date());
    const latest = mockAnalyses
      .filter(a => a.item_id === item.id)
      .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];

    let score = decay;
    if (latest) {
      const M = latest.mold_detected ? 1.0 : 0.0;
      const VS = latest.freshness_score;
      const B = latest.color_degradation;
      const R = latest.texture_roughness;
      const Br = latest.bruising_detected ? 1.0 : 0.0;
      const D = latest.damage_detected ? 1.0 : 0.0;

      score = (1.0 - M) * (0.4 * VS + 0.6 * decay - B * 20.0 - R * 15.0 - Br * 10.0 - D * 10.0);
      score = Math.max(0.0, Math.min(100.0, score));
    }

    let classification = 'Fresh';
    let colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    
    if (score >= 85.0) {
      classification = 'Fresh';
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else if (score >= 70.0) {
      classification = 'Good';
      colorClass = 'bg-green-500/10 text-green-400 border-green-500/20';
    } else if (score >= 50.0) {
      classification = 'Acceptable';
      colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    } else if (score >= 30.0) {
      classification = 'Near Spoilage';
      colorClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse';
    } else {
      classification = 'Spoiled';
      colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-black';
    }

    return {
      score: parseFloat(score.toFixed(1)),
      classification,
      colorClass,
      spoilageProbability: parseFloat((100.0 - score).toFixed(1)),
    };
  };

  const getDynamicRemainingShelfLife = (item: InventoryItemType) => {
    const [defTemp, defHum] = getEnvironmentalDefaultsByLocation(item.storage_location);
    const elapsed = (Date.now() - new Date(item.entry_date).getTime()) / (1000 * 60 * 60 * 24);
    const latest = mockAnalyses
      .filter(a => a.item_id === item.id)
      .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];
    const visualScore = latest ? latest.freshness_score : 100.0;
    
    return runShelfLifePredictionKinetics(
      item.category,
      item.packaging_type || "None",
      defTemp,
      defHum,
      Math.max(0, elapsed),
      visualScore
    );
  };

  // Phase 8 FEFO Override Checker for table rendering
  const hasFefoOverride = (item: InventoryItemType) => {
    const calendarDays = (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24);
    const pred = getDynamicRemainingShelfLife(item);
    return pred.remainingDays < calendarDays - 1.5;
  };

  const runSimulation = (temp: number, hum: number, item: InventoryItemType) => {
    const elapsed = (Date.now() - new Date(item.entry_date).getTime()) / (1000 * 60 * 60 * 24);
    const latest = mockAnalyses
      .filter(a => a.item_id === item.id)
      .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];
    const visualScore = latest ? latest.freshness_score : 100.0;

    const pred = runShelfLifePredictionKinetics(
      item.category,
      item.packaging_type || "None",
      temp,
      hum,
      Math.max(0.0, elapsed),
      visualScore
    );
    setSimPrediction(pred);
  };

  const canWrite = () => {
    return currentRole === 'RETAIL_MANAGER' || currentRole === 'WAREHOUSE_OPERATOR';
  };

  // Open Analysis Modal & Load data
  const openAnalysisModal = async (item: InventoryItemType) => {
    setActiveItemForAnalysis(item);
    setIsAnalysisModalOpen(true);
    setSelectedFile(null);
    setFilePreview(null);
    setActiveRecTab('storage');

    const [defTemp, defHum] = getEnvironmentalDefaultsByLocation(item.storage_location);
    setSimTemp(defTemp);
    setSimHumidity(defHum);
    setStorageForm({
      temperature: defTemp,
      humidity: defHum,
      air_circulation: 'Medium',
      light_exposure: 'Low'
    });

    const elapsed = (Date.now() - new Date(item.entry_date).getTime()) / (1000 * 60 * 60 * 24);
    const latest = mockAnalyses
      .filter(a => a.item_id === item.id)
      .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];
    const visualScore = latest ? latest.freshness_score : 100.0;
    
    const pred = runShelfLifePredictionKinetics(
      item.category,
      item.packaging_type || "None",
      defTemp,
      defHum,
      Math.max(0, elapsed),
      visualScore
    );
    setSimPrediction(pred);
    
    await loadFreshnessTelemetry(item);
    await loadStorageTelemetry(item);
    await loadScoringBreakdown(item);
    await loadRecommendations(item);
  };

  const loadFreshnessTelemetry = async (item: InventoryItemType) => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const response = await fetch(`/api/v1/freshness/item/${item.id}`, { headers });
      if (!response.ok) throw new Error('API offline');
      const data = await response.json();
      
      setBlendedScore(data.current.freshness_score);
      setSpoilageProbability(data.current.spoilage_probability);
      setFreshnessTrend(data.trend);
      
      const imgRes = await fetch(`/api/v1/image-analysis/item/${item.id}`, { headers });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        setItemAnalyses(imgData);
      }
    } catch (err) {
      const info = getBlendedFreshnessInfo(item);
      setBlendedScore(info.score);
      setSpoilageProbability(info.spoilageProbability);

      const itemReports = mockAnalyses
        .filter(a => a.item_id === item.id)
        .sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime());

      setItemAnalyses([...itemReports].reverse());

      const trendPoints: TrendPointType[] = [];
      const entry = new Date(item.entry_date);
      const expiry = new Date(item.expiry_date);
      const total = expiry.getTime() - entry.getTime();

      if (itemReports.length > 0) {
        itemReports.forEach(report => {
          const decay = getDecayFactor(item.entry_date, item.expiry_date, new Date(report.analyzed_at));
          
          const M = report.mold_detected ? 1.0 : 0.0;
          const VS = report.freshness_score;
          const B = report.color_degradation;
          const R = report.texture_roughness;
          const Br = report.bruising_detected ? 1.0 : 0.0;
          const D = report.damage_detected ? 1.0 : 0.0;

          const score = (1.0 - M) * (0.4 * VS + 0.6 * decay - B * 20.0 - R * 15.0 - Br * 10.0 - D * 10.0);
          const finalScore = Math.max(0.0, Math.min(100.0, score));

          trendPoints.push({
            timestamp: report.analyzed_at,
            freshness_score: parseFloat(finalScore.toFixed(1)),
            quality_classification: getBlendedFreshnessInfo(item).classification,
          });
        });
      } else {
        const steps = 5;
        for (let s = 0; s <= steps; s++) {
          const time = new Date(entry.getTime() + (total * (s / steps)));
          if (time.getTime() > Date.now()) {
            trendPoints.push({
              timestamp: new Date().toISOString(),
              freshness_score: info.score,
              quality_classification: info.classification,
            });
            break;
          }
          const decay = getDecayFactor(item.entry_date, item.expiry_date, time);
          trendPoints.push({
            timestamp: time.toISOString(),
            freshness_score: parseFloat(decay.toFixed(1)),
            quality_classification: decay >= 85 ? 'Fresh' : decay >= 70 ? 'Good' : decay >= 50 ? 'Acceptable' : decay >= 30 ? 'Near Spoilage' : 'Spoiled',
          });
        }
      }
      setFreshnessTrend(trendPoints);
    }
  };

  const loadStorageTelemetry = async (item: InventoryItemType) => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`/api/v1/storage/item/${item.id}`, { headers });
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      setStorageReport(data);
      
      const histRes = await fetch(`/api/v1/storage/item/${item.id}/history`, { headers });
      if (histRes.ok) {
        const histData = await histRes.json();
        setStorageHistory(histData);
      }
    } catch (err) {
      const defaults = getEnvironmentalDefaultsByLocation(item.storage_location);
      const consts = FOOD_CATEGORY_CONSTANTS[item.category] || FOOD_CATEGORY_CONSTANTS["Fruits"];
      const t_ideal = consts.ideal_temp;
      const h_ideal = consts.ideal_humidity;
      
      const temp_diff = defaults[0] - t_ideal;
      const hum_diff = defaults[1] - h_ideal;
      
      let status = 'COMPLIANT';
      const recs = [];
      if (Math.abs(temp_diff) > 5.0 || Math.abs(hum_diff) > 20.0) {
        status = 'CRITICAL';
      } else if (Math.abs(temp_diff) > 2.0 || Math.abs(hum_diff) > 10.0) {
        status = 'WARNING';
      }
      
      if (temp_diff > 2.0) recs.push(`Temperature is ${temp_diff.toFixed(1)}°C above ideal. Increase refrigeration cooling.`);
      if (temp_diff < -2.0) recs.push(`Temperature is ${Math.abs(temp_diff).toFixed(1)}°C below ideal. Check if chill damage occurred.`);
      if (hum_diff > 10.0) recs.push(`Humidity is ${hum_diff.toFixed(1)}% above ideal. Open ventilation dampers.`);
      
      if (recs.length === 0) recs.push("All storage conditions are fully compliant with guidelines.");

      setStorageReport({
        item_id: item.id,
        warehouse_zone: item.storage_location || 'Storage Zone Alpha',
        compliance_status: status,
        temperature: defaults[0],
        humidity: defaults[1],
        air_circulation: 'Medium',
        light_exposure: 'Low',
        temperature_deviation: parseFloat(temp_diff.toFixed(1)),
        humidity_deviation: parseFloat(hum_diff.toFixed(1)),
        recorded_at: new Date().toISOString(),
        recommendations: recs
      });
      
      setStorageHistory([
        {
          id: 'h_1',
          temperature: defaults[0],
          humidity: defaults[1],
          air_circulation: 'Medium',
          light_exposure: 'Low',
          recorded_at: new Date().toISOString()
        },
        {
          id: 'h_2',
          temperature: defaults[0] + 1.5,
          humidity: defaults[1] - 4,
          air_circulation: 'Medium',
          light_exposure: 'Low',
          recorded_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
        }
      ]);
    }
  };

  const loadScoringBreakdown = async (item: InventoryItemType) => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`/api/v1/scoring/item/${item.id}`, { headers });
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      setScoringReport(data);
    } catch (err) {
      const defaults = getEnvironmentalDefaultsByLocation(item.storage_location);
      const consts = FOOD_CATEGORY_CONSTANTS[item.category] || FOOD_CATEGORY_CONSTANTS["Fruits"];
      const t_ideal = consts.ideal_temp;
      const h_ideal = consts.ideal_humidity;
      
      const temp_diff = defaults[0] - t_ideal;
      const hum_diff = defaults[1] - h_ideal;
      
      const latest = mockAnalyses
        .filter(a => a.item_id === item.id)
        .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];
      
      let visScore = 100.0;
      let moldDetected = false;
      if (latest) {
        visScore = (1.0 - (latest.mold_detected ? 1.0 : 0.0)) * 
                   (latest.freshness_score - latest.color_degradation * 20.0 - latest.texture_roughness * 15.0 - (latest.bruising_detected ? 10.0 : 0.0) - (latest.damage_detected ? 10.0 : 0.0));
        visScore = Math.max(0.0, Math.min(100.0, visScore));
        moldDetected = latest.mold_detected;
      }
      
      const temp_penalty = Math.min(50.0, Math.abs(temp_diff) * 10.0);
      const hum_penalty = Math.min(30.0, Math.abs(hum_diff) * 1.5);
      const storageScore = Math.max(0.0, 100.0 - temp_penalty - hum_penalty);
      
      const elapsed = (Date.now() - new Date(item.entry_date).getTime()) / (1000 * 60 * 60 * 24);
      const kinetics = runShelfLifePredictionKinetics(item.category, item.packaging_type || 'None', defaults[0], defaults[1], Math.max(0, elapsed), latest ? latest.freshness_score : 100.0);
      const pkg_mod = PACKAGING_MODIFIERS[item.packaging_type || 'None'] || 1.0;
      const total_ideal = consts.base_shelf_life * pkg_mod;
      const shelfLifeScore = Math.max(0.0, Math.min(100.0, (kinetics.remainingDays / total_ideal) * 100.0));
      
      const total_allotted = (new Date(item.expiry_date).getTime() - new Date(item.entry_date).getTime()) / (1000 * 3600 * 24);
      const remaining_days_allotted = (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24);
      const ageScore = total_allotted <= 0 ? 0.0 : Math.max(0.0, Math.min(100.0, (remaining_days_allotted / total_allotted) * 100.0));
      
      let combined = 0.0;
      if (!moldDetected) {
        combined = 0.40 * visScore + 0.25 * storageScore + 0.20 * shelfLifeScore + 0.15 * ageScore;
        combined = Math.max(0.0, Math.min(100.0, combined));
      }
      
      let confidence = 50.0;
      if (latest) confidence += 30.0;
      if (storageReport) confidence += 20.0;

      let classification = 'Fresh';
      if (combined >= 85.0) classification = 'Fresh';
      else if (combined >= 70.0) classification = 'Good';
      else if (combined >= 50.0) classification = 'Acceptable';
      else if (combined >= 30.0) classification = 'Near Spoilage';
      else classification = 'Spoiled';

      setScoringReport({
        item_id: item.id,
        item_name: item.name,
        combined_health_score: parseFloat(combined.toFixed(1)),
        quality_classification: classification,
        confidence_score: confidence,
        breakdown: {
          visual_score: parseFloat(visScore.toFixed(1)),
          storage_score: parseFloat(storageScore.toFixed(1)),
          shelflife_score: parseFloat(shelfLifeScore.toFixed(1)),
          age_score: parseFloat(ageScore.toFixed(1))
        }
      });
    }
  };

  const loadRecommendations = async (item: InventoryItemType) => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`/api/v1/recommendation/item/${item.id}`, { headers });
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      setRecommendationsReport(data);
    } catch (err) {
      const defaults = getEnvironmentalDefaultsByLocation(item.storage_location);
      const consts = FOOD_CATEGORY_CONSTANTS[item.category] || FOOD_CATEGORY_CONSTANTS["Fruits"];
      const t_ideal = consts.ideal_temp;
      const h_ideal = consts.ideal_humidity;
      
      const temp_diff = defaults[0] - t_ideal;
      const hum_diff = defaults[1] - h_ideal;

      const latest = mockAnalyses
        .filter(a => a.item_id === item.id)
        .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0];
      
      const elapsed = (Date.now() - new Date(item.entry_date).getTime()) / (1000 * 60 * 60 * 24);
      const kinetics = runShelfLifePredictionKinetics(item.category, item.packaging_type || 'None', defaults[0], defaults[1], Math.max(0, elapsed), latest ? latest.freshness_score : 100.0);
      const pkg_mod = PACKAGING_MODIFIERS[item.packaging_type || 'None'] || 1.0;
      const total_ideal = consts.base_shelf_life * pkg_mod;

      const storage_advisories = [];
      if (Math.abs(temp_diff) > 2.0) {
        storage_advisories.push(temp_diff > 0 
          ? `Decrease refrigeration temperature. Current temp (${defaults[0]}°C) is above ideal (${t_ideal}°C).`
          : `Increase temperature. Current temp (${defaults[0]}°C) is below ideal (${t_ideal}°C).`
        );
      }
      if (Math.abs(hum_diff) > 10.0) {
        storage_advisories.push(hum_diff > 0
          ? `Dehumidify storage room. Humidity (${defaults[1]}%) exceeds target (${h_ideal}%).`
          : `Humidify storage room. Humidity (${defaults[1]}%) is below target (${h_ideal}%).`
        );
      }
      
      if (item.category === 'Meat & Poultry' && item.packaging_type !== 'Vacuum Sealed') {
        storage_advisories.push("Upgrade packaging structure to 'Vacuum Sealed' to retard degradation.");
      } else if (item.category === 'Fruits' && item.packaging_type === 'None') {
        storage_advisories.push("Transition to 'Modified Atmosphere Packaging (MAP)' to slow ripening.");
      }

      if (storage_advisories.length === 0) {
        storage_advisories.push("Storage parameters and packaging methods are optimal.");
      }

      const priority_level = kinetics.remainingDays < 2.0 ? 'HIGH' : kinetics.remainingDays < 5.0 ? 'MEDIUM' : 'LOW';
      const consumption_advisories = [];
      if (priority_level === 'HIGH') {
        consumption_advisories.push("CRITICAL: Distribute or consume immediately. Product is near expiration limits.");
      } else if (priority_level === 'MEDIUM') {
        consumption_advisories.push("Schedule for distribution within 48 hours to prevent quality loss.");
      } else {
        consumption_advisories.push("Quality is stable. Follow standard distribution schedules.");
      }

      const rotation_advisories = [];
      rotation_advisories.push(`Distribute according to First-Expired, First-Out (FEFO). Remaining: {kinetics.remainingDays} days.`);
      
      const cal_days = (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24);
      if (kinetics.remainingDays < cal_days - 1.5) {
        rotation_advisories.push("ALERT: Freshness decay rate exceeds standard calendar expiration. Override standard FIFO queue; dispatch this item ahead of older stock.");
      }

      const waste_reduction_advisories = [];
      const score = getBlendedFreshnessInfo(item).score;
      if (score < 30.0) {
        waste_reduction_advisories.push("Product spoiled. Route to organic composting bins.");
      } else if (score < 60.0) {
        waste_reduction_advisories.push(item.category === 'Fruits' 
          ? "Repurpose for ready juices, jams, smoothies, or freeze immediately."
          : "Process into cooked ready-to-eat meals or flash-freeze immediately."
        );
      } else {
        waste_reduction_advisories.push("No waste mitigation needed. Product quality is compliant.");
      }

      const quality_improvement_advisories = [];
      if (latest) {
        if (latest.color_degradation > 0.3) {
          quality_improvement_advisories.push("Color browning detected. Flush units with nitrogen gas.");
        }
        if (latest.texture_roughness > 0.3) {
          quality_improvement_advisories.push("Wrinkling indicates cell dehydration. Regulate relative humidity closer to optimal.");
        }
      }
      if (quality_improvement_advisories.length === 0) {
        quality_improvement_advisories.push("Product handles safely with no active warnings.");
      }

      setRecommendationsReport({
        item_id: item.id,
        item_name: item.name,
        priority_level,
        storage_advisories,
        consumption_advisories,
        rotation_advisories,
        waste_reduction_advisories,
        quality_improvement_advisories
      });
    }
  };

  const handleStorageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForAnalysis) return;
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`/api/v1/storage/reading`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          item_id: activeItemForAnalysis.id,
          ...storageForm
        })
      });
      
      if (!res.ok) throw new Error('API post failed');
      
      const data = await res.json();
      setStorageReport(data);
      await loadStorageTelemetry(activeItemForAnalysis);
      await loadScoringBreakdown(activeItemForAnalysis);
      await loadRecommendations(activeItemForAnalysis);

    } catch (err) {
      const consts = FOOD_CATEGORY_CONSTANTS[activeItemForAnalysis.category] || FOOD_CATEGORY_CONSTANTS["Fruits"];
      const t_ideal = consts.ideal_temp;
      const h_ideal = consts.ideal_humidity;
      
      const temp_diff = storageForm.temperature - t_ideal;
      const hum_diff = storageForm.humidity - h_ideal;
      
      let status = 'COMPLIANT';
      const recs = [];
      
      if (Math.abs(temp_diff) > 5.0 || Math.abs(hum_diff) > 20.0) {
        status = 'CRITICAL';
      } else if (Math.abs(temp_diff) > 2.0 || Math.abs(hum_diff) > 10.0) {
        status = 'WARNING';
      }
      
      if (temp_diff > 2.0) recs.push(`Critical Temperature Abuse: ${temp_diff.toFixed(1)}°C above ideal. Decrease refrigerator thermostat.`);
      if (temp_diff < -2.0) recs.push(`Temperature is ${Math.abs(temp_diff).toFixed(1)}°C below ideal. Verify if chill injury occurred.`);
      if (hum_diff > 10.0) recs.push(`Humidity is ${hum_diff.toFixed(1)}% above ideal. Dehumidifiers needed.`);
      if (hum_diff < -10.0) recs.push(`Humidity is ${Math.abs(hum_diff).toFixed(1)}% below ideal. Increase moisture.`);
      if (activeItemForAnalysis.category === 'Fruits' && storageForm.air_circulation === 'Low') {
        recs.push("Low air circulation detected. Increase fan speeds to dissipate ethylene.");
      }
      
      if (recs.length === 0) recs.push("All storage conditions are fully compliant with guidelines.");
      
      const mockReport = {
        item_id: activeItemForAnalysis.id,
        warehouse_zone: activeItemForAnalysis.storage_location || 'Storage Zone Alpha',
        compliance_status: status,
        ...storageForm,
        temperature_deviation: parseFloat(temp_diff.toFixed(1)),
        humidity_deviation: parseFloat(hum_diff.toFixed(1)),
        recorded_at: new Date().toISOString(),
        recommendations: recs
      };
      
      setStorageReport(mockReport);
      
      const mockHistPoint = {
        id: 'sim_h_' + Date.now(),
        ...storageForm,
        recorded_at: new Date().toISOString()
      };
      setStorageHistory(prev => [mockHistPoint, ...prev]);

      setTimeout(() => {
        loadScoringBreakdown(activeItemForAnalysis);
        loadRecommendations(activeItemForAnalysis);
      }, 50);
    }
  };

  // Setup form for editing
  const openEditModal = (item: any) => {
    if (!canWrite()) {
      alert('Operation Denied: Consumers are restricted to read-only rights.');
      return;
    }
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      batch_id: item.batch_id || '',
      quantity: item.quantity,
      unit: item.unit,
      packaging_type: item.packaging_type || 'None',
      expiry_date: item.expiry_date.split('T')[0],
      storage_location: item.storage_location || '',
    });
    setIsItemModalOpen(true);
  };

  const openAddModal = () => {
    if (!canWrite()) {
      alert('Operation Denied: Consumers are restricted to read-only rights.');
      return;
    }
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Fruits',
      batch_id: batches[0]?.id || '',
      quantity: 1,
      unit: 'kg',
      packaging_type: 'None',
      expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      storage_location: '',
    });
    setIsItemModalOpen(true);
  };

  // Handlers
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert('Action Denied: You do not have permissions to register food items.');
      return;
    }

    const matchedBatch = batches.find(b => b.id === itemForm.batch_id);
    const itemStatus = getDynamicStatus(itemForm.expiry_date + 'T12:00:00Z');

    if (editingItem) {
      setItems(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            ...itemForm,
            batch: matchedBatch,
            status: itemStatus,
            expiry_date: itemForm.expiry_date + 'T12:00:00Z',
          };
        }
        return item;
      }));
    } else {
      const newItem = {
        id: 'i_' + Date.now(),
        ...itemForm,
        batch: matchedBatch,
        entry_date: new Date().toISOString(),
        expiry_date: itemForm.expiry_date + 'T12:00:00Z',
        status: itemStatus,
      };
      setItems(prev => [newItem, ...prev]);
    }
    setIsItemModalOpen(false);
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert('Action Denied: You do not have permissions to register supply batches.');
      return;
    }

    const newBatch = {
      id: 'b_' + Date.now(),
      batch_number: batchForm.batch_number,
      supplier_name: batchForm.supplier_name,
      received_date: new Date().toISOString(),
    };
    setBatches(prev => [...prev, newBatch]);
    setIsBatchModalOpen(false);
    setBatchForm({ batch_number: '', supplier_name: '' });
  };

  const handleDelete = (id: string) => {
    if (!canWrite()) {
      alert('Action Denied: You do not have permissions to delete items.');
      return;
    }
    if (confirm('Are you sure you want to remove this item?')) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  // Upload trigger
  const handleUploadAndAnalyze = async () => {
    if (!selectedFile || !activeItemForAnalysis) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('item_id', activeItemForAnalysis.id);

    try {
      const res = await fetch('/api/v1/image-analysis/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('API processing error');
      
      const newReport = await res.json();
      
      setMockAnalyses(prev => [newReport, ...prev]);
      await loadFreshnessTelemetry(activeItemForAnalysis);
      await loadScoringBreakdown(activeItemForAnalysis);
      await loadRecommendations(activeItemForAnalysis);
    } catch (err) {
      alert("Image analysis failed: " + (err instanceof Error ? err.message : "AI model is currently unavailable."));
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const getSvgCoordinates = (trend: TrendPointType[], width: number, height: number) => {
    if (trend.length === 0) return '';
    const pointsCount = trend.length;
    
    return trend.map((point, index) => {
      const x = 40 + (index / (pointsCount - 1 || 1)) * (width - 80);
      const y = height - 40 - (point.freshness_score / 100.0) * (height - 80);
      return `${x},${y}`;
    }).join(' ');
  };

  // Filter Search Results
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          (item.batch?.batch_number.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate Batch Aggregated Averages dynamically
  const getBatchAggregatedHealth = (batchId: string) => {
    const batchItems = items.filter(i => i.batch_id === batchId);
    if (batchItems.length === 0) return { score: 100.0, classification: 'Fresh' };
    
    let total = 0.0;
    batchItems.forEach(i => {
      const info = getBlendedFreshnessInfo(i);
      total += info.score;
    });
    
    const avg = total / batchItems.length;
    let classification = 'Fresh';
    if (avg >= 85.0) classification = 'Fresh';
    else if (avg >= 70.0) classification = 'Good';
    else if (avg >= 50.0) classification = 'Acceptable';
    else if (avg >= 30.0) classification = 'Near Spoilage';
    else classification = 'Spoiled';

    return {
      score: parseFloat(avg.toFixed(1)),
      classification
    };
  };

  const getCategoryAvgScore = (category: string) => {
    const catItems = items.filter(i => i.category === category);
    if (catItems.length === 0) return 0;
    const total = catItems.reduce((acc, curr) => acc + getBlendedFreshnessInfo(curr).score, 0);
    return parseFloat((total / catItems.length).toFixed(1));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 selection:bg-emerald-500 selection:text-slate-950">
      {/* Role Toggle Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">👤</span>
          <div>
            <h4 className="font-bold text-white text-sm">Sandbox Role Simulator</h4>
            <p className="text-xs text-slate-400">Simulate active session context to evaluate role-based access policies (RBAC).</p>
          </div>
        </div>
        <div className="flex gap-2">
          {roles.map(role => (
            <button
              key={role.code}
              onClick={() => setCurrentRole(role.code)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition duration-150 ${
                currentRole === role.code
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {role.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-900 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <span>🏪</span> FreshLens Inventory Catalog
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Overview of active lots, packaging structures, and dynamic product freshness assessments.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition flex items-center justify-center gap-1.5"
          >
            <span>🔔</span>
            <span className="font-bold">Alerts</span>
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
                {unreadNotifCount}
              </span>
            )}
          </button>
          <Link href="/dashboard/reports" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium text-emerald-400">
            📊 Reports Hub
          </Link>
          <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium">
            Portal Hub
          </Link>
          {canWrite() && (
            <>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-sm transition font-semibold"
              >
                + Create Lot (Batch)
              </button>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition duration-150"
              >
                + Register Food Item
              </button>
            </>
          )}
        </div>
      </header>

      {/* Supply Lots Widget */}
      <section className="mb-8">
        <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">📦 Active Supply Lots (Batches) Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {batches.map(b => {
            const stats = getBatchAggregatedHealth(b.id);
            return (
              <div key={b.id} className="bg-slate-900 border border-slate-855 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-indigo-400 font-bold">{b.batch_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                    stats.classification === 'Fresh' || stats.classification === 'Good' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    stats.classification === 'Acceptable' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                  }`}>
                    {stats.classification.toUpperCase()} LOT
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-xs text-slate-400">Avg. Health Score</span>
                    <p className="text-2xl font-black text-white font-mono mt-0.5">{stats.score}%</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Total Items</span>
                    <p className="text-lg font-bold text-slate-200 mt-0.5">{items.filter(i => i.batch_id === b.id).length}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Supplier: {b.supplier_name} | Rec: {new Date(b.received_date).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats Layer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Items</span>
          <p className="text-3xl font-extrabold text-white mt-1">{items.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fresh (Healthy)</span>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">
            {items.filter(i => getBlendedFreshnessInfo(i).score >= 70).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Near-Expiry Alerts</span>
          <p className="text-3xl font-extrabold text-amber-500 mt-1">
            {items.filter(i => {
              const score = getBlendedFreshnessInfo(i).score;
              return score >= 30 && score < 70;
            }).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-900 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spoiled Items</span>
          <p className="text-3xl font-extrabold text-rose-500 mt-1">
            {items.filter(i => getBlendedFreshnessInfo(i).score < 30).length}
          </p>
        </div>
      </div>

      {/* Category Freshness Index Chart */}
      <section className="mb-8 bg-slate-900 border border-slate-900 rounded-3xl p-6">
        <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>📊</span> Category Freshness Index Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {CATEGORIES.map(category => {
            const avg = getCategoryAvgScore(category);
            const count = items.filter(i => i.category === category).length;
            if (count === 0) return null;
            return (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">{category} <span className="text-slate-500 font-normal">({count} items)</span></span>
                  <span className={`font-bold font-mono ${
                    avg >= 85 ? 'text-emerald-400' :
                    avg >= 70 ? 'text-green-400' :
                    avg >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{avg}% avg</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      avg >= 85 ? 'bg-emerald-400' :
                      avg >= 70 ? 'bg-green-400' :
                      avg >= 50 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${avg}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Search & Filters */}
      <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Search Items</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or batch number"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Category Filter</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Freshness Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="All">All Statuses</option>
              <option value="Fresh">FRESH (Score &ge; 85%)</option>
              <option value="Good">GOOD (Score 70% - 85%)</option>
              <option value="Acceptable">ACCEPTABLE (Score 50% - 70%)</option>
              <option value="Near Spoilage">NEAR SPOILAGE (Score 30% - 50%)</option>
              <option value="Spoiled">SPOILED (Score &lt; 30%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-900 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Registered Batches & Items</h2>
          <span className="text-xs text-slate-400">Showing {filteredItems.length} entries</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No inventory items match the current search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-950 text-slate-400 text-xs font-semibold uppercase bg-slate-900/30">
                  <th className="py-3.5 pl-6">Product Name</th>
                  <th className="py-3.5">Category</th>
                  <th className="py-3.5">Batch / Lot</th>
                  <th className="py-3.5">Quantity</th>
                  <th className="py-3.5">Packaging Type</th>
                  <th className="py-3.5">Expiry Date</th>
                  <th className="py-3.5 text-center">Blended Freshness</th>
                  <th className="py-3.5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-sm">
                {filteredItems.map((item) => {
                  const info = getBlendedFreshnessInfo(item);
                  const pred = getDynamicRemainingShelfLife(item);
                  const showFefoAlert = hasFefoOverride(item);
                  
                  // Filter by status dropdown
                  if (selectedStatus !== 'All' && info.classification !== selectedStatus) {
                    return null;
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition duration-150">
                      <td className="py-4 pl-6">
                        <div className="font-bold text-white flex items-center gap-2">
                          {item.name}
                          {pred.risk === 'HIGH' && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black tracking-wider animate-pulse uppercase">
                              ⚠️ High Risk
                            </span>
                          )}
                          {showFefoAlert && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[9px] font-black tracking-wider uppercase">
                              🚨 FEFO Override
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Est. Shelf Life: <span className="font-bold text-indigo-400">{pred.remainingDays} days</span> left ({pred.risk} risk)
                        </div>
                      </td>
                      <td className="py-4 text-slate-300">{item.category}</td>
                      <td className="py-4 font-mono text-xs text-indigo-400">
                        {item.batch ? item.batch.batch_number : 'Unassigned'}
                      </td>
                      <td className="py-4 text-slate-300 font-semibold">{item.quantity} {item.unit}</td>
                      <td className="py-4 text-slate-400 text-xs">{item.packaging_type}</td>
                      <td className="py-4 text-slate-300 font-mono text-xs">
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${info.colorClass}`}>
                            {info.classification}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{info.score}%</span>
                        </div>
                      </td>
                      <td className="py-4 text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openAnalysisModal(item)}
                            className="px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/50 text-xs text-indigo-400 font-bold rounded-lg border border-indigo-900/20 transition"
                          >
                            📷 Diagnostics
                          </button>
                          {canWrite() && (
                            <>
                              <button
                                onClick={() => openEditModal(item)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-2.5 py-1 bg-rose-950/20 hover:bg-rose-900/40 text-xs text-rose-400 font-bold rounded-lg border border-rose-900/20 transition"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- IMAGE ANALYSIS & FRESHNESS TREND DIAGNOSTICS MODAL --- */}
      {isAnalysisModalOpen && activeItemForAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-855 flex justify-between items-center bg-slate-900/80 backdrop-blur sticky top-0 z-10">
              <div>
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Freshness Assessment Diagnostics</span>
                <h3 className="text-2xl font-black text-white mt-0.5">Scoring Report: {activeItemForAnalysis.name}</h3>
              </div>
              <button
                onClick={() => setIsAnalysisModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* TOP DASHBOARD METRICS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Score Circular SVG Meter */}
                <div className="bg-slate-955 border border-slate-850 rounded-2xl p-5 flex items-center gap-5">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className="stroke-slate-800 fill-none"
                        strokeWidth="6"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        className={`fill-none transition-all duration-500 ${
                          blendedScore >= 85.0 ? 'stroke-emerald-400' :
                          blendedScore >= 70.0 ? 'stroke-green-400' :
                          blendedScore >= 50.0 ? 'stroke-amber-500' : 'stroke-rose-500'
                        }`}
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - blendedScore / 100.0)}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-black text-white font-mono">{blendedScore}%</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Blended Freshness</span>
                    <h4 className="text-xl font-extrabold text-white mt-1">
                      {getBlendedFreshnessInfo(activeItemForAnalysis).classification}
                    </h4>
                  </div>
                </div>

                {/* Spoilage Probability */}
                <div className="bg-slate-955 border border-slate-850 rounded-2xl p-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Spoilage Probability</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-rose-500 font-mono">{spoilageProbability}%</p>
                    <span className="text-xs text-slate-400">risk of decay</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{ width: `${spoilageProbability}%` }}
                    ></div>
                  </div>
                </div>

                {/* Decay Factor */}
                <div className="bg-slate-955 border border-slate-850 rounded-2xl p-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shelf Life Decay (Time)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-indigo-400 font-mono">
                      {getDecayFactor(activeItemForAnalysis.entry_date, activeItemForAnalysis.expiry_date, new Date()).toFixed(0)}%
                    </p>
                    <span className="text-xs text-slate-400">duration remaining</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-3 font-mono">
                    Entry: {new Date(activeItemForAnalysis.entry_date).toLocaleDateString()} | Exp: {new Date(activeItemForAnalysis.expiry_date).toLocaleDateString()}
                  </p>
                </div>

              </div>

              {/* MULTI-FACTOR WEIGHTED FRESHNESS BREAKDOWN PANEL */}
              {scoringReport && (
                <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-bold text-sm flex items-center gap-2">
                        <span>🔬</span> Multi-Factor Health Breakdown
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Scientific weighted scores based on product condition sensors.
                      </p>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">Visual Condition <span className="text-slate-500 font-mono">(40% Weight)</span></span>
                          <span className="text-emerald-400 font-black font-mono">{scoringReport.breakdown.visual_score}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400" style={{ width: `${scoringReport.breakdown.visual_score}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">Storage Compliance <span className="text-slate-500 font-mono">(25% Weight)</span></span>
                          <span className="text-indigo-400 font-black font-mono">{scoringReport.breakdown.storage_score}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400" style={{ width: `${scoringReport.breakdown.storage_score}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">Remaining Shelf-Life <span className="text-slate-500 font-mono">(20% Weight)</span></span>
                          <span className="text-blue-400 font-black font-mono">{scoringReport.breakdown.shelflife_score}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400" style={{ width: `${scoringReport.breakdown.shelflife_score}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-medium">Product Age Decay <span className="text-slate-500 font-mono">(15% Weight)</span></span>
                          <span className="text-amber-400 font-black font-mono">{scoringReport.breakdown.age_score}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${scoringReport.breakdown.age_score}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic Confidence Index</span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                          scoringReport.confidence_score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          scoringReport.confidence_score >= 70 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {scoringReport.confidence_score}% CONFIDENCE
                        </span>
                      </div>
                      
                      <div>
                        <div className="text-3xl font-black text-white font-mono">{scoringReport.combined_health_score}%</div>
                        <span className="text-xs text-slate-400">Blended Overall Health Index</span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                        🔒 Health scores are recalibrated automatically whenever fresh visual scans are processed or sensor readings are received.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                      <span>Refreshed: {new Date(scoringReport.recorded_at || Date.now()).toLocaleTimeString()}</span>
                      <span>Quality: {scoringReport.quality_classification}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PHASE 8: RECOMMENDATION ENGINE ADVISORY PANEL */}
              {recommendationsReport && (
                <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-900 pb-3">
                    <div>
                      <h4 className="text-white font-bold text-sm flex items-center gap-2">
                        <span>💡</span> Operations Recommendation Engine
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Actionable instructions tailored to visual indicators, telemetry limits, and rotation queues.
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded text-xs font-black border ${
                      recommendationsReport.priority_level === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
                      recommendationsReport.priority_level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {recommendationsReport.priority_level} ACTION PRIORITY
                    </span>
                  </div>

                  {/* Recommendation Category Tabs */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-900/50 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveRecTab('storage')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeRecTab === 'storage' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      🌡️ Storage Control
                    </button>
                    <button
                      onClick={() => setActiveRecTab('consumption')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeRecTab === 'consumption' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      🍽️ Consumption Order
                    </button>
                    <button
                      onClick={() => setActiveRecTab('rotation')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeRecTab === 'rotation' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      🔄 FEFO Rotation
                    </button>
                    <button
                      onClick={() => setActiveRecTab('waste')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeRecTab === 'waste' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      ♻️ Waste Repurpose
                    </button>
                    <button
                      onClick={() => setActiveRecTab('quality')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeRecTab === 'quality' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      🛡️ Handling Quality
                    </button>
                  </div>

                  {/* Recommendations Display */}
                  <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-4">
                    <ul className="space-y-2.5 text-xs text-slate-200">
                      {activeRecTab === 'storage' && recommendationsReport.storage_advisories.map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <span className="text-emerald-400">❄️</span> <span>{r}</span>
                        </li>
                      ))}

                      {activeRecTab === 'consumption' && recommendationsReport.consumption_advisories.map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <span className="text-amber-400">⚡</span> <span>{r}</span>
                        </li>
                      ))}

                      {activeRecTab === 'rotation' && recommendationsReport.rotation_advisories.map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <span className="text-blue-400">🔄</span> <span>{r}</span>
                        </li>
                      ))}

                      {activeRecTab === 'waste' && recommendationsReport.waste_reduction_advisories.map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <span className="text-purple-400">♻️</span> <span>{r}</span>
                        </li>
                      ))}

                      {activeRecTab === 'quality' && recommendationsReport.quality_improvement_advisories.map((r: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                          <span className="text-rose-400">🛡️</span> <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* STORAGE CONDITION MONITORING DIAGNOSTICS */}
              {storageReport && (
                <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                    <div>
                      <h4 className="text-white font-bold text-sm">📦 Storage Condition Monitoring</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Active telemetry for zone: <span className="font-semibold text-indigo-400">{storageReport.warehouse_zone}</span>
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      storageReport.compliance_status === 'COMPLIANT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      storageReport.compliance_status === 'WARNING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse font-black'
                    }`}>
                      {storageReport.compliance_status} STORAGE
                    </span>
                  </div>

                  {/* Telemetry Dials Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-xs text-slate-400 block mb-1">Temperature</span>
                      <span className="text-2xl font-black text-white font-mono">{storageReport.temperature}°C</span>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Dev: {storageReport.temperature_deviation > 0 ? '+' : ''}{storageReport.temperature_deviation}°C
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-xs text-slate-400 block mb-1">Relative Humidity</span>
                      <span className="text-2xl font-black text-white font-mono">{storageReport.humidity}%</span>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Dev: {storageReport.humidity_deviation > 0 ? '+' : ''}{storageReport.humidity_deviation}%
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-xs text-slate-400 block mb-1">Air Circulation</span>
                      <span className="text-xl font-bold text-indigo-300 block py-0.5">{storageReport.air_circulation}</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Ethylene Dispersion</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                      <span className="text-xs text-slate-400 block mb-1">Light Exposure</span>
                      <span className="text-xl font-bold text-amber-400 block py-0.5">{storageReport.light_exposure}</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Photo-oxidation Risk</span>
                    </div>
                  </div>

                  {/* Recommendations Advisories */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-3">🛠️ Optimization Recommendations</h5>
                    <ul className="space-y-2 text-xs">
                      {storageReport.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex gap-2.5 items-start text-slate-300">
                          <span className="text-indigo-400">⚡</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* ENVIRONMENTAL SIMULATOR PANEL */}
              <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">🌡️ Arrhenius Shelf-Life Simulator</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Simulate how deviations in temperature and humidity affect kinetic degradation.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Temperature Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Storage Temperature: <strong className="text-emerald-400">{simTemp}°C</strong></span>
                        <span className="text-slate-500 font-mono">Ideal: {simPrediction?.recommendedTemp}°C</span>
                      </div>
                      <input
                        type="range"
                        min="-20"
                        max="40"
                        step="0.5"
                        value={simTemp}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimTemp(val);
                          runSimulation(val, simHumidity, activeItemForAnalysis);
                        }}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                    </div>

                    {/* Humidity Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">Relative Humidity: <strong className="text-indigo-400">{simHumidity}%</strong></span>
                        <span className="text-slate-500 font-mono">Ideal: {simPrediction?.recommendedHumidity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={simHumidity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setSimHumidity(val);
                          runSimulation(simTemp, val, activeItemForAnalysis);
                        }}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulation Output */}
                {simPrediction && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Simulated Remaining Shelf Life</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          simPrediction.risk === 'HIGH' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse' :
                          simPrediction.risk === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {simPrediction.risk} RISK
                        </span>
                      </div>
                      
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black font-mono ${
                          simPrediction.risk === 'HIGH' ? 'text-rose-400' :
                          simPrediction.risk === 'MEDIUM' ? 'text-amber-400' :
                          'text-emerald-400'
                        }`}>{simPrediction.remainingDays} days</span>
                        <span className="text-xs text-slate-400">remaining</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] space-y-1.5">
                      <p className="text-slate-300">🌡️ <span className="text-slate-400">{simPrediction.temp_impact}</span></p>
                      <p className="text-slate-300">💧 <span className="text-slate-400">{simPrediction.hum_impact}</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* DYNAMIC FRESHNESS TREND LINE CHART (SVG) */}
              <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6">
                <h4 className="text-white font-bold text-sm mb-4">Freshness Index Degradation Curve</h4>
                
                <div className="w-full aspect-[21/9] relative">
                  <svg className="w-full h-full" viewBox="0 0 600 200">
                    <line x1="40" y1="40" x2="560" y2="40" stroke="#1e293b" strokeDasharray="3" />
                    <line x1="40" y1="80" x2="560" y2="80" stroke="#1e293b" strokeDasharray="3" />
                    <line x1="40" y1="120" x2="560" y2="120" stroke="#1e293b" strokeDasharray="3" />
                    <line x1="40" y1="160" x2="560" y2="160" stroke="#1e293b" strokeDasharray="3" />

                    <polyline
                      fill="none"
                      stroke="url(#chart-gradient)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={getSvgCoordinates(freshnessTrend, 600, 200)}
                    />

                    {freshnessTrend.map((pt, index) => {
                      const x = 40 + (index / (freshnessTrend.length - 1 || 1)) * 520;
                      const y = 160 - (pt.freshness_score / 100.0) * 120;
                      return (
                        <g key={index} className="group cursor-pointer">
                          <circle
                            cx={x}
                            cy={y}
                            r="5"
                            className="fill-emerald-400 stroke-slate-950 stroke-2"
                          />
                          <rect
                            x={x - 45}
                            y={y - 30}
                            width="90"
                            height="20"
                            rx="4"
                            className="fill-slate-900 stroke-slate-800 opacity-0 group-hover:opacity-100 transition duration-150"
                          />
                          <text
                            x={x}
                            y={y - 17}
                            textAnchor="middle"
                            className="fill-white font-mono text-[9px] font-bold opacity-0 group-hover:opacity-100 transition duration-150"
                          >
                            {pt.freshness_score}%
                          </text>
                        </g>
                      );
                    })}

                    <defs>
                      <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="60%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f87171" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute left-2 top-8 text-[9px] text-slate-500 font-mono">100%</div>
                  <div className="absolute left-2 bottom-8 text-[9px] text-slate-500 font-mono">0%</div>
                  
                  <div className="absolute bottom-1 left-10 text-[9px] text-slate-500 font-mono">
                    Entry ({new Date(activeItemForAnalysis.entry_date).toLocaleDateString()})
                  </div>
                  <div className="absolute bottom-1 right-10 text-[9px] text-slate-500 font-mono text-right">
                    Current Expiry
                  </div>
                </div>
              </div>

              {/* CORE WORKSPACE PANELS: TELEMETRY INGESTOR & LOGS HISTORY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                
                {/* Telemetry Logger Form */}
                <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6">
                  <h4 className="text-white font-bold text-sm mb-1">📟 Telemetry Logger Ingestion</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Simulate MQTT hardware sensor uploads by submitting manual climate readings.
                  </p>

                  {canWrite() ? (
                    <form onSubmit={handleStorageSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Temperature (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={storageForm.temperature}
                            onChange={(e) => setStorageForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.0 }))}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Humidity (%)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={storageForm.humidity}
                            onChange={(e) => setStorageForm(prev => ({ ...prev, humidity: parseFloat(e.target.value) || 0.0 }))}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Air Circulation</label>
                          <select
                            value={storageForm.air_circulation}
                            onChange={(e) => setStorageForm(prev => ({ ...prev, air_circulation: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Light Exposure</label>
                          <select
                            value={storageForm.light_exposure}
                            onChange={(e) => setStorageForm(prev => ({ ...prev, light_exposure: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Dark">Dark</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-500/20"
                      >
                        📡 Submit Ingest Telemetry
                      </button>
                    </form>
                  ) : (
                    <div className="p-8 border border-slate-850 bg-slate-900 text-center text-slate-500 text-xs rounded-xl">
                      🔒 Manual logging restricted. Consumers have read-only diagnostics.
                    </div>
                  )}
                </div>

                {/* Telemetry logs history */}
                <div className="bg-slate-955 border border-slate-850 rounded-3xl p-6 space-y-4">
                  <h4 className="text-white font-bold text-sm">📅 Sensor Logs History</h4>
                  {storageHistory.length === 0 ? (
                    <div className="p-12 text-slate-500 text-center text-xs">
                      No telemetry logs recorded. Submit a reading above to build logs.
                    </div>
                  ) : (
                    <div className="max-h-[30vh] overflow-y-auto pr-1 space-y-2">
                      {storageHistory.map((log) => (
                        <div key={log.id} className="bg-slate-900 border border-slate-855 rounded-xl p-3 flex justify-between items-center text-xs font-mono">
                          <div>
                            <span className="text-slate-300 font-bold">{log.temperature}°C</span> | <span className="text-indigo-400">{log.humidity}%</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Circ: {log.air_circulation} | Light: {log.light_exposure}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.recorded_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* DUAL WORKSPACE PANEL - SPECIMEN UPLOADER */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                
                <div>
                  <h4 className="text-white font-bold text-sm mb-2">Upload Visual Specimen</h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Register a new product photograph. OpenCV parses color browning ratios and wrinkled edge indexes.
                  </p>
                  
                  {canWrite() ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition duration-150 ${
                        dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="file"
                        id="food-img-input"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      
                      {filePreview ? (
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-4 bg-slate-900 border border-slate-855">
                          <img
                            src={filePreview}
                            alt="Upload preview"
                            className="object-contain w-full h-full"
                          />
                          <button
                            type="button"
                            onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                            className="absolute top-2 right-2 px-2.5 py-1 bg-red-600 hover:bg-red-755 text-xs font-bold text-white rounded-lg transition"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="food-img-input" className="cursor-pointer block py-8">
                          <span className="text-4xl block mb-3">📷</span>
                          <span className="text-sm font-semibold text-white block">Drag and drop image here</span>
                          <span className="text-xs text-slate-500 mt-1 block">or click to browse from files (PNG, JPG)</span>
                        </label>
                      )}

                      {selectedFile && (
                        <div className="space-y-3">
                          <button
                            onClick={handleUploadAndAnalyze}
                            disabled={isUploading}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-955 font-extrabold rounded-xl text-sm transition shadow-lg shadow-emerald-500/10 cursor-pointer"
                          >
                            {isUploading ? '⚙️ Executing Computer Vision' : '⚡ Run Freshness Pipeline'}
                          </button>
                          {isUploading && (
                            <div className="text-left space-y-1.5 p-3.5 bg-slate-950 border border-slate-900 rounded-xl animate-pulse">
                              <div className="flex justify-between text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                                <span>Scanning Specimen</span>
                                <span>Estimating score</span>
                              </div>
                              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full w-2/3 animate-[pulse_1s_infinite]"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-855 rounded-2xl p-6 text-center text-slate-500 text-xs font-medium">
                      🔒 Upload functions restricted. Consumers have read-only diagnostic view.
                    </div>
                  )}
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  <h4 className="text-white font-bold text-sm">Specimens History ({itemAnalyses.length})</h4>
                  {itemAnalyses.length === 0 ? (
                    <div className="p-12 border border-slate-855 bg-slate-955 text-slate-500 text-center text-xs rounded-2xl">
                      No analyses recorded. Upload a file on the left to test.
                    </div>
                  ) : (
                    itemAnalyses.map((report) => (
                      <div key={report.id} className="bg-slate-950 border border-slate-855 rounded-2xl p-4 space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                          <div>
                            <span className="text-slate-400 text-xs font-mono">{report.filename}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              {new Date(report.analyzed_at).toLocaleString()}
                            </span>
                          </div>
                          <span className={`text-sm font-black ${
                            report.freshness_score >= 85 ? 'text-emerald-400' :
                            report.freshness_score >= 70 ? 'text-green-400' :
                            report.freshness_score >= 50 ? 'text-amber-500' : 'text-rose-500'
                          }`}>
                            CV Score: {report.freshness_score}%
                          </span>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                          {report.file_url && (
                            <div className="w-full md:w-24 aspect-square rounded-xl overflow-hidden border border-slate-900 bg-slate-900 shrink-0">
                              <img
                                src={report.file_url.startsWith('http') || report.file_url.startsWith('blob:') || report.file_url.startsWith('/') ? report.file_url : `/static/uploads/${report.file_url}`}
                                alt="Analyzed specimen"
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-slate-400">Color Degradation</span>
                                <span className="text-white font-mono">{(report.color_degradation * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{ width: `${report.color_degradation * 100}%` }}></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-slate-400">Surface Wrinkles</span>
                                <span className="text-white font-mono">{(report.texture_roughness * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${report.texture_roughness * 100}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div className={`py-1 rounded border ${report.mold_detected ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-slate-900 border-slate-900 text-slate-500'}`}>
                            <strong>MOLD</strong>: {report.mold_detected ? 'YES' : 'NO'}
                          </div>
                          <div className={`py-1 rounded border ${report.bruising_detected ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-900 border-slate-900 text-slate-500'}`}>
                            <strong>BRUISE</strong>: {report.bruising_detected ? 'YES' : 'NO'}
                          </div>
                          <div className={`py-1 rounded border ${report.damage_detected ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-slate-900 border-slate-900 text-slate-500'}`}>
                            <strong>DAMAGE</strong>: {report.damage_detected ? 'YES' : 'NO'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT ITEM MODAL --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Food Item Parameters' : 'Register New Food Item'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="E.g., Sweet Strawberries"
                  className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Batch / Lot</label>
                  <select
                    value={itemForm.batch_id}
                    onChange={(e) => setItemForm(prev => ({ ...prev, batch_id: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batch_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="E.g., kg, unit, L"
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Packaging Type</label>
                  <input
                    type="text"
                    value={itemForm.packaging_type}
                    onChange={(e) => setItemForm(prev => ({ ...prev, packaging_type: e.target.value }))}
                    placeholder="E.g., Plastic Bag"
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={itemForm.expiry_date}
                    onChange={(e) => setItemForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Storage Location</label>
                <input
                  type="text"
                  value={itemForm.storage_location}
                  onChange={(e) => setItemForm(prev => ({ ...prev, storage_location: e.target.value }))}
                  placeholder="E.g., Aisle C / Fridge 4"
                  className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-955 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/10"
                >
                  {editingItem ? 'Save Changes' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD BATCH MODAL --- */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Create Supply Lot (Batch)</h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Batch (Lot) Number</label>
                <input
                  type="text"
                  required
                  value={batchForm.batch_number}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  placeholder="E.g., LOT-20260809-99"
                  className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={batchForm.supplier_name}
                  onChange={(e) => setBatchForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                  placeholder="E.g., AgroFresh Wholesalers"
                  className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-955 font-bold rounded-xl text-sm transition"
                >
                  Create Lot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NOTIFICATION CENTER DRAWER --- */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <h3 className="text-lg font-black text-white">Alert Dispatch Center</h3>
                </div>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>
              </div>

              {/* Preferences Settings Toggle */}
              <div className="bg-slate-955 border border-slate-850 rounded-2xl p-4 mb-6 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">My Preferences</h4>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Email Alerts</span>
                  <input
                    type="checkbox"
                    checked={notifPref.email_enabled}
                    onChange={e => setNotifPref(prev => ({ ...prev, email_enabled: e.target.checked }))}
                    className="accent-emerald-400"
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifPref.push_enabled}
                    onChange={e => setNotifPref(prev => ({ ...prev, push_enabled: e.target.checked }))}
                    className="accent-emerald-400"
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Storage Telemetry Warns</span>
                  <input
                    type="checkbox"
                    checked={notifPref.storage_alerts_enabled}
                    onChange={e => setNotifPref(prev => ({ ...prev, storage_alerts_enabled: e.target.checked }))}
                    className="accent-emerald-400"
                  />
                </div>

                <div className="pt-2 border-t border-slate-900">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Min Freshness Threshold</span>
                    <span>{notifPref.min_freshness_threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={notifPref.min_freshness_threshold}
                    onChange={e => setNotifPref(prev => ({ ...prev, min_freshness_threshold: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>
              </div>

              {/* Alerts logs list */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400">Active Logs ({unreadNotifCount} unread)</span>
                {unreadNotifCount > 0 && (
                  <button
                    onClick={markAllNotifRead}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase transition"
                  >
                    ✓ Clear all
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No active notifications recorded.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`relative border-l-4 rounded-xl p-3.5 bg-slate-950 transition ${
                        n.is_read ? 'border-slate-800 opacity-60' :
                        n.type === 'spoilage' ? 'border-rose-500 bg-rose-950/5' :
                        n.type === 'storage' ? 'border-amber-500 bg-amber-950/5' :
                        n.type === 'shelf-life' ? 'border-indigo-500 bg-indigo-950/5' :
                        'border-emerald-400 bg-emerald-950/5'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-xs text-white leading-tight">{n.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal">{n.message}</p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={() => markNotifRead(n.id)}
                            className="text-[9px] text-slate-500 hover:text-white shrink-0 font-bold transition uppercase"
                          >
                            Read
                          </button>
                        )}
                      </div>
                      <span className="text-[8px] text-slate-600 block mt-2.5 font-mono">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>Syncing live updates</span>
              <button
                onClick={loadNotifications}
                className="hover:text-white transition font-bold"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
