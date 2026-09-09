import { useState } from "react";
import "./CommonSidebar.css";

import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import FoodInventory from "./FoodInventory";
import AddFood from "./AddFood";
import AnalyzeFood from "./AnalyzeFood";
import ShelfLife from "./ShelfLife";
import Alerts from "./Alerts";
import Recommendations from "./Recommendations";
import Analytics from "./Analytics";
import Profile from "./Profile";

function App() {
  const [page, setPage] = useState("home");

  const [foodItems, setFoodItems] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);

  const goToHome = () => setPage("home");
  const goToLogin = () => setPage("login");
  const goToRegister = () => setPage("register");
  const goToDashboard = () => setPage("dashboard");
  const goToInventory = () => setPage("inventory");
  const goToAddFood = () => setPage("add-food");
  const goToAnalyze = () => setPage("analyze");
  const goToShelfLife = () => setPage("shelf-life");
  const goToAlerts = () => setPage("alerts");
  const goToRecommendations = () => setPage("recommendations");
  const goToAnalytics = () => setPage("analytics");
  const goToProfile = () => setPage("profile");

  const addFoodItem = (newFood) => {
    const foodWithId = {
      ...newFood,
      id: Date.now(),
      freshness: "Pending AI Analysis",
      score: "--",
      status: "Pending",
      shelfLife: "Pending AI Analysis",
    };

    setFoodItems((currentItems) => [
      ...currentItems,
      foodWithId,
    ]);

    setPage("inventory");
  };

  const deleteFoodItem = (id) => {
    setFoodItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );

    setAnalysisResults((currentResults) =>
      currentResults.filter(
        (item) => item.foodId !== id
      )
    );
  };

  const saveAnalysisResult = (analysis) => {
    const analysisData = {
      ...analysis,
      id: Date.now(),
    };

    setAnalysisResults((currentResults) => [
      analysisData,
      ...currentResults,
    ]);

    if (analysis.foodId) {
      setFoodItems((currentItems) =>
        currentItems.map((item) =>
          item.id === analysis.foodId
            ? {
                ...item,
                freshness: analysis.freshness,
                score: analysis.score,
                shelfLife: analysis.shelfLife,
                status:
                  analysis.freshness === "Fresh"
                    ? "Fresh"
                    : "At Risk",
              }
            : item
        )
      );
    }
  };

  if (page === "home") {
    return (
      <Home
        onStart={goToLogin}
        onLogin={goToLogin}
      />
    );
  }

  if (page === "login") {
    return (
      <Login
        onLogin={goToDashboard}
        onRegister={goToRegister}
        onHome={goToHome}
      />
    );
  }

  if (page === "register") {
    return (
      <Register
        onRegister={goToDashboard}
        onLogin={goToLogin}
        onHome={goToHome}
      />
    );
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        foodItems={foodItems}
        analysisResults={analysisResults}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onInventory={goToInventory}
        onAlerts={goToAlerts}
        onShelfLife={goToShelfLife}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "inventory") {
    return (
      <FoodInventory
        foodItems={foodItems}
        onDeleteFood={deleteFoodItem}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "add-food") {
    return (
      <AddFood
        onSaveFood={addFoodItem}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAnalyze={goToAnalyze}
      />
    );
  }

  if (page === "analyze") {
    return (
      <AnalyzeFood
        foodItems={foodItems}
        onSaveAnalysis={saveAnalysisResult}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "shelf-life") {
    return (
      <ShelfLife
        foodItems={foodItems}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "alerts") {
    return (
      <Alerts
        foodItems={foodItems}
        analysisResults={analysisResults}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "recommendations") {
    return (
      <Recommendations
        foodItems={foodItems}
        analysisResults={analysisResults}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "analytics") {
    return (
      <Analytics
        foodItems={foodItems}
        analysisResults={analysisResults}
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  if (page === "profile") {
    return (
      <Profile
        onHome={goToHome}
        onDashboard={goToDashboard}
        onInventory={goToInventory}
        onAddFood={goToAddFood}
        onAnalyze={goToAnalyze}
        onShelfLife={goToShelfLife}
        onAlerts={goToAlerts}
        onRecommendations={goToRecommendations}
        onAnalytics={goToAnalytics}
        onProfile={goToProfile}
      />
    );
  }

  return null;
}

export default App;