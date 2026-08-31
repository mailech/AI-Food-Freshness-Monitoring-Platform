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
} from "react-icons/fa";
import "../App.css";

function Dashboard() {
  const [selectedImage, setSelectedImage] = useState(null);
const [selectedFile, setSelectedFile] = useState(null);
const [prediction, setPrediction] = useState(null);

  // ================= USER PROFILE =================

  const [profile, setProfile] = useState(null);

  // Profile popup
  const [showProfile, setShowProfile] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);

  // Edit fields
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

      console.log("Profile data:", data);

      setProfile(data);

      // Set edit fields
      setEditName(data.name);
      setEditEmail(data.email);

    } catch (error) {
      console.error("Profile error:", error);
    }
  };

  // Fetch profile when dashboard opens
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
  }
};
  // ================= TEMPORARY PREDICTION =================

  const handlePrediction = async () => {
  if (!selectedFile) {
    alert("Please select an image first.");
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
      throw new Error(data.detail || "Prediction failed");
    }

    console.log("Prediction:", data);

    setPrediction({
      status: data.prediction.includes("fresh")
        ? "Fresh"
        : "Spoiled",
      confidence: `${data.confidence}%`,
    });

  } catch (error) {
    console.error("Prediction error:", error);
    alert("Unable to predict the image.");
  }
};
  // ================= REMOVE IMAGE =================

  const removeImage = () => {
  setSelectedImage(null);
  setSelectedFile(null);
  setPrediction(null);
};

  // ================= PROFILE CLICK =================

  const handleProfileClick = () => {
    setShowProfile(true);
    setEditMode(false);

    if (profile) {
      setEditName(profile.name);
      setEditEmail(profile.email);
    }
  };

  // ================= CLOSE PROFILE =================

  const closeProfile = () => {
    setShowProfile(false);
    setEditMode(false);
  };

  // ================= START EDIT =================

  const handleEditProfile = () => {
    setEditMode(true);

    setEditName(profile.name);
    setEditEmail(profile.email);
  };

  // ================= CANCEL EDIT =================

  const handleCancelEdit = () => {
    setEditMode(false);

    setEditName(profile.name);
    setEditEmail(profile.email);
  };

  // ================= SAVE PROFILE =================

  const handleSaveProfile = async () => {
  if (editName.trim() === "" || editEmail.trim() === "") {
    alert("Name and email cannot be empty.");
    return;
  }

  if (!editEmail.includes("@") || !editEmail.includes(".")) {
    alert("Please enter a valid email address.");
    return;
  }

  const token = localStorage.getItem("access_token");

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
      alert(data.detail || "Failed to update profile.");
      return;
    }

    alert("Profile updated successfully!");

    // Refresh profile from backend
    await fetchProfile();

    // Close edit mode
    setEditMode(false);

  } catch (error) {
    console.error("Update profile error:", error);
    alert("Unable to connect to the server.");
  }
};

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

        <div className="nav-right">

          <FaBell className="nav-icon" />

          {/* PROFILE */}

          <div
            className="profile"
            onClick={handleProfileClick}
            style={{ cursor: "pointer" }}
          >

            <FaUserCircle className="profile-icon" />

            <span>
              {profile ? profile.name : "Loading..."}
            </span>

          </div>

        </div>

      </nav>

      {/* ================= PROFILE POPUP ================= */}

      {showProfile && profile && (

        <div className="profile-overlay">

          <div className="profile-popup">

            {/* CLOSE BUTTON */}

            <button
              className="profile-close"
              onClick={closeProfile}
            >
              <FaTimes />
            </button>

            {/* PROFILE ICON */}

            <FaUserCircle className="profile-popup-icon" />

            <h2>
              My Profile
            </h2>

            {!editMode ? (

              /* ================= VIEW PROFILE ================= */

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

                {/* EDIT BUTTON */}

                <button
                  className="edit-profile-btn"
                  onClick={handleEditProfile}
                >
                  <FaEdit />

                  Edit Profile
                </button>

              </>

            ) : (

              /* ================= EDIT PROFILE ================= */

              <div className="edit-profile-form">

                <div className="edit-field">

                  <label>
                    Name
                  </label>

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

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(e.target.value)
                    }
                    placeholder="Enter your email"
                  />

                </div>

                {/* BUTTONS */}

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

        {/* ================= WELCOME SECTION ================= */}

        <section className="welcome-section">

          <div className="welcome-text">

            <h1>
              🍃 Welcome Back!
            </h1>

            <h2>
              AI-Powered Food Freshness Detection
            </h2>

            <p>
              Upload a food image and let Artificial Intelligence
              determine whether it is <b>Fresh</b> or
              <b> Spoiled</b> in just a few seconds.
            </p>

            <button className="start-btn">
              Start Detection
            </button>

          </div>

          {/* ================= UPLOAD CARD ================= */}

          <div className="upload-card">

            {!selectedImage ? (

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

            ) : (

              <>

                <img
                  src={selectedImage}
                  alt="Selected food"
                  className="image-preview"
                />

                <p>
                  Image selected successfully ✅
                </p>

                {!prediction && (

                  <button
                    className="predict-btn"
                    onClick={handlePrediction}
                  >
                    Predict Freshness
                  </button>

                )}

                <button
                  className="remove-btn"
                  onClick={removeImage}
                >
                  <FaTimes />
                  Remove Image
                </button>

                {prediction && (

                  <div className="prediction-result">

                    <FaCheckCircle
                      className="result-icon"
                    />

                    <h3>
                      Prediction Result
                    </h3>

                    <div className="result-status">
                      {prediction.status}
                    </div>

                    <p>
                      Confidence:{" "}
                      <strong>
                        {prediction.confidence}
                      </strong>
                    </p>

                  </div>

                )}

              </>

            )}

          </div>

        </section>

        {/* ================= STATISTICS ================= */}

        <section className="stats-container">

          <div className="stat-card">
            <h2>125</h2>
            <p>Images Uploaded</p>
          </div>

          <div className="stat-card">
            <h2>98</h2>
            <p>Fresh Detected</p>
          </div>

          <div className="stat-card">
            <h2>27</h2>
            <p>Spoiled Detected</p>
          </div>

          <div className="stat-card">
            <h2>96.8%</h2>
            <p>Model Accuracy</p>
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

                <tr>

                  <td>
                    🍎 Apple
                  </td>

                  <td>
                    <span className="fresh">
                      Fresh
                    </span>
                  </td>

                  <td>
                    98%
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
                    <span className="spoiled">
                      Spoiled
                    </span>
                  </td>

                  <td>
                    91%
                  </td>

                  <td>
                    Today
                  </td>

                </tr>

                <tr>

                  <td>
                    🍅 Tomato
                  </td>

                  <td>
                    <span className="fresh">
                      Fresh
                    </span>
                  </td>

                  <td>
                    97%
                  </td>

                  <td>
                    Yesterday
                  </td>

                </tr>

              </tbody>

            </table>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;