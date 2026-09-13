import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ScanLine,
  Boxes,
  ThermometerSnowflake,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  ClipboardCheck,
  Settings,
  Shield
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || 'retail_manager';

  const navItems = [
    {
      label: 'Role Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      roles: ['consumer', 'retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'AI Produce Scanner',
      to: '/scanner',
      icon: ScanLine,
      roles: ['consumer', 'retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'Inventory & Batches',
      to: '/inventory',
      icon: Boxes,
      roles: ['consumer', 'retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'Climate & Storage',
      to: '/storage',
      icon: ThermometerSnowflake,
      roles: ['retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'Spoilage Alerts',
      to: '/alerts',
      icon: AlertTriangle,
      roles: ['consumer', 'retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'AI Recommendations',
      to: '/recommendations',
      icon: Lightbulb,
      roles: ['consumer', 'retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'Audit Reports & PDF',
      to: '/reports',
      icon: FileSpreadsheet,
      roles: ['retail_manager', 'warehouse_operator', 'food_quality_inspector', 'administrator']
    },
    {
      label: 'Inspector Workbench',
      to: '/inspections',
      icon: ClipboardCheck,
      roles: ['food_quality_inspector', 'administrator', 'retail_manager']
    },
    {
      label: 'System Administration',
      to: '/admin',
      icon: Settings,
      roles: ['administrator']
    }
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-[#EBEBEB] flex-shrink-0 hidden md:flex flex-col justify-between py-6 px-4 min-h-[calc(100vh-5rem)]">
      <div className="space-y-6">
        <div className="px-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#717171]">
            Platform Modules
          </p>
        </div>
        <nav className="space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 shadow-sm'
                      : 'text-[#555555] hover:text-[#222222] hover:bg-[#F7F7F7]'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#EBEBEB] text-xs">
        <div className="flex items-center space-x-2 text-emerald-700 mb-1 font-bold">
          <Shield className="w-4 h-4" />
          <span>Active Persona</span>
        </div>
        <p className="text-[#222222] font-bold capitalize">{role.replace('_', ' ')}</p>
        <p className="text-[11px] text-[#717171] mt-0.5">8 Categories Active</p>
      </div>
    </aside>
  );
};
