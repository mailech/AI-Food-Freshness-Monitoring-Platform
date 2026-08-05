import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Warehouse, 
  Camera, 
  BarChart3, 
  FileSpreadsheet, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Bell, 
  User as UserIcon,
  Leaf
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: string;
  is_read: boolean;
  created_at: string;
}

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, userName, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Error marking read:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'consumer', 'retail_manager', 'warehouse_operator', 'food_inspector'] },
    { name: 'Inventory', path: '/inventory', icon: Warehouse, roles: ['admin', 'consumer', 'retail_manager', 'warehouse_operator', 'food_inspector'] },
    { name: 'Analyze Image', path: '/upload', icon: Camera, roles: ['admin', 'consumer', 'retail_manager', 'warehouse_operator', 'food_inspector'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'consumer', 'retail_manager', 'warehouse_operator', 'food_inspector'] },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet, roles: ['admin', 'retail_manager', 'warehouse_operator', 'food_inspector'] },
    { name: 'Admin Panel', path: '/admin', icon: ShieldAlert, roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'consumer', 'retail_manager', 'warehouse_operator', 'food_inspector'] },
  ];

  const filteredMenuItems = menuItems.filter(item => role && item.roles.includes(role));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Decorative gradient glowing blobs - Premium Aesthetic */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 glass-panel border-r border-slate-700/30 flex flex-col justify-between transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-0'} md:translate-x-0`}>
        
        <div>
          {/* Brand Logo Header */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/60">
            <Leaf className="w-8 h-8 text-emerald-400 stroke-[2]" />
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              FRESH PLATFORM
            </span>
            <button className="md:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Links list */}
          <nav className="p-4 space-y-1.5">
            {filteredMenuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-500/20 to-emerald-500/10 border-l-4 border-indigo-500 text-indigo-400 font-semibold' 
                      : 'hover:bg-slate-800/30 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 flex items-center justify-center text-slate-100 font-bold">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-medium text-sm truncate">{userName || 'Profile'}</h4>
              <p className="text-xs text-slate-500 capitalize">{role || 'User'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Layout container */}
      <div className="flex-1 flex flex-col overflow-x-hidden min-h-screen">
        
        {/* Top Header Navbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/40 glass-panel md:bg-transparent sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold tracking-tight hidden md:block">
              {menuItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Theme mode switcher button */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </button>

            {/* Notifications Alert Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-lg hover:bg-slate-800/30 text-slate-400 hover:text-slate-200 relative transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Notification Overlay Menu */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-3 w-80 glass-panel border border-slate-700/50 rounded-2xl shadow-xl p-4 z-50">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-sm">Alerts & Notifications</h4>
                    <span className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full font-medium">
                      {unreadCount} unread
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-4">No active warnings or alerts.</p>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => markAsRead(n.id)}
                          className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                            n.is_read ? 'bg-slate-800/10 hover:bg-slate-800/20' : 'bg-indigo-500/10 border-l-2 border-indigo-400 hover:bg-indigo-500/20'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${
                              n.channel.includes('Spoilage') ? 'text-red-400' : 'text-indigo-400'
                            }`}>
                              {n.channel}
                            </span>
                            <span className="text-[9px] text-slate-500">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <h5 className="font-semibold text-xs mt-0.5 text-slate-200">{n.title}</h5>
                          <p className="text-slate-400 text-[11px] leading-tight mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Short Profile tag */}
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-400 hidden sm:block">
                Hello, <strong className="text-slate-200 font-semibold">{userName}</strong>
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <UserIcon className="w-4 h-4 text-indigo-400" />
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Page Content Wrapper */}
        <main className="flex-1 p-6 relative z-10 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
};

export default DashboardLayout;
