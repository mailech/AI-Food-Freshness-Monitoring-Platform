import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Camera, 
  Sparkles, 
  AlertTriangle,
  Info,
  Thermometer,
  Droplets,
  RefreshCcw
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: { name: string };
}

interface CVMetrics {
  color_score: number;
  texture_score: number;
  mold_detected: boolean;
  mold_probability: number;
  bruise_detected: boolean;
  bruise_score: number;
}

interface AnalysisResponse {
  image_url: string;
  predicted_category: string;
  status: string;
  freshness_score: number;
  spoilage_probability: number;
  remaining_shelf_life_days: number;
  cv_metrics: CVMetrics;
}

const UploadPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Settings
  const [temp, setTemp] = useState(20);
  const [humidity, setHumidity] = useState(60);
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Result state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSelections();
  }, []);

  const fetchSelections = async () => {
    try {
      const itemRes = await axios.get('/api/inventory');
      setItems(itemRes.data);
      
      const catRes = await axios.get('/api/batches/categories');
      setCategories(catRes.data);
      if (catRes.data.length > 0) {
        setSelectedCategory(catRes.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load selections:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setResult(null);
        setError(null);
      } else {
        setError("Only image files are supported.");
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('temp', temp.toString());
    formData.append('humidity', humidity.toString());
    
    if (selectedItem) {
      formData.append('inventory_item_id', selectedItem);
    } else if (selectedCategory) {
      formData.append('category_id', selectedCategory);
    }

    try {
      const res = await axios.post('/api/predict/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "AI analysis failed. Please verify the server is running and models are loaded.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-black tracking-tight">AI Food Freshness Scan</h1>
        <p className="text-xs text-slate-400">Scan items using your camera, inspect mold probability, and calculate decays.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Column: Upload box and Parameters */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg">1. Upload Image</h3>
            
            {/* Upload Area */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={triggerUpload}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                previewUrl 
                  ? 'border-indigo-500/40 bg-slate-900/10' 
                  : 'border-slate-700/40 hover:border-indigo-500/40 bg-slate-800/10 hover:bg-slate-800/20'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              
              {previewUrl ? (
                <div className="space-y-4 relative group">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-h-60 mx-auto rounded-2xl object-cover border border-slate-700/50" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold bg-indigo-600 px-3 py-1.5 rounded-xl">
                      Change Image
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs truncate">{file?.name}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Drag and drop your image here</p>
                    <p className="text-slate-500 text-xs mt-1">Supports PNG, JPG, JPEG formats</p>
                  </div>
                  <span className="inline-block px-4 py-2 bg-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors mt-2">
                    Browse Files
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Parameters settings panel */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg">2. Scan Parameters</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Link to existing item */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-slate-400 font-bold uppercase">Link to Inventory Item (Optional)</label>
                <select 
                  value={selectedItem}
                  onChange={e => {
                    setSelectedItem(e.target.value);
                    if (e.target.value) setSelectedCategory('');
                  }}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none bg-slate-900"
                >
                  <option value="">Transient Scan (No item link)</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.category.name})</option>
                  ))}
                </select>
              </div>

              {/* Category selector if transient scan */}
              {!selectedItem && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">Expected Category</label>
                  <select 
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none bg-slate-900"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ambient temperature */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ambient Temp (°C)</span>
                </label>
                <input 
                  type="number"
                  value={temp}
                  onChange={e => setTemp(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                />
              </div>

              {/* Ambient humidity */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ambient Humidity (%)</span>
                </label>
                <input 
                  type="number"
                  value={humidity}
                  onChange={e => setHumidity(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                />
              </div>

            </div>

            <button 
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-2xl font-bold shadow-glow flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                  <span>Running AI Inspection Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Execute Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis Output Results */}
        <div className="space-y-6">
          
          {error && (
            <div className="glass-panel p-5 rounded-3xl border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Inspection Error</h4>
                <p className="mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-3 min-h-[400px] flex flex-col justify-center">
              <Camera className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="font-bold text-lg text-slate-300">Awaiting Capture</h3>
              <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                Select produce files and configure conditions, then trigger the engine to view diagnostic overlays.
              </p>
            </div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              
              {/* Primary fresh score card */}
              <div className="glass-panel p-6 rounded-3xl space-y-4 relative overflow-hidden">
                
                {/* Visual canvas representation overlay */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 max-h-56">
                  {/* Real image path mapped to server endpoint */}
                  <img 
                    src={result.image_url} 
                    alt="Analyzed produce" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Computer Vision box overlays - simulation layer for UX WOW factor */}
                  {result.cv_metrics.mold_detected && (
                    <div className="absolute top-1/4 left-1/3 w-16 h-16 border-2 border-dashed border-red-500 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="text-[8px] bg-red-500 text-white font-extrabold px-1 rounded">MOLD</span>
                    </div>
                  )}
                  {result.cv_metrics.bruise_detected && (
                    <div className="absolute bottom-1/4 right-1/4 w-20 h-12 border-2 border-dashed border-amber-500 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <span className="text-[8px] bg-amber-500 text-black font-extrabold px-1 rounded">BRUISE</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Classification</span>
                    <h3 className="text-xl font-extrabold mt-0.5">{result.predicted_category}</h3>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block text-right">State</span>
                    <span className={`px-2.5 py-0.5 rounded-xl text-xs font-bold ${
                      result.status === 'Fresh' 
                        ? 'text-emerald-400 bg-emerald-500/10' 
                        : result.status === 'Decaying' 
                          ? 'text-amber-400 bg-amber-500/10' 
                          : 'text-red-400 bg-red-500/10'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                </div>

                {/* Score bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Freshness Score</span>
                    <span className={
                      result.freshness_score >= 70 
                        ? 'text-emerald-400' 
                        : result.freshness_score >= 40 
                          ? 'text-amber-400' 
                          : 'text-red-400'
                    }>{result.freshness_score}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-850 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.freshness_score >= 70 
                          ? 'bg-emerald-500' 
                          : result.freshness_score >= 40 
                            ? 'bg-amber-500' 
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${result.freshness_score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Predicted Shelf Life</span>
                    <p className="font-extrabold text-lg mt-0.5">{result.remaining_shelf_life_days} days</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Spoilage Probability</span>
                    <p className="font-extrabold text-lg mt-0.5">{(result.spoilage_probability * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Physical details diagnostics */}
              <div className="glass-panel p-5 rounded-3xl space-y-3">
                <h4 className="font-bold text-sm tracking-wide uppercase text-slate-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>Computer Vision Diagnostics</span>
                </h4>
                
                <div className="divide-y divide-slate-800/30 text-xs space-y-2.5">
                  <div className="flex justify-between items-center pt-2.5">
                    <span className="text-slate-400">Color discloration index</span>
                    <span className="font-semibold">{result.cv_metrics.color_score}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2.5">
                    <span className="text-slate-400">Texture softness index</span>
                    <span className="font-semibold">{result.cv_metrics.texture_score}%</span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5">
                    <span className="text-slate-400">Mold spots detected</span>
                    <span className={`font-semibold ${result.cv_metrics.mold_detected ? 'text-red-400' : 'text-emerald-400'}`}>
                      {result.cv_metrics.mold_detected ? 'Positive' : 'None'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5">
                    <span className="text-slate-400">Bruise spots detected</span>
                    <span className={`font-semibold ${result.cv_metrics.bruise_detected ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {result.cv_metrics.bruise_detected ? 'Positive' : 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
};

export default UploadPage;
