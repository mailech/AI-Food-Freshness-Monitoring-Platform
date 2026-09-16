import React, { useMemo, useState } from "react";
import "./StorageMonitoring.css";

const initialRooms = [
  {
    id: 1,
    name: "Cold Storage A",
    location: "Warehouse 01",
    temperature: 6,
    humidity: 65,
    airCirculation: "Good",
    lightExposure: "Low",
    packaging: "Proper",
    duration: 2,
  },
  {
    id: 2,
    name: "Vegetable Rack",
    location: "Warehouse 01",
    temperature: 9,
    humidity: 72,
    airCirculation: "Moderate",
    lightExposure: "Low",
    packaging: "Proper",
    duration: 3,
  },
  {
    id: 3,
    name: "Fruit Storage B",
    location: "Retail Store",
    temperature: 13,
    humidity: 84,
    airCirculation: "Poor",
    lightExposure: "Medium",
    packaging: "Open",
    duration: 5,
  },
];

function getStatus(room) {
  const problems = [];

  if (room.temperature > 12) {
    problems.push("Temperature high");
  }

  if (room.humidity > 85) {
    problems.push("Humidity high");
  }

  if (room.airCirculation === "Poor") {
    problems.push("Poor air circulation");
  }

  if (room.lightExposure === "High") {
    problems.push("High light exposure");
  }

  if (
    room.packaging === "Open" ||
    room.packaging === "None"
  ) {
    problems.push("Packaging issue");
  }

  return problems;
}

