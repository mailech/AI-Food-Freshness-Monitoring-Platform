import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaLeaf } from "react-icons/fa";
import "../App.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const navigate = useNavigate();

const handleLogin = async () => {
  if (email.trim() === "" || password.trim() === "") {
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

  try {
    const response = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail);
      return;
    }

    localStorage.setItem("access_token", data.access_token);

    alert(data.message);
    navigate("/dashboard");
  } catch (error) {
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
          AI-powered system to identify fresh and spoiled food with speed and
          accuracy.
        </p>

        <div className="feature">✅ Fresh Food Detection</div>
        <div className="feature">🤖 AI-Based Prediction</div>
        <div className="feature">⚡ Fast Analysis</div>
        <div className="feature">📊 Accurate Results</div>

      </div>

      {/* Right Panel */}
      <div className="right-panel">
        <div className="form-card">

          <h2>Login</h2>
          <p>Welcome back! Login to continue.</p>

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

          <button className="green-btn" onClick={handleLogin}>
  Login
</button>

          <p className="register">
            Don't have an account? <Link to="/register">Register</Link>
          </p>

        </div>
      </div>

    </div>
  );
}

export default Login;