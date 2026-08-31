import { useState } from "react";

function Inventory() {
  const [items, setItems] = useState([
    {
      id: 1,
      name: "Gala Apple",
      quantity: 25,
      expiry: "2026-09-03",
      location: "Cold Storage",
      status: "Fresh",
    },
    {
      id: 2,
      name: "Tomato",
      quantity: 18,
      expiry: "2026-08-30",
      location: "Storage Room",
      status: "Use Soon",
    },
    {
      id: 3,
      name: "Banana",
      quantity: 12,
      expiry: "2026-08-29",
      location: "Cold Storage",
      status: "Fresh",
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    expiry: "",
    location: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const addItem = (e) => {
    e.preventDefault();

    if (
      !form.name ||
      !form.quantity ||
      !form.expiry ||
      !form.location
    ) {
      alert("Please fill all fields.");
      return;
    }

    const newItem = {
      id: Date.now(),
      name: form.name,
      quantity: Number(form.quantity),
      expiry: form.expiry,
      location: form.location,
      status: "Fresh",
    };

    setItems([...items, newItem]);

    setForm({
      name: "",
      quantity: "",
      expiry: "",
      location: "",
    });

    setShowForm(false);
  };

  const deleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div style={{ padding: "30px" }}>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "5px" }}>
            Inventory
          </h1>

          <p style={{ color: "#777" }}>
            Manage your food inventory and freshness.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#2e7d32",
            color: "white",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          + Add Food
        </button>
      </div>


      {showForm && (
        <form
          onSubmit={addItem}
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "12px",
            marginBottom: "25px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          }}
        >

          <h3>Add Food Item</h3>

          <input
            name="name"
            placeholder="Food name"
            value={form.name}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="quantity"
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="expiry"
            type="date"
            value={form.expiry}
            onChange={handleChange}
            style={inputStyle}
          />

          <input
            name="location"
            placeholder="Storage location"
            value={form.location}
            onChange={handleChange}
            style={inputStyle}
          />

          <button
            type="submit"
            style={{
              padding: "10px 18px",
              background: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: "7px",
              cursor: "pointer",
            }}
          >
            Save Item
          </button>

        </form>
      )}


      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "15px",
          marginBottom: "25px",
        }}
      >

        <div style={cardStyle}>
          <small>Total Items</small>
          <h2>{items.length}</h2>
        </div>

        <div style={cardStyle}>
          <small>Total Quantity</small>
          <h2>
            {items.reduce(
              (sum, item) => sum + item.quantity,
              0
            )}
          </h2>
        </div>

        <div style={cardStyle}>
          <small>Fresh Items</small>
          <h2>
            {
              items.filter(
                (item) => item.status === "Fresh"
              ).length
            }
          </h2>
        </div>

        <div style={cardStyle}>
          <small>Use Soon</small>
          <h2>
            {
              items.filter(
                (item) => item.status === "Use Soon"
              ).length
            }
          </h2>
        </div>

      </div>


      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "20px",
          overflowX: "auto",
        }}
      >

        <h3>Food Inventory</h3>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "15px",
          }}
        >

          <thead>
            <tr>
              <th style={thStyle}>Food</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Expiry</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>

            {items.map((item) => (
              <tr key={item.id}>

                <td style={tdStyle}>
                  {item.name}
                </td>

                <td style={tdStyle}>
                  {item.quantity}
                </td>

                <td style={tdStyle}>
                  {item.expiry}
                </td>

                <td style={tdStyle}>
                  {item.location}
                </td>

                <td style={tdStyle}>
                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: "15px",
                      background:
                        item.status === "Fresh"
                          ? "#e8f5e9"
                          : "#fff3cd",
                      color:
                        item.status === "Fresh"
                          ? "#2e7d32"
                          : "#856404",
                    }}
                  >
                    {item.status}
                  </span>
                </td>

                <td style={tdStyle}>

                  <button
                    onClick={() =>
                      deleteItem(item.id)
                    }
                    style={{
                      border: "none",
                      background: "#ffebee",
                      color: "#c62828",
                      padding: "7px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}


const inputStyle = {
  width: "100%",
  padding: "11px",
  margin: "8px 0",
  border: "1px solid #ddd",
  borderRadius: "7px",
  boxSizing: "border-box",
};


const cardStyle = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};


const thStyle = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #eee",
};


const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #eee",
};


export default Inventory;