'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePortal() {
  const portals = [
    {
      role: 'Consumer Portal',
      title: 'Groceries & Kitchen',
      desc: 'Keep track of household inventory, expiry alerts, and receive smart storage recommendations.',
      link: '/dashboard/consumer',
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/10',
      icon: '🍉',
    },
    {
      role: 'Retail Operations',
      title: 'Store Inventory',
      desc: 'Manage store-level food batches, quality inspector schedules, and dynamic discount notifications.',
      link: '/dashboard/retail',
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/10',
      icon: '🏪',
    },
    {
      role: 'Warehouse Operator',
      title: 'Bulk Storage & IoT',
      desc: 'Monitor bulk cooling zones, temperature/humidity sensor grids, and MQTT telemetry logs.',
      link: '/dashboard/warehouse',
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/10',
      icon: '🏭',
    },
    {
      role: 'Root Administrator',
      title: 'System Management',
      desc: 'Oversee user provisioning, service endpoints health, global discount policies, and database logs.',
      link: '/dashboard/admin',
      color: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-500/10',
      icon: '⚙',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-955 relative overflow-hidden animate-fade-in">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06),transparent_65%)] pointer-events-none z-0" />

      {/* Navigation Header */}
      <header className="relative z-10 px-6 py-6 max-w-7xl mx-auto w-full flex justify-between items-center border-b border-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-float">🔍</span>
          <span className="text-xl font-black tracking-tight text-white">
            Fresh<span className="text-emerald-400">Lens</span>
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition"
          >
            API Docs
          </a>
          <span className="text-slate-800">|</span>
          <a
            href="/health"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-slate-400 hover:text-emerald-400 uppercase tracking-wider transition"
          >
            System Status
          </a>
        </div>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center items-center text-center">
        
        {/* 3D Rotating Scanning Mesh Wireframe */}
        <div className="relative w-full max-w-[220px] h-[220px] flex items-center justify-center mb-8 animate-float">
          <div className="rotating-3d-sphere">
            <div className="ring-3d ring-3d-1"></div>
            <div className="ring-3d ring-3d-2"></div>
            <div className="ring-3d ring-3d-3"></div>
            <div className="ring-3d ring-3d-4"></div>
          </div>
          {/* Scan laser */}
          <div className="absolute w-[260px] h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent blur-[1px] animate-pulse"></div>
        </div>

        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-[10px] font-bold tracking-widest text-emerald-400 uppercase mb-6 animate-pulse">
          ⚡ AI-Powered Food Freshness Platform
        </span>
        
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-3xl leading-none animate-slide-up">
          Track freshness, reduce waste, optimize storage.
        </h1>
        
        <p className="mt-6 text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed animate-fade-in">
          Access specialized analytics consoles to monitor item decay rates, run visual produce inspections, and audit compliance indices.
        </p>

        {/* Portal Grid with 3D card tilt */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-16 text-left perspective-1000 animate-slide-up">
          {portals.map((portal) => (
            <Link key={portal.role} href={portal.link} className="group">
              <div className={`h-full bg-slate-900/40 backdrop-blur border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-2xl card-3d-hover relative overflow-hidden`}>
                <div>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition duration-300 inline-block">{portal.icon}</div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                    {portal.role}
                  </span>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition duration-300">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {portal.desc}
                  </p>
                </div>
                <div className="mt-8 flex items-center text-xs font-bold text-emerald-400 gap-1 group-hover:translate-x-1 transition duration-300">
                  <span>Enter Dashboard</span>
                  <span>→</span>
                </div>
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${portal.color} opacity-[0.02] rounded-bl-full`} />
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-slate-900/60 text-center text-xs text-slate-650 max-w-7xl mx-auto w-full font-mono">
        <p>© 2026 FreshLens Inc. All rights reserved. Deployed Sandbox Environments.</p>
      </footer>
    </div>
  );
}
