import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================================================
  // ROLE INFORMATION
  // ============================================================

  const roleDetails = {
    admin: {
      name: "Administrator",
      icon: "👑",
      description:
        "Manage users, platform, inventory and analytics",
    },

    consumer: {
      name: "Consumer",
      icon: "👤",
      description:
        "Check food freshness, shelf life and recommendations",
    },

    retail_manager: {
      name: "Retail Manager",
      icon: "🏪",
      description:
        "Monitor inventory, freshness and shelf-life alerts",
    },

    warehouse_operator: {
      name: "Warehouse Operator",
      icon: "📦",
      description:
        "Manage storage conditions, batches and inventory",
    },

    quality_inspector: {
      name: "Food Quality Inspector",
      icon: "🔍",
      description:
        "Analyze food quality, spoilage and freshness",
    },
  };

  // ============================================================
  // ROLE SELECT
  // ============================================================

  const handleRoleSelect = (role) => {
    setSelectedRole(role);

    setEmail("");
    setPassword("");
    setError("");
  };

  // ============================================================
  // BACK / CHANGE ROLE
  // ============================================================

  const handleBack = () => {
    setSelectedRole(null);

    setEmail("");
    setPassword("");
    setError("");
  };

  // ============================================================
  // LOGIN - FASTAPI JWT
  // ============================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    // Check role
    if (!selectedRole) {
      setError("Please select your role.");
      return;
    }

    // Check fields
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    setLoading(true);

    try {
      // ========================================================
      // CALL FASTAPI LOGIN
      // ========================================================

      const response = await fetch(
        "http://127.0.0.1:8000/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            email: normalizedEmail,
            password: password,
            role: selectedRole,
          }),
        }
      );

      const data = await response.json();

      // ========================================================
      // LOGIN ERROR
      // ========================================================

      if (!response.ok) {
        setError(
          data.detail ||
            `Invalid ${roleDetails[selectedRole].name} email or password.`
        );

        return;
      }

      // ========================================================
      // SAVE JWT TOKEN
      // ========================================================

      localStorage.setItem(
        "foodfresh_access_token",
        data.access_token
      );

      // ========================================================
      // SAVE LOGIN STATE
      // ========================================================

      localStorage.setItem(
        "foodfresh_logged_in",
        "true"
      );

      // ========================================================
      // SAVE USER INFORMATION
      // ========================================================

      localStorage.setItem(
        "foodfresh_user",
        JSON.stringify(data.user)
      );

      // ========================================================
      // CLEAR FORM
      // ========================================================

      setEmail("");
      setPassword("");
      setError("");

      // ========================================================
      // GO TO DASHBOARD
      // ========================================================

      navigate("/dashboard");

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      setError(
        "Unable to connect to the FoodFresh server. Please make sure the backend is running."
      );

    } finally {

      setLoading(false);

    }
  };

  // ============================================================
  // ROLE BUTTON STYLE
  // ============================================================

  const roleButtonStyle = {
    width: "100%",
    padding: "18px",
    border: "1px solid #dce8df",
    borderRadius: "12px",
    background: "#f8fcf9",
    color: "#12372a",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="auth-page">

      {/* ====================================================== */}
      {/* LEFT SIDE */}
      {/* ====================================================== */}

      <div className="auth-left">

        <div className="auth-brand">

          <div className="auth-logo">
            F
          </div>

          <div>
            <h2>FoodFresh</h2>
            <span>AI PLATFORM</span>
          </div>

        </div>

        <div className="auth-content">

          <span className="auth-label">
            AI-POWERED FOOD SAFETY
          </span>

          <h1>
            Smarter food.
            <br />
            <span>
              Less waste.
            </span>
          </h1>

          <p>
            Monitor food freshness, predict shelf life,
            and reduce food waste with intelligent
            AI-powered analysis.
          </p>

          <div className="auth-features">

            <div>
              ✓ AI freshness detection
            </div>

            <div>
              ✓ Shelf-life prediction
            </div>

            <div>
              ✓ Smart recommendations
            </div>

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* RIGHT SIDE */}
      {/* ====================================================== */}

      <div className="auth-right">

        <div className="auth-card">

          {/* ================================================== */}
          {/* MOBILE BRAND */}
          {/* ================================================== */}

          <div className="mobile-brand">

            <div className="auth-logo">
              F
            </div>

            <strong>
              FoodFresh
            </strong>

          </div>

          {/* ================================================== */}
          {/* ROLE SELECTION */}
          {/* ================================================== */}

          {!selectedRole && (

            <>

              <h1>
                Select your role
              </h1>

              <p className="auth-subtitle">
                Choose how you want to access FoodFresh
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "30px",
                }}
              >

                {/* ADMINISTRATOR */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect("admin")
                  }
                  style={roleButtonStyle}
                >

                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "5px",
                    }}
                  >
                    👑 Administrator
                  </strong>

                  <span>
                    Manage users, platform, inventory
                    and analytics
                  </span>

                </button>

                {/* CONSUMER */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect("consumer")
                  }
                  style={roleButtonStyle}
                >

                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "5px",
                    }}
                  >
                    👤 Consumer
                  </strong>

                  <span>
                    Check food freshness, shelf life
                    and recommendations
                  </span>

                </button>

                {/* RETAIL MANAGER */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect("retail_manager")
                  }
                  style={roleButtonStyle}
                >

                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "5px",
                    }}
                  >
                    🏪 Retail Manager
                  </strong>

                  <span>
                    Monitor inventory, freshness and
                    shelf-life alerts
                  </span>

                </button>

                {/* WAREHOUSE OPERATOR */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect(
                      "warehouse_operator"
                    )
                  }
                  style={roleButtonStyle}
                >

                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "5px",
                    }}
                  >
                    📦 Warehouse Operator
                  </strong>

                  <span>
                    Manage storage conditions,
                    batches and inventory
                  </span>

                </button>

                {/* FOOD QUALITY INSPECTOR */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect(
                      "quality_inspector"
                    )
                  }
                  style={roleButtonStyle}
                >

                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "5px",
                    }}
                  >
                    🔍 Food Quality Inspector
                  </strong>

                  <span>
                    Analyze food quality, spoilage
                    and freshness
                  </span>

                </button>

              </div>

              {/* DIVIDER */}

              <div className="divider">

                <span>
                  or
                </span>

              </div>

              {/* REGISTER */}

              <p className="register-text">

                Don't have an account?{" "}

                <Link to="/register">
                  Create an account
                </Link>

              </p>

            </>

          )}

          {/* ================================================== */}
          {/* LOGIN FORM */}
          {/* ================================================== */}

          {selectedRole && (

            <>

              {/* CHANGE ROLE */}

              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  color: "#19744b",
                  marginBottom: "15px",
                  fontSize: "14px",
                }}
              >
                ← Change role
              </button>

              <h1>
                Welcome back
              </h1>

              <p className="auth-subtitle">

                Sign in as{" "}

                <strong>
                  {roleDetails[selectedRole].name}
                </strong>

              </p>

              <form onSubmit={handleLogin}>

                {/* EMAIL */}

                <div className="form-group">

                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    disabled={loading}
                    autoComplete="email"
                  />

                </div>

                {/* PASSWORD */}

                <div className="form-group">

                  <div className="password-label">

                    <label>
                      Password
                    </label>

                    <Link to="/forgot-password">
                      Forgot password?
                    </Link>

                  </div>

                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    disabled={loading}
                    autoComplete="current-password"
                  />

                </div>

                {/* ERROR */}

                {error && (

                  <div
                    style={{
                      color: "#d64545",
                      background: "#fff1f1",
                      border: "1px solid #ffd5d5",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "15px",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </div>

                )}

                {/* REMEMBER ME */}

                <label className="remember">

                  <input
                    type="checkbox"
                    disabled={loading}
                  />

                  <span>
                    Remember me
                  </span>

                </label>

                {/* SIGN IN */}

                <button
                  className="auth-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Signing In..."
                    : "Sign In →"}
                </button>

              </form>

              {/* DIVIDER */}

              <div className="divider">

                <span>
                  or
                </span>

              </div>

              {/* ACCOUNT INFORMATION */}

              <div
                style={{
                  background: "#f6faf7",
                  border: "1px solid #e1eee5",
                  borderRadius: "10px",
                  padding: "14px",
                  marginTop: "10px",
                  marginBottom: "18px",
                  fontSize: "13px",
                }}
              >

                <strong
                  style={{
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {roleDetails[selectedRole].name}
                </strong>

                <div>
                  Use your registered account
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color: "#64748b",
                  }}
                >
                  Your account is authenticated
                  securely using JWT.
                </div>

              </div>

              {/* REGISTER */}

              <p className="register-text">

                Don't have an account?{" "}

                <Link to="/register">
                  Create an account
                </Link>

              </p>

            </>

          )}

        </div>

      </div>

    </div>
  );
}

export default Login;