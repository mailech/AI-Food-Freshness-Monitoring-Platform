import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Warehouse, 
  Sparkles, 
  ShieldCheck, 
  TrendingDown, 
  ChevronRight, 
  Leaf 
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 relative overflow-hidden flex flex-col justify-between">
      
      {/* Dynamic background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto w-full px-6 h-20 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2">
          <Leaf className="w-8 h-8 text-emerald-400 stroke-[2.5]" />
          <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
            FRESH PLATFORM
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
            Sign In
          </Link>
          <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/20">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center z-10 relative">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Computer Vision Engine</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-100">
            Real-Time AI <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Food Freshness
            </span> <br />
            Monitoring
          </motion.h1>

          <motion.p variants={itemVariants} className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-lg">
            Empower your kitchen, retail outlet, or warehouse. Use computer vision and deep learning to inspect freshness, detect mold, find bruises, and predict shelf life.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link to="/register" className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 hover:opacity-90 rounded-2xl text-white font-semibold transition-all shadow-glow">
              <span>Start Free Trial</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-2xl text-slate-300 font-semibold transition-colors">
              <span>View Dashboard</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Grid / Visual Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 gap-4 relative"
        >
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-3xl space-y-3 transform translate-y-8">
              <Camera className="w-8 h-8 text-indigo-400" />
              <h3 className="font-bold text-lg">Image Inspection</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Scan produce to detect physical bruising, mold patches, and surface tissue damage.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-3xl space-y-3 transform translate-y-8">
              <Warehouse className="w-8 h-8 text-emerald-400" />
              <h3 className="font-bold text-lg">Batch Tracking</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Log and trace large supply-chain shipments from receiving docks to shelves.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-3xl space-y-3">
              <TrendingDown className="w-8 h-8 text-amber-400" />
              <h3 className="font-bold text-lg">Shelf-Life Prediction</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Regression algorithms predict exact remaining shelf-life days based on temp.
              </p>
            </div>
            <div className="glass-panel p-6 rounded-3xl space-y-3">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              <h3 className="font-bold text-lg">Quality Audits</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automatic expiry alerts, compliance reports, and food safety inspections.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="h-16 flex items-center justify-center border-t border-slate-800/40 text-slate-500 text-xs tracking-wider z-10 relative">
        &copy; {new Date().getFullYear()} AI Food Freshness Monitoring Platform. All Rights Reserved.
      </footer>

    </div>
  );
};

export default LandingPage;
