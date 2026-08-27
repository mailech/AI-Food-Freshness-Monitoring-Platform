'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface PlatformUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
}

const INITIAL_USERS: PlatformUser[] = [
  { id: 'u1', username: 'alice_ops', email: 'alice@freshlens.io', role: 'WAREHOUSE_OPERATOR', status: 'ACTIVE' },
  { id: 'u2', username: 'bob_retail', email: 'bob@freshlens.io', role: 'RETAIL_MANAGER', status: 'ACTIVE' },
  { id: 'u3', username: 'charlie_consumer', email: 'charlie@gmail.com', role: 'CONSUMER', status: 'ACTIVE' },
  { id: 'u4', username: 'admin_root', email: 'admin@freshlens.io', role: 'ADMIN', status: 'ACTIVE' },
];

export default function AdminDashboard() {
  const [activeRole, setActiveRole] = useState('ADMIN');
  const [users, setUsers] = useState<PlatformUser[]>(INITIAL_USERS);
  const [securityLogs, setSecurityLogs] = useState<string[]>([
    '[13:40:02] ADMIN: Configuration updated (Verifications = Enabled)',
    '[13:12:15] WAREHOUSE: Telemetry batch logged for LOT-20260809-01',
    '[12:55:40] AUTH: Token generated for bob_retail',
  ]);

  const [settings, setSettings] = useState({
    verifications: true,
    securityAudits: true,
    discountingSync: false,
  });

  const services = [
    { name: 'Gateway Service (FastAPI)', status: 'ACTIVE', latency: '14ms', cpu: '1.2%' },
    { name: 'User Management Microservice', status: 'ACTIVE', latency: '8ms', cpu: '0.8%' },
    { name: 'Image Analysis CV Engine', status: 'ACTIVE', latency: '240ms', cpu: '15.4%' },
    { name: 'Freshness assessment Service', status: 'ACTIVE', latency: '42ms', cpu: '4.8%' },
    { name: 'Notification Service', status: 'ACTIVE', latency: '110ms', cpu: '0.5%' },
  ];

  // SVG coordinates for CPU load chart
  const cpuTrendPoints = [15, 20, 18, 25, 42, 38, 22, 19, 14, 16];
  const cpuCoords = cpuTrendPoints.map((val, i) => `${40 + i * 45},${140 - val * 2}`).join(' ');

  const promoteUser = (userId: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setSecurityLogs(prev => [
      `[${new Date().toLocaleTimeString()}] USER: Modified role for user ${userId} to ${newRole}`,
      ...prev
    ]);
  };

  const toggleSetting = (key: 'verifications' | 'securityAudits' | 'discountingSync') => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setSecurityLogs(logs => [
        `[${new Date().toLocaleTimeString()}] ADMIN: Toggled setting '${key}' to ${next[key] ? 'ENABLED' : 'DISABLED'}`,
        ...logs
      ]);
      return next;
    });
  };

  // RBAC Gated Screen Check
  const hasAccess = activeRole === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 p-6 selection:bg-rose-500 selection:text-white">
      
      {/* Sandbox Role Switcher Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <h4 className="font-bold text-white text-sm">Sandbox Role Simulator</h4>
            <p className="text-xs text-slate-400">Simulate active session context to evaluate role-based access policies (RBAC).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveRole('CONSUMER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeRole === 'CONSUMER' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Consumer (Block screen)
          </button>
          <button
            onClick={() => setActiveRole('ADMIN')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeRole === 'ADMIN' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Root Administrator (Allow screen)
          </button>
        </div>
      </div>

      {!hasAccess ? (
        /* RBAC RESTRICTED ACCESS SCREEN */
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center text-3xl">
            🔒
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Denied</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              You do not have authorization to view the Root System console. This dashboard is gated by role-based access tokens.
            </p>
            <p className="text-xs text-indigo-400 font-mono mt-3">
              Enable "Root Administrator" role in the testing panel above to bypass this check.
            </p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold transition">
            Return to Portal Hub
          </Link>
        </div>
      ) : (
        /* ADMIN DASHBOARD CONSOLE */
        <div className="space-y-8 animate-in fade-in zoom-in duration-200">
          
          {/* Main Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-900 gap-4">
            <div>
              <span className="text-rose-500 text-xs font-semibold uppercase tracking-wider">Role: Root Administrator</span>
              <h1 className="text-3xl font-black tracking-tight text-white mt-1">System Management Console</h1>
              <p className="text-slate-400 mt-1 text-sm">Configure dynamic API integrations, audits, and database user rosters.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/" className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm transition font-medium">
                Portal Hub
              </Link>
              <button
                onClick={() => alert('Safe system reboot triggered. Microservices cycling...')}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-sm text-white font-bold shadow-lg shadow-rose-500/20 transition duration-150"
              >
                Safe System Reboot
              </button>
            </div>
          </header>

          {/* System Performance Visualizer (SVG lines chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* System Performance SVG Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold text-sm">Cluster CPU utilization (24h)</h3>
                <span className="text-xs font-mono text-slate-500">Average: 24.3%</span>
              </div>

              <div className="w-full aspect-[21/9] relative">
                <svg className="w-full h-full" viewBox="0 0 500 180">
                  <line x1="40" y1="40" x2="480" y2="40" stroke="#1e293b" strokeDasharray="3" />
                  <line x1="40" y1="90" x2="480" y2="90" stroke="#1e293b" strokeDasharray="3" />
                  <line x1="40" y1="140" x2="480" y2="140" stroke="#1e293b" strokeDasharray="3" />

                  <polyline
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3.5"
                    points={cpuCoords}
                  />

                  {cpuTrendPoints.map((val, index) => {
                    const x = 40 + index * 45;
                    const y = 140 - val * 2;
                    return (
                      <g key={index} className="group cursor-pointer">
                        <circle cx={x} cy={y} r="4" className="fill-rose-400 stroke-slate-950 stroke-2" />
                        <text x={x} y={y - 12} textAnchor="middle" className="fill-white font-mono text-[9px] font-bold opacity-0 group-hover:opacity-100 transition">
                          {val}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-1 left-10 right-10 flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>00:00</span>
                  <span>04:00</span>
                  <span>08:00</span>
                  <span>12:00</span>
                  <span>16:00</span>
                  <span>20:00</span>
                </div>
              </div>
            </div>

            {/* Platform metrics summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-white font-bold text-sm mb-4">Platform Stats</h3>
                <div className="space-y-4 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Total Scans Run</span>
                    <span className="text-white font-bold">14,208</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Database Size</span>
                    <span className="text-white font-bold">4.8 GB</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800">
                    <span className="text-slate-400">Active Sensors</span>
                    <span className="text-emerald-400 font-bold">32 Online</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">REST API Status</span>
                    <span className="text-emerald-400 font-bold">Healthy</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed pt-4 border-t border-slate-800">
                🔒 System metrics are queried from the gateway Prometheus integration.
              </p>
            </div>

          </div>

          {/* Microservices health checklist & global controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Core Microservices checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Core Microservices State</h2>
              <div className="divide-y divide-slate-950">
                {services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center py-3.5">
                    <div>
                      <h4 className="font-semibold text-sm text-white">{service.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Latency: {service.latency} • CPU: {service.cpu}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Global configurations */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Global Configuration Settings</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3.5 bg-slate-955 border border-slate-850 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs">Force User verification</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Require verified emails on signup</p>
                    </div>
                    <button
                      onClick={() => toggleSetting('verifications')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition ${
                        settings.verifications ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {settings.verifications ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3.5 bg-slate-955 border border-slate-850 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs">Session security audits</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Audit failed authorization requests on Gateway</p>
                    </div>
                    <button
                      onClick={() => toggleSetting('securityAudits')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition ${
                        settings.securityAudits ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {settings.securityAudits ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3.5 bg-slate-955 border border-slate-850 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs">Dynamic discounting sync</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Sync freshness health score to Point-of-Sale catalog pricing</p>
                    </div>
                    <button
                      onClick={() => toggleSetting('discountingSync')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition ${
                        settings.discountingSync ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {settings.discountingSync ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Session token: JWT HMAC-256 Verified</span>
                <span>IP: 192.168.1.100</span>
              </div>
            </div>

          </div>

          {/* USER MANAGEMENT & ROLE PROMOTION GRIDS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">User Database & Role Gating</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 pl-4">Username</th>
                    <th className="py-2.5">Email Address</th>
                    <th className="py-2.5">Current Role Role</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right pr-4">Rbac Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-850/10">
                      <td className="py-3 pl-4 font-bold text-white">{u.username}</td>
                      <td className="py-3 text-slate-300 font-mono">{u.email}</td>
                      <td className="py-3 font-mono text-indigo-400 font-bold">{u.role}</td>
                      <td className="py-3">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-4">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => promoteUser(u.id, 'CONSUMER')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              u.role === 'CONSUMER' ? 'bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                            }`}
                          >
                            Consumer
                          </button>
                          <button
                            onClick={() => promoteUser(u.id, 'WAREHOUSE_OPERATOR')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              u.role === 'WAREHOUSE_OPERATOR' ? 'bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                            }`}
                          >
                            Operator
                          </button>
                          <button
                            onClick={() => promoteUser(u.id, 'RETAIL_MANAGER')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              u.role === 'RETAIL_MANAGER' ? 'bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                            }`}
                          >
                            Manager
                          </button>
                          <button
                            onClick={() => promoteUser(u.id, 'ADMIN')}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                              u.role === 'ADMIN' ? 'bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-950 hover:bg-slate-900 border-slate-800'
                            }`}
                          >
                            Admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit trail / Security Console Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Audit Security Log Trail</h3>
            <div className="font-mono text-xs text-rose-400/90 space-y-2 bg-black/40 p-4 rounded-xl max-h-40 overflow-y-auto border border-slate-900 leading-relaxed">
              {securityLogs.map((log, i) => <p key={i}>{log}</p>)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
