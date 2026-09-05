import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRoleSelect = (role) => {
    setSelectedRole(role);

    setEmail("");
    setPassword("");
    setError("");
  };


  const handleBack = () => {
    setSelectedRole(null);

    setEmail("");
    setPassword("");
    setError("");
  };


  const handleLogin = (e) => {
    e.preventDefault();

    setError("");

    if (!selectedRole) {
      setError("Please select your role.");
      return;
    }

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    const normalizedEmail =
      email.toLowerCase().trim();


    // =========================================
    // ADMIN DEMO ACCOUNT
    // =========================================

    if (
      selectedRole === "admin" &&
      normalizedEmail === "admin@foodfresh.com" &&
      password === "admin123"
    ) {

      const user = {
        name: "Administrator",
        email: "admin@foodfresh.com",
        role: "admin",
      };

      localStorage.setItem(
        "foodfresh_logged_in",
        "true"
      );

      localStorage.setItem(
        "foodfresh_user",
        JSON.stringify(user)
      );

      navigate("/dashboard");

      return;
    }


    // =========================================
    // USER DEMO ACCOUNT
    // =========================================

    if (
      selectedRole === "user" &&
      normalizedEmail === "user@foodfresh.com" &&
      password === "user123"
    ) {

      const user = {
        name: "Food Staff",
        email: "user@foodfresh.com",
        role: "user",
      };

      localStorage.setItem(
        "foodfresh_logged_in",
        "true"
      );

      localStorage.setItem(
        "foodfresh_user",
        JSON.stringify(user)
      );

      navigate("/dashboard");

      return;
    }


    // =========================================
    // REGISTERED USERS
    // =========================================

    const registeredUsers =
      JSON.parse(
        localStorage.getItem(
          "foodfresh_registered_users"
        )
      ) || [];


    const registeredUser =
      registeredUsers.find(
        (user) =>
          user.email === normalizedEmail &&
          user.password === password &&
          user.role === selectedRole
      );


    if (registeredUser) {

      const loggedInUser = {
        name: registeredUser.name,
        email: registeredUser.email,
        role: registeredUser.role,
      };


      localStorage.setItem(
        "foodfresh_logged_in",
        "true"
      );

      localStorage.setItem(
        "foodfresh_user",
        JSON.stringify(loggedInUser)
      );


      navigate("/dashboard");

      return;
    }


    // =========================================
    // INVALID LOGIN
    // =========================================

    if (selectedRole === "admin") {

      setError(
        "Invalid Administrator email or password."
      );

    } else {

      setError(
        "Invalid User / Staff email or password."
      );

    }
  };


  return (
    <div className="auth-page">

      {/* ===================================== */}
      {/* LEFT SIDE */}
      {/* ===================================== */}

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


      {/* ===================================== */}
      {/* RIGHT SIDE */}
      {/* ===================================== */}

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


          {/* ================================= */}
          {/* ROLE SELECTION */}
          {/* ================================= */}

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
                  gap: "15px",
                  marginTop: "30px",
                }}
              >

                {/* ADMINISTRATOR */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect("admin")
                  }
                  style={{
                    width: "100%",
                    padding: "20px",
                    border: "1px solid #dce8df",
                    borderRadius: "12px",
                    background: "#f8fcf9",
                    color: "#12372a",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "15px",
                  }}
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
                    Manage platform, inventory and analytics
                  </span>

                </button>


                {/* USER / STAFF */}

                <button
                  type="button"
                  onClick={() =>
                    handleRoleSelect("user")
                  }
                  style={{
                    width: "100%",
                    padding: "20px",
                    border: "1px solid #dce8df",
                    borderRadius: "12px",
                    background: "#f8fcf9",
                    color: "#12372a",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "15px",
                  }}
                >

                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      marginBottom: "5px",
                    }}
                  >
                    👤 User / Staff
                  </strong>


                  <span>
                    Monitor food freshness and daily operations
                  </span>

                </button>

              </div>


              <div className="divider">
                <span>
                  or
                </span>
              </div>


              <p className="register-text">

                Don't have an account?

                <Link to="/register">
                  Create an account
                </Link>

              </p>

            </>

          )}


          {/* ================================= */}
          {/* LOGIN FORM */}
          {/* ================================= */}

          {selectedRole && (

            <>

              {/* CHANGE ROLE */}

              <button
                type="button"
                onClick={handleBack}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
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
                  {selectedRole === "admin"
                    ? "Administrator"
                    : "User / Staff"}
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
                  />

                </div>


                {/* ERROR MESSAGE */}

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


                {/* REMEMBER ME */}

                <label className="remember">

                  <input
                    type="checkbox"
                  />

                  <span>
                    Remember me
                  </span>

                </label>


                {/* SIGN IN */}

                <button
                  className="auth-button"
                  type="submit"
                >
                  Sign In →
                </button>

              </form>


              <div className="divider">

                <span>
                  or
                </span>

              </div>


              {/* DEMO ACCOUNT */}

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
                  Demo Login
                </strong>


                {selectedRole === "admin" ? (

                  <>

                    <div>
                      <strong>
                        Administrator
                      </strong>
                    </div>

                    <div>
                      admin@foodfresh.com
                    </div>

                    <div>
                      Password: admin123
                    </div>

                  </>

                ) : (

                  <>

                    <div>
                      <strong>
                        User / Staff
                      </strong>
                    </div>

                    <div>
                      user@foodfresh.com
                    </div>

                    <div>
                      Password: user123
                    </div>

                  </>

                )}

              </div>


              {/* REGISTER */}

              <p className="register-text">

                Don't have an account?

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