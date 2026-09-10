import { useEffect, useState } from "react";

function StorageComplianceReport() {
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [storageScore, setStorageScore] = useState(null);

  useEffect(() => {
    const savedTemperature =
      localStorage.getItem("latest_temperature");

    const savedHumidity =
      localStorage.getItem("latest_humidity");

    const savedStorageScore =
      localStorage.getItem("storage_score");

    if (savedTemperature !== null) {
      setTemperature(Number(savedTemperature));
    }

    if (savedHumidity !== null) {
      setHumidity(Number(savedHumidity));
    }

    if (savedStorageScore !== null) {
      setStorageScore(Number(savedStorageScore));
    }
  }, []);

  const getStorageStatus = () => {
    if (storageScore === null) {
      return "No Data";
    }

    if (storageScore >= 90) {
      return "Good";
    }

    if (storageScore >= 70) {
      return "Warning";
    }

    return "Critical";
  };

  const status = getStorageStatus();

  return (
    <div className="report-detail-page">

      <div className="report-detail-header">
        <h1>🌡️ Storage Compliance Report</h1>

        <p>
          Review the latest temperature, humidity and storage conditions
        </p>
      </div>

      {temperature === null || humidity === null ? (
        <div className="no-report-data">

          <div className="no-report-icon">🌡️</div>

          <h2>No Storage Data Available</h2>

          <p>
            Enter temperature and humidity on the Dashboard and
            perform a freshness prediction to generate this report.
          </p>

        </div>
      ) : (
        <div className="freshness-report-card">

          {/* STORAGE STATUS */}

          <div className="freshness-main-result">

            <div className="freshness-icon">
              {status === "Good"
                ? "✅"
                : status === "Warning"
                ? "⚠️"
                : "🔴"}
            </div>

            <p>Overall Storage Condition</p>

            <h2
              className={
                status === "Good"
                  ? "report-fresh"
                  : status === "Warning"
                  ? "report-warning"
                  : "report-spoiled"
              }
            >
              {status}
            </h2>

          </div>


          {/* STORAGE SCORE */}

          <div className="freshness-score-section">

            <p>Storage Compliance Score</p>

            <div className="freshness-score">
              {storageScore !== null
                ? storageScore
                : "N/A"}

              <span>/100</span>
            </div>

          </div>


          {/* STORAGE INFORMATION */}

          <div className="report-info">

            <div className="report-info-box">

              <span>🌡️ Temperature</span>

              <strong>
                {temperature}°C
              </strong>

            </div>


            <div className="report-info-box">

              <span>💧 Humidity</span>

              <strong>
                {humidity}%
              </strong>

            </div>


            <div className="report-info-box">

              <span>📊 Storage Score</span>

              <strong>
                {storageScore}/100
              </strong>

            </div>


            <div className="report-info-box recommendation-box">

              <span>💡 Storage Recommendation</span>

              <strong>
                {status === "Good"
                  ? "Storage conditions are suitable. Continue maintaining the current conditions."
                  : status === "Warning"
                  ? "Storage conditions need attention. Adjust temperature or humidity if necessary."
                  : "Storage conditions are critical. Take corrective action to protect food quality."}
              </strong>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default StorageComplianceReport;