import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Layers,
  ShieldCheck
} from 'lucide-react';

export const ReportsCenter = () => {
  const [summary, setSummary] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const categories = [
    'fruits',
    'vegetables',
    'dairy_products',
    'meat_poultry',
    'seafood',
    'bakery_products',
    'packaged_foods',
    'beverages'
  ];

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await api.getReportsSummary();
        setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
          Audit Reports & Compliance Exports
        </h1>
        <p className="text-xs sm:text-sm text-[#717171] mt-1">
          Generate tamper-evident PDF inspection certificates, multi-sheet Excel master ledgers, and raw CSV feeds.
        </p>
      </div>

      {/* Export Cards Grid (Airbnb Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PDF Certificate Card */}
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#222222] text-base">Official PDF Audit Report</h3>
            <p className="text-xs text-[#717171] mt-1.5 mb-5 leading-relaxed">
              Standardized inspection certificate with defect breakdown tables, batch sampling logs, and inspector signature block.
            </p>

            <div className="mb-5">
              <label className="text-xs font-bold text-[#222222] block mb-1">Filter by Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full text-xs font-medium border border-[#CCCCCC] rounded-xl px-3.5 py-2.5 bg-white text-[#222222] focus:outline-none focus:border-emerald-600 capitalize"
              >
                <option value="">All 8 Food Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <a
            href={api.getExportPdfUrl(selectedCategory)}
            download="freshness_audit_report.pdf"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Audit PDF
          </a>
        </div>

        {/* Excel Master Ledger Card */}
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#222222] text-base">Excel Comprehensive Ledger</h3>
            <p className="text-xs text-[#717171] mt-1.5 mb-5 leading-relaxed">
              Multi-sheet Excel workbook containing active inventory, batch inspection records, IoT sensor telemetry, and AI recommendations.
            </p>
          </div>

          <a
            href={api.getExportExcelUrl()}
            download="food_freshness_master_ledger.xlsx"
            className="w-full py-3.5 px-4 bg-[#222222] hover:bg-[#333333] text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Excel (.XLSX)
          </a>
        </div>

        {/* Raw CSV Data Stream Card */}
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#222222] text-base">Raw Tabular CSV Feed</h3>
            <p className="text-xs text-[#717171] mt-1.5 mb-5 leading-relaxed">
              Lightweight CSV feed formatted for seamless integration into enterprise ERPs (SAP, Oracle SCM, Microsoft Dynamics).
            </p>
          </div>

          <a
            href={api.getExportCsvUrl()}
            download="food_freshness_export.csv"
            className="w-full py-3.5 px-4 bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#222222] font-bold rounded-2xl text-xs transition border border-[#DDDDDD] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download CSV Feed
          </a>
        </div>
      </div>

      {/* Summary Metrics Banner */}
      {summary && (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm">
          <h3 className="font-bold text-[#222222] text-base mb-4">Current Platform Audit Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Audited Produce</span>
              <span className="font-extrabold text-[#222222] text-xl mt-1 block">{summary.total_items}</span>
            </div>
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Logistics Batches</span>
              <span className="font-extrabold text-[#222222] text-xl mt-1 block">{summary.total_batches}</span>
            </div>
            <div className="p-4 bg-[#F7F7F7] rounded-2xl border border-[#EBEBEB]">
              <span className="text-[#717171] block font-medium">Completed Scans</span>
              <span className="font-extrabold text-[#222222] text-xl mt-1 block">{summary.total_scans}</span>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-emerald-800 block font-medium">Average Freshness</span>
              <span className="font-extrabold text-emerald-700 text-xl mt-1 block">{summary.avg_freshness_score}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
