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

  const handleRegister = (e) => {
    e.preventDefault();

    if (!selectedRole) {
      alert("Please select your account type.");
      return;
    }

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUsers =
      JSON.parse(
        localStorage.getItem("foodfresh_registered_users")
      ) || [];

    const emailExists = existingUsers.some(
      (user) => user.email === normalizedEmail
    );

    if (emailExists) {
      alert("An account with this email already exists.");
      return;
    }

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: selectedRole,
    };

    existingUsers.push(newUser);

    localStorage.setItem(
      "foodfresh_registered_users",
      JSON.stringify(existingUsers)
    );

    alert("Account created successfully!");

    navigate("/login");
  };

  return (
    <div className="auth-page">

      {/* LEFT SIDE */}

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


      {/* RIGHT SIDE */}

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


          {/* ROLE SELECTION */}

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
                  gap: "15px",
                  marginTop: "25px",
                }}
              >

                {/* ADMINISTRATOR */}

                <button
                  type="button"
                  onClick={() => setSelectedRole("admin")}
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
                  onClick={() => setSelectedRole("user")}
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
                <span>or</span>
              </div>


              <p className="register-text">

                Already have an account?

                <Link to="/login">
                  Sign in
                </Link>

              </p>

            </>
          )}


          {/* REGISTRATION FORM */}

          {selectedRole && (
            <>

              <button
                type="button"
                onClick={() => setSelectedRole(null)}
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
                ← Change account type
              </button>


              <h1>
                Create account
              </h1>

              <p className="auth-subtitle">
                Register as{" "}

                <strong>
                  {selectedRole === "admin"
                    ? "Administrator"
                    : "User / Staff"}
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
                      setConfirmPassword(e.target.value)
                    }
                  />

                </div>


                {/* TERMS */}

                <label className="terms">

                  <input
                    type="checkbox"
                    required
                  />

                  <span>
                    I agree to the Terms & Conditions
                  </span>

                </label>


                {/* CREATE ACCOUNT */}

                <button
                  className="auth-button"
                  type="submit"
                >
                  Create Account →
                </button>

              </form>


              <p className="register-text">

                Already have an account?

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