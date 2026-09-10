import { useEffect, useState } from "react";

function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const generateAlerts = async () => {
      const generatedAlerts = [];

      // ================= STORAGE ALERT =================

      const savedTemperature = localStorage.getItem("latest_temperature");
      const savedHumidity = localStorage.getItem("latest_humidity");
      const savedStorageScore = localStorage.getItem("storage_score");

      if (
        savedTemperature !== null &&
        savedHumidity !== null &&
        savedStorageScore !== null
      ) {
        const temperature = Number(savedTemperature);
        const humidity = Number(savedHumidity);
        const storageScore = Number(savedStorageScore);

        if (storageScore < 70) {
          generatedAlerts.push({
            type: "Storage Alert",
            icon: "🌡️",
            title: "Critical Storage Conditions",
            message:
              `Storage conditions need immediate attention. Current temperature is ${temperature}°C and humidity is ${humidity}%.`,
            status: "CRITICAL",
          });
        } else if (storageScore < 90) {
          generatedAlerts.push({
            type: "Storage Alert",
            icon: "🌡️",
            title: "Storage Conditions Need Attention",
            message:
              `Storage conditions are not ideal. Current temperature is ${temperature}°C and humidity is ${humidity}%.`,
            status: "WARNING",
          });
        }
      }

      // ================= FRESHNESS ALERT =================

      const savedPrediction = localStorage.getItem("latest_prediction");

      if (savedPrediction) {
        try {
          const prediction = JSON.parse(savedPrediction);

          if (prediction.status === "Spoiled") {
            generatedAlerts.push({
              type: "Freshness Alert",
              icon: "🥀",
              title: "Food Spoiled",
              message:
                `${prediction.foodType || "The analyzed food"} appears to be spoiled. Do not consume it and remove it safely.`,
              status: "CRITICAL",
            });
          } else if (
            prediction.freshnessScore !== undefined &&
            Number(prediction.freshnessScore) < 70
          ) {
            generatedAlerts.push({
              type: "Freshness Alert",
              icon: "⚠️",
              title: "Food Near Spoilage",
              message:
                `${prediction.foodType || "The analyzed food"} has a low freshness score of ${prediction.freshnessScore}/100. Consider consuming it soon.`,
              status: "WARNING",
            });
          }
        } catch (error) {
          console.error("Failed to read prediction data:", error);
        }
      }

      // ================= EXPIRY ALERT =================

      try {
        const token = localStorage.getItem("access_token");

        if (token) {
          const response = await fetch("http://127.0.0.1:8000/food/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const foodItems = await response.json();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const expiredItems = [];
            const expiringSoonItems = [];

            foodItems.forEach((item) => {
              if (!item.expiry_date) return;

              const expiryDate = new Date(item.expiry_date);
              expiryDate.setHours(0, 0, 0, 0);

              const difference =
                (expiryDate - today) / (1000 * 60 * 60 * 24);

              if (difference < 0) {
                expiredItems.push(item);
              } else if (difference <= 7) {
                expiringSoonItems.push(item);
              }
            });

            if (expiredItems.length > 0) {
              generatedAlerts.push({
                type: "Expiry Alert",
                icon: "📦",
                title: "Food Items Expired",
                message:
                  `${expiredItems.length} inventory item${expiredItems.length > 1 ? "s have" : " has"} expired. Check your inventory and remove the expired food safely.`,
                status: "CRITICAL",
              });
            } else if (expiringSoonItems.length > 0) {
              generatedAlerts.push({
                type: "Expiry Alert",
                icon: "📅",
                title: "Food Expiring Soon",
                message:
                  `${expiringSoonItems.length} inventory item${expiringSoonItems.length > 1 ? "s are" : " is"} approaching the expiry date. Consider using ${expiringSoonItems.length > 1 ? "them" : "it"} soon.`,
                status: "WARNING",
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to load inventory alerts:", error);
      }

      setAlerts(generatedAlerts);
    };

    generateAlerts();
  }, []);

  const criticalCount = alerts.filter(
    (alert) => alert.status === "CRITICAL"
  ).length;

  const warningCount = alerts.filter(
    (alert) => alert.status === "WARNING"
  ).length;

  return (
    <div className="alerts-page">

      {/* ================= HEADER ================= */}

      <div className="alerts-header">
        <h1>🚨 Alerts</h1>

        <p>
          Monitor important food freshness and storage alerts
        </p>
      </div>


      {/* ================= SUMMARY ================= */}

      <div className="alerts-summary">

        <div className="alert-summary-card">
          <h2>{alerts.length}</h2>
          <p>Total Alerts</p>
        </div>

        <div className="alert-summary-card">
          <h2>{criticalCount}</h2>
          <p>Critical</p>
        </div>

        <div className="alert-summary-card">
          <h2>{warningCount}</h2>
          <p>Warnings</p>
        </div>

      </div>


      {/* ================= ALERT LIST ================= */}

      <div className="alerts-list">

        {alerts.length === 0 ? (

          <div className="no-alerts">
            <h2>✅ No Alerts</h2>

            <p>
              There are currently no food freshness or storage alerts.
            </p>
          </div>

        ) : (

          alerts.map((alert, index) => (

            <div
              className={`alert-card alert-${alert.status.toLowerCase()}`}
              key={index}
            >

              <div className="alert-icon">
                {alert.icon}
              </div>

              <div className="alert-content">

                <div className="alert-top">

                  <span className="alert-type">
                    {alert.type}
                  </span>

                  <span className="alert-status">
                    {alert.status}
                  </span>

                </div>

                <h2>{alert.title}</h2>

                <p>{alert.message}</p>

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default Alerts;