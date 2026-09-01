import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/Layout/Sidebar";
import { TopBar } from "./components/Layout/TopBar";

// Pages
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { FoodAnalysis } from "./pages/FoodAnalysis";
import { ShelfLife } from "./pages/ShelfLife";
import { StorageMonitoring } from "./pages/StorageMonitoring";
import { Recommendations } from "./pages/Recommendations";
import { Alerts } from "./pages/Alerts";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { FoodDetail } from "./pages/FoodDetail";

const MainContent = () => {
  const { isAuthenticated } = useAuth();
  const [authView, setAuthView] = useState("login"); // "login", "register", "forgot"

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");

  // Handle unauthenticated views
  if (!isAuthenticated) {
    if (authView === "register") {
      return <Register onNavigateLogin={() => setAuthView("login")} />;
    }
    if (authView === "forgot") {
      return <ForgotPassword onNavigateLogin={() => setAuthView("login")} />;
    }
    return (
      <Login
        onNavigateRegister={() => setAuthView("register")}
        onNavigateForgot={() => setAuthView("forgot")}
      />
    );
  }

  // Navigation handlers
  const handleSelectFood = (item) => {
    setSelectedFoodItem(item);
    setActiveTab("food_detail");
  };

  const handleGlobalSearch = (query) => {
    setGlobalSearch(query);
    if (activeTab !== "inventory") {
      setActiveTab("inventory");
    }
  };

  const renderActivePage = () => {
    if (activeTab === "food_detail") {
      return (
        <FoodDetail
          item={selectedFoodItem}
          onBack={() => setActiveTab("inventory")}
          onNavigateAnalysis={() => setActiveTab("analysis")}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectFoodItem={handleSelectFood}
          />
        );
      case "inventory":
        return (
          <Inventory
            onSelectFoodItem={handleSelectFood}
            initialSearch={globalSearch}
          />
        );
      case "analysis":
        return <FoodAnalysis onNavigateInventory={() => setActiveTab("inventory")} />;
      case "shelflife":
        return <ShelfLife onSelectFoodItem={handleSelectFood} />;
      case "storage":
        return <StorageMonitoring />;
      case "recommendations":
        return <Recommendations />;
      case "alerts":
        return <Alerts onSelectFoodItem={handleSelectFood} />;
      case "reports":
        return <Reports />;
      case "settings":
        return <Settings />;
      default:
        return (
          <Dashboard
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectFoodItem={handleSelectFood}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedFoodItem(null);
          setActiveTab(tab);
        }}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <TopBar
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onNavigateAlerts={() => setActiveTab("alerts")}
          onSearch={handleGlobalSearch}
          searchQuery={globalSearch}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
