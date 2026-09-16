import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
  // REGISTER
  // ============================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (!selectedRole) {
      setError("Please select your account type.");
      return;
    }

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    setLoading(true);

    try {
      // ========================================================
      // CALL FASTAPI REGISTER
      // ========================================================

      const response = await fetch(
        "http://127.0.0.1:8000/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            email: normalizedEmail,
            password: password,
            role: selectedRole,
          }),
        }
      );

      const data = await response.json();

      // ========================================================
      // REGISTRATION ERROR
      // ========================================================

      if (!response.ok) {
        setError(
          data.detail ||
            "Unable to create account."
        );

        return;
      }

      // ========================================================
      // SUCCESS
      // ========================================================

      alert(
        "Account created successfully! Please sign in."
      );

      // Clear form

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setSelectedRole(null);

      // Go to login

      navigate("/login");

    } catch (error) {

      console.error(
        "REGISTRATION ERROR:",
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
            JOIN FOODFRESH
          </span>

          <h1>
            Start reducing
            <br />
            <span>
              food waste today.
            </span>
          </h1>

          <p>
            Create your account and start monitoring
            food freshness with AI-powered insights.
          </p>

          <div className="auth-features">

            <div>
              ✓ Track food inventory
            </div>

            <div>
              ✓ Analyze freshness
            </div>

            <div>
              ✓ Get intelligent alerts
            </div>

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* RIGHT SIDE */}
      {/* ====================================================== */}

      <div className="auth-right">

        <div className="auth-card">

          {/* MOBILE BRAND */}

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
                Create account
              </h1>

              <p className="auth-subtitle">
                Choose your account type
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "25px",
                }}
              >

                {/* ADMINISTRATOR */}

                <button
                  type="button"
                  onClick={() =>
                    setSelectedRole("admin")
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
                    setSelectedRole("consumer")
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
                    setSelectedRole("retail_manager")
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
                    setSelectedRole(
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
                    setSelectedRole(
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

              <div className="divider">
                <span>or</span>
              </div>

              <p className="register-text">

                Already have an account?{" "}

                <Link to="/login">
                  Sign in
                </Link>

              </p>

            </>

          )}

          {/* ================================================== */}
          {/* REGISTRATION FORM */}
          {/* ================================================== */}

          {selectedRole && (

            <>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setError("");
                }}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#19744b",
                  marginBottom: "15px",
                  fontSize: "14px",
                }}
                disabled={loading}
              >
                ← Change account type
              </button>

              <h1>
                Create account
              </h1>

              <p className="auth-subtitle">

                Register as{" "}

                <strong>
                  {roleDetails[selectedRole].name}
                </strong>

              </p>

              <form onSubmit={handleRegister}>

                {/* NAME */}

                <div className="form-group">

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    disabled={loading}
                  />

                </div>

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
                  />

                </div>

                {/* PASSWORD */}

                <div className="form-group">

                  <label>
                    Password
                  </label>

                  <input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    disabled={loading}
                  />

                </div>

                {/* CONFIRM PASSWORD */}

                <div className="form-group">

                  <label>
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    disabled={loading}
                  />

                </div>

                {/* ERROR */}

                {error && (

                  <div
                    style={{
                      color: "#d64545",
                      background: "#fff1f1",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "15px",
                      fontSize: "14px",
                    }}
                  >
                    {error}
                  </div>

                )}

                {/* TERMS */}

                <label className="terms">

                  <input
                    type="checkbox"
                    required
                    disabled={loading}
                  />

                  <span>
                    I agree to the Terms & Conditions
                  </span>

                </label>

                {/* CREATE ACCOUNT */}

                <button
                  className="auth-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Creating Account..."
                    : "Create Account →"}
                </button>

              </form>

              <p className="register-text">

                Already have an account?{" "}

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

export default Register;