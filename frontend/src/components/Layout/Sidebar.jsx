import React from "react";
import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  Hourglass,
  ThermometerSnowflake,
  Sparkles,
  Bell,
  FileBarChart,
  Settings,
  Leaf,
  LogOut,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Food Inventory", icon: Boxes, badge: "17" },
    { id: "analysis", label: "Food Analysis", icon: ScanLine, highlight: true },
    { id: "shelflife", label: "Shelf Life", icon: Hourglass },
    { id: "storage", label: "Storage Monitoring", icon: ThermometerSnowflake },
    { id: "recommendations", label: "Recommendations", icon: Sparkles },
    { id: "alerts", label: "Alerts & Notifications", icon: Bell, badge: "3", badgeColor: "bg-red-500" },
    { id: "reports", label: "Reports & Audits", icon: FileBarChart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out backdrop-blur-xl lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-tight flex items-center gap-1.5">
                FreshGuard <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold uppercase">AI</span>
              </h1>
              <p className="text-[11px] text-slate-400">Freshness Platform</p>
            </div>
          </div>

          {/* User Role Badge */}
          <div className="mx-4 my-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Active Role</p>
              <p className="text-xs font-bold text-emerald-400 truncate">{user?.role || "Inspector"}</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 font-semibold"
                      : item.highlight
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : item.badgeColor
                          ? `${item.badgeColor} text-white`
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs text-white">
                {user?.name ? user.name[0] : "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Demo User"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || "user@freshguard.io"}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
