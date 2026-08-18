import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        🥗 Food Freshness Platform
      </Link>
      <nav className="navbar-links">
        <Link to="/">Dashboard</Link>
        <Link to="/add-item">Add Item</Link>
        <span className="navbar-user">Hi, {user?.name?.split(" ")[0]}</span>
        <button className="btn-link" onClick={handleLogout}>
          Log out
        </button>
      </nav>
    </header>
  );
}
