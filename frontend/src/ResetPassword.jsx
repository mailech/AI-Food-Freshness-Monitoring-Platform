import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updated, setUpdated] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert("Please fill in both fields.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setUpdated(true);
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
            AI-powered freshness monitoring and
            shelf-life prediction for smarter food management.
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

          {!updated ? (
            <>
              <div className="back-link">
                <Link to="/login">
                  ← Back to Login
                </Link>
              </div>

              <h1>Reset password</h1>

              <p className="auth-subtitle">
                Create a new password for your FoodFresh account.
              </p>

              <form onSubmit={handleSubmit}>

                <div className="form-group">
                  <label>New Password</label>

                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>

                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    required
                  />
                </div>

                <button
                  className="auth-button"
                  type="submit"
                >
                  Reset Password →
                </button>

              </form>
            </>
          ) : (
            <>
              <div className="success-icon">
                ✓
              </div>

              <h1>Password updated!</h1>

              <p className="auth-subtitle">
                Your password has been successfully updated.
                You can now sign in with your new password.
              </p>

              <button
                className="auth-button"
                onClick={() => navigate("/login")}
              >
                Continue to Login →
              </button>
            </>
          )}

        </div>

      </div>

    </div>
  );
}

export default ResetPassword;