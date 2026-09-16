import { useState, useEffect } from "react";
import {
  FaThermometerHalf,
  FaTint,
  FaWind,
  FaLightbulb,
  FaClock,
  FaLeaf,
} from "react-icons/fa";

function StorageMonitoring() {
  // ================= FOOD TYPE =================

  const [foodType, setFoodType] = useState("Unknown");

  const [temperature, setTemperature] = useState(5);
  const [humidity, setHumidity] = useState(60);

  // ================= LOAD LATEST PREDICTION =================

  useEffect(() => {
    const savedPrediction =
      localStorage.getItem("latest_prediction");

    if (savedPrediction) {
      try {
        const prediction = JSON.parse(savedPrediction);

        if (prediction.foodType) {
          setFoodType(prediction.foodType);
        }
      } catch (error) {
        console.error(
          "Failed to load latest prediction:",
          error
        );
      }
    }
  }, []);

  // ================= FRUIT STORAGE RANGES =================

  const getStorageRange = () => {
    if (foodType === "Apple") {
      return {
        minTemperature: 0,
        maxTemperature: 10,
        minHumidity: 40,
        maxHumidity: 70,
      };
    }

    if (foodType === "Banana") {
      return {
        minTemperature: 12,
        maxTemperature: 18,
        minHumidity: 50,
        maxHumidity: 70,
      };
    }

    if (foodType === "Orange") {
      return {
        minTemperature: 3,
        maxTemperature: 10,
        minHumidity: 40,
        maxHumidity: 70,
      };
    }

    // Default range when no fruit prediction exists
    return {
      minTemperature: 2,
      maxTemperature: 8,
      minHumidity: 40,
      maxHumidity: 70,
    };
  };

  const storageRange = getStorageRange();

  // ================= TEMPERATURE STATUS =================

  const getTemperatureStatus = (value) => {
    const temp = Number(value);

    const min = storageRange.minTemperature;
    const max = storageRange.maxTemperature;

    if (temp >= min && temp <= max) {
      return "GOOD";
    }

    // Warning range slightly outside recommended range
    if (
      temp >= min - 2 &&
      temp < min
    ) {
      return "WARNING";
    }

    if (
      temp > max &&
      temp <= max + 2
    ) {
      return "WARNING";
    }

    return "CRITICAL";
  };

  // ================= HUMIDITY STATUS =================

  const getHumidityStatus = (value) => {
    const hum = Number(value);

    const min = storageRange.minHumidity;
    const max = storageRange.maxHumidity;

    if (hum >= min && hum <= max) {
      return "GOOD";
    }

    if (
      hum >= min - 10 &&
      hum < min
    ) {
      return "WARNING";
    }

    if (
      hum > max &&
      hum <= max + 10
    ) {
      return "WARNING";
    }

    return "CRITICAL";
  };

  const temperatureStatus =
    getTemperatureStatus(temperature);

  const humidityStatus =
    getHumidityStatus(humidity);

  // ================= AIR & LIGHT =================

  // Currently these are fixed because we don't
  // have physical sensors connected yet.

  const airCirculationStatus = "GOOD";
  const lightExposureStatus = "GOOD";

  // ================= PARAMETER SCORES =================

  const getParameterScore = (status) => {
    if (status === "GOOD") {
      return 100;
    }

    if (status === "WARNING") {
      return 70;
    }

    return 40;
  };

  const temperatureScore =
    getParameterScore(temperatureStatus);

  const humidityScore =
    getParameterScore(humidityStatus);

  const airCirculationScore =
    getParameterScore(airCirculationStatus);

  const lightExposureScore =
    getParameterScore(lightExposureStatus);

  // ================= STORAGE SCORE =================

  // Storage Conditions = 25% of final freshness score.
  //
  // Internally the storage score is calculated from:
  //
  // Temperature       = 25%
  // Humidity          = 25%
  // Air Circulation   = 25%
  // Light Exposure    = 25%

  const storageScore = Math.round(
    (
      temperatureScore +
      humidityScore +
      airCirculationScore +
      lightExposureScore
    ) / 4
  );

  // ================= SAVE STORAGE DATA =================

  useEffect(() => {
    localStorage.setItem(
      "latest_temperature",
      String(temperature)
    );

    localStorage.setItem(
      "latest_humidity",
      String(humidity)
    );

    localStorage.setItem(
      "storage_score",
      String(storageScore)
    );
  }, [temperature, humidity, storageScore]);

  // ================= OVERALL STATUS =================

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

  // ================= OVERALL MESSAGE =================

  const getOverallMessage = () => {
    if (foodType === "Unknown") {
      return "Upload and predict a food image first so that fruit-specific storage conditions can be applied.";
    }

    if (overallStatus === "CRITICAL") {
      return `Storage conditions are unsafe for ${foodType}. Adjust the temperature and humidity immediately to protect food quality.`;
    }

    if (overallStatus === "WARNING") {
      return `Storage conditions need attention for ${foodType}. Adjust the environmental conditions to maintain food freshness.`;
    }

    return `Current storage conditions are suitable for maintaining ${foodType} freshness.`;
  };

  // ================= RECOMMENDATION =================

  const getRecommendation = () => {
    if (foodType === "Unknown") {
      return "First upload a food image and predict its freshness. The system will then use fruit-specific storage conditions.";
    }

    if (overallStatus === "CRITICAL") {
      return `Immediately adjust the storage conditions for ${foodType}. Check the temperature and humidity to prevent food spoilage.`;
    }

    if (overallStatus === "WARNING") {
      return `Monitor the storage conditions for ${foodType} closely and adjust temperature or humidity if they move outside the recommended range.`;
    }

    return `Keep ${foodType} within the recommended temperature and humidity range to maintain food quality and extend shelf life.`;
  };

  // ================= STATUS CLASS =================

  const getStatusClass = (status) => {
    if (status === "GOOD") {
      return "status-good";
    }

    if (status === "WARNING") {
      return "status-warning";
    }

    return "status-critical";
  };

  // ================= DISPLAY RANGE =================

  const getTemperatureRangeText = () => {
    return `${storageRange.minTemperature}–${storageRange.maxTemperature}°C`;
  };

  const getHumidityRangeText = () => {
    return `${storageRange.minHumidity}–${storageRange.maxHumidity}%`;
  };

  // ================= UI =================

  return (
    <div className="storage-monitoring-page">

      {/* ================= HEADER ================= */}

      <div className="storage-monitoring-header">

        <div>

          <h1>
            🧊 Storage Monitoring
          </h1>

          <p>
            Monitor and maintain ideal food storage conditions
          </p>

        </div>

      </div>


      {/* ================= DETECTED FOOD ================= */}

      <div className="storage-input-card">

        <h2>
          🍎 Detected Food
        </h2>

        {foodType === "Unknown" ? (

          <p>
            No food prediction available.
            Please predict a food image first.
          </p>

        ) : (

          <div>

            <h2>
              {foodType === "Apple" && "🍎 Apple"}
              {foodType === "Banana" && "🍌 Banana"}
              {foodType === "Orange" && "🍊 Orange"}
            </h2>

            <p>
              Recommended Temperature:
              <strong>
                {" "}
                {getTemperatureRangeText()}
              </strong>
            </p>

            <p>
              Recommended Humidity:
              <strong>
                {" "}
                {getHumidityRangeText()}
              </strong>
            </p>

          </div>

        )}

      </div>


      {/* ================= INPUT SECTION ================= */}

      <div className="storage-input-card">

        <h2>
          Enter Current Storage Conditions
        </h2>

        <div className="storage-condition-inputs">

          {/* Temperature */}

          <div className="storage-condition-field">

            <label>
              Temperature (°C)
            </label>

            <input
              type="number"
              value={temperature}
              onChange={(e) =>
                setTemperature(e.target.value)
              }
              placeholder="Enter temperature"
            />

          </div>


          {/* Humidity */}

          <div className="storage-condition-field">

            <label>
              Humidity (%)
            </label>

            <input
              type="number"
              value={humidity}
              onChange={(e) =>
                setHumidity(e.target.value)
              }
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

            <h3>
              Temperature
            </h3>

            <h2>
              {temperature}°C
            </h2>

            <span
              className={`monitor-status ${getStatusClass(
                temperatureStatus
              )}`}
            >
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

            <h3>
              Humidity
            </h3>

            <h2>
              {humidity}%
            </h2>

            <span
              className={`monitor-status ${getStatusClass(
                humidityStatus
              )}`}
            >
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

            <h3>
              Air Circulation
            </h3>

            <h2>
              Good
            </h2>

            <span
              className={`monitor-status ${getStatusClass(
                airCirculationStatus
              )}`}
            >
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

            <h3>
              Light Exposure
            </h3>

            <h2>
              Low
            </h2>

            <span
              className={`monitor-status ${getStatusClass(
                lightExposureStatus
              )}`}
            >
              {lightExposureStatus}
            </span>

          </div>

        </div>

      </div>


      {/* ================= STORAGE SCORE ================= */}

      <div className="storage-duration-card">

        <div className="duration-icon">

          <FaLeaf />

        </div>

        <div>

          <h3>
            Storage Score
          </h3>

          <h2>
            {storageScore}/100
          </h2>

        </div>

      </div>


      {/* ================= STORAGE DURATION ================= */}

      <div className="storage-duration-card">

        <div className="duration-icon">

          <FaClock />

        </div>

        <div>

          <h3>
            Storage Duration
          </h3>

          <h2>
            3 Days
          </h2>

        </div>

      </div>


      {/* ================= OVERALL STATUS ================= */}

      <div
        className={`storage-status-card ${getStatusClass(
          overallStatus
        )}`}
      >

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