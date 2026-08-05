import React from 'react';
import { 
  FileSpreadsheet, 
  FileDown, 
  HelpCircle,
  FileCheck2,
  TrendingDown,
  Warehouse
} from 'lucide-react';

const ReportsPage: React.FC = () => {

  const handleDownload = (format: string) => {
    // Standard file trigger. Points to backend proxy routes.
    window.open(`/api/reports/${format}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-black tracking-tight">Compliance & Quality Reports</h1>
        <p className="text-xs text-slate-400">Export inventory data, waste summaries, and food freshness audit sheets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Report Card 1: PDF */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg">Freshness Quality Audit</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates a formal PDF document detailing item parameters, categorization, color indices, and warning alerts. Ideal for official inspections.
            </p>
          </div>
          
          <button 
            onClick={() => handleDownload('pdf')}
            className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>
        </div>

        {/* Report Card 2: Excel */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg">Inventory Ledger (Excel)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export raw database columns containing batch details, temperature thresholds, expiry ranges, and exact freshness values for external processing.
            </p>
          </div>
          
          <button 
            onClick={() => handleDownload('excel')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel Sheet</span>
          </button>
        </div>

        {/* Report Card 3: CSV */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300">
              <FileDown className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg">Raw Logs CSV</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quick spreadsheet export containing core fields delimited by commas. Best for importing directly into custom ERP or legacy software.
            </p>
          </div>
          
          <button 
            onClick={() => handleDownload('csv')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Download CSV File</span>
          </button>
        </div>

      </div>

      {/* Waste Reduction Summary Visual card */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-lg">Cumulative Waste Reduction Index</h3>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              By prioritizing decaying produce through markdown sales and moving storage items into optimal cooling zones based on recommendation engine tips, you have prevented disposal of stock. Keep tracking items to log historical waste prevention.
            </p>
            <div className="flex gap-4 pt-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Estimated Savings</span>
                <p className="font-black text-xl text-emerald-400">$345.80</p>
              </div>
              <div className="w-px bg-slate-850 h-8 self-center"></div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Stock Rescued</span>
                <p className="font-black text-xl text-indigo-400">128.5 kg</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportsPage;
