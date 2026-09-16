import { useEffect, useState } from "react";

function FoodQualityInspectorDashboard() {
  const [foodItems, setFoodItems] = useState([]);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const loadInspectorData = async () => {
      try {
        const token = localStorage.getItem("access_token");

        // GET INVENTORY
        const response = await fetch(
          "http://127.0.0.1:8000/food/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setFoodItems(data);
        }

        // GET LATEST AI PREDICTION
        const savedPrediction =
          localStorage.getItem("latest_prediction");

        if (savedPrediction) {
          setPrediction(JSON.parse(savedPrediction));
        }
      } catch (error) {
        console.error(
          "Failed to load inspector dashboard data:",
          error
        );
      }
    };

    loadInspectorData();
  }, []);

  // FRESHNESS CLASSIFICATION
  const getFreshnessCategory = (score) => {
    if (score >= 90) return "Fresh";
    if (score >= 75) return "Good";
    if (score >= 60) return "Acceptable";
    if (score >= 40) return "Near Spoilage";
    return "Spoiled";
  };

  const freshnessCategory = prediction
    ? getFreshnessCategory(
        Number(prediction.freshnessScore || 0)
      )
    : "No Assessment";

  // SPOILAGE PROBABILITY
  const spoilageProbability = prediction
    ? Math.max(
        0,
        100 - Number(prediction.freshnessScore || 0)
      )
    : null;

  return (
    <div className="inspector-dashboard">

      {/* HEADER */}
      <div className="inspector-header">
        <h1>Food Quality Inspector Dashboard</h1>
        <p>
          Assess food quality, freshness, spoilage risk
          and monitor quality reports.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="inspector-stats">

        <div className="inspector-stat-card">
          <h2>{foodItems.length}</h2>
          <p>Inventory Items</p>
        </div>

        <div className="inspector-stat-card">
          <h2>
            {prediction
              ? `${prediction.freshnessScore}/100`
              : "--"}
          </h2>
          <p>Latest Freshness Score</p>
        </div>

        <div className="inspector-stat-card">
          <h2>{freshnessCategory}</h2>
          <p>Quality Classification</p>
        </div>

        <div className="inspector-stat-card">
          <h2>
            {spoilageProbability !== null
              ? `${spoilageProbability}%`
              : "--"}
          </h2>
          <p>Spoilage Probability</p>
        </div>

      </div>

      {/* FRESHNESS ASSESSMENT */}
      <div className="inspector-section">
        <h2>🔍 Freshness Assessment</h2>

        {prediction ? (
          <div className="inspector-assessment">

            <div className="assessment-item">
              <span>Food Item</span>
              <strong>
                {prediction.foodEmoji}{" "}
                {prediction.foodType}
              </strong>
            </div>

            <div className="assessment-item">
              <span>Freshness Status</span>
              <strong>{prediction.status}</strong>
            </div>

            <div className="assessment-item">
              <span>Freshness Score</span>
              <strong>
                {prediction.freshnessScore}/100
              </strong>
            </div>

            <div className="assessment-item">
              <span>Quality Category</span>
              <strong>{freshnessCategory}</strong>
            </div>

            <div className="assessment-item">
              <span>AI Confidence</span>
              <strong>{prediction.confidence}</strong>
            </div>

            <div className="assessment-item">
              <span>Shelf Life</span>
              <strong>{prediction.shelfLife}</strong>
            </div>

          </div>
        ) : (
          <div className="inspector-empty">
            <h3>No Freshness Assessment Available</h3>
            <p>
              Perform a food image analysis from the
              Consumer Dashboard to generate an assessment.
            </p>
          </div>
        )}
      </div>

      {/* SPOILAGE RISK */}
      <div className="inspector-section">
        <h2>⚠️ Spoilage Risk Analysis</h2>

        {prediction ? (
          <div className="risk-box">

            <div className="risk-value">
              {spoilageProbability}%
            </div>

            <div>
              <h3>Spoilage Probability</h3>
              <p>
                {spoilageProbability >= 60
                  ? "High spoilage risk. Immediate quality inspection is recommended."
                  : spoilageProbability >= 30
                  ? "Moderate spoilage risk. Monitor this food item carefully."
                  : "Low spoilage risk. Food quality is currently acceptable."}
              </p>
            </div>

          </div>
        ) : (
          <p>No spoilage assessment available.</p>
        )}
      </div>

      {/* QUALITY REPORT */}
      <div className="inspector-section">
        <h2>📊 Quality Assessment Report</h2>

        {prediction ? (
          <div className="quality-report">

            <div>
              <span>Classification</span>
              <strong>{freshnessCategory}</strong>
            </div>

            <div>
              <span>Freshness Score</span>
              <strong>
                {prediction.freshnessScore}/100
              </strong>
            </div>

            <div>
              <span>AI Confidence</span>
              <strong>{prediction.confidence}</strong>
            </div>

            <div>
              <span>Shelf Life</span>
              <strong>{prediction.shelfLife}</strong>
            </div>

            <div>
              <span>Assessment Date</span>
              <strong>{prediction.date}</strong>
            </div>

          </div>
        ) : (
          <p>No quality report available.</p>
        )}
      </div>

      {/* INVENTORY QUALITY */}
      <div className="inspector-section">
        <h2>📦 Inventory Quality Monitoring</h2>

        {foodItems.length === 0 ? (
          <div className="inspector-empty">
            <p>No inventory items available.</p>
          </div>
        ) : (
          <div className="inspector-inventory-grid">

            {foodItems.map((item) => (
              <div
                className="inspector-inventory-card"
                key={item.food_id}
              >
                <h3>{item.food_name}</h3>

                <p>
                  <strong>Category:</strong>{" "}
                  {item.category}
                </p>

                <p>
                  <strong>Quantity:</strong>{" "}
                  {item.quantity}
                </p>

                <p>
                  <strong>Batch:</strong>{" "}
                  {item.batch_number}
                </p>

                <p>
                  <strong>Expiry:</strong>{" "}
                  {item.expiry_date}
                </p>
              </div>
            ))}

          </div>
        )}
      </div>

    </div>
  );
}

export default FoodQualityInspectorDashboard;