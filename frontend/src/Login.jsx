import { useState } from "react";
import "./Login.css";

function Login({ onLogin, onRegister, onHome }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (email && password) {
      onLogin();
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>AI Food Freshness Monitoring</p>
          </div>
        </div>

        <div className="login-left-content">
          <span className="login-badge">
            🤖 AI-POWERED FOOD MONITORING
          </span>

          <h1>
            Smarter Food
            <br />
            <span>Freshness</span>
            <br />
            Monitoring.
          </h1>

          <p>
            Monitor food freshness, predict shelf life and
            reduce food waste with intelligent AI technology.
          </p>

          <div className="login-benefits">
            <div>
              <span>✓</span>
              <p>AI-based freshness analysis</p>
            </div>

            <div>
              <span>✓</span>
              <p>Shelf-life prediction</p>
            </div>

            <div>
              <span>✓</span>
              <p>Smart alerts and recommendations</p>
            </div>
          </div>
        </div>

        <div className="login-left-footer">
          © 2026 FreshGuard AI
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <button
            className="back-home-btn"
            onClick={onHome}
          >
            ← Back to Home
          </button>

          <div className="login-heading">
            <h1>Welcome Back!</h1>

            <p>
              Login to continue monitoring your food freshness.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>

              <div className="input-wrapper">
                <span className="input-icon">✉</span>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="password-label">
                <label>Password</label>

                <button
                  type="button"
                  className="forgot-password"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="input-wrapper">
                <span className="input-icon">🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="show-password-btn"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
            >
              Login →
            </button>
          </form>

          <div className="register-divider">
            <span>Don't have an account?</span>
          </div>

          <button
            className="create-account-btn"
            onClick={onRegister}
          >
            Create Account
          </button>

          <p className="login-security">
            🔐 Your information is securely protected
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;