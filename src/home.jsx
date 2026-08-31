import { FaLeaf, FaRobot, FaChartLine, FaShieldAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./index.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">

      {/* ================= NAVBAR ================= */}

      <nav className="home-navbar">

        <div className="home-logo">
          <FaLeaf />
          <span>Food Freshness Monitoring</span>
        </div>

        <div className="home-nav-links">
          <button onClick={() => navigate("/")}>
            Home
          </button>

          <button onClick={() => navigate("/login")}>
            Login
          </button>

          <button
            className="home-register-btn"
            onClick={() => navigate("/register")}
          >
            Register
          </button>
        </div>

      </nav>


      {/* ================= HERO SECTION ================= */}

      <section className="home-hero">

        <div className="home-hero-content">

          <div className="home-badge">
            🍃 AI-Powered Food Safety
          </div>

          <h1>
            Know Your Food's
            <span> Freshness </span>
            Instantly
          </h1>

          <p>
            Upload a food image and let our AI-powered system
            analyze it to determine whether the food is
            fresh or spoiled.
          </p>

          <div className="home-buttons">

            <button
              className="home-primary-btn"
              onClick={() => navigate("/login")}
            >
              Start Detection →
            </button>

            <button
              className="home-secondary-btn"
              onClick={() => navigate("/register")}
            >
              Create Account
            </button>

          </div>

        </div>


        {/* ================= HERO VISUAL ================= */}

        <div className="home-visual">

          <div className="food-circle">
            🍎
          </div>

          <div className="ai-card">

            <FaRobot />

            <div>
              <strong>AI Analysis</strong>
              <span>Freshness detected</span>
            </div>

            <div className="fresh-check">
              ✓
            </div>

          </div>

        </div>

      </section>


      {/* ================= FEATURES ================= */}

      <section className="home-features">

        <div className="home-section-title">

          <p>WHY CHOOSE US</p>

          <h2>
            Smart Food Freshness Detection
          </h2>

          <span>
            Making food quality analysis simple, fast and intelligent.
          </span>

        </div>


        <div className="feature-cards">

          <div className="feature-card">

            <div className="feature-icon">
              <FaRobot />
            </div>

            <h3>
              AI-Based Detection
            </h3>

            <p>
              Our system uses artificial intelligence
              to analyze uploaded food images.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              <FaChartLine />
            </div>

            <h3>
              Accurate Analysis
            </h3>

            <p>
              Get a freshness prediction along with
              the model's confidence score.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              <FaShieldAlt />
            </div>

            <h3>
              Simple & Secure
            </h3>

            <p>
              Easily upload images and securely access
              your food freshness analysis.
            </p>

          </div>

        </div>

      </section>


      {/* ================= HOW IT WORKS ================= */}

      <section className="home-how">

        <div className="home-section-title">

          <p>HOW IT WORKS</p>

          <h2>
            Check Food Freshness in 3 Steps
          </h2>

        </div>


        <div className="steps-container">

          <div className="step">

            <div className="step-number">
              1
            </div>

            <h3>
              Create Account
            </h3>

            <p>
              Register and securely log in to your account.
            </p>

          </div>


          <div className="step">

            <div className="step-number">
              2
            </div>

            <h3>
              Upload Image
            </h3>

            <p>
              Upload an image of the food you want to analyze.
            </p>

          </div>


          <div className="step">

            <div className="step-number">
              3
            </div>

            <h3>
              Get Prediction
            </h3>

            <p>
              Our AI model predicts whether the food is fresh or spoiled.
            </p>

          </div>

        </div>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="home-footer">

        <div className="home-logo">
          <FaLeaf />
          <span>Food Freshness Monitoring</span>
        </div>

        <p>
          AI-powered food freshness detection system
        </p>

        <span>
          © 2026 Food Freshness Monitoring
        </span>

      </footer>

    </div>
  );
}

export default Home;