import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  User,
  Store,
  Warehouse,
  ClipboardCheck,
  Settings,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ChevronRight
} from 'lucide-react';

export const LoginPage = () => {
  const { login, register, switchRole, user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('quick_role'); // 'quick_role' | 'credentials' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedRole, setSelectedRole] = useState('retail_manager');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoRoles = [
    {
      role: 'retail_manager',
      email: 'retail@foodfresh.io',
      title: 'Retail Store Manager',
      department: 'Store #104 - Fresh Produce',
      icon: Store,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Store freshness KPIs, FEFO batch discounting, real-time inventory synchronization.',
      features: ['Store Freshness Index', 'Dynamic Markdown Trigger', 'FEFO Rotation']
    },
    {
      role: 'food_quality_inspector',
      email: 'inspector@foodfresh.io',
      title: 'Food Safety Inspector',
      department: 'State Agri-Food Safety Board',
      icon: ClipboardCheck,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Formal batch inspection workbench, 3-way lot decisions, tamper-evident PDF certificates.',
      features: ['Lot Compliance Review', 'Official Decision Deck', 'PDF Cert Generator']
    },
    {
      role: 'warehouse_operator',
      email: 'warehouse@foodfresh.io',
      title: 'Warehouse Logistics Operator',
      department: 'Central Cold Logistics Hub',
      icon: Warehouse,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Cold chain climate telemetry, sensor violation threshold alerts, batch receiving.',
      features: ['Multi-Zone Telemetry', 'IoT Sensor Sandbox', 'Cold Chain Alarms']
    },
    {
      role: 'consumer',
      email: 'consumer@foodfresh.io',
      title: 'Consumer (Household)',
      department: 'Household Pantry',
      icon: User,
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      description: 'Household pantry inventory, optical produce scanner, recipe & waste reduction tips.',
      features: ['Camera Freshness Scan', 'Expiry Countdown', 'Waste Savings Tracker']
    },
    {
      role: 'administrator',
      email: 'admin@foodfresh.io',
      title: 'System Administrator',
      department: 'HQ Engineering & Ops',
      icon: Settings,
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'User access control, PyTorch CNN model governance (97.11% accuracy), system audit trails.',
      features: ['Model Governance', 'Role Permissions', 'Security Audit Trail']
    }
  ];

  const handleQuickLogin = async (roleKey) => {
    try {
      setLoading(true);
      setError('');
      await switchRole(roleKey);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to authenticate role');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await register({
        email,
        password,
        full_name: fullName,
        role: selectedRole,
        department
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#222222] flex flex-col justify-between font-sans">
      {/* Airbnb-style Top Bar */}
      <header className="bg-white border-b border-[#EBEBEB] sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-emerald-700">
              FreshGuard<span className="text-[#222222]">AI</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-xs text-[#717171] font-medium">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-100 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              ResNet / CNN 97.11% Acc
            </span>
            <span>·</span>
            <span>8 Food Categories</span>
            <span>·</span>
            <span>IoT Telemetry</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#222222]">
            Food Freshness & Quality Platform
          </h1>
          <p className="text-sm sm:text-base text-[#717171] mt-2">
            Select your persona to access specialized workflows, or sign in with your enterprise credentials.
          </p>

          {/* Clean Segmented Tab Switcher */}
          <div className="inline-flex p-1 bg-[#F0F0F0] rounded-full mt-6 border border-[#E5E5E5] text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('quick_role'); setError(''); }}
              className={`px-5 py-2 rounded-full transition-all ${
                activeTab === 'quick_role'
                  ? 'bg-white text-[#222222] shadow-sm font-bold'
                  : 'text-[#717171] hover:text-[#222222]'
              }`}
            >
              1-Click Role Access
            </button>
            <button
              onClick={() => { setActiveTab('credentials'); setError(''); }}
              className={`px-5 py-2 rounded-full transition-all ${
                activeTab === 'credentials'
                  ? 'bg-white text-[#222222] shadow-sm font-bold'
                  : 'text-[#717171] hover:text-[#222222]'
              }`}
            >
              Enterprise Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError(''); }}
              className={`px-5 py-2 rounded-full transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-[#222222] shadow-sm font-bold'
                  : 'text-[#717171] hover:text-[#222222]'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Quick Role Selection Cards (Airbnb Experience Card Style) */}
        {activeTab === 'quick_role' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {demoRoles.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.role}
                  className="bg-white rounded-2xl border border-[#EBEBEB] p-6 hover:shadow-xl hover:border-emerald-500/50 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
                  onClick={() => handleQuickLogin(item.role)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${item.badgeColor}`}>
                        {item.department}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#222222] group-hover:text-emerald-700 transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#717171] mt-1.5 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#F0F0F0] space-y-1.5">
                      {item.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-[#555555]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#EBEBEB] flex items-center justify-between">
                    <span className="text-xs font-mono text-[#999999]">{item.email}</span>
                    <button
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-[#222222] group-hover:bg-emerald-600 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Enter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Enterprise Email & Password Login */}
        {activeTab === 'credentials' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#EBEBEB] p-8 shadow-lg">
            <h2 className="text-xl font-bold text-[#222222] mb-1">Sign in to FreshGuard</h2>
            <p className="text-xs text-[#717171] mb-6">Enter your authorized email and security credentials.</p>

            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Work Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. retail@foodfresh.io"
                    className="w-full text-xs pl-10 pr-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#999999] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-10 pr-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                  />
                </div>
                <div className="mt-1.5 text-right">
                  <span className="text-[11px] text-emerald-700 hover:underline cursor-pointer">
                    Default demo password: password123
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Create New Account */}
        {activeTab === 'register' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-[#EBEBEB] p-8 shadow-lg">
            <h2 className="text-xl font-bold text-[#222222] mb-1">Create an Account</h2>
            <p className="text-xs text-[#717171] mb-6">Register a new team member with specialized data access permissions.</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Jane Cooper"
                  className="w-full text-xs px-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.cooper@agri-inspect.org"
                  className="w-full text-xs px-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Primary Role Persona</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition bg-white"
                >
                  <option value="retail_manager">Retail Store Manager</option>
                  <option value="food_quality_inspector">Food Safety Inspector</option>
                  <option value="warehouse_operator">Warehouse Logistics Operator</option>
                  <option value="consumer">Consumer (Household)</option>
                  <option value="administrator">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Department / Organization</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Store #104 / Agri Inspection"
                  className="w-full text-xs px-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#222222] mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full text-xs px-3.5 py-3 border border-[#CCCCCC] rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Register & Enter'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Airbnb-style Footer */}
      <footer className="bg-white border-t border-[#EBEBEB] py-6 px-6 text-center text-xs text-[#717171]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 FreshGuard AI Platform · Privacy · Terms · System Specifications</p>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#222222]">
            <span>English (US)</span>
            <span>USD ($)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
