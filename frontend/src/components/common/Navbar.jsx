import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Menu,
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronDown,
  Layers,
  Activity,
  Store,
  Warehouse,
  ClipboardCheck,
  Settings
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const roleLabels = {
    consumer: 'Consumer (Home)',
    retail_manager: 'Retail Manager',
    warehouse_operator: 'Warehouse Operator',
    food_quality_inspector: 'Quality Inspector',
    administrator: 'Administrator'
  };

  const handleSelectRole = async (roleKey) => {
    await switchRole(roleKey);
    setShowRoleModal(false);
    setShowMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-[#EBEBEB] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* 1. Left: Brand Logo & Wordmark (Airbnb Style) */}
          <NavLink to="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm group-hover:bg-emerald-700 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-emerald-700 leading-none">
                FreshGuard<span className="text-[#222222]">AI</span>
              </span>
              <span className="text-[10px] font-semibold text-[#717171] tracking-wide mt-0.5">
                Food Freshness Platform
              </span>
            </div>
          </NavLink>

          {/* 2. Center: Airbnb-style Floating Pill Search / Quick Actions */}
          <div className="hidden md:flex items-center bg-white border border-[#DDDDDD] rounded-full shadow-sm hover:shadow-md transition cursor-pointer px-4 py-2 text-xs font-semibold divide-x divide-[#DDDDDD]">
            <NavLink to="/scanner" className="px-3 hover:text-emerald-700 flex items-center gap-1.5 text-[#222222]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Produce Scanner</span>
            </NavLink>
            <NavLink to="/storage" className="px-3 hover:text-emerald-700 flex items-center gap-1.5 text-[#222222]">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>IoT Telemetry</span>
            </NavLink>
            <NavLink to="/inventory" className="px-3 hover:text-emerald-700 flex items-center gap-1.5 text-[#222222]">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>8 Categories</span>
            </NavLink>
          </div>

          {/* 3. Right: Persona Switcher & Airbnb User Menu Button */}
          <div className="flex items-center space-x-3">
            {/* Quick Switch Role Pill */}
            <button
              onClick={() => setShowRoleModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border border-[#EBEBEB] bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#222222] transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="capitalize">{user?.role ? roleLabels[user.role] : 'Switch Role'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#717171]" />
            </button>

            {/* Airbnb Pill Button with Hamburger & User Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2.5 p-1.5 pl-3 border border-[#DDDDDD] rounded-full hover:shadow-md transition bg-white"
              >
                <Menu className="w-4 h-4 text-[#222222]" />
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#EBEBEB] shadow-2xl py-2 z-50 text-xs font-medium">
                  <div className="px-4 py-3 border-b border-[#F0F0F0]">
                    <p className="font-bold text-[#222222] text-sm">{user?.full_name || 'Active User'}</p>
                    <p className="text-[11px] text-[#717171]">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-100 uppercase">
                      {user?.role?.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => { setShowRoleModal(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F7F7F7] text-[#222222] flex items-center gap-2 font-semibold"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Switch Active Persona</span>
                  </button>

                  <NavLink
                    to="/dashboard"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2.5 hover:bg-[#F7F7F7] text-[#222222]"
                  >
                    My Role Dashboard
                  </NavLink>
                  <NavLink
                    to="/scanner"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2.5 hover:bg-[#F7F7F7] text-[#222222]"
                  >
                    AI Produce Scanner
                  </NavLink>
                  <NavLink
                    to="/reports"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2.5 hover:bg-[#F7F7F7] text-[#222222]"
                  >
                    Audit & PDF Exports
                  </NavLink>

                  <div className="border-t border-[#F0F0F0] mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#EBEBEB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <div>
                <h3 className="text-lg font-bold text-[#222222]">Select Active Persona</h3>
                <p className="text-xs text-[#717171]">Switch to test tailored workflows and access control.</p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F0F0F0] text-[#717171] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { id: 'retail_manager', title: 'Retail Store Manager', dept: 'Store #104 - Fresh Produce', icon: Store },
                { id: 'food_quality_inspector', title: 'Food Safety Inspector', dept: 'State Agri-Food Safety Board', icon: ClipboardCheck },
                { id: 'warehouse_operator', title: 'Warehouse Logistics Operator', dept: 'Central Cold Logistics Hub', icon: Warehouse },
                { id: 'consumer', title: 'Consumer (Household)', dept: 'Household Pantry', icon: UserIcon },
                { id: 'administrator', title: 'System Administrator', dept: 'HQ Engineering & Ops', icon: Settings }
              ].map((r) => {
                const Icon = r.icon;
                const isCur = user?.role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                      isCur
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                        : 'border-[#EBEBEB] hover:border-[#CCCCCC] bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#222222]">{r.title}</p>
                        <p className="text-[11px] text-[#717171]">{r.dept}</p>
                      </div>
                    </div>
                    {isCur && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
