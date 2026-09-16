import { NavLink, useNavigate } from "react-router-dom";

function ConsumerSidebar() {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", icon: "⌂", path: "/dashboard" },
    { name: "Food Analysis", icon: "●", path: "/food-analysis" },
    { name: "Shelf Life", icon: "◷", path: "/shelf-life" },
    { name: "Storage Monitoring", icon: "♨", path: "/storage-monitoring" },
    { name: "Alerts", icon: "♢", path: "/alerts" },
    { name: "Reports", icon: "▤", path: "/reports" },
    { name: "My Inventory", icon: "📦", path: "/consumer-inventory" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("latest_prediction");
    navigate("/login");
  };

  return (
    <aside className="consumer-sidebar">
      <div className="consumer-sidebar-role">
        CONSUMER
      </div>

      <nav className="consumer-sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `consumer-sidebar-link ${
                isActive ? "consumer-sidebar-link-active" : ""
              }`
            }
          >
            <span className="consumer-sidebar-icon">
              {item.icon}
            </span>

            <span className="consumer-sidebar-label">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="consumer-sidebar-bottom">
        <button
          className="consumer-sidebar-link consumer-profile"
          onClick={() => navigate("/profile")}
        >
          <span className="consumer-sidebar-icon">◉</span>
          <span className="consumer-sidebar-label">
            Profile
          </span>
        </button>

        <button
          className="consumer-sidebar-link consumer-logout"
          onClick={handleLogout}
        >
          <span className="consumer-sidebar-icon">↪</span>
          <span className="consumer-sidebar-label">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}

export default ConsumerSidebar;