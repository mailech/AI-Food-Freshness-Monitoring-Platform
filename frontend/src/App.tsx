import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [productType, setProductType] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [packaging, setPackaging] = useState("");
  const [storageDuration, setStorageDuration] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
  product_type: string;
  temperature: number;
  humidity: number;
  storage_duration: number;
  freshness_category: string;
  freshness_score: number;
  shelf_life_days: number;
  confidence: number;
  recommendation: string;
} | null>(null);
  const [error, setError] = useState("");

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
      setShowResult(false);
    }
  };

  const handleAnalyze = async () => {
  if (
  !image ||
  !productType ||
  !packaging ||
  temperature === "" ||
  humidity === "" ||
  storageDuration === ""
) {
    setError("Please complete all food and storage details.");
    setShowResult(false);
    return;
  }

  try {
    setError("");

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_type: productType,
        temperature: Number(temperature),
        humidity: Number(humidity),
        packaging: packaging,
        storage_duration: Number(storageDuration),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze food.");
    }

    const data = await response.json();

    console.log("Backend response:", data);

    setAnalysisResult(data);
    setShowResult(true);
  } catch (error) {
    console.error(error);
    setError(
      "Unable to connect to the backend. Please make sure FastAPI is running."
    );
    setShowResult(false);
  }
};

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">🥬 FreshGuard</div>

        <nav>
          <a href="#">Dashboard</a>
          <a href="#">History</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="tag">AI-POWERED FOOD MONITORING</p>

          <h1>
            Know your food's
            <span> freshness.</span>
          </h1>

          <p className="description">
            Upload an image of your food and provide storage details
            to assess its freshness and quality.
          </p>

          <label className="upload-button">
            📷 Upload Food Image

            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
          </label>

          {image && (
            <div className="preview">
              <h3>Selected Food Image</h3>

              <img src={image} alt="Uploaded food" />

              <div className="food-form">
                <h3>Food & Storage Details</h3>

                <label>
                  Product Type
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                  >
                    <option value="">Select food type</option>
                    <option value="fruit">Fruit</option>
                    <option value="vegetable">Vegetable</option>
                    <option value="dairy">Dairy Product</option>
                    <option value="meat">Meat & Poultry</option>
                    <option value="seafood">Seafood</option>
                    <option value="bakery">Bakery Product</option>
                    <option value="packaged">Packaged Food</option>
                    <option value="beverage">Beverage</option>
                  </select>
                </label>

                <label>
                  Storage Temperature (°C)
                  <input
                    type="number"
                    min="-30"
                    max="60"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                </label>

                <label>
                  Humidity (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                  />
                </label>

                <label>
                  Packaging Type
                  <select
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value)}
                  >
                    <option value="">Select packaging</option>
                    <option value="open">Open</option>
                    <option value="plastic">Plastic</option>
                    <option value="sealed">Sealed</option>
                    <option value="vacuum">Vacuum Packed</option>
                    <option value="container">Container</option>
                  </select>
                </label>

                <label>
                  Storage Duration (days)
                  <input
                    type="number"
                    min="0"
                    max="3650"
                    value={storageDuration}
                    onChange={(e) =>
                      setStorageDuration(e.target.value)
                    }
                  />
                </label>

                <button
                  className="analyze-button"
                  onClick={handleAnalyze}
                >
                  🔍 Analyze Freshness
                </button>
                {error && <p className="form-error">{error}</p>}
              </div>

              {showResult && (
  <div className="result-card">
    {analysisResult && (
      <>
        <p className="result-label">PRELIMINARY ASSESSMENT</p>

        <div className="result-icon">
          {analysisResult.freshness_category === "Fresh"
            ? "🟢"
            : analysisResult.freshness_category === "Spoiled"
            ? "🔴"
            : "🟡"}
        </div>

        <h2>{analysisResult.freshness_category}</h2>

        <p>
          The food appears to be in a good condition based on
          the analysis.
        </p>

        <div className="result-details">
          <div>
            <span>Product</span>
            <strong>{analysisResult.product_type}</strong>
          </div>

          <div>
            <span>Temperature</span>
            <strong>{analysisResult.temperature} °C</strong>
          </div>

          <div>
            <span>Humidity</span>
            <strong>{analysisResult.humidity}%</strong>
          </div>

          <div>
            <span>Storage Duration</span>
            <strong>{analysisResult.storage_duration} days</strong>
          </div>

          <div>
            <span>Freshness Score</span>
            <strong>{analysisResult.freshness_score}%</strong>
          </div>

          <div>
            <span>Shelf Life</span>
            <strong>{analysisResult.shelf_life_days} days</strong>
          </div>

          <div>
            <span>Confidence</span>
            <strong>{analysisResult.confidence}%</strong>
          </div>
        </div>

        <div className="recommendation">
          <strong>💡 Recommendation</strong>
          <p>{analysisResult.recommendation}</p>
        </div>

        <p className="demo-note">
          AI model analysis will be connected in the next stage.
        </p>
      </>
    )}
  </div>
)}
            </div>
          )}
        </section>

        <section className="status-section">
          <div className="status-card">
            <div className="status-icon">🟢</div>
            <h3>Fresh</h3>
            <p>Food appears fresh</p>
          </div>

          <div className="status-card">
            <div className="status-icon">🟡</div>
            <h3>Warning</h3>
            <p>Check food condition</p>
          </div>

          <div className="status-card">
            <div className="status-icon">🔴</div>
            <h3>Spoiled</h3>
            <p>Food may be unsafe</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;