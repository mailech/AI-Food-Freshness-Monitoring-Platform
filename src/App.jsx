import { Routes, Route } from "react-router-dom";
import Home from "./home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <Routes>

      {/* Home Page */}
      <Route path="/" element={<Home />} />

      {/* Login Page */}
      <Route path="/login" element={<Login />} />

      {/* Register Page */}
      <Route path="/register" element={<Register />} />

      {/* Dashboard Page */}
      <Route path="/dashboard" element={<Dashboard />} />

    </Routes>
  );
}

export default App;