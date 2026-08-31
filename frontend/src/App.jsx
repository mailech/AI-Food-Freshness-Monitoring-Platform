import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Inventory from "./Inventory";

import "./App.css";


function Dashboard() {
  const [activePage, setActivePage] = useState("Dashboard");

  const menuItems = [
    { name: "Dashboard", icon: "▦" },
    { name: "Analyze Food", icon: "⌁" },
    { name: "Inventory", icon: "▤" },
    { name: "Food Batches", icon: "▥" },
    { name: "Freshness History", icon: "◷" },
    { name: "Recommendations", icon: "✦" },
    { name: "Alerts", icon: "⚠" },
    { name: "Reports", icon: "▥" },
    { name: "Settings", icon: "⚙" },
  ];

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setAnalysisResult(null);
  };


  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert("Please select a food image first.");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Analysis failed"
        );
      }

      setAnalysisResult(data.result);

    } catch (error) {
      console.error("Analysis error:", error);

      alert(
        "Unable to analyze image. Please make sure the backend is running."
      );

    } finally {
      setAnalyzing(false);
    }
  };


  const Sidebar = () => (
    <aside className="sidebar">

      <div className="logo">
        <div className="logo-icon">F</div>

        <div>
          <h2>FoodFresh</h2>
          <span>AI PLATFORM</span>
        </div>
      </div>


      <div className="menu-title">
        MAIN MENU
      </div>


      <nav>
        {menuItems.map((item) => (
          <button
            key={item.name}
            className={`menu-item ${
              activePage === item.name
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage(item.name)
            }
          >
            <span className="menu-icon">
              {item.icon}
            </span>

            <span>{item.name}</span>
          </button>
        ))}
      </nav>


      <div className="sidebar-bottom">

        <div className="system-status">

          <span className="status-dot"></span>

          <div>
            <strong>System Status</strong>
            <small>
              All systems operational
            </small>
          </div>

        </div>


        <div className="user-box">

          <div className="avatar">
            N
          </div>

          <div>
            <strong>Nanditha</strong>
            <small>Administrator</small>
          </div>

          <span>⋮</span>

        </div>

      </div>

    </aside>
  );


  const TopBar = () => (
    <header className="topbar">

      <div className="search-box">

        <span>⌕</span>

        <input
          type="text"
          placeholder="Search analytics, batches, or reports..."
        />

      </div>


      <div className="top-actions">

        <button className="notification">
          🔔
          <span className="notification-dot"></span>
        </button>

        <button className="help-button">
          ?
        </button>


        <div className="profile">

          <div className="avatar small">
            N
          </div>

          <div>
            <strong>Nanditha</strong>
            <small>Admin</small>
          </div>

          <span>⌄</span>

        </div>

      </div>

    </header>
  );


  if (activePage === "Inventory") {

    return (
      <div className="app">

        <Sidebar />

        <main className="main">

          <TopBar />

          <section className="content">

            <Inventory />

          </section>

        </main>

      </div>
    );
  }


  return (
    <div className="app">

      <Sidebar />


      <main className="main">

        <TopBar />


        <section className="content">


          {/* DASHBOARD */}

          {activePage === "Dashboard" && (
            <>

              <div className="page-heading">

                <div>

                  <h1>
                    Food Freshness Dashboard
                  </h1>

                  <p>
                    Track food quality, freshness
                    and shelf-life predictions.
                  </p>

                </div>


                <div className="date-filter">
                  Last 30 days ▾
                </div>

              </div>


              {/* STAT CARDS */}

              <div className="stats-grid">

                <div className="stat-card">

                  <div className="stat-top">
                    <span>Total Food Items</span>
                    <div className="stat-icon">
                      ▦
                    </div>
                  </div>

                  <h2>1,284</h2>

                  <div className="stat-change positive">
                    ↑ 4.2%
                    <span>
                      from last month
                    </span>
                  </div>

                </div>


                <div className="stat-card">

                  <div className="stat-top">
                    <span>Fresh Items</span>

                    <div className="stat-icon fresh">
                      ✓
                    </div>
                  </div>

                  <h2 className="fresh-text">
                    1,042
                  </h2>

                  <div className="stat-change positive">
                    ↑ 8.1%
                    <span>
                      of inventory
                    </span>
                  </div>

                </div>


                <div className="stat-card warning-card">

                  <div className="stat-top">

                    <span>
                      Near Spoilage
                    </span>

                    <div className="stat-icon warning">
                      !
                    </div>

                  </div>

                  <h2 className="warning-text">
                    42
                  </h2>

                  <div className="stat-change warning-change">
                    Requires priority action
                  </div>

                </div>


                <div className="stat-card">

                  <div className="stat-top">

                    <span>
                      Spoiled Items
                    </span>

                    <div className="stat-icon danger">
                      ×
                    </div>

                  </div>

                  <h2 className="danger-text">
                    08
                  </h2>

                  <div className="stat-change danger-change">
                    ↓ 12.4%
                    <span>
                      waste reduction
                    </span>
                  </div>

                </div>


                <div className="stat-card score-card">

                  <div className="stat-top">

                    <span>
                      Avg. Freshness
                    </span>

                    <div className="score-icon">
                      ◉
                    </div>

                  </div>

                  <h2>
                    92<span>/100</span>
                  </h2>

                  <div className="progress">
                    <div className="progress-fill"></div>
                  </div>

                  <small>
                    Excellent overall quality
                  </small>

                </div>

              </div>


              {/* CHARTS */}

              <div className="charts-grid">


                <div className="panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        Freshness Distribution
                      </h3>

                      <p>
                        Current inventory quality
                      </p>

                    </div>

                    <button>
                      •••
                    </button>

                  </div>


                  <div className="distribution">

                    <div className="donut">

                      <div className="donut-center">

                        <strong>
                          84%
                        </strong>

                        <span>
                          OPTIMAL
                        </span>

                      </div>

                    </div>


                    <div className="legend">

                      <div>
                        <span className="legend-dot fresh-dot"></span>
                        Fresh
                        <strong>62%</strong>
                      </div>

                      <div>
                        <span className="legend-dot good-dot"></span>
                        Good
                        <strong>22%</strong>
                      </div>

                      <div>
                        <span className="legend-dot acceptable-dot"></span>
                        Acceptable
                        <strong>10%</strong>
                      </div>

                      <div>
                        <span className="legend-dot spoiled-dot"></span>
                        Spoiled
                        <strong>6%</strong>
                      </div>

                    </div>

                  </div>

                </div>


                <div className="panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        Freshness Trend
                      </h3>

                      <p>
                        Average score over time
                      </p>

                    </div>

                    <select>

                      <option>
                        Last 7 days
                      </option>

                      <option>
                        Last 30 days
                      </option>

                    </select>

                  </div>


                  <div className="bar-chart">

                    <div
                      className="bar"
                      style={{ height: "48%" }}
                    >
                      <span>88</span>
                    </div>

                    <div
                      className="bar"
                      style={{ height: "55%" }}
                    >
                      <span>89</span>
                    </div>

                    <div
                      className="bar"
                      style={{ height: "51%" }}
                    >
                      <span>88</span>
                    </div>

                    <div
                      className="bar"
                      style={{ height: "62%" }}
                    >
                      <span>90</span>
                    </div>

                    <div
                      className="bar"
                      style={{ height: "68%" }}
                    >
                      <span>91</span>
                    </div>

                    <div
                      className="bar"
                      style={{ height: "76%" }}
                    >
                      <span>92</span>
                    </div>

                    <div
                      className="bar active-bar"
                      style={{ height: "85%" }}
                    >
                      <span>94</span>
                    </div>

                  </div>


                  <div className="chart-labels">

                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>

                  </div>

                </div>

              </div>


              {/* ANALYSIS + RECOMMENDATIONS */}

              <div className="lower-grid">


                <div className="panel analysis-panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        Analyze Food Freshness
                      </h3>

                      <p>
                        Upload a food image to
                        estimate freshness and
                        remaining shelf life.
                      </p>

                    </div>

                    <span className="model-badge">
                      AI MODEL v1.0
                    </span>

                  </div>


                  <div className="analysis-content">


                    <div className="upload-area">

                      {!preview ? (

                        <>

                          <div className="upload-icon">
                            ↑
                          </div>

                          <h4>
                            Upload Food Sample
                          </h4>

                          <p>
                            Drag and drop an image
                            here or browse from your
                            device.
                          </p>

                          <label className="browse-button">

                            Browse Image

                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              hidden
                            />

                          </label>

                        </>

                      ) : (

                        <>

                          <img
                            src={preview}
                            alt="Selected food"
                            className="food-preview-small"
                          />

                          <p className="selected-name">
                            {selectedFile?.name}
                          </p>


                          <button
                            className="analyze-button"
                            onClick={handleAnalyze}
                            disabled={analyzing}
                          >

                            {analyzing
                              ? "⏳ Analyzing..."
                              : "🔍 Analyze Freshness"
                            }

                          </button>

                        </>

                      )}

                    </div>


                    {/* RESULT */}

                    <div className="result-card">

                      {analysisResult ? (

                        <>

                          <div className="result-top">

                            <span className="fresh-badge">
                              ●{" "}
                              {analysisResult.freshness?.toUpperCase()}
                            </span>

                            <span>
                              {analysisResult.confidence}% confidence
                            </span>

                          </div>


                          <h2>
                            {analysisResult.food}
                          </h2>


                          <div className="result-info">

                            <div>

                              <span>
                                FRESHNESS
                              </span>

                              <strong className="fresh-text">
                                {analysisResult.freshness_score}/100
                              </strong>

                            </div>


                            <div>

                              <span>
                                SHELF LIFE
                              </span>

                              <strong>
                                {analysisResult.shelf_life}
                              </strong>

                            </div>

                          </div>


                          <div className="result-bar">

                            <div
                              style={{
                                width:
                                  `${analysisResult.freshness_score}%`,
                              }}
                            ></div>

                          </div>


                          <small>
                            {analysisResult.recommendation}
                          </small>

                        </>

                      ) : (

                        <>

                          <div className="result-top">

                            <span className="fresh-badge">
                              ● FRESH
                            </span>

                            <span>
                              98.4% confidence
                            </span>

                          </div>


                          <h2>
                            Gala Apple
                          </h2>


                          <div className="result-info">

                            <div>

                              <span>
                                FRESHNESS
                              </span>

                              <strong className="fresh-text">
                                94/100
                              </strong>

                            </div>


                            <div>

                              <span>
                                SHELF LIFE
                              </span>

                              <strong>
                                ~7 Days
                              </strong>

                            </div>

                          </div>


                          <div className="result-bar">
                            <div></div>
                          </div>


                          <small>
                            Upload and analyze a food
                            image to update this result.
                          </small>

                        </>

                      )}

                    </div>

                  </div>

                </div>


                {/* RECOMMENDATIONS */}

                <div className="panel recommendation-panel">

                  <div className="panel-header">

                    <div>

                      <h3>
                        AI Recommendations
                      </h3>

                      <p>
                        Smart actions to reduce
                        food waste
                      </p>

                    </div>

                    <span className="ai-star">
                      ✦
                    </span>

                  </div>


                  <div className="recommendation">

                    <span className="priority">
                      HIGH PRIORITY
                    </span>

                    <h4>
                      Process Bananas Soon
                    </h4>

                    <p>
                      Batch B-2018 has several
                      over-ripe bananas. Consider
                      processing them into smoothies
                      or bakery products.
                    </p>

                  </div>


                  <div className="recommendation">

                    <span className="priority logistics">
                      LOGISTICS
                    </span>

                    <h4>
                      Cooling Optimization
                    </h4>

                    <p>
                      Shelf 04 currently maintains
                      6°C. Lowering it to 4°C may
                      extend shelf life.
                    </p>

                  </div>


                  <div className="waste-box">

                    <strong>
                      ♻ Waste Prevented
                    </strong>

                    <p>
                      Your monitoring system has
                      saved an estimated 42kg of
                      potential food waste this week.
                    </p>

                  </div>

                </div>

              </div>


              {/* RECENT ANALYSIS */}

              <div className="panel recent-panel">

                <div className="panel-header">

                  <div>

                    <h3>
                      Recent Food Analysis
                    </h3>

                    <p>
                      Latest freshness assessments
                    </p>

                  </div>

                  <button className="view-all">
                    View All →
                  </button>

                </div>


                <div className="table-wrapper">

                  <table>

                    <thead>

                      <tr>

                        <th>Food Item</th>
                        <th>Category</th>
                        <th>Freshness</th>
                        <th>Score</th>
                        <th>Shelf Life</th>
                        <th>Analyzed</th>

                      </tr>

                    </thead>


                    <tbody>

                      <tr>

                        <td>
                          🍎 Gala Apple
                        </td>

                        <td>
                          Fruit
                        </td>

                        <td>
                          <span className="table-badge fresh-badge">
                            Fresh
                          </span>
                        </td>

                        <td>
                          94/100
                        </td>

                        <td>
                          7 Days
                        </td>

                        <td>
                          Today
                        </td>

                      </tr>


                      <tr>

                        <td>
                          🍌 Banana
                        </td>

                        <td>
                          Fruit
                        </td>

                        <td>
                          <span className="table-badge warning-badge">
                            Near Spoilage
                          </span>
                        </td>

                        <td>
                          58/100
                        </td>

                        <td>
                          1 Day
                        </td>

                        <td>
                          Today
                        </td>

                      </tr>


                      <tr>

                        <td>
                          🥛 Milk
                        </td>

                        <td>
                          Dairy
                        </td>

                        <td>
                          <span className="table-badge fresh-badge">
                            Fresh
                          </span>
                        </td>

                        <td>
                          91/100
                        </td>

                        <td>
                          5 Days
                        </td>

                        <td>
                          Yesterday
                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

            </>
          )}


          {/* ANALYZE FOOD PAGE */}

          {activePage === "Analyze Food" && (

            <div className="panel analysis-panel">

              <div className="panel-header">

                <div>

                  <h1>
                    Analyze Food
                  </h1>

                  <p>
                    Upload a food image for AI
                    freshness analysis.
                  </p>

                </div>

                <span className="model-badge">
                  AI MODEL v1.0
                </span>

              </div>


              <div className="analysis-content">

                <div className="upload-area">

                  {!preview ? (

                    <>

                      <div className="upload-icon">
                        ↑
                      </div>

                      <h4>
                        Upload Food Sample
                      </h4>

                      <p>
                        Select an image from your device.
                      </p>

                      <label className="browse-button">

                        Browse Image

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          hidden
                        />

                      </label>

                    </>

                  ) : (

                    <>

                      <img
                        src={preview}
                        alt="Selected food"
                        className="food-preview-small"
                      />

                      <p className="selected-name">
                        {selectedFile?.name}
                      </p>

                      <button
                        className="analyze-button"
                        onClick={handleAnalyze}
                        disabled={analyzing}
                      >

                        {analyzing
                          ? "⏳ Analyzing..."
                          : "🔍 Analyze Freshness"
                        }

                      </button>

                    </>

                  )}

                </div>


                <div className="result-card">

                  {analysisResult ? (

                    <>

                      <div className="result-top">

                        <span className="fresh-badge">
                          ●{" "}
                          {analysisResult.freshness?.toUpperCase()}
                        </span>

                        <span>
                          {analysisResult.confidence}% confidence
                        </span>

                      </div>

                      <h2>
                        {analysisResult.food}
                      </h2>

                      <div className="result-info">

                        <div>
                          <span>
                            FRESHNESS
                          </span>

                          <strong className="fresh-text">
                            {analysisResult.freshness_score}/100
                          </strong>
                        </div>

                        <div>
                          <span>
                            SHELF LIFE
                          </span>

                          <strong>
                            {analysisResult.shelf_life}
                          </strong>
                        </div>

                      </div>

                      <div className="result-bar">

                        <div
                          style={{
                            width:
                              `${analysisResult.freshness_score}%`,
                          }}
                        ></div>

                      </div>

                      <small>
                        {analysisResult.recommendation}
                      </small>

                    </>

                  ) : (

                    <>

                      <div className="result-top">

                        <span className="fresh-badge">
                          ● FRESH
                        </span>

                        <span>
                          Waiting for analysis
                        </span>

                      </div>

                      <h2>
                        Food Analysis
                      </h2>

                      <small>
                        Upload an image and click
                        Analyze Freshness.
                      </small>

                    </>

                  )}

                </div>

              </div>

            </div>
          )}


          {/* OTHER PAGES */}

          {[
            "Food Batches",
            "Freshness History",
            "Recommendations",
            "Alerts",
            "Reports",
            "Settings",
          ].includes(activePage) && (

            <div className="panel">

              <h1>
                {activePage}
              </h1>

              <p>
                This module is ready for development.
                We will connect it to the backend
                after the ML dataset integration.
              </p>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}


/* ROUTING */

function App() {

  return (

    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}


export default App;