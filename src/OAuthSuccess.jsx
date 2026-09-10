import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("access_token", token);
      navigate("/dashboard");
    } else {
      alert("Google login failed.");
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div>
      <h2>Logging in with Google...</h2>
    </div>
  );
}

export default OAuthSuccess;