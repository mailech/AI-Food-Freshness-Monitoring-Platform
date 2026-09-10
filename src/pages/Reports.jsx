function Reports() {
  const reports = [
    {
      icon: "🍎",
      title: "Freshness Report",
      description:
        "View food freshness scores, freshness status and spoilage analysis.",
      path: "/reports/freshness",
    },
    {
      icon: "📅",
      title: "Shelf-Life Report",
      description:
        "View estimated remaining shelf life of analyzed food items.",
      path: "/reports/shelf-life",
    },
    {
      icon: "📦",
      title: "Inventory Quality Report",
      description:
        "Review inventory items and their current quality information.",
      path: "/reports/inventory",
    },
    {
      icon: "🌡️",
      title: "Storage Compliance Report",
      description:
        "Review temperature, humidity and storage condition status.",
      path: "/reports/storage",
    },
    {
      icon: "♻️",
      title: "Waste Reduction Report",
      description:
        "Track spoiled and near-spoilage food to identify waste reduction opportunities.",
      path: "/reports/waste",
    },
  ];

  const handleViewReport = (path) => {
    window.location.href = path;
  };

  return (
    <div className="reports-page">

      <div className="reports-header">
        <h1>📊 Reports</h1>

        <p>
          Analyze food freshness, shelf-life, inventory and storage performance
        </p>
      </div>

      <div className="reports-grid">

        {reports.map((report, index) => (
          <div className="report-card" key={index}>

            <div className="report-icon">
              {report.icon}
            </div>

            <h2>{report.title}</h2>

            <p>{report.description}</p>

            <button
              className="view-report-btn"
              onClick={() => handleViewReport(report.path)}
            >
              View Report
            </button>

          </div>
        ))}

      </div>

    </div>
  );
}

export default Reports;