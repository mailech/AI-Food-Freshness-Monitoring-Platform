import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

function FreshnessReport() {
  const [prediction, setPrediction] = useState(null);
  const [predictions, setPredictions] = useState([]);

  // ================= DOWNLOAD PDF =================

  const downloadPDF = () => {
  if (predictions.length === 0) return;

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("Freshness Report", 20, 20);

  doc.setFontSize(10);

  let y = 35;

  predictions.forEach((item, index) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.text(`Analysis ${index + 1}`, 20, y);

    doc.setFontSize(10);

    doc.text(
      `Food Type: ${item.foodType || "N/A"}`,
      20,
      y + 10
    );

    doc.text(
      `Status: ${item.status || "N/A"}`,
      20,
      y + 18
    );

    doc.text(
      `Freshness Score: ${
        item.freshnessScore || "N/A"
      }/100`,
      20,
      y + 26
    );

    doc.text(
      `AI Confidence: ${
        item.confidence || "N/A"
      }`,
      20,
      y + 34
    );

    doc.text(
      `Estimated Shelf Life: ${
        item.shelfLife || "N/A"
      }`,
      20,
      y + 42
    );

    doc.text(
      `Recommendation: ${
        item.recommendation || "N/A"
      }`,
      20,
      y + 50
    );

    y += 65;
  });

  doc.save("Freshness_Report.pdf");
};

  // ================= DOWNLOAD EXCEL =================

 const downloadExcel = () => {
  if (predictions.length === 0) return;

  const reportData = predictions.map((item, index) => ({
    "Analysis No.": index + 1,
    "Food Type": item.foodType || "N/A",
    "Status": item.status || "N/A",
    "Freshness Score": item.freshnessScore || "N/A",
    "AI Confidence": item.confidence || "N/A",
    "Estimated Shelf Life": item.shelfLife || "N/A",
    "Recommendation": item.recommendation || "N/A",
  }));

  const worksheet =
    XLSX.utils.json_to_sheet(reportData);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Freshness History"
  );

  XLSX.writeFile(
    workbook,
    "Freshness_Report.xlsx"
  );
};

  // ================= LOAD PREDICTIONS =================

  useEffect(() => {
    // Load latest prediction
    const savedPrediction =
      localStorage.getItem(
        "latest_prediction"
      );

    if (savedPrediction) {
      try {
        const data =
          JSON.parse(savedPrediction);

        setPrediction(data);
      } catch (error) {
        setPrediction(null);
      }
    }

    // Load prediction history
    const savedHistory =
      localStorage.getItem(
        "prediction_history"
      );

    if (savedHistory) {
      try {
        const history =
          JSON.parse(savedHistory);

        setPredictions(history);
      } catch (error) {
        setPredictions([]);
      }
    }
  }, []);

  // ================= UI =================

  return (
    <div className="report-detail-page">

      {/* ================= HEADER ================= */}

      <div className="report-detail-header">

        <h1>
          🍎 Freshness Report
        </h1>

        <p>
          Detailed analysis of the latest
          food freshness prediction
        </p>

      </div>

      {/* ================= LATEST PREDICTION ================= */}

      {!prediction ? (

        <div className="no-report-data">

          <div className="no-report-icon">
            📊
          </div>

          <h2>
            No Freshness Data Available
          </h2>

          <p>
            Upload a food image from the
            Dashboard to generate a
            freshness report.
          </p>

        </div>

      ) : (

        <div className="freshness-report-card">

          {/* ================= MAIN RESULT ================= */}

          <div className="freshness-main-result">

            <div className="freshness-icon">
              {prediction.foodEmoji}
            </div>

            <p>
              Latest Food Prediction
            </p>

            <h2
              className={
                prediction.status === "Fresh"
                  ? "report-fresh"
                  : "report-spoiled"
              }
            >
              {prediction.status}
            </h2>

            {/* ================= PDF BUTTON ================= */}

            <button
              className="download-report-btn"
              onClick={downloadPDF}
            >
              📄 Download PDF
            </button>

            {/* ================= EXCEL BUTTON ================= */}

            <button
              className="download-report-btn"
              onClick={downloadExcel}
            >
              📊 Download Excel
            </button>

          </div>

          {/* ================= FRESHNESS SCORE ================= */}

          <div className="freshness-score-section">

            <p>
              Overall Freshness Score
            </p>

            <div className="freshness-score">

              {prediction.freshnessScore}

              <span>
                /100
              </span>

            </div>

          </div>

          {/* ================= INFORMATION ================= */}

          <div className="report-info">

            {/* AI CONFIDENCE */}

            <div className="report-info-box">

              <span>
                AI Confidence
              </span>

              <strong>
                {prediction.confidence ||
                  "N/A"}
              </strong>

            </div>

            {/* FOOD TYPE */}

            <div className="report-info-box">

              <span>
                Food Type
              </span>

              <strong className="fruit-name">
                {prediction.foodType ||
                  "N/A"}
              </strong>

            </div>

            {/* SHELF LIFE */}

            <div className="report-info-box">

              <span>
                Estimated Shelf Life
              </span>

              <strong
                className={
                  prediction.status === "Fresh"
                    ? "status-fresh"
                    : "status-spoiled"
                }
              >
                {prediction.shelfLife ||
                  "N/A"}
              </strong>

            </div>

            {/* RECOMMENDATION */}

            <div className="report-info-box recommendation-box">

              <span>
                Recommendation
              </span>

              <strong
                className={
                  prediction.status === "Fresh"
                    ? "status-fresh"
                    : "status-spoiled"
                }
              >
                {prediction.recommendation ||
                  "N/A"}
              </strong>

            </div>

          </div>

        </div>

      )}

      {/* ================= PREDICTION HISTORY ================= */}

      {predictions.length > 0 && (

        <div className="shelf-life-table-container">

          <h2>
            📋 Previous Analyzed Items
          </h2>

          <table className="shelf-life-table">

            <thead>

              <tr>
                <th>Food Item</th>
                <th>Food Status</th>
                <th>Freshness Score</th>
                <th>AI Confidence</th>
                <th>Estimated Shelf Life</th>
                <th>Recommendation</th>
              </tr>

            </thead>

            <tbody>

              {predictions.map(
                (item, index) => (

                  <tr key={index}>

                    <td>
                      <span className="food-item-cell">
                        {item.foodEmoji}{" "}
                        {item.foodType || "N/A"}
                      </span>
                    </td>

                    <td>
                      <strong
                        className={
                          item.status === "Fresh"
                            ? "report-fresh"
                            : "report-spoiled"
                        }
                      >
                        {item.status || "N/A"}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {item.freshnessScore ||
                          "N/A"}
                        /100
                      </strong>
                    </td>

                    <td>
                      {item.confidence || "N/A"}%
                    </td>

                    <td>
                      <strong
                        className={
                          item.status === "Fresh"
                            ? "report-fresh"
                            : "report-spoiled"
                        }
                      >
                        {item.shelfLife || "N/A"}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={
                          item.status === "Fresh"
                            ? "report-fresh"
                            : "report-spoiled"
                        }
                      >
                        {item.recommendation ||
                          "N/A"}
                      </span>
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

export default FreshnessReport;