export default function StorageMonitoring() {
  const [rooms, setRooms] = useState(() => {
  const savedRooms = JSON.parse(
    localStorage.getItem("foodfresh_storage_rooms") || "[]"
  );

  return savedRooms.length > 0
  ? savedRooms
  : initialRooms;
});
  const [selectedId, setSelectedId] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    location: "",
    temperature: 6,
    humidity: 65,
    airCirculation: "Good",
    lightExposure: "Low",
    packaging: "Proper",
    duration: 0,
  });

  const selected =
    rooms.find((room) => room.id === selectedId) ||
    rooms[0];

  const compliance = useMemo(() => {
    if (!selected) return 0;

    let score = 100;

    if (selected.temperature > 12) {
      score -= 20;
    } else if (selected.temperature > 8) {
      score -= 10;
    }

    if (selected.humidity > 85) {
      score -= 20;
    } else if (selected.humidity > 70) {
      score -= 8;
    }

    if (selected.airCirculation === "Moderate") {
      score -= 8;
    }

    if (selected.airCirculation === "Poor") {
      score -= 18;
    }

    if (selected.lightExposure === "Medium") {
      score -= 5;
    }

    if (selected.lightExposure === "High") {
      score -= 15;
    }

    if (selected.packaging === "Open") {
      score -= 15;
    }

    if (selected.packaging === "None") {
      score -= 20;
    }

    return Math.max(0, score);
  }, [selected]);

  const alerts = rooms.flatMap((room) =>
    getStatus(room).map((message) => ({
      room: room.name,
      message,
    }))
  );

  const handleAdd = (e) => {
    e.preventDefault();

    const id = Date.now();

    const newRoom = {
      ...form,
      id,
      temperature: Number(form.temperature),
      humidity: Number(form.humidity),
      duration: Number(form.duration),
    };

    setRooms((prev) => {
  const updatedRooms = [...prev, newRoom];

  localStorage.setItem(
    "foodfresh_storage_rooms",
    JSON.stringify(updatedRooms)
  );

  return updatedRooms;
});

setSelectedId(id);
setShowModal(false);

    setForm({
      name: "",
      location: "",
      temperature: 6,
      humidity: 65,
      airCirculation: "Good",
      lightExposure: "Low",
      packaging: "Proper",
      duration: 0,
    });
  };

  return (
    <div className="storage-page">

      {/* HEADER */}

      <div className="storage-header">

        <div>
          <h2>Storage Condition Monitoring</h2>

          <p>
            Track environmental conditions and validate
            storage compliance.
          </p>
        </div>

        <button
          className="storage-add-btn"
          onClick={() => setShowModal(true)}
        >
          + Add Storage Unit
        </button>

      </div>


      {/* KPI CARDS */}

      <div className="storage-kpis">

        <div className="storage-kpi">
          <span>Storage Units</span>

          <strong>{rooms.length}</strong>

          <small>
            Active monitoring points
          </small>
        </div>


        <div className="storage-kpi">
          <span>Average Temperature</span>

          <strong>
            {(
              rooms.reduce(
                (total, room) =>
                  total + room.temperature,
                0
              ) / rooms.length
            ).toFixed(1)}
            °C
          </strong>

          <small>
            Environmental reading
          </small>
        </div>


        <div className="storage-kpi">
          <span>Average Humidity</span>

          <strong>
            {Math.round(
              rooms.reduce(
                (total, room) =>
                  total + room.humidity,
                0
              ) / rooms.length
            )}
            %
          </strong>

          <small>
            Humidity level
          </small>
        </div>


        <div className="storage-kpi">
          <span>Open Alerts</span>

          <strong>{alerts.length}</strong>

          <small>
            {alerts.length
              ? "Attention required"
              : "All conditions normal"}
          </small>
        </div>

      </div>


      {/* MAIN STORAGE AREA */}

      <div className="storage-layout">

        {/* STORAGE UNITS */}

        <section className="storage-card">

          <div className="storage-card-title">

            <div>
              <h3>Storage Units</h3>

              <p>
                Select a unit to inspect its conditions.
              </p>
            </div>

          </div>


          <div className="storage-unit-list">

            {rooms.map((room) => {

              const issues = getStatus(room);

              return (
                <button
                  key={room.id}
                  className={`storage-unit ${
                    selectedId === room.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedId(room.id)
                  }
                >

                  <div>

                    <strong>
                      {room.name}
                    </strong>

                    <span>
                      {room.location}
                    </span>

                  </div>


                  <div
                    className={
                      issues.length
                        ? "unit-warning"
                        : "unit-ok"
                    }
                  >
                    {issues.length
                      ? `${issues.length} alert${
                          issues.length > 1
                            ? "s"
                            : ""
                        }`
                      : "Compliant"}
                  </div>

                </button>
              );

            })}

          </div>

        </section>


        {/* DETAILS */}

        {selected && (

          <section className="storage-card storage-detail">

            <div className="storage-detail-head">

              <div>

                <h3>
                  {selected.name}
                </h3>

                <p>
                  {selected.location} • Storage
                  duration: {selected.duration} days
                </p>

              </div>


              <div
                className={`compliance-badge ${
                  compliance >= 80
                    ? "good"
                    : compliance >= 60
                    ? "medium"
                    : "bad"
                }`}
              >
                {compliance}% Compliance
              </div>

            </div>


            {/* ENVIRONMENT PARAMETERS */}

            <div className="environment-grid">

              <div className="environment-item">
                <span>Temperature</span>

                <strong>
                  {selected.temperature}°C
                </strong>

                <small>
                  Target: 2–8°C
                </small>
              </div>


              <div className="environment-item">
                <span>Humidity</span>

                <strong>
                  {selected.humidity}%
                </strong>

                <small>
                  Target: 30–70%
                </small>
              </div>


              <div className="environment-item">
                <span>Air Circulation</span>

                <strong>
                  {selected.airCirculation}
                </strong>

                <small>
                  Environmental airflow
                </small>
              </div>


              <div className="environment-item">
                <span>Light Exposure</span>

                <strong>
                  {selected.lightExposure}
                </strong>

                <small>
                  Light condition
                </small>
              </div>


              <div className="environment-item">
                <span>Packaging</span>

                <strong>
                  {selected.packaging}
                </strong>

                <small>
                  Protection status
                </small>
              </div>


              <div className="environment-item">
                <span>Storage Duration</span>

                <strong>
                  {selected.duration} days
                </strong>

                <small>
                  Current batch duration
                </small>
              </div>

            </div>


            {/* VALIDATION */}

            <div className="storage-status-box">

              <h4>
                Storage Validation
              </h4>

              {getStatus(selected).length === 0 ? (

                <p>
                  ✓ Storage conditions are within
                  acceptable limits.
                </p>

              ) : (

                <div>

                  {getStatus(selected).map(
                    (issue) => (
                      <p key={issue}>
                        ⚠ {issue}
                      </p>
                    )
                  )}

                </div>

              )}

            </div>


            {/* RECOMMENDATION */}

            <div className="storage-recommendation">

              <h4>
                Optimization Recommendation
              </h4>

              <p>
                {compliance >= 80
                  ? "Maintain the current conditions and continue regular monitoring."
                  : "Review temperature, humidity and environmental controls to improve storage compliance and reduce freshness risk."}
              </p>

            </div>

          </section>

        )}

      </div>


      {/* ALERTS */}

      <section className="storage-card storage-alert-card">

        <div className="storage-card-title">

          <div>

            <h3>
              Environmental Alerts
            </h3>

            <p>
              Conditions requiring attention
              across monitored units.
            </p>

          </div>

        </div>


        {alerts.length === 0 ? (

          <div className="no-alerts">
            ✓ No active storage alerts.
          </div>

        ) : (

          <div className="storage-alert-list">

            {alerts.map((alert, index) => (

              <div
                className="storage-alert"
                key={`${alert.room}-${alert.message}-${index}`}
              >

                <span>⚠</span>

                <div>

                  <strong>
                    {alert.room}
                  </strong>

                  <p>
                    {alert.message}
                  </p>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>


      {/* ADD STORAGE MODAL */}

      {showModal && (

        <div
          className="storage-modal-backdrop"
          onClick={() =>
            setShowModal(false)
          }
        >

          <form
            className="storage-modal"
            onSubmit={handleAdd}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="storage-modal-head">

              <h3>
                Add Storage Unit
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>

            </div>


            <div className="storage-form-grid">

              <label>
                Unit Name

                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />

              </label>


              <label>
                Location

                <input
                  required
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value,
                    })
                  }
                />

              </label>


              <label>
                Temperature (°C)

                <input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      temperature:
                        e.target.value,
                    })
                  }
                />

              </label>


              <label>
                Humidity (%)

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.humidity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      humidity:
                        e.target.value,
                    })
                  }
                />

              </label>


              <label>
                Air Circulation

                <select
                  value={form.airCirculation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      airCirculation:
                        e.target.value,
                    })
                  }
                >
                  <option>Good</option>
                  <option>Moderate</option>
                  <option>Poor</option>
                </select>

              </label>


              <label>
                Light Exposure

                <select
                  value={form.lightExposure}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lightExposure:
                        e.target.value,
                    })
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>

              </label>


              <label>
                Packaging

                <select
                  value={form.packaging}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      packaging:
                        e.target.value,
                    })
                  }
                >
                  <option>Proper</option>
                  <option>Damaged</option>
                  <option>Open</option>
                  <option>None</option>
                </select>

              </label>


              <label>
                Storage Duration (days)

                <input
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration:
                        e.target.value,
                    })
                  }
                />

              </label>

            </div>


            <div className="storage-modal-actions">

              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  setShowModal(false)
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="save-btn"
              >
                Add Storage Unit
              </button>

            </div>

          </form>

        </div>

      )}

    </div>
  );
}