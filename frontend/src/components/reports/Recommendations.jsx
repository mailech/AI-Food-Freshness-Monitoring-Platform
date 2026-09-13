import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Lightbulb,
  Tag,
  ThermometerSnowflake,
  Utensils,
  HeartHandshake,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export const Recommendations = () => {
  const { token } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRecs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedType) params.recommendation_type = selectedType;
      const data = await api.getRecommendations(params);
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, [selectedType]);

  const handleAction = async (recId) => {
    try {
      await api.actionRecommendation(recId, token);
      fetchRecs();
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'storage':
        return <ThermometerSnowflake className="w-5 h-5 text-blue-700" />;
      case 'discount':
        return <Tag className="w-5 h-5 text-emerald-700" />;
      case 'consumption':
        return <Utensils className="w-5 h-5 text-amber-700" />;
      case 'donation':
        return <HeartHandshake className="w-5 h-5 text-purple-700" />;
      default:
        return <Lightbulb className="w-5 h-5 text-teal-700" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          AI Action Recommendations & Waste Prevention
        </h1>
        <p className="text-xs sm:text-sm text-[#717171] mt-1">
          Dynamic pricing markdowns, storage optimizations, and consumption strategies powered by Arrhenius kinetics.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: '', label: 'All Strategies' },
          { id: 'discount', label: 'Dynamic Discounting' },
          { id: 'storage', label: 'Storage Shifts' },
          { id: 'consumption', label: 'Priority Consumption' },
          { id: 'donation', label: 'Food Donation' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition ${
              selectedType === tab.id
                ? 'bg-[#222222] text-white shadow-sm'
                : 'bg-white text-[#717171] border border-[#EBEBEB] hover:border-[#CCCCCC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recommendations Cards (Airbnb Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-[#EBEBEB]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="text-xs text-[#717171] mt-2 font-medium">Analyzing inventory shelf-life...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-[#EBEBEB] text-[#717171]">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#222222]">Inventory Optimized</p>
            <p className="text-xs text-[#717171] mt-0.5">No urgent recommendations needed at this time.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-6 sm:p-8 rounded-3xl border bg-white shadow-sm flex flex-col justify-between transition ${
                rec.is_actioned ? 'opacity-70 border-[#EBEBEB]' : 'border-[#EBEBEB] hover:border-emerald-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F7F7F7] border border-[#EBEBEB] flex items-center justify-center">
                      {getTypeIcon(rec.recommendation_type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#717171]">
                        {rec.recommendation_type} Strategy
                      </span>
                      <h3 className="text-sm font-bold text-[#222222]">{rec.title}</h3>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${
                      rec.priority === 'immediate'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : rec.priority === 'high'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}
                  >
                    {rec.priority}
                  </span>
                </div>

                <p className="text-xs text-[#555555] leading-relaxed mb-4">{rec.description}</p>

                {rec.action_suggested && (
                  <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 mb-4 text-xs text-emerald-950 font-medium">
                    <span className="font-bold block mb-0.5 text-emerald-800">Suggested Action:</span>
                    {rec.action_suggested}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#F0F0F0] flex items-center justify-between">
                <span className="text-[11px] text-[#717171] font-mono">
                  {new Date(rec.created_at).toLocaleDateString()}
                </span>
                {rec.is_actioned ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Action Executed
                  </span>
                ) : (
                  <button
                    onClick={() => handleAction(rec.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#222222] hover:bg-emerald-600 text-white rounded-full text-xs font-bold transition shadow-sm"
                  >
                    <span>Execute Action</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
