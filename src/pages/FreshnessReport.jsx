import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

function FreshnessReport() {
    const downloadPDF = () => {
    if (!prediction) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Freshness Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Food Type: ${prediction.foodType || "N/A"}`, 20, 40);
    doc.text(`Status: ${prediction.status || "N/A"}`, 20, 50);
    doc.text(
      `Freshness Score: ${prediction.freshnessScore || "N/A"}/100`,
      20,
      60
    );
    doc.text(`AI Confidence: ${prediction.confidence || "N/A"}`, 20, 70);
    doc.text(
      `Estimated Shelf Life: ${prediction.shelfLife || "N/A"}`,
      20,
      80
    );

    doc.text("Recommendation:", 20, 100);

    const recommendation = prediction.recommendation || "N/A";

    const lines = doc.splitTextToSize(recommendation, 170);
    doc.text(lines, 20, 110);

    doc.save("Freshness_Report.pdf");
  };
  const downloadExcel = () => {
  if (!prediction) return;

  const reportData = [
    {
      "Food Type": prediction.foodType || "N/A",
      "Status": prediction.status || "N/A",
      "Freshness Score": prediction.freshnessScore || "N/A",
      "AI Confidence": prediction.confidence || "N/A",
      "Estimated Shelf Life": prediction.shelfLife || "N/A",
      "Recommendation": prediction.recommendation || "N/A",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Freshness Report");

  XLSX.writeFile(workbook, "Freshness_Report.xlsx");
};
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    const savedPrediction = localStorage.getItem("latest_prediction");

    if (savedPrediction) {
      const data = JSON.parse(savedPrediction);
      setPrediction(data);
    }
  }, []);

  return (
    <div className="report-detail-page">

      <div className="report-detail-header">
        <h1>🍎 Freshness Report</h1>
        <p>
          Detailed analysis of the latest food freshness prediction
        </p>
      </div>

      {!prediction ? (
        <div className="no-report-data">
          <div className="no-report-icon">📊</div>

          <h2>No Freshness Data Available</h2>

          <p>
            Upload a food image from the Dashboard to generate a freshness
            report.
          </p>
        </div>
      ) : (
        <div className="freshness-report-card">

          {/* MAIN RESULT */}

          <div className="freshness-main-result">

            <div className="freshness-icon">
              {prediction.foodEmoji}
            </div>

            <p>Latest Food Prediction</p>

            <h2
              className={
                prediction.status === "Fresh"
                  ? "report-fresh"
                  : "report-spoiled"
              }
            >
              {prediction.status}
            </h2>
            <button className="download-report-btn" onClick={downloadPDF}>
  📄 Download PDF
</button>


<button className="download-report-btn" onClick={downloadExcel}>
  📊 Download Excel
</button>
          </div>


          {/* FRESHNESS SCORE */}

          <div className="freshness-score-section">

            <p>Overall Freshness Score</p>

            <div className="freshness-score">
              {prediction.freshnessScore}
              <span>/100</span>
            </div>

          </div>


          {/* INFORMATION */}

          <div className="report-info">

            <div className="report-info-box">
              <span>AI Confidence</span>

              <strong>
                {prediction.confidence || "N/A"}
              </strong>
            </div>


            <div className="report-info-box">
              <span>Food Type</span>

              <strong>
                {prediction.foodType || "N/A"}
              </strong>
            </div>


            <div className="report-info-box">
              <span>Estimated Shelf Life</span>

              <strong>
                {prediction.shelfLife || "N/A"}
              </strong>
            </div>


            <div className="report-info-box recommendation-box">
              <span>Recommendation</span>

              <strong>
                {prediction.recommendation || "N/A"}
              </strong>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default FreshnessReport;