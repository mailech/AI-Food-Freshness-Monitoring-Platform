import { useState } from "react";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLeaf } from "react-icons/fa";
import "../App.css";

function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const handleRegister = async () => {
  if (
    name.trim() === "" ||
    email.trim() === "" ||
    password.trim() === "" ||
    confirmPassword.trim() === ""
  ) {
    alert("Please fill all the details.");
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    alert("Please enter a valid email address.");
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

  try {
    const response = await fetch("http://127.0.0.1:8000/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Registration failed.");
      return;
    }

    alert(data.message);

  } catch (error) {
    console.error(error);
    alert("Unable to connect to the server.");
  }
};
  return (
    <div className="container">

      {/* Left Panel */}
      <div className="left-panel">

  <div className="logo">
  <FaLeaf />
</div>

  <h1>Food Freshness Monitoring</h1>

  <p>
    AI-powered system to identify fresh and spoiled food with speed and accuracy.
  </p>

  <div className="feature">
    ✅ Fresh Food Detection
  </div>

  <div className="feature">
    🤖 AI-Based Prediction
  </div>

  <div className="feature">
    ⚡ Fast Analysis
  </div>

  <div className="feature">
    📊 Accurate Results
  </div>

</div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="form-card">

          <h2>Register</h2>
          <p>Create your account</p>

          <input
  type="text"
  placeholder="Full Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

          <input
  type="email"
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

          <div className="password-box">
            <input
  type={showPassword ? "text" : "password"}
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

            <span
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="password-box">
            <input
  type={showConfirmPassword ? "text" : "password"}
  placeholder="Confirm Password"
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
/>

            <span
              className="eye-icon"
              onClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            >
              {showConfirmPassword ? (
                <FaEyeSlash />
              ) : (
                <FaEye />
              )}
            </span>
          </div>

          <button className="green-btn" onClick={handleRegister}>
  Create Account
</button>

          <p className="register">
            Already have an account?{" "}
            <Link to="/">Login</Link>
          </p>

        </div>
      </div>

    </div>
  );
}

export default Register;