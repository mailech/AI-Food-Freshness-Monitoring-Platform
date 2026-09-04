import { Activity, AlertTriangle, CheckCircle, Package } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Platform Overview</h2>
        <p className="text-gray-500 mt-1">Real-time insights into your food inventory.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Tracked Items", val: "1,248", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { title: "Optimal Freshness", val: "892", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
          { title: "Near Spoilage", val: "142", icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
          { title: "Spoiled / Waste", val: "24", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className={`p-4 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-600 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-red-800 text-sm">Temperature Spike Detected</p>
                <p className="text-xs text-red-600 mt-1">Warehouse A - Sector 4 exceeded 5°C threshold.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <Activity className="text-amber-600 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Batch #849 Near Expiry</p>
                <p className="text-xs text-amber-600 mt-1">Dairy products dropping below Acceptable freshness.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}