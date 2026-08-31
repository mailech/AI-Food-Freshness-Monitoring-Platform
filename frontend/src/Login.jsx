import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    // Temporary frontend login
    localStorage.setItem("foodfresh_logged_in", "true");

    navigate("/dashboard");
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
          <span className="auth-label">AI-POWERED FOOD SAFETY</span>

          <h1>
            Smarter food.
            <br />
            <span>Less waste.</span>
          </h1>

          <p>
            Monitor food freshness, predict shelf life, and reduce
            food waste with intelligent AI-powered analysis.
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

          <h1>Welcome back</h1>

          <p className="auth-subtitle">
            Sign in to your FoodFresh account
          </p>


          <form onSubmit={handleLogin}>

            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>


            <div className="form-group">
              <div className="password-label">
                <label>Password</label>
                <Link to="/forgot-password">
                    Forgot password?
                </Link>
              </div>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>


            <label className="remember">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>


            <button className="auth-button" type="submit">
              Sign In →
            </button>

          </form>


          <div className="divider">
            <span>or</span>
          </div>


          <p className="register-text">
            Don't have an account?

            <Link to="/register">
              Create an account
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;