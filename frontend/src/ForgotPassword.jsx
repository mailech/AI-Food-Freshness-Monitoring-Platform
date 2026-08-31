import { useState } from "react";
import { Link } from "react-router-dom";
import "./Auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSent(true);
      } else {
        alert(data.message || "Unable to send reset email.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);

      alert(
        "Cannot connect to backend. Please make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-left">

        <div className="auth-brand">
          <div className="auth-logo">F</div>

          <div>
            <h2>FoodFresh</h2>
            <span>AI PLATFORM</span>
          </div>
        </div>

        <div className="auth-content">

          <span className="auth-label">
            FOOD FRESHNESS MONITORING
          </span>

          <h1>
            Keep your food
            <br />
            <span>fresh & safe.</span>
          </h1>

          <p>
            AI-powered freshness monitoring and shelf-life
            prediction for smarter food management.
          </p>

          <div className="auth-features">
            <div>✓ AI freshness detection</div>
            <div>✓ Shelf-life prediction</div>
            <div>✓ Smart recommendations</div>
          </div>

        </div>

      </div>


      <div className="auth-right">

        <div className="auth-card">

          <div className="mobile-brand">
            <div className="auth-logo">F</div>
            <strong>FoodFresh</strong>
          </div>

          {!sent ? (
            <>
              <div className="back-link">
                <Link to="/login">
                  ← Back to Login
                </Link>
              </div>

              <h1>Forgot password?</h1>

              <p className="auth-subtitle">
                No worries. Enter your email address and
                we'll help you reset your password.
              </p>

              <form onSubmit={handleSubmit}>

                <div className="form-group">

                  <label>Email Address</label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    required
                  />

                </div>

                <button
                  className="auth-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Sending..."
                    : "Send Reset Link →"}
                </button>

              </form>
            </>
          ) : (
            <>
              <div className="success-icon">
                ✓
              </div>

              <h1>Check your email</h1>

              <p className="auth-subtitle">
                We've sent password reset instructions to
                <strong> {email}</strong>.
              </p>

              <button
                className="auth-button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Try Another Email
              </button>

              <p className="register-text">
                Remember your password?{" "}
                <Link to="/login">
                  Sign in
                </Link>
              </p>
            </>
          )}

        </div>

      </div>

    </div>
  );
}

export default ForgotPassword;