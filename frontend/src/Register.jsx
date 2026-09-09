import { useState } from "react";
import "./Register.css";

function Register({ onRegister, onLogin, onHome }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password === confirmPassword) {
      onRegister();
    } else {
      alert("Passwords do not match");
    }
  };

  return (
    <div className="register-page">
      <div className="register-left">
        <div className="register-brand">
          <div className="register-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>AI Food Freshness Monitoring</p>
          </div>
        </div>

        <div className="register-left-content">
          <span className="register-badge">
            🌱 SMART FOOD MANAGEMENT
          </span>

          <h1>
            Start Your
            <br />
            <span>Freshness</span>
            <br />
            Journey.
          </h1>

          <p>
            Create your FreshGuard AI account and start
            monitoring food freshness intelligently.
          </p>

          <div className="register-benefits">
            <div>
              <span>✓</span>
              <p>Monitor food freshness</p>
            </div>

            <div>
              <span>✓</span>
              <p>Predict remaining shelf life</p>
            </div>

            <div>
              <span>✓</span>
              <p>Get smart recommendations and alerts</p>
            </div>
          </div>
        </div>

        <div className="register-left-footer">
          © 2026 FreshGuard AI
        </div>
      </div>

      <div className="register-right">
        <div className="register-card">
          <button
            className="register-back-home"
            onClick={onHome}
          >
            ← Back to Home
          </button>

          <div className="register-heading">
            <h1>Create Account</h1>
            <p>
              Join FreshGuard AI and start monitoring your food.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="register-input-group">
              <label>Full Name</label>

              <div className="register-input-wrapper">
                <span>👤</span>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="register-input-group">
              <label>Email Address</label>

              <div className="register-input-wrapper">
                <span>✉</span>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="register-input-group">
              <label>Password</label>

              <div className="register-input-wrapper">
                <span>🔒</span>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="register-eye-btn"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="register-input-group">
              <label>Confirm Password</label>

              <div className="register-input-wrapper">
                <span>🔒</span>

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="register-eye-btn"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <label className="terms-check">
              <input type="checkbox" required />
              <span>
                I agree to the Terms & Conditions and Privacy Policy
              </span>
            </label>

            <button
              type="submit"
              className="register-submit-btn"
            >
              Create Account →
            </button>
          </form>

          <div className="already-account">
            Already have an account?
          </div>

          <button
            className="register-login-btn"
            onClick={onLogin}
          >
            Login
          </button>

          <p className="register-security">
            🔐 Your information is securely protected
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;