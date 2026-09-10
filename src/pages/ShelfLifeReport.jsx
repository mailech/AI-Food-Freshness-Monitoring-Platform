import { useEffect, useState } from "react";

function ShelfLifeReport() {
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const savedPrediction = localStorage.getItem("latest_prediction");

    if (savedPrediction) {
      setPrediction(JSON.parse(savedPrediction));
    }
  }, []);

  return (
    <div className="report-detail-page">

      <div className="report-detail-header">
        <h1>📅 Shelf-Life Report</h1>

        <p>
          View the estimated remaining shelf life of the latest analyzed food
        </p>
      </div>

      {!prediction ? (
        <div className="no-report-data">

          <div className="no-report-icon">📅</div>

          <h2>No Shelf-Life Data Available</h2>

          <p>
            Upload and analyze a food image from the Dashboard to generate a
            shelf-life report.
          </p>

        </div>
      ) : (
        <div className="freshness-report-card">

          <div className="freshness-main-result">

            <div className="freshness-icon">
              {prediction.foodEmoji}
            </div>

            <p>Food Item</p>

            <h2 className="report-fresh">
              {prediction.foodType}
            </h2>

          </div>

          <div className="freshness-score-section">

            <p>Estimated Remaining Shelf Life</p>

            <div className="freshness-score">
              {prediction.shelfLife || "N/A"}
            </div>

          </div>

          <div className="report-info">

            <div className="report-info-box">
              <span>Food Status</span>

              <strong
                className={
                  prediction.status === "Fresh"
                    ? "report-fresh"
                    : "report-spoiled"
                }
              >
                {prediction.status}
              </strong>
            </div>

            <div className="report-info-box">
              <span>Freshness Score</span>

              <strong>
                {prediction.freshnessScore}/100
              </strong>
            </div>

            <div className="report-info-box">
              <span>AI Confidence</span>

              <strong>
                {prediction.confidence || "N/A"}
              </strong>
            </div>

            <div className="report-info-box recommendation-box">
              <span>Recommendation</span>

              <strong>
                {prediction.recommendation || "N/A"}
              </strong>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default ShelfLifeReport;