import { useState, useEffect } from "react";
import {
  FaLeaf,
  FaBell,
  FaUserCircle,
  FaCloudUploadAlt,
  FaTimes,
  FaCheckCircle,
  FaEdit,
  FaSave,
  FaRedo,
} from "react-icons/fa";
import "../App.css";

function Dashboard() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");

  // ================= PREDICTION HISTORY =================

  const [predictionHistory, setPredictionHistory] = useState(() => {
    try {
      const savedHistory = localStorage.getItem("prediction_history");
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to load prediction history:", error);
      return [];
    }
  });

  // ================= USER PROFILE =================

  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // ================= FETCH PROFILE =================

  const fetchProfile = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("Please login first.");
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();

      setProfile(data);
      setEditName(data.name);
      setEditEmail(data.email);
    } catch (error) {
      console.error("Profile error:", error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ================= SELECT IMAGE =================

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      const imageURL = URL.createObjectURL(file);

      setSelectedFile(file);
      setSelectedImage(imageURL);
      setPrediction(null);

      setTemperature("");
      setHumidity("");
    }
  };

  // ================= PREDICTION =================

  const handlePrediction = async () => {
    if (!selectedFile) {
      alert("Please select an image first.");
      return;
    }

    if (temperature === "" || humidity === "") {
      alert(
        "Please enter temperature and humidity before predicting."
      );
      return;
    }

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch(
        "http://127.0.0.1:8000/predict/",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Prediction failed"
        );
      }

      // ================= FOOD TYPE =================

      let foodType = "Food";
      let foodEmoji = "🍽️";

      if (data.prediction.includes("apple")) {
        foodType = "Apple";
        foodEmoji = "🍎";
      } else if (data.prediction.includes("banana")) {
        foodType = "Banana";
        foodEmoji = "🍌";
      } else if (data.prediction.includes("orange")) {
        foodType = "Orange";
        foodEmoji = "🍊";
      }

      // ================= STATUS =================

      const status = data.prediction.includes("fresh")
        ? "Fresh"
        : "Spoiled";

      // ================= STORAGE SCORE =================

      let storageScore = 100;

      const temp = Number(temperature);
      const hum = Number(humidity);

      // Temperature check

      if (foodType === "Apple") {
        if (temp < 0 || temp > 10) {
          storageScore -= 20;
        }
      } else if (foodType === "Banana") {
        if (temp < 12 || temp > 18) {
          storageScore -= 20;
        }
      } else if (foodType === "Orange") {
        if (temp < 3 || temp > 10) {
          storageScore -= 20;
        }
      }

      // Humidity check

      if (hum < 50 || hum > 95) {
        storageScore -= 15;
      }

      storageScore = Math.max(
        0,
        Math.min(100, storageScore)
      );

      // ================= SAVE STORAGE SCORE =================

      localStorage.setItem(
        "storage_score",
        storageScore.toString()
      );

      // ================= SHELF LIFE =================

      let shelfLife = "Not recommended";

      if (status === "Fresh") {
        if (foodType === "Apple") {
          shelfLife = "5–7 days";
        } else if (foodType === "Banana") {
          shelfLife = "2–4 days";
        } else if (foodType === "Orange") {
          shelfLife = "5–7 days";
        } else {
          shelfLife = "3–5 days";
        }
      }

      // ================= RECOMMENDATION =================

      let recommendation = "";

      if (status === "Fresh") {
        recommendation =
          "Safe to consume. Store properly to maintain freshness.";
      } else {
        recommendation =
          "Do not consume. The food appears to be spoiled.";
      }

      // ================= FRESHNESS SCORE =================

      const aiScore =
        status === "Fresh"
          ? data.confidence
          : 100 - data.confidence;

      const freshnessScore = Math.round(
        aiScore * 0.75 + storageScore * 0.25
      );

      // ================= SAVE RESULT =================

      const predictionResult = {
        foodType: foodType,
        foodEmoji: foodEmoji,
        status: status,
        confidence: `${data.confidence}%`,
        freshnessScore: freshnessScore,
        shelfLife: shelfLife,
        recommendation: recommendation,
        date: new Date().toISOString(),
      };

      setPrediction(predictionResult);

      // ================= SAVE LATEST PREDICTION =================

      localStorage.setItem(
        "latest_prediction",
        JSON.stringify(predictionResult)
      );

      // ================= SAVE PREDICTION HISTORY =================

      const updatedHistory = [
        predictionResult,
        ...predictionHistory,
      ];

      setPredictionHistory(updatedHistory);

      localStorage.setItem(
        "prediction_history",
        JSON.stringify(updatedHistory)
      );

      // ================= SAVE TEMPERATURE =================

      localStorage.setItem(
        "latest_temperature",
        temperature
      );

      // ================= SAVE HUMIDITY =================

      localStorage.setItem(
        "latest_humidity",
        humidity
      );

    } catch (error) {
      console.error("Prediction error:", error);
      alert("Unable to predict the image.");
    }
  };

  // ================= PREDICT AGAIN =================

  const handlePredictAgain = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setPrediction(null);
    setTemperature("");
    setHumidity("");

    const fileInput =
      document.getElementById("food-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // ================= REMOVE IMAGE =================

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setPrediction(null);
    setTemperature("");
    setHumidity("");

    const fileInput =
      document.getElementById("food-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // ================= PROFILE =================

  const handleProfileClick = () => {
    setShowProfile(true);
    setEditMode(false);

    if (profile) {
      setEditName(profile.name);
      setEditEmail(profile.email);
    }
  };

  const closeProfile = () => {
    setShowProfile(false);
    setEditMode(false);
  };

  const handleEditProfile = () => {
    setEditMode(true);

    setEditName(profile.name);
    setEditEmail(profile.email);
  };

  const handleCancelEdit = () => {
    setEditMode(false);

    setEditName(profile.name);
    setEditEmail(profile.email);
  };

  // ================= SAVE PROFILE =================

  const handleSaveProfile = async () => {
    if (
      editName.trim() === "" ||
      editEmail.trim() === ""
    ) {
      alert("Name and email cannot be empty.");
      return;
    }

    if (
      !editEmail.includes("@") ||
      !editEmail.includes(".")
    ) {
      alert("Please enter a valid email address.");
      return;
    }

    const token =
      localStorage.getItem("access_token");

    if (!token) {
      alert("Please login again.");
      return;
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editName,
            email: editEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.detail ||
            "Failed to update profile."
        );
        return;
      }

      alert("Profile updated successfully!");

      await fetchProfile();

      setEditMode(false);
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      alert("Unable to connect to the server.");
    }
  };

  // ================= DYNAMIC STATISTICS =================

  const totalPredictions = predictionHistory.length;

  const freshCount = predictionHistory.filter(
    (item) => item.status === "Fresh"
  ).length;

  const spoiledCount = predictionHistory.filter(
    (item) => item.status === "Spoiled"
  ).length;

  // ================= DATE FORMAT =================

  const formatPredictionDate = (date) => {
    if (!date) {
      return "Today";
    }

    const predictionDate = new Date(date);
    const today = new Date();

    const isToday =
      predictionDate.toDateString() ===
      today.toDateString();

    if (isToday) {
      return "Today";
    }

    return predictionDate.toLocaleDateString();
  };

  // Show only latest 5 predictions

  const recentPredictions =
    predictionHistory.slice(0, 5);

  return (
    <div className="dashboard">

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <div className="logo-section">

          <FaLeaf className="logo-icon" />

          <h2>
            Food Freshness Monitoring
          </h2>

        </div>

        <div className="nav-links">

          <a href="/dashboard">
            Dashboard
          </a>

          <a href="/inventory">
            Inventory
          </a>

          <a href="/storage-monitoring">
            Storage Monitoring
          </a>

          <a href="/alerts">
            Alerts
          </a>

          <a href="/reports">
            Reports
          </a>

        </div>

        <div className="nav-right">

          <a href="/alerts">
            <FaBell className="nav-icon" />
          </a>

          <div
            className="profile"
            onClick={handleProfileClick}
            style={{ cursor: "pointer" }}
          >

            <FaUserCircle className="profile-icon" />

            <span>
              {profile
                ? profile.name
                : "Loading..."}
            </span>

          </div>

        </div>

      </nav>

      {/* ================= PROFILE POPUP ================= */}

      {showProfile && profile && (

        <div className="profile-overlay">

          <div className="profile-popup">

            <button
              className="profile-close"
              onClick={closeProfile}
            >
              <FaTimes />
            </button>

            <FaUserCircle
              className="profile-popup-icon"
            />

            <h2>My Profile</h2>

            {!editMode ? (

              <>
                <div className="profile-details">

                  <div className="profile-detail">

                    <strong>Name</strong>

                    <span>
                      {profile.name}
                    </span>

                  </div>

                  <div className="profile-detail">

                    <strong>Email</strong>

                    <span>
                      {profile.email}
                    </span>

                  </div>

                </div>

                <button
                  className="edit-profile-btn"
                  onClick={handleEditProfile}
                >
                  <FaEdit />
                  Edit Profile
                </button>

              </>

            ) : (

              <div className="edit-profile-form">

                <div className="edit-field">

                  <label>Name</label>

                  <input
                    type="text"
                    value={editName}
                    onChange={(e) =>
                      setEditName(e.target.value)
                    }
                    placeholder="Enter your name"
                  />

                </div>

                <div className="edit-field">

                  <label>Email</label>

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(e.target.value)
                    }
                    placeholder="Enter your email"
                  />

                </div>

                <div className="edit-buttons">

                  <button
                    className="save-profile-btn"
                    onClick={handleSaveProfile}
                  >
                    <FaSave />
                    Save Changes
                  </button>

                  <button
                    className="cancel-profile-btn"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      )}

      {/* ================= MAIN CONTENT ================= */}

      <main className="dashboard-content">

        {/* ================= WELCOME ================= */}

        <section className="welcome-section">

          <div className="welcome-text">

            <h1>🍃 Welcome Back!</h1>

            <h2>
              AI-Powered Food Freshness Detection
            </h2>

            <p>
              Upload a food image and let
              Artificial Intelligence determine
              whether it is <b>Fresh</b> or
              <b> Spoiled</b> in just a few seconds.
            </p>

            <button className="start-btn">
              Start Detection
            </button>

          </div>

          {/* ================= DETECTION CARD ================= */}

          <div
            className={`upload-card ${
              prediction
                ? "result-card"
                : selectedImage
                ? "storage-card"
                : "upload-card-empty"
            }`}
          >

            {/* ================= STATE 1 : UPLOAD ================= */}

            {!selectedImage && !prediction && (

              <>

                <FaCloudUploadAlt
                  className="upload-big-icon"
                />

                <h2>
                  Upload Food Image
                </h2>

                <p>
                  Drag & Drop your image here
                  <br />
                  or browse from your device
                </p>

                <input
                  type="file"
                  id="food-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />

                <label
                  htmlFor="food-image"
                  className="upload-btn"
                >
                  Choose Image
                </label>

              </>

            )}

            {/* ================= STATE 2 : STORAGE ================= */}

            {selectedImage && !prediction && (

              <div className="storage-step">

                <img
                  src={selectedImage}
                  alt="Selected food"
                  className="image-preview"
                />

                <p className="image-success">
                  Image selected successfully ✅
                </p>

                <div className="storage-box">

                  <h3>
                    Storage Conditions
                  </h3>

                  <div className="storage-input-row">

                    <div className="storage-field">

                      <label>
                        🌡️ Temperature (°C)
                      </label>

                      <input
                        type="number"
                        value={temperature}
                        onChange={(e) =>
                          setTemperature(
                            e.target.value
                          )
                        }
                        placeholder="e.g. 5"
                      />

                    </div>

                    <div className="storage-field">

                      <label>
                        💧 Humidity (%)
                      </label>

                      <input
                        type="number"
                        value={humidity}
                        onChange={(e) =>
                          setHumidity(
                            e.target.value
                          )
                        }
                        placeholder="e.g. 60"
                      />

                    </div>

                  </div>

                </div>

                <div className="prediction-buttons">

                  <button
                    className="predict-btn"
                    onClick={handlePrediction}
                  >
                    🔍 Predict Freshness
                  </button>

                  <button
                    className="remove-image-btn"
                    onClick={removeImage}
                  >
                    ✕ Remove Image
                  </button>

                </div>

              </div>

            )}

            {/* ================= STATE 3 : RESULT ================= */}

            {prediction && (

              <div className="prediction-result">

                <FaCheckCircle
                  className="result-icon"
                />

                <h3>
                  Prediction Result
                </h3>

                <div className="food-type">
                  {prediction.foodEmoji}{" "}
                  {prediction.foodType}
                </div>

                <div
                  className={`main-prediction ${
                    prediction.status === "Fresh"
                      ? "prediction-fresh"
                      : "prediction-spoiled"
                  }`}
                >
                  {prediction.status === "Fresh"
                    ? "🟢"
                    : "🔴"}{" "}
                  {prediction.status.toUpperCase()}
                </div>

                <div className="prediction-info">

                  <div className="info-item">

                    <span>
                      🎯 Confidence
                    </span>

                    <strong>
                      {prediction.confidence}
                    </strong>

                  </div>

                  <div className="info-item">

                    <span>
                      🌿 Freshness Score
                    </span>

                    <strong>
                      {prediction.freshnessScore}/100
                    </strong>

                  </div>

                  <div className="info-item">

                    <span>
                      📅 Estimated Shelf Life
                    </span>

                    <strong>
                      {prediction.shelfLife}
                    </strong>

                  </div>

                  <div className="info-item recommendation-item">

                    <span>
                      💡 Recommendation
                    </span>

                    <strong>
                      {prediction.recommendation}
                    </strong>

                  </div>

                </div>

                {/* PREDICT AGAIN */}

                <button
                  className="predict-again-btn"
                  onClick={handlePredictAgain}
                >
                  <FaRedo />
                  Predict Again
                </button>

              </div>

            )}

          </div>

        </section>

        {/* ================= DYNAMIC STATISTICS ================= */}

        <section className="stats-container">

          <div className="stat-card">

            <h2>
              {totalPredictions}
            </h2>

            <p>
              Images Uploaded
            </p>

          </div>

          <div className="stat-card">

            <h2>
              {freshCount}
            </h2>

            <p>
              Fresh Detected
            </p>

          </div>

          <div className="stat-card">

            <h2>
              {spoiledCount}
            </h2>

            <p>
              Spoiled Detected
            </p>

          </div>

          <div className="stat-card">

            <h2>
              99.05%
            </h2>

            <p>
              Model Accuracy
            </p>

          </div>

        </section>

        {/* ================= RECENT PREDICTIONS ================= */}

        <section className="history-section">

          <div className="section-heading">

            <div>

              <h2>
                Recent Predictions
              </h2>

              <p>
                Your latest food freshness analysis
              </p>

            </div>

            <button className="view-all-btn">
              View All
            </button>

          </div>

          <div className="table-container">

            <table className="history-table">

              <thead>

                <tr>
                  <th>Food</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Date</th>
                </tr>

              </thead>

              <tbody>

                {recentPredictions.length === 0 ? (

                  <tr>

                    <td
                      colSpan="4"
                      style={{ textAlign: "center" }}
                    >
                      No predictions yet
                    </td>

                  </tr>

                ) : (

                  recentPredictions.map(
                    (item, index) => (

                      <tr key={index}>

                        <td>
                          {item.foodEmoji}{" "}
                          {item.foodType}
                        </td>

                        <td>

                          <span
                            className={
                              item.status === "Fresh"
                                ? "fresh"
                                : "spoiled"
                            }
                          >
                            {item.status}
                          </span>

                        </td>

                        <td>
                          {item.confidence}
                        </td>

                        <td>
                          {formatPredictionDate(
                            item.date
                          )}
                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;