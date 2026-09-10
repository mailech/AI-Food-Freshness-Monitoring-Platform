import { useEffect, useState } from "react";

function WasteReductionReport() {
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
        <h1>♻️ Waste Reduction Report</h1>
        <p>
          Identify food spoilage and take actions to reduce food waste
        </p>
      </div>

      {!prediction ? (
        <div className="no-report-data">
          <div className="no-report-icon">♻️</div>

          <h2>No Waste Reduction Data Available</h2>

          <p>
            Upload and analyze a food image from the Dashboard to
            generate a waste reduction report.
          </p>
        </div>
      ) : (
        <div className="freshness-report-card">

          <div className="freshness-main-result">
            <div className="freshness-icon">
              {prediction.foodEmoji}
            </div>

            <p>Analyzed Food</p>

            <h2
              className={
                prediction.status === "Fresh"
                  ? "report-fresh"
                  : "report-spoiled"
              }
            >
              {prediction.foodType}
            </h2>
          </div>

          <div className="freshness-score-section">
            <p>Food Status</p>

            <div className={prediction.status === "Fresh" ? "status-fresh" : "status-spoiled"}>
  {prediction.status}
</div>
          </div>

          <div className="report-info">

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

            <div className="report-info-box">
              <span>Shelf Life</span>
              <strong>
                {prediction.shelfLife || "N/A"}
              </strong>
            </div>

            <div className="report-info-box recommendation-box">
              <span>♻️ Waste Reduction Action</span>

              <strong
  className={
    prediction.status === "Fresh"
      ? "status-fresh"
      : "status-spoiled"
  }
>
  {prediction.status === "Fresh"
    ? "Food is currently fresh. Store it properly and consume it before the estimated shelf life ends to avoid unnecessary waste."
    : "The food appears to be spoiled. Do not consume it. Remove it safely and check storage conditions to help prevent future food waste."}
</strong>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default WasteReductionReport;