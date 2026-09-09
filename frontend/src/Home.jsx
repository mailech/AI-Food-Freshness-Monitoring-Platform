import "./Home.css";

function Home({ onStart, onLogin }) {
  return (
    <div className="home-page">
      <nav className="home-navbar">
        <div className="home-brand">
          <div className="home-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>AI Food Freshness Monitoring</p>
          </div>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#about">About</a>
        </div>

        <div className="nav-buttons">
          <button
            className="login-btn"
            onClick={onLogin}
          >
            Login
          </button>

          <button
            className="get-started-btn"
            onClick={onStart}
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="home-hero" id="home">
        <div className="hero-left">
          <span className="hero-badge">
            🤖 AI-POWERED FOOD MONITORING
          </span>

          <h1>
            Know What's
            <br />
            <span>Fresh.</span>
            <br />
            Reduce Food Waste.
          </h1>

          <p>
            FreshGuard AI helps monitor food freshness using
            intelligent image analysis, freshness assessment,
            shelf-life prediction and smart alerts.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-hero-btn"
              onClick={onStart}
            >
              Start Monitoring →
            </button>

            <a
              href="#how-it-works"
              className="secondary-hero-btn"
            >
              Learn More
            </a>
          </div>

          <div className="hero-stats">
            <div>
              <strong>AI</strong>
              <span>Powered Analysis</span>
            </div>

            <div>
              <strong>24/7</strong>
              <span>Monitoring</span>
            </div>

            <div>
              <strong>Smart</strong>
              <span>Food Management</span>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="food-dashboard">
            <div className="dashboard-top">
              <span>Freshness Monitor</span>

              <span className="live-status">
                ● Live
              </span>
            </div>

            <div className="food-image">
              🍎
            </div>

            <div className="freshness-info">
              <div>
                <span>Current Status</span>
                <strong>Fresh</strong>
              </div>

              <div className="freshness-score">
                <span>Freshness Score</span>
                <strong>92%</strong>
              </div>
            </div>

            <div className="progress-bar">
              <div></div>
            </div>

            <div className="monitor-info">
              <div>
                <span>Storage</span>
                <strong>Optimal</strong>
              </div>

              <div>
                <span>Spoilage Risk</span>
                <strong>Low</strong>
              </div>
            </div>
          </div>

          <div className="floating-card card-one">
            🧠 AI Analysis
            <small>Food detected successfully</small>
          </div>

          <div className="floating-card card-two">
            ⏰ Shelf Life
            <small>Estimated monitoring active</small>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-title">
          <span>SMART MONITORING</span>

          <h2>
            Everything You Need to
            <br />
            Monitor Food Freshness
          </h2>

          <p>
            Intelligent tools designed to help you understand
            food condition and manage spoilage risk.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-box">
            <div className="feature-icon">🧠</div>

            <h3>AI Freshness Detection</h3>

            <p>
              Analyze food images using AI-based freshness
              classification and identify the condition of food.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">📊</div>

            <h3>Freshness Assessment</h3>

            <p>
              Get meaningful freshness information and
              monitor the condition of your food items.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">⏰</div>

            <h3>Shelf-Life Prediction</h3>

            <p>
              Estimate remaining shelf life and keep track
              of food items before they become unsafe.
            </p>
          </div>

          <div className="feature-box">
            <div className="feature-icon">🚨</div>

            <h3>Smart Alerts</h3>

            <p>
              Receive alerts when food requires attention
              because of spoilage or expiry risk.
            </p>
          </div>
        </div>
      </section>

      <section
        className="how-section"
        id="how-it-works"
      >
        <div className="section-title">
          <span>SIMPLE PROCESS</span>

          <h2>How FreshGuard AI Works</h2>

          <p>
            From food registration to intelligent monitoring,
            everything is designed to be simple.
          </p>
        </div>

        <div className="steps-container">
          <div className="step">
            <div className="step-number">01</div>

            <div className="step-icon">📦</div>

            <h3>Add Food</h3>

            <p>
              Register your food item and provide the
              required information.
            </p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">02</div>

            <div className="step-icon">📷</div>

            <h3>Upload Image</h3>

            <p>
              Upload a clear image of the food for AI analysis.
            </p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">03</div>

            <div className="step-icon">🤖</div>

            <h3>AI Analysis</h3>

            <p>
              The AI system analyzes the food and assesses
              its freshness.
            </p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">04</div>

            <div className="step-icon">📊</div>

            <h3>Monitor</h3>

            <p>
              Track freshness, shelf life and receive
              important alerts.
            </p>
          </div>
        </div>
      </section>

      <section
        className="about-section"
        id="about"
      >
        <div className="about-content">
          <span>ABOUT FRESHGUARD AI</span>

          <h2>
            Smarter Food Monitoring
            <br />
            With Artificial Intelligence
          </h2>

          <p>
            FreshGuard AI is designed to support intelligent
            food freshness monitoring by combining AI-based
            image analysis with monitoring, shelf-life
            prediction, recommendations and alerts.
          </p>

          <button
            className="about-button"
            onClick={onStart}
          >
            Start Monitoring →
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <strong>🍎 FreshGuard AI</strong>
          <p>AI Food Freshness Monitoring Platform</p>
        </div>

        <p>
          © 2026 FreshGuard AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default Home;