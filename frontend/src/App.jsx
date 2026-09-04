import { useContext } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { LayoutDashboard, PackageSearch, ScanFace, LogOut } from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FoodInventory from './pages/FoodInventory';
import ImageAnalysis from './pages/ImageAnalysis';

export default function App() {
  const { token, logout, userRole } = useContext(AuthContext);

  if (!token) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-xl flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-green-600 tracking-tight">FreshSense</h1>
            <p className="text-xs text-gray-400 mt-1">Role: {userRole}</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <Link to="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-700 font-medium transition-colors">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/inventory" className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-700 font-medium transition-colors">
              <PackageSearch size={20} /> Inventory
            </Link>
            <Link to="/analysis" className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 text-gray-600 hover:text-green-700 font-medium transition-colors">
              <ScanFace size={20} /> AI Analysis
            </Link>
          </nav>
          
          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={logout} 
              className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 font-medium transition-colors"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-8">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<FoodInventory />} />
              <Route path="/analysis" element={<ImageAnalysis />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}