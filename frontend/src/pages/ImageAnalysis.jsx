import { useState } from 'react';
import axios from 'axios';
import { UploadCloud, FileImage, ShieldAlert } from 'lucide-react';

export default function ImageAnalysis() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:8000/api/analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.data);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (category) => {
    const colors = { Fresh: 'text-green-700 bg-green-100 border-green-200', Good: 'text-blue-700 bg-blue-100 border-blue-200', Acceptable: 'text-amber-700 bg-amber-100 border-amber-200', Spoiled: 'text-red-700 bg-red-100 border-red-200' };
    return colors[category] || 'text-gray-700 bg-gray-100 border-gray-200';
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">AI Visual Inspection</h2>
        <p className="text-gray-500 mt-1">Upload a photo to detect freshness, bruising, and spoilage indicators.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="border-2 border-dashed border-green-200 bg-green-50/30 rounded-xl p-10 flex flex-col items-center justify-center min-h-[320px] relative transition-all hover:bg-green-50/60">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={e => {
                const f = e.target.files[0];
                if(f) { setFile(f); setPreview(URL.createObjectURL(f)); }
              }} 
              accept="image/*" 
            />
            
            {preview ? (
              <img src={preview} alt="Upload preview" className="absolute inset-0 w-full h-full object-contain p-2 rounded-xl" />
            ) : (
              <div className="text-center">
                <UploadCloud className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">Drag & Drop Image</p>
                <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG, WEBP (Max 5MB)</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleUpload}
            disabled={!file || loading}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <span className="animate-pulse">Processing via Neural Network...</span> : <><FileImage size={20} /> Run Analysis</>}
          </button>
        </div>

        {result && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              Diagnostic Report
              {result.is_demo_prediction && <ShieldAlert size={18} className="text-amber-500" title="Demo Predictor Active" />}
            </h3>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Quality Classification</p>
                <span className={`inline-block px-4 py-1.5 rounded-lg border text-sm font-bold mt-2 ${getStatusColor(result.freshness_category)}`}>
                  {result.freshness_category}
                </span>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Overall Score</p>
                <p className="text-3xl font-black text-gray-800 mt-1">{result.freshness_score}<span className="text-lg text-gray-400 font-medium">/100</span></p>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-500">Spoilage Risk</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{(result.spoilage_probability * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-500">AI Confidence</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{(result.confidence_score * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Detected Visual Indicators</p>
              <div className="flex flex-wrap gap-2">
                {result.detected_indicators.map((ind, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}