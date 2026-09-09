import { useState } from "react";
import "./AnalyzeFood.css";

function AnalyzeFood({
  foodItems,
  onSaveAnalysis,
  onHome,
  onDashboard,
  onInventory,
  onAddFood,
  onAnalyze,
  onShelfLife,
  onAlerts,
  onRecommendations,
  onAnalytics,
  onProfile,
}) {
  const [foodType, setFoodType] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [result, setResult] = useState(null);

  // ---------------- IMAGE UPLOAD ----------------

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setAnalyzed(false);
      setResult(null);
    }
  };

  // ---------------- ANALYZE FOOD ----------------

  const handleAnalyze = (e) => {
    e.preventDefault();

    if (!foodType) {
      alert("Please select a food item.");
      return;
    }

    if (!image) {
      alert("Please upload a food image.");
      return;
    }

    /*
      Frontend demonstration only.

      Later this section will be replaced by
      the actual FastAPI + AI model response.
    */

    const isFresh = Math.random() > 0.5;

    let demoResult;

    if (isFresh) {
      if (foodType === "Apple") {
        demoResult = {
          freshness: "Fresh",
          score: 92,
          shelfLife: "5–7 Days",
          status: "Safe to Consume",
          message:
            "The food appears to be in good condition.",
        };
      } else if (foodType === "Banana") {
        demoResult = {
          freshness: "Fresh",
          score: 88,
          shelfLife: "3–5 Days",
          status: "Safe to Consume",
          message:
            "The food appears to be in good condition.",
        };
      } else {
        demoResult = {
          freshness: "Fresh",
          score: 90,
          shelfLife: "5–6 Days",
          status: "Safe to Consume",
          message:
            "The food appears to be in good condition.",
        };
      }
    } else {
      if (foodType === "Apple") {
        demoResult = {
          freshness: "Rotten",
          score: 32,
          shelfLife: "Expired",
          status: "Do Not Consume",
          message:
            "Signs of spoilage were detected.",
        };
      } else if (foodType === "Banana") {
        demoResult = {
          freshness: "Rotten",
          score: 28,
          shelfLife: "Expired",
          status: "Do Not Consume",
          message:
            "Signs of spoilage were detected.",
        };
      } else {
        demoResult = {
          freshness: "Rotten",
          score: 35,
          shelfLife: "Expired",
          status: "Do Not Consume",
          message:
            "Signs of spoilage were detected.",
        };
      }
    }

    setResult(demoResult);
    setAnalyzed(true);

    // Find the latest matching food item from inventory.
    const matchingFoodItems = foodItems.filter(
      (item) => item.foodName === foodType
    );

    const latestFood =
      matchingFoodItems.length > 0
        ? matchingFoodItems[matchingFoodItems.length - 1]
        : null;

    // Save AI result into App state.
    if (onSaveAnalysis) {
      onSaveAnalysis({
        foodId: latestFood ? latestFood.id : null,
        foodName: foodType,
        freshness: demoResult.freshness,
        score: demoResult.score,
        shelfLife: demoResult.shelfLife,
        status: demoResult.status,
        message: demoResult.message,
      });
    }
  };

  const isFreshResult =
    result?.freshness === "Fresh";

  // ---------------- UI ----------------

  return (
    <div className="analyze-page">

      {/* SIDEBAR */}

      <aside className="analyze-sidebar">

        <div className="analyze-logo-section">
          <div className="analyze-logo">
            🍎
          </div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="analyze-nav">

          <button onClick={onDashboard}>
            <span>📊</span>
            Dashboard
          </button>

          <button onClick={onInventory}>
            <span>📦</span>
            Food Inventory
          </button>

          <button
            className="active"
            onClick={onAnalyze}
          >
            <span>📷</span>
            Analyze Food
          </button>

          <button onClick={onShelfLife}>
            <span>⏰</span>
            Shelf Life
          </button>

          <button onClick={onAlerts}>
            <span>🚨</span>
            Alerts
          </button>

          <button onClick={onRecommendations}>
            <span>💡</span>
            Recommendations
          </button>

          <button onClick={onAnalytics}>
            <span>📈</span>
            Analytics
          </button>

          <button onClick={onProfile}>
            <span>👤</span>
            Profile
          </button>

        </nav>

        <div className="analyze-sidebar-bottom">
          <button onClick={onHome}>
            🏠 Back to Home
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="analyze-main">

        <header className="analyze-header">

          <div>
            <p className="analyze-label">
              AI FOOD ANALYSIS
            </p>

            <h1>
              Analyze Food
            </h1>

            <p>
              Upload a food image and let FreshGuard AI
              assess its freshness.
            </p>
          </div>

          <button
            className="analyze-add-btn"
            onClick={onAddFood}
          >
            + Add Food
          </button>

        </header>

        <section className="analyze-content">

          {/* ANALYSIS FORM */}

          <div className="analyze-card">

            <div className="analyze-card-heading">

              <div className="analyze-heading-icon">
                📷
              </div>

              <div>
                <h2>
                  Food Freshness Analysis
                </h2>

                <p>
                  Select the food type and upload
                  its image for analysis.
                </p>
              </div>

            </div>

            <form onSubmit={handleAnalyze}>

              {/* FOOD TYPE */}

              <div className="analyze-form-group">

                <label>
                  Food Item
                </label>

                <select
                  value={foodType}
                  onChange={(e) =>
                    setFoodType(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Select food item
                  </option>

                  <option value="Apple">
                    🍎 Apple
                  </option>

                  <option value="Banana">
                    🍌 Banana
                  </option>

                  <option value="Orange">
                    🍊 Orange
                  </option>
                </select>

                <small>
                  Supported food categories:
                  Apple, Banana and Orange
                </small>

              </div>

              {/* IMAGE */}

              <div className="analyze-form-group">

                <label>
                  Food Image
                </label>

                <label className="upload-box">

                  {!preview ? (
                    <>
                      <div className="upload-icon">
                        ☁️
                      </div>

                      <h3>
                        Upload Food Image
                      </h3>

                      <p>
                        Click to select an image
                        from your device
                      </p>

                      <span>
                        JPG, JPEG or PNG
                      </span>
                    </>
                  ) : (
                    <div className="preview-container">

                      <img
                        src={preview}
                        alt="Food preview"
                      />

                      <div className="preview-text">

                        <strong>
                          {image.name}
                        </strong>

                        <span>
                          Click to change image
                        </span>

                      </div>

                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageChange}
                    hidden
                  />

                </label>

              </div>

              {/* AI INFORMATION */}

              <div className="analysis-info">

                <div className="analysis-info-icon">
                  🤖
                </div>

                <div>

                  <h3>
                    AI Analysis
                  </h3>

                  <p>
                    The AI model will classify the
                    food as Fresh or Rotten and
                    generate a freshness assessment.
                  </p>

                </div>

              </div>

              {/* ANALYZE BUTTON */}

              <button
                type="submit"
                className="start-analysis-btn"
              >
                🔍 Analyze Food
              </button>

            </form>

          </div>

          {/* RESULT */}

          {!analyzed ? (

            <div className="analysis-result-placeholder">

              <div className="result-icon">
                🤖
              </div>

              <h2>
                Analysis Result
              </h2>

              <p>
                Your AI freshness analysis result
                will appear here after uploading and
                analyzing a food image.
              </p>

              <div className="result-features">

                <div>
                  <span>✓</span>
                  <p>
                    Freshness Classification
                  </p>
                </div>

                <div>
                  <span>✓</span>
                  <p>
                    Freshness Score
                  </p>
                </div>

                <div>
                  <span>✓</span>
                  <p>
                    Shelf-Life Prediction
                  </p>
                </div>

              </div>

            </div>

          ) : (

            <div
              className={`analysis-result-card ${
                isFreshResult
                  ? "fresh-result"
                  : "rotten-result"
              }`}
            >

              {/* COMPLETE */}

              <div
                className={`result-success ${
                  isFreshResult
                    ? "success-fresh"
                    : "success-rotten"
                }`}
              >
                <span>
                  {isFreshResult ? "✓" : "!"}
                </span>

                Analysis Complete
              </div>

              {/* IMAGE */}

              <div className="result-food-image">

                <img
                  src={preview}
                  alt="Analyzed food"
                />

              </div>

              {/* FOOD NAME */}

              <div className="result-food-name">

                <span>
                  {foodType === "Apple"
                    ? "🍎"
                    : foodType === "Banana"
                    ? "🍌"
                    : "🍊"}
                </span>

                <h2>
                  {foodType}
                </h2>

              </div>

              {/* FRESHNESS */}

              <div
                className={`freshness-result ${
                  isFreshResult
                    ? "fresh-box"
                    : "rotten-box"
                }`}
              >

                <div className="freshness-icon">
                  {isFreshResult ? "✓" : "!"}
                </div>

                <div>

                  <span>
                    Freshness Classification
                  </span>

                  <strong>
                    {result.freshness}
                  </strong>

                </div>

              </div>

              {/* SCORE */}

              <div className="score-section">

                <div className="score-heading">

                  <span>
                    Freshness Score
                  </span>

                  <strong>
                    {result.score}%
                  </strong>

                </div>

                <div className="score-bar">

                  <div
                    className={`score-fill ${
                      isFreshResult
                        ? "fresh-score"
                        : "rotten-score"
                    }`}
                    style={{
                      width: `${result.score}%`,
                    }}
                  ></div>

                </div>

                <p>
                  {result.message}
                </p>

              </div>

              {/* DETAILS */}

              <div className="result-details">

                <div>

                  <span>⏰</span>

                  <p>
                    Estimated Shelf Life
                  </p>

                  <strong>
                    {result.shelfLife}
                  </strong>

                </div>

                <div>

                  <span>🛡️</span>

                  <p>
                    Food Safety Status
                  </p>

                  <strong>
                    {result.status}
                  </strong>

                </div>

              </div>

              {/* AGAIN */}

              <button
                className="analyze-again-btn"
                onClick={() => {
                  setAnalyzed(false);
                  setResult(null);
                  setImage(null);
                  setPreview(null);
                  setFoodType("");
                }}
              >
                🔄 Analyze Another Food
              </button>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default AnalyzeFood;