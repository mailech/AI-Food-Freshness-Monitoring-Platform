import React, { useState } from "react";
import {
  Menu,
  Search,
  Bell,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";

export const TopBar = ({ onOpenSidebar, onNavigateAlerts, onSearch, searchQuery }) => {
  const { user, logout, setRole } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Hamburger + Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batches, food types, storage zones..."
            value={searchQuery}
            onChange={(e) => onSearch?.(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right side: Role selector, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Role Switcher dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-slate-200 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline text-slate-400">Role:</span>
            <span className="text-emerald-400 font-bold">{user?.role || "Inspector"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 border-b border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Switch Active Role</p>
              </div>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    user?.role === r ? "text-emerald-400 bg-emerald-500/10 font-bold" : "text-slate-300"
                  }`}
                >
                  <span>{r}</span>
                  {user?.role === r && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-3 z-50">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Freshness Alerts</h4>
                <button
                  onClick={() => {
                    setShowNotificationMenu(false);
                    onNavigateAlerts?.();
                  }}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  View All (5)
                </button>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
                <div
                  onClick={() => {
                    setShowNotificationMenu(false);
                    onNavigateAlerts?.();
                  }}
                  className="p-3 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">5 products expiring soon</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Bananas and Salmon batches expire in &lt; 48h.</p>
                      <span className="text-[10px] text-slate-500 mt-1 inline-block">12m ago</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setShowNotificationMenu(false);
                    onNavigateAlerts?.();
                  }}
                  className="p-3 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Spoilage Alert: Strawberries</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Batch BATCH-SB-104 score dropped to 24/100.</p>
                      <span className="text-[10px] text-slate-500 mt-1 inline-block">45m ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xs font-extrabold text-white shadow">
            {user?.name ? user.name[0] : "U"}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-white leading-tight">{user?.name || "Demo User"}</p>
            <p className="text-[10px] text-slate-400">{user?.role || "Inspector"}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
