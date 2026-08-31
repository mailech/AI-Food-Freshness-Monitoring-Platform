import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Temporary registration
    localStorage.setItem(
      "foodfresh_user",
      JSON.stringify({
        name,
        email,
      })
    );

    alert("Account created successfully!");

    navigate("/login");
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
            JOIN FOODFRESH
          </span>

          <h1>
            Start reducing
            <br />
            <span>food waste today.</span>
          </h1>

          <p>
            Create your account and start monitoring food
            freshness with AI-powered insights.
          </p>

          <div className="auth-features">
            <div>✓ Track food inventory</div>
            <div>✓ Analyze freshness</div>
            <div>✓ Get intelligent alerts</div>
          </div>

        </div>

      </div>


      <div className="auth-right">

        <div className="auth-card">

          <div className="mobile-brand">
            <div className="auth-logo">F</div>
            <strong>FoodFresh</strong>
          </div>

          <h1>Create account</h1>

          <p className="auth-subtitle">
            Get started with FoodFresh
          </p>


          <form onSubmit={handleRegister}>

            <div className="form-group">
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>


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
              <label>Password</label>

              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>


            <div className="form-group">
              <label>Confirm Password</label>

              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
              />
            </div>


            <label className="terms">
              <input type="checkbox" required />
              <span>
                I agree to the Terms & Conditions
              </span>
            </label>


            <button className="auth-button" type="submit">
              Create Account →
            </button>

          </form>


          <p className="register-text">
            Already have an account?

            <Link to="/login">
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;