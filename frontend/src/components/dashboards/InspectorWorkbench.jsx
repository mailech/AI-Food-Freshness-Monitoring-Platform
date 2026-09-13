import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardCheck,
  CheckCircle,
  AlertOctagon,
  Ban,
  ShieldCheck,
  Package,
  Calendar,
  Building
} from 'lucide-react';

export const InspectorWorkbench = () => {
  const { token, user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const data = await api.getBatches();
      setBatches(data);
      if (data.length > 0 && !selectedBatch) {
        setSelectedBatch(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleDecision = async (status) => {
    if (!selectedBatch) return;
    try {
      await api.updateBatch(selectedBatch.id, {
        inspection_status: status,
        inspector_notes: inspectorNotes || `Evaluated and marked as ${status} by ${user?.full_name || 'Inspector'}.`
      }, token);

      setActionSuccess(`Batch ${selectedBatch.batch_number} successfully marked as ${status.toUpperCase()}!`);
      setInspectorNotes('');
      fetchBatches();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-800 rounded-full text-xs font-bold border border-purple-100 mb-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-purple-700" />
          <span>Official Food Safety Inspection Authority</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          Food Safety Inspector Workbench
        </h1>
        <p className="text-xs sm:text-sm text-[#717171] mt-1">
          Perform formal batch verifications, quarantine suspect produce, or issue official release approvals.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batches Queue (1 col) */}
        <div className="bg-white p-6 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#222222] text-sm">Batch Queue</h3>
            <span className="text-xs bg-[#F0F0F0] text-[#555555] px-2.5 py-1 rounded-full font-mono font-bold">
              {batches.length} Lots
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {batches.map((b) => {
              const isSelected = selectedBatch?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBatch(b);
                    setInspectorNotes(b.inspector_notes || '');
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/40 ring-1 ring-purple-500/30'
                      : 'border-[#EBEBEB] bg-[#FAFAFA] hover:bg-[#F2F2F2]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-[#222222]">{b.batch_number}</span>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                        b.inspection_status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : b.inspection_status === 'quarantined'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : b.inspection_status === 'discarded'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {b.inspection_status}
                    </span>
                  </div>
                  <p className="text-xs text-[#555555] font-medium truncate">{b.supplier_name}</p>
                  <p className="text-[11px] text-[#717171] mt-1 font-semibold">Quantity: {b.quantity} {b.unit}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inspection Details & 3-Way Decision Deck (2 cols) */}
        {selectedBatch ? (
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#EBEBEB] shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0F0F0]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Regulatory Compliance Review
                </span>
                <h2 className="text-xl font-extrabold text-[#222222] mt-0.5">
                  Lot: {selectedBatch.batch_number}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#717171] block">Current Status</span>
                <span className="text-xs font-bold uppercase text-[#222222]">{selectedBatch.inspection_status}</span>
              </div>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium">Supplier</span>
                <span className="font-extrabold text-[#222222] mt-1 block">{selectedBatch.supplier_name}</span>
              </div>
              <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium">Total Volume</span>
                <span className="font-extrabold text-[#222222] mt-1 block">{selectedBatch.quantity} {selectedBatch.unit}</span>
              </div>
              <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium">Harvest Date</span>
                <span className="font-extrabold text-[#222222] mt-1 block">{selectedBatch.harvest_date || 'N/A'}</span>
              </div>
              <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
                <span className="text-[#717171] block font-medium">Received Date</span>
                <span className="font-extrabold text-[#222222] mt-1 block">
                  {new Date(selectedBatch.received_date).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3.5 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB] sm:col-span-2">
                <span className="text-[#717171] block font-medium">Origin Region</span>
                <span className="font-extrabold text-[#222222] mt-1 block">{selectedBatch.origin_region || 'Domestic'}</span>
              </div>
            </div>

            {/* Official Compliance Notes */}
            <div>
              <label className="text-xs font-bold text-[#222222] block mb-2">
                Official Compliance Notes & Defect Justification:
              </label>
              <textarea
                rows="3"
                value={inspectorNotes}
                onChange={(e) => setInspectorNotes(e.target.value)}
                placeholder="Enter formal findings on organoleptic checks, temperature logs, or microbiological sampling..."
                className="w-full text-xs p-3.5 border border-[#CCCCCC] rounded-2xl focus:outline-none focus:border-purple-600 text-[#222222] font-medium"
              />
            </div>

            {/* 3-Way Official Decision Buttons */}
            <div className="pt-2">
              <span className="text-xs font-bold text-[#222222] block mb-3">Execute Official Regulatory Decision:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleDecision('approved')}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Approve for Retail (Pass)
                </button>
                <button
                  onClick={() => handleDecision('quarantined')}
                  className="py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  <AlertOctagon className="w-4 h-4" />
                  Quarantine Lot (Hold)
                </button>
                <button
                  onClick={() => handleDecision('discarded')}
                  className="py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" />
                  Condemn & Discard (Fail)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white p-12 rounded-3xl border border-[#EBEBEB] text-center text-[#717171]">
            <ClipboardCheck className="w-12 h-12 text-[#CCCCCC] mx-auto mb-2" />
            <p className="text-sm font-bold text-[#222222]">No Batch Selected</p>
            <p className="text-xs text-[#717171] mt-0.5">Select a batch from the left queue to begin inspection.</p>
          </div>
        )}
      </div>
    </div>
  );
};
