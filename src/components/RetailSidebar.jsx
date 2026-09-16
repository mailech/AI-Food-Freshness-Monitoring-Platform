import { NavLink, useNavigate } from "react-router-dom";

function RetailSidebar() {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      icon: "⌂",
      path: "/dashboard",
    },
    {
      name: "Inventory",
      icon: "▣",
      path: "/inventory",
    },
    {
      name: "Batch Management",
      icon: "◆",
      path: "/batch-management",
    },
    {
      name: "Freshness Analysis",
      icon: "●",
      path: "/retail/freshness-analysis",
    },
    {
  name: "Shelf Life",
  icon: "◷",
  path: "/retail/shelf-life",
},
    {
  name: "Alerts",
  icon: "♢",
  path: "/retail/alerts",
},
    {
      name: "Recommendations",
      icon: "💡",
      path: "/retail/recommendations",
    },
    {
      name: "Analytics",
      icon: "▥",
      path: "/retail/analytics",
    },
    {
      name: "Waste Insights",
      icon: "♻",
      path: "/retail/waste-insights",
    },
    {
  name: "Storage & Compliance",
  icon: "♨",
  path: "/retail/storage-monitoring",
},
    {
  name: "Reports",
  icon: "▤",
  path: "/retail/reports",
},
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("latest_prediction");

    navigate("/login");
  };

  return (
    <aside className="retail-sidebar">

      {/* SECTION TITLE */}
      <div className="retail-sidebar-role">
        RETAIL MANAGEMENT
      </div>

      {/* MENU */}
      <nav className="retail-sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `retail-sidebar-link ${
                isActive ? "retail-sidebar-link-active" : ""
              }`
            }
          >
            <span className="retail-sidebar-icon">
              {item.icon}
            </span>

            <span className="retail-sidebar-label">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* BOTTOM */}
      <div className="retail-sidebar-bottom">

        <button
          className="retail-sidebar-link retail-profile"
          onClick={() => navigate("/profile")}
        >
          <span className="retail-sidebar-icon">
            ◉
          </span>

          <span className="retail-sidebar-label">
            Profile
          </span>
        </button>

        <button
          className="retail-sidebar-link retail-logout"
          onClick={handleLogout}
        >
          <span className="retail-sidebar-icon">
            ↪
          </span>

          <span className="retail-sidebar-label">
            Logout
          </span>
        </button>

      </div>

    </aside>
  );
}

export default RetailSidebar;