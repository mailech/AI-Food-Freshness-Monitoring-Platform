import { useState } from "react";
import {
  FaLeaf,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaRedo,
  FaTimes,
} from "react-icons/fa";
import "../App.css";

function FoodAnalysis() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // ================= PRODUCT AGE SCORE =================

  const getProductAgeScore = async (foodType) => {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        return 50;
      }

      const response = await fetch(
        "http://127.0.0.1:8000/food/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return 50;
      }

      const foodItems = await response.json();

      const matchingItems = foodItems.filter(
        (item) =>
          item.food_name &&
          item.food_name
            .toLowerCase()
            .includes(foodType.toLowerCase())
      );

      if (matchingItems.length === 0) {
        return 50;
      }

      const validItems = matchingItems.filter(
        (item) => item.purchase_date
      );

      if (validItems.length === 0) {
        return 50;
      }

      const sortedItems = [...validItems].sort(
        (a, b) =>
          new Date(b.purchase_date) -
          new Date(a.purchase_date)
      );

      const purchaseDate = new Date(
        sortedItems[0].purchase_date
      );

      const today = new Date();

      const ageInDays = Math.max(
        0,
        Math.floor(
          (today - purchaseDate) /
            (1000 * 60 * 60 * 24)
        )
      );

      /*
        PRODUCT AGE SCORE

        0 days      -> 100
        1-3 days    -> 90
        4-7 days    -> 75
        8-14 days   -> 60
        15-30 days  -> 40
        30+ days    -> 20
      */

      if (ageInDays === 0) {
        return 100;
      }

      if (ageInDays <= 3) {
        return 90;
      }

      if (ageInDays <= 7) {
        return 75;
      }

      if (ageInDays <= 14) {
        return 60;
      }

      if (ageInDays <= 30) {
        return 40;
      }

      return 20;
    } catch (error) {
      console.error(
        "Product age calculation error:",
        error
      );

      return 50;
    }
  };

  // ================= SHELF LIFE SCORE =================

  const getShelfLifeScore = (shelfLife) => {
    if (!shelfLife) {
      return 50;
    }

    if (shelfLife.includes("Not recommended")) {
      return 0;
    }

    const numbers = shelfLife.match(/\d+/g);

    if (!numbers || numbers.length === 0) {
      return 50;
    }

    const maximumDays = Number(
      numbers[numbers.length - 1]
    );

    if (maximumDays >= 7) {
      return 100;
    }

    if (maximumDays >= 5) {
      return 90;
    }

    if (maximumDays >= 3) {
      return 75;
    }

    if (maximumDays >= 1) {
      return 50;
    }

    return 0;
  };

  // ================= FIVE LEVEL FRESHNESS =================

  const getFreshnessLevel = (score, aiStatus) => {
    /*
      FINAL FRESHNESS CLASSIFICATION

      90-100 -> Fresh
      75-89  -> Good
      60-74  -> Acceptable
      40-59  -> Near Spoilage
      0-39   -> Spoiled

      If ML detects spoiled food,
      final level remains Spoiled.
    */

    if (aiStatus === "Spoiled") {
      return "Spoiled";
    }

    if (score >= 90) {
      return "Fresh";
    }

    if (score >= 75) {
      return "Good";
    }

    if (score >= 60) {
      return "Acceptable";
    }

    if (score >= 40) {
      return "Near Spoilage";
    }

    return "Spoiled";
  };

  // ================= SELECT IMAGE =================

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const imageURL = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedImage(imageURL);
    setPrediction(null);
  };

  // ================= PREDICTION =================

  const handlePrediction = async () => {
    if (!selectedFile) {
      alert("Please select a food image first.");
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

      const predictionText =
        String(data.prediction || "").toLowerCase();

      if (predictionText.includes("apple")) {
        foodType = "Apple";
        foodEmoji = "🍎";
      } else if (
        predictionText.includes("banana")
      ) {
        foodType = "Banana";
        foodEmoji = "🍌";
      } else if (
        predictionText.includes("orange")
      ) {
        foodType = "Orange";
        foodEmoji = "🍊";
      }

      // ================= ML STATUS =================

      const aiStatus =
        predictionText.includes("fresh")
          ? "Fresh"
          : "Spoiled";

      // ================= ML CONFIDENCE =================

      const aiConfidence = Number(
        data.confidence
      );

      // ================= SPOILAGE PROBABILITY =================

      /*
        The trained ML model provides its prediction
        confidence.

        If the model predicts Fresh:
          Spoilage probability = 100 - confidence

        If the model predicts Spoiled:
          Spoilage probability = confidence

        This keeps the value directly connected
        to the trained ML prediction confidence.
      */

      const spoilageProbability =
        aiStatus === "Spoiled"
          ? aiConfidence
          : 100 - aiConfidence;

      // ================= COLOR ANALYSIS =================

      const colorScore =
        data.color_analysis &&
        data.color_analysis.color_score !== undefined
          ? Number(
              data.color_analysis.color_score
            )
          : 50;

      // ================= TEXTURE ANALYSIS =================

      const textureScore =
        data.texture_analysis &&
        data.texture_analysis.texture_score !== undefined
          ? Number(
              data.texture_analysis.texture_score
            )
          : 50;

      // ================= VISUAL FRESHNESS =================

      /*
        Visual Freshness

        AI model confidence = 60%
        Color analysis       = 25%
        Texture analysis     = 15%
      */

      const visualScore = Math.round(
        aiConfidence * 0.60 +
          colorScore * 0.25 +
          textureScore * 0.15
      );

      // ================= STORAGE SCORE =================

      /*
        Storage Conditions = 25%

        Storage Monitoring page saves
        storage_score in localStorage.
      */

      const savedStorageScore =
        localStorage.getItem("storage_score");

      const storageScore =
        savedStorageScore !== null
          ? Number(savedStorageScore)
          : 100;

      // ================= SHELF LIFE =================

let shelfLife = "Not recommended";

if (aiStatus === "Fresh") {
  let baseShelfLife = 3;

  if (foodType === "Apple") {
    baseShelfLife = 7;
  } else if (foodType === "Banana") {
    baseShelfLife = 4;
  } else if (foodType === "Orange") {
    baseShelfLife = 7;
  } else {
    baseShelfLife = 5;
  }

  // Adjust shelf life based on storage conditions
  if (storageScore >= 90) {
  if (foodType === "Apple" || foodType === "Orange") {
    shelfLife = "5–7 days";
  } else if (foodType === "Banana") {
    shelfLife = "2–4 days";
  } else {
    shelfLife = "3–5 days";
  }
} else if (storageScore >= 70) {
    shelfLife = `1–${Math.max(2, baseShelfLife - 2)} days`;
  } else if (storageScore >= 40) {
    shelfLife = `1–${Math.max(1, baseShelfLife - 4)} days`;
  } else {
    shelfLife = `Not recommended`;
  }
}

      // ================= SHELF LIFE SCORE =================

      const shelfLifeScore =
        getShelfLifeScore(shelfLife);

      // ================= PRODUCT AGE SCORE =================

      const productAgeScore =
        await getProductAgeScore(foodType);

      // ================= FINAL FRESHNESS SCORE =================

      /*
        PDF-BASED FRESHNESS SCORING ENGINE

        Visual Freshness = 40%
        Storage          = 25%
        Shelf-Life       = 20%
        Product Age      = 15%

        TOTAL = 100%
      */

      const freshnessScore = Math.round(
        visualScore * 0.40 +
          storageScore * 0.25 +
          shelfLifeScore * 0.20 +
          productAgeScore * 0.15
      );

      // ================= FINAL LEVEL =================

      const freshnessLevel =
        getFreshnessLevel(
          freshnessScore,
          aiStatus
        );

      // ================= RECOMMENDATION =================

      let recommendation = "";

      if (freshnessLevel === "Fresh") {
        recommendation =
          "Food is in excellent condition. Store properly to maintain freshness.";
      } else if (freshnessLevel === "Good") {
        recommendation =
          "Food is in good condition. Store properly to maintain freshness.";
      } else if (
        freshnessLevel === "Acceptable"
      ) {
        recommendation =
          "Food is acceptable. Consume soon and maintain proper storage conditions.";
      } else if (
        freshnessLevel === "Near Spoilage"
      ) {
        recommendation =
          "Food freshness is declining. Consider consuming it soon and maintain proper storage conditions.";
      } else {
        recommendation =
          "Do not consume. The food appears to be spoiled.";
      }

      // ================= RESULT OBJECT =================

      const predictionResult = {
        foodType: foodType,
        foodEmoji: foodEmoji,

        // ML prediction
        status: aiStatus,

        // Final freshness level
        freshnessLevel: freshnessLevel,

        // ML confidence
        confidence: `${aiConfidence}%`,

        // ML-based spoilage probability
        spoilageProbability: `${Math.round(
          spoilageProbability
        )}%`,

        // Final freshness score
        freshnessScore: freshnessScore,

        // Internal scores
        visualScore: visualScore,

        storageScore: Math.round(
          storageScore
        ),

        shelfLifeScore: Math.round(
          shelfLifeScore
        ),

        productAgeScore: Math.round(
          productAgeScore
        ),

        colorScore: Math.round(
          colorScore
        ),

        textureScore: Math.round(
          textureScore
        ),

        shelfLife: shelfLife,

        recommendation: recommendation,

        date: new Date().toISOString(),
      };

      // ================= SAVE RESULT =================

      setPrediction(predictionResult);

      localStorage.setItem(
        "latest_prediction",
        JSON.stringify(predictionResult)
      );

      // ================= SAVE HISTORY =================

      const savedHistory =
        localStorage.getItem(
          "prediction_history"
        );

      let predictionHistory = [];

      try {
        predictionHistory = savedHistory
          ? JSON.parse(savedHistory)
          : [];
      } catch (error) {
        predictionHistory = [];
      }

      const updatedHistory = [
        predictionResult,
        ...predictionHistory,
      ];

      localStorage.setItem(
        "prediction_history",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error(
        "Prediction error:",
        error
      );

      alert(
        "Unable to predict the image. Please try again."
      );
    }
  };

  // ================= REMOVE IMAGE =================

  const removeImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setPrediction(null);

    const fileInput =
      document.getElementById("food-analysis-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // ================= PREDICT AGAIN =================

  const handlePredictAgain = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setPrediction(null);

    const fileInput =
      document.getElementById("food-analysis-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // ================= UI =================

  return (
    <div className="food-analysis-page">

      {/* ================= PAGE HEADER ================= */}

      <div className="food-analysis-header">

        <div>
          <div className="food-analysis-label">
            AI FOOD QUALITY ANALYSIS
          </div>

          <h1>
            <FaLeaf />
            Food Analysis
          </h1>

          <p>
            Upload a food image to analyze its
            freshness using our trained AI model.
          </p>
        </div>

      </div>

      {/* ================= MAIN ANALYSIS AREA ================= */}

      <div className="food-analysis-container">

        {/* ================= UPLOAD / IMAGE AREA ================= */}

        <div className="food-analysis-upload-card">

  {!selectedImage && !prediction && (
    <>
      <div className="food-analysis-upload-icon">
        <FaCloudUploadAlt />
      </div>

      <h2>Upload Food Image</h2>

      <p>
        Select an image of a food item to check
        its freshness using AI.
      </p>

      <input
        type="file"
        id="food-analysis-image"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: "none" }}
      />

      <label
        htmlFor="food-analysis-image"
        className="food-analysis-upload-btn"
      >
        <FaCloudUploadAlt />
        Choose Food Image
      </label>

      <span className="food-analysis-upload-hint">
        Supported formats: JPG, JPEG, PNG
      </span>
    </>
  )}

  {selectedImage && !prediction && (
    <div className="food-analysis-preview">

      <div className="food-analysis-image-wrapper">
        <img
          src={selectedImage}
          alt="Selected food"
          className="food-analysis-image"
        />

        <button
          className="food-analysis-remove"
          onClick={removeImage}
          title="Remove image"
        >
          <FaTimes />
        </button>
      </div>

      <p className="food-analysis-success">
        <FaCheckCircle />
        Image selected successfully
      </p>

      <button
        className="food-analysis-predict-btn"
        onClick={handlePrediction}
      >
        🔍 Analyze Freshness
      </button>

    </div>
  )}

  {prediction && (
    <div className="food-analysis-completed">

      <div className="food-analysis-completed-icon">
        <FaCheckCircle />
      </div>

      <h3>Analysis Completed</h3>

      <p>
        Your food image has been successfully analyzed.
      </p>

      <button
        className="food-analysis-new-upload-btn"
        onClick={handlePredictAgain}
      >
        <FaRedo />
        Analyze Another Image
      </button>

    </div>
  )}

</div>
        {/* ================= RESULT ================= */}

        {prediction && (
          <div className="food-analysis-result-card">

            <div className="food-analysis-result-header">

              <FaCheckCircle />

              <div>
                <span>
                  AI ANALYSIS COMPLETE
                </span>

                <h2>
                  Prediction Result
                </h2>
              </div>

            </div>

            {/* ================= FOOD ================= */}

            <div className="food-analysis-food">

              <div className="food-analysis-food-icon">
                {prediction.foodEmoji}
              </div>

              <div>
                <span>Detected Food</span>

                <h3>
                  {prediction.foodType}
                </h3>
              </div>

            </div>

            {/* ================= FRESHNESS STATUS ================= */}

            <div
              className={`food-analysis-status ${
                prediction.freshnessLevel ===
                  "Fresh" ||
                prediction.freshnessLevel ===
                  "Good"
                  ? "food-status-good"
                  : prediction.freshnessLevel ===
                    "Acceptable"
                  ? "food-status-acceptable"
                  : prediction.freshnessLevel ===
                    "Near Spoilage"
                  ? "food-status-warning"
                  : "food-status-spoiled"
              }`}
            >

              <span>
                {prediction.freshnessLevel ===
                  "Fresh" ||
                prediction.freshnessLevel ===
                  "Good"
                  ? "🟢"
                  : prediction.freshnessLevel ===
                    "Acceptable"
                  ? "🟡"
                  : prediction.freshnessLevel ===
                    "Near Spoilage"
                  ? "🟠"
                  : "🔴"}
              </span>

              <strong>
                {prediction.freshnessLevel}
              </strong>

            </div>

            {/* ================= KEY RESULTS ================= */}

            <div className="food-analysis-metrics">

              {/* FRESHNESS SCORE */}

              <div className="food-analysis-metric freshness-metric">

                <span>
                  🌿 Freshness Score
                </span>

                <strong>
                  {prediction.freshnessScore}
                  <small>/100</small>
                </strong>

              </div>

              {/* SPOILAGE PROBABILITY */}

              <div className="food-analysis-metric spoilage-metric">

                <span>
                  ⚠️ Spoilage Probability
                </span>

                <strong>
                  {prediction.spoilageProbability}
                </strong>

              </div>

              {/* CONFIDENCE */}

              <div className="food-analysis-metric">

                <span>
                  🎯 ML Confidence
                </span>

                <strong>
                  {prediction.confidence}
                </strong>

              </div>

              {/* SHELF LIFE */}

              <div className="food-analysis-metric">

                <span>
                  📅 Estimated Shelf Life
                </span>

                <strong>
                  {prediction.shelfLife}
                </strong>

              </div>

            </div>

            {/* ================= ANALYSIS DETAILS ================= */}

            <div className="food-analysis-details">

              <h3>
                Analysis Details
              </h3>

              <div className="food-analysis-detail-grid">

                <div>
                  <span>
                    AI Visual Score
                  </span>

                  <strong>
                    {prediction.visualScore}/100
                  </strong>
                </div>

                <div>
                  <span>
                    Color Analysis
                  </span>

                  <strong>
                    {prediction.colorScore}/100
                  </strong>
                </div>

                <div>
                  <span>
                    Texture Analysis
                  </span>

                  <strong>
                    {prediction.textureScore}/100
                  </strong>
                </div>

                <div>
                  <span>
                    Storage Score
                  </span>

                  <strong>
                    {prediction.storageScore}/100
                  </strong>
                </div>

                <div>
                  <span>
                    Shelf-Life Score
                  </span>

                  <strong>
                    {prediction.shelfLifeScore}/100
                  </strong>
                </div>

                <div>
                  <span>
                    Product Age Score
                  </span>

                  <strong>
                    {prediction.productAgeScore}/100
                  </strong>
                </div>

              </div>

            </div>

            {/* ================= RECOMMENDATION ================= */}

            <div
              className={`food-analysis-recommendation ${
                prediction.freshnessLevel ===
                "Spoiled"
                  ? "food-recommendation-danger"
                  : ""
              }`}
            >

              <span>
                💡
              </span>

              <div>
                <strong>
                  Recommendation
                </strong>

                <p>
                  {prediction.recommendation}
                </p>
              </div>

            </div>

            {/* ================= ACTION BUTTON ================= */}

            <button
              className="food-analysis-again-btn"
              onClick={handlePredictAgain}
            >
              <FaRedo />
              Analyze Another Image
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

export default FoodAnalysis;