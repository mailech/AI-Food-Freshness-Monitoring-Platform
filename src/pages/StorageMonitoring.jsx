import { useState } from "react";
import {
  FaThermometerHalf,
  FaTint,
  FaWind,
  FaLightbulb,
  FaClock,
  FaLeaf,
} from "react-icons/fa";

function StorageMonitoring() {
  const [temperature, setTemperature] = useState(5);
  const [humidity, setHumidity] = useState(60);

  // Temperature status
  const getTemperatureStatus = (value) => {
    const temp = Number(value);

    if (temp >= 2 && temp <= 8) {
      return "GOOD";
    }

    if ((temp >= 0 && temp < 2) || (temp > 8 && temp <= 12)) {
      return "WARNING";
    }

    return "CRITICAL";
  };

  // Humidity status
  const getHumidityStatus = (value) => {
    const hum = Number(value);

    if (hum >= 40 && hum <= 70) {
      return "GOOD";
    }

    if ((hum >= 30 && hum < 40) || (hum > 70 && hum <= 80)) {
      return "WARNING";
    }

    return "CRITICAL";
  };

  const temperatureStatus = getTemperatureStatus(temperature);
  const humidityStatus = getHumidityStatus(humidity);

  // Air circulation
  const airCirculationStatus = "GOOD";

  // Light exposure
  const lightExposureStatus = "GOOD";

  // Overall storage condition
  const getOverallStatus = () => {
    const statuses = [
      temperatureStatus,
      humidityStatus,
      airCirculationStatus,
      lightExposureStatus,
    ];

    if (statuses.includes("CRITICAL")) {
      return "CRITICAL";
    }

    if (statuses.includes("WARNING")) {
      return "WARNING";
    }

    return "GOOD";
  };

  const overallStatus = getOverallStatus();

  // Overall message
  const getOverallMessage = () => {
    if (overallStatus === "CRITICAL") {
      return "Storage conditions are unsafe. Adjust the temperature and humidity immediately to protect food quality.";
    }

    if (overallStatus === "WARNING") {
      return "Storage conditions need attention. Adjust the environmental conditions to maintain food freshness.";
    }

    return "Current storage conditions are suitable for maintaining food freshness.";
  };

  // Recommendation
  const getRecommendation = () => {
    if (overallStatus === "CRITICAL") {
      return "Immediately adjust the temperature and humidity to the recommended range. Check the storage environment to prevent food spoilage.";
    }

    if (overallStatus === "WARNING") {
      return "Monitor the storage conditions closely and adjust temperature or humidity if they move outside the recommended range.";
    }

    return "Keep the temperature and humidity within the recommended range to maintain food quality and extend shelf life.";
  };

  // Status class
  const getStatusClass = (status) => {
    if (status === "GOOD") {
      return "status-good";
    }

    if (status === "WARNING") {
      return "status-warning";
    }

    return "status-critical";
  };

  return (
    <div className="storage-monitoring-page">

      {/* ================= HEADER ================= */}

      <div className="storage-monitoring-header">
        <div>
          <h1>🧊 Storage Monitoring</h1>
          <p>
            Monitor and maintain ideal food storage conditions
          </p>
        </div>
      </div>


      {/* ================= INPUT SECTION ================= */}

      <div className="storage-input-card">

        <h2>Enter Storage Conditions</h2>

        <div className="storage-condition-inputs">

          {/* Temperature Input */}

          <div className="storage-condition-field">

            <label>
              Temperature (°C)
            </label>

            <input
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="Enter temperature"
            />

          </div>


          {/* Humidity Input */}

          <div className="storage-condition-field">

            <label>
              Humidity (%)
            </label>

            <input
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="Enter humidity"
            />

          </div>

        </div>

      </div>


      {/* ================= MONITORING CARDS ================= */}

      <div className="storage-monitoring-grid">


        {/* Temperature */}

        <div className="monitor-card">

          <div className="monitor-icon">
            <FaThermometerHalf />
          </div>

          <div className="monitor-content">

            <h3>Temperature</h3>

            <h2>{temperature}°C</h2>

            <span className={`monitor-status ${getStatusClass(temperatureStatus)}`}>
              {temperatureStatus}
            </span>

          </div>

        </div>


        {/* Humidity */}

        <div className="monitor-card">

          <div className="monitor-icon">
            <FaTint />
          </div>

          <div className="monitor-content">

            <h3>Humidity</h3>

            <h2>{humidity}%</h2>

            <span className={`monitor-status ${getStatusClass(humidityStatus)}`}>
              {humidityStatus}
            </span>

          </div>

        </div>


        {/* Air Circulation */}

        <div className="monitor-card">

          <div className="monitor-icon">
            <FaWind />
          </div>

          <div className="monitor-content">

            <h3>Air Circulation</h3>

            <h2>Good</h2>

            <span className={`monitor-status ${getStatusClass(airCirculationStatus)}`}>
              {airCirculationStatus}
            </span>

          </div>

        </div>


        {/* Light Exposure */}

        <div className="monitor-card">

          <div className="monitor-icon">
            <FaLightbulb />
          </div>

          <div className="monitor-content">

            <h3>Light Exposure</h3>

            <h2>Low</h2>

            <span className={`monitor-status ${getStatusClass(lightExposureStatus)}`}>
              {lightExposureStatus}
            </span>

          </div>

        </div>

      </div>


      {/* ================= STORAGE DURATION ================= */}

      <div className="storage-duration-card">

        <div className="duration-icon">
          <FaClock />
        </div>

        <div>

          <h3>Storage Duration</h3>

          <h2>3 Days</h2>

        </div>

      </div>


      {/* ================= OVERALL STATUS ================= */}

      <div className={`storage-status-card ${getStatusClass(overallStatus)}`}>

        <FaLeaf className="status-leaf" />

        <div>

          <h2>
            Storage Condition: {overallStatus}
          </h2>

          <p>
            {getOverallMessage()}
          </p>

        </div>

      </div>


      {/* ================= RECOMMENDATION ================= */}

      <div className="storage-recommendation">

        <h2>
          💡 Storage Recommendation
        </h2>

        <p>
          {getRecommendation()}
        </p>

      </div>

    </div>
  );
}

export default StorageMonitoring;