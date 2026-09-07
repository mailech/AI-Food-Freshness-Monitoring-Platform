const API_BASE = "http://127.0.0.1:8000/api";

const FALLBACK_FOODS = [
  {
    id: "food-001",
    name: "Organic Honeycrisp Apples",
    category: "Fruits",
    batch_id: "BATCH-AP-101",
    quantity: 45.0,
    unit: "kg",
    purchase_date: "2026-08-29",
    expiry_date: "2026-09-07",
    storage_temp: 4.0,
    humidity: 88.0,
    packaging_type: "Perforated Eco-Carton",
    freshness_status: "Fresh",
    freshness_score: 92,
    spoilage_probability: 0.05,
    estimated_shelf_life_days: 6,
    storage_duration_days: 3,
    confidence: 0.94,
    detected_issues: ["None"],
    recommendation: "Store in a cool refrigerated environment with high humidity.",
    image_url: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80",
    freshness_history: [
      { date: "2026-08-26", score: 98 },
      { date: "2026-08-27", score: 96 },
      { date: "2026-08-28", score: 95 },
      { date: "2026-08-29", score: 94 },
      { date: "2026-08-30", score: 93 },
      { date: "2026-08-31", score: 92 },
      { date: "2026-09-01", score: 92 },
    ]
  },
  {
    id: "food-002",
    name: "Cavendish Bananas",
    category: "Fruits",
    batch_id: "BATCH-BN-204",
    quantity: 30.0,
    unit: "kg",
    purchase_date: "2026-08-27",
    expiry_date: "2026-09-03",
    storage_temp: 14.0,
    humidity: 85.0,
    packaging_type: "Vented Crate",
    freshness_status: "Near Spoilage",
    freshness_score: 52,
    spoilage_probability: 0.45,
    estimated_shelf_life_days: 2,
    storage_duration_days: 5,
    confidence: 0.89,
    detected_issues: ["Surface brown sugar spots", "Peel thinning"],
    recommendation: "Keep at room temperature away from direct sunlight.",
    image_url: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80",
    freshness_history: [
      { date: "2026-08-26", score: 78 },
      { date: "2026-08-27", score: 72 },
      { date: "2026-08-28", score: 68 },
      { date: "2026-08-29", score: 62 },
      { date: "2026-08-30", score: 58 },
      { date: "2026-08-31", score: 54 },
      { date: "2026-09-01", score: 52 },
    ]
  },
  {
    id: "food-003",
    name: "Roma Vine Tomatoes",
    category: "Vegetables",
    batch_id: "BATCH-TM-305",
    quantity: 25.0,
    unit: "kg",
    purchase_date: "2026-08-30",
    expiry_date: "2026-09-06",
    storage_temp: 11.5,
    humidity: 82.0,
    packaging_type: "Open Tray",
    freshness_status: "Good",
    freshness_score: 84,
    spoilage_probability: 0.12,
    estimated_shelf_life_days: 5,
    storage_duration_days: 2,
    confidence: 0.91,
    detected_issues: ["Minor skin wrinkling"],
    recommendation: "Store stem-side down at cool room temperature.",
    image_url: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80",
    freshness_history: [
      { date: "2026-08-26", score: 92 },
      { date: "2026-08-27", score: 90 },
      { date: "2026-08-28", score: 88 },
      { date: "2026-08-29", score: 86 },
      { date: "2026-08-30", score: 85 },
      { date: "2026-08-31", score: 84 },
      { date: "2026-09-01", score: 84 },
    ]
  },
  {
    id: "food-004",
    name: "Russet Gold Potatoes",
    category: "Vegetables",
    batch_id: "BATCH-PT-409",
    quantity: 120.0,
    unit: "kg",
    purchase_date: "2026-08-26",
    expiry_date: "2026-09-23",
    storage_temp: 8.0,
    humidity: 80.0,
    packaging_type: "Burlap Jute Sack",
    freshness_status: "Fresh",
    freshness_score: 95,
    spoilage_probability: 0.03,
    estimated_shelf_life_days: 22,
    storage_duration_days: 6,
    confidence: 0.96,
    detected_issues: ["None"],
    recommendation: "Store in a cool, dark, well-ventilated dry pantry.",
    image_url: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80",
    freshness_history: [
      { date: "2026-08-26", score: 98 },
      { date: "2026-08-27", score: 97 },
      { date: "2026-08-28", score: 97 },
      { date: "2026-08-29", score: 96 },
      { date: "2026-08-30", score: 95 },
      { date: "2026-08-31", score: 95 },
      { date: "2026-09-01", score: 95 },
    ]
  },
  {
    id: "food-005",
    name: "Whole Pasteurized Milk (1L)",
    category: "Dairy Products",
    batch_id: "BATCH-MK-512",
    quantity: 60.0,
    unit: "liters",
    purchase_date: "2026-08-28",
    expiry_date: "2026-09-04",
    storage_temp: 3.2,
    humidity: 70.0,
    packaging_type: "HDPE Jug / Carton",
    freshness_status: "Acceptable",
    freshness_score: 74,
    spoilage_probability: 0.22,
    estimated_shelf_life_days: 3,
    storage_duration_days: 4,
    confidence: 0.90,
    detected_issues: ["Slight acidity elevation"],
    recommendation: "Store on interior refrigerator shelf below 4°C.",
    image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80",
    freshness_history: [
      { date: "2026-08-26", score: 90 },
      { date: "2026-08-27", score: 86 },
      { date: "2026-08-28", score: 82 },
      { date: "2026-08-29", score: 79 },
      { date: "2026-08-30", score: 76 },
      { date: "2026-08-31", score: 74 },
      { date: "2026-09-01", score: 74 },
    ]
  },
  {
    id: "food-006",
    name: "Aged Cheddar Cheese Block",
    category: "Dairy Products",
    batch_id: "BATCH-CH-618",
    quantity: 18.0,
    unit: "kg",
    purchase_date: "2026-08-22",
    expiry_date: "2026-09-19",
    storage_temp: 4.5,
    humidity: 75.0,
    packaging_type: "Vacuum Sealed Film",
    freshness_status: "Fresh",
    freshness_score: 89,
    spoilage_probability: 0.08,
    estimated_shelf_life_days: 18,
    storage_duration_days: 10,
    confidence: 0.93,
    detected_issues: ["None"],
    recommendation: "Wrap in wax or parchment paper in cheese drawer.",
    image_url: "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-007",
    name: "Fresh Boneless Chicken Breast",
    category: "Meat & Poultry",
    batch_id: "BATCH-CK-701",
    quantity: 35.0,
    unit: "kg",
    purchase_date: "2026-08-31",
    expiry_date: "2026-09-03",
    storage_temp: 1.2,
    humidity: 85.0,
    packaging_type: "Modified Atmosphere Tray",
    freshness_status: "Fresh",
    freshness_score: 91,
    spoilage_probability: 0.06,
    estimated_shelf_life_days: 2,
    storage_duration_days: 1,
    confidence: 0.94,
    detected_issues: ["None"],
    recommendation: "Store at 0-2°C on bottom shelf in sealed container.",
    image_url: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-008",
    name: "Atlantic Salmon Fillets",
    category: "Seafood",
    batch_id: "BATCH-SF-803",
    quantity: 15.0,
    unit: "kg",
    purchase_date: "2026-08-30",
    expiry_date: "2026-09-02",
    storage_temp: 0.8,
    humidity: 90.0,
    packaging_type: "Iced Poly Styrene Box",
    freshness_status: "Near Spoilage",
    freshness_score: 58,
    spoilage_probability: 0.48,
    estimated_shelf_life_days: 1,
    storage_duration_days: 2,
    confidence: 0.91,
    detected_issues: ["Slight flesh softening"],
    recommendation: "Pack on crushed ice in refrigerator; prioritize immediate use.",
    image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-009",
    name: "Artisan Sourdough Bread",
    category: "Bakery Products",
    batch_id: "BATCH-BR-911",
    quantity: 20.0,
    unit: "loaves",
    purchase_date: "2026-08-29",
    expiry_date: "2026-09-02",
    storage_temp: 20.0,
    humidity: 50.0,
    packaging_type: "Paper Bag with Window",
    freshness_status: "Acceptable",
    freshness_score: 70,
    spoilage_probability: 0.28,
    estimated_shelf_life_days: 1,
    storage_duration_days: 3,
    confidence: 0.90,
    detected_issues: ["Crumb staling"],
    recommendation: "Store in bread box at room temperature.",
    image_url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-010",
    name: "Fresh Sweet Strawberries",
    category: "Fruits",
    batch_id: "BATCH-SB-104",
    quantity: 14.0,
    unit: "kg",
    purchase_date: "2026-08-28",
    expiry_date: "2026-09-01",
    storage_temp: 2.5,
    humidity: 92.0,
    packaging_type: "Vented Clamshell",
    freshness_status: "Spoiled",
    freshness_score: 24,
    spoilage_probability: 0.88,
    estimated_shelf_life_days: 0,
    storage_duration_days: 4,
    confidence: 0.96,
    detected_issues: ["Mold spore expansion", "Tissue collapse"],
    recommendation: "Quarantine and compost immediately.",
    image_url: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-011",
    name: "Crunchy Baby Carrots",
    category: "Vegetables",
    batch_id: "BATCH-CR-115",
    quantity: 40.0,
    unit: "kg",
    purchase_date: "2026-08-29",
    expiry_date: "2026-09-15",
    storage_temp: 3.0,
    humidity: 95.0,
    packaging_type: "Resealable Polybag",
    freshness_status: "Fresh",
    freshness_score: 94,
    spoilage_probability: 0.04,
    estimated_shelf_life_days: 14,
    storage_duration_days: 3,
    confidence: 0.95,
    detected_issues: ["None"],
    recommendation: "Keep in airtight container with damp cloth.",
    image_url: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-012",
    name: "Baby Spinach Leaves",
    category: "Vegetables",
    batch_id: "BATCH-SP-120",
    quantity: 16.0,
    unit: "kg",
    purchase_date: "2026-08-30",
    expiry_date: "2026-09-05",
    storage_temp: 2.0,
    humidity: 94.0,
    packaging_type: "Pillow Pouch",
    freshness_status: "Good",
    freshness_score: 86,
    spoilage_probability: 0.10,
    estimated_shelf_life_days: 4,
    storage_duration_days: 2,
    confidence: 0.92,
    detected_issues: ["Early leaf moisture"],
    recommendation: "Keep in sealed bag with paper towel in crisper.",
    image_url: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-013",
    name: "Greek Probiotic Yogurt",
    category: "Dairy Products",
    batch_id: "BATCH-YG-133",
    quantity: 28.0,
    unit: "tubs",
    purchase_date: "2026-08-27",
    expiry_date: "2026-09-10",
    storage_temp: 3.5,
    humidity: 70.0,
    packaging_type: "Polypropylene Tub",
    freshness_status: "Fresh",
    freshness_score: 88,
    spoilage_probability: 0.09,
    estimated_shelf_life_days: 9,
    storage_duration_days: 5,
    confidence: 0.93,
    detected_issues: ["None"],
    recommendation: "Keep sealed tightly in coldest section of fridge.",
    image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-014",
    name: "Valencia Sweet Oranges",
    category: "Fruits",
    batch_id: "BATCH-OR-142",
    quantity: 55.0,
    unit: "kg",
    purchase_date: "2026-08-28",
    expiry_date: "2026-09-13",
    storage_temp: 5.5,
    humidity: 85.0,
    packaging_type: "Mesh Netting Bag",
    freshness_status: "Fresh",
    freshness_score: 90,
    spoilage_probability: 0.07,
    estimated_shelf_life_days: 12,
    storage_duration_days: 4,
    confidence: 0.94,
    detected_issues: ["None"],
    recommendation: "Store in crisper drawer in mesh bag.",
    image_url: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "food-015",
    name: "English Seedless Cucumbers",
    category: "Vegetables",
    batch_id: "BATCH-CU-155",
    quantity: 22.0,
    unit: "kg",
    purchase_date: "2026-08-30",
    expiry_date: "2026-09-07",
    storage_temp: 10.0,
    humidity: 88.0,
    packaging_type: "Shrink-wrap Film",
    freshness_status: "Good",
    freshness_score: 85,
    spoilage_probability: 0.11,
    estimated_shelf_life_days: 6,
    storage_duration_days: 2,
    confidence: 0.92,
    detected_issues: ["None"],
    recommendation: "Wrap in paper towel on upper refrigerator shelf.",
    image_url: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80"
  }
];

export const getAuthToken = () => {
  try {
    const saved = localStorage.getItem("ffm_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.token || null;
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return null;
};

export const getAuthHeaders = (extra = {}) => {
  const token = getAuthToken();
  const headers = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  login: async (email, password, role) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Invalid credentials or account not found");
    }
    return await res.json();
  },

  register: async (name, email, password, role) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Registration failed");
    }
    return await res.json();
  },

  getMe: async () => {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
      });
      if (!res.ok) throw new Error("Invalid session");
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Dashboard
  getDashboard: async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return await res.json();
    } catch (e) {
      return {
        total_items: 128,
        active_inventory_count: FALLBACK_FOODS.length,
        fresh_items: 82,
        near_spoilage: 18,
        spoiled: 8,
        average_freshness: 84,
        freshness_distribution: {
          Fresh: 9,
          Good: 3,
          Acceptable: 2,
          "Near Spoilage": 2,
          Spoiled: 1
        },
        category_distribution: {
          Fruits: 5,
          Vegetables: 5,
          "Dairy Products": 3,
          "Meat & Poultry": 1,
          Seafood: 1,
          "Bakery Products": 1,
          "Packaged Foods": 1,
          Beverages: 1
        },
        freshness_trend: [
          { day: "Aug 26", avg_score: 88 },
          { day: "Aug 27", avg_score: 86 },
          { day: "Aug 28", avg_score: 85 },
          { day: "Aug 29", avg_score: 87 },
          { day: "Aug 30", avg_score: 83 },
          { day: "Aug 31", avg_score: 85 },
          { day: "Sep 01", avg_score: 84 },
        ],
        expiring_soon: FALLBACK_FOODS.filter(f => f.estimated_shelf_life_days <= 3),
        recent_analyses: [
          { id: "ana-1", food_name: "Organic Honeycrisp Apple", timestamp: "15m ago", score: 92, status: "Fresh", confidence: 0.94, image_url: FALLBACK_FOODS[0].image_url },
          { id: "ana-2", food_name: "Fresh Boneless Chicken", timestamp: "48m ago", score: 91, status: "Fresh", confidence: 0.91, image_url: FALLBACK_FOODS[6].image_url },
          { id: "ana-3", food_name: "Cavendish Banana", timestamp: "2h ago", score: 52, status: "Near Spoilage", confidence: 0.89, image_url: FALLBACK_FOODS[1].image_url },
        ]
      };
    }
  },

  // Foods
  getFoods: async (params = {}) => {
    try {
      const query = new URLSearchParams();
      if (params.category && params.category !== "All") query.append("category", params.category);
      if (params.status && params.status !== "All") query.append("status", params.status);
      if (params.search) query.append("search", params.search);
      if (params.sort_by) query.append("sort_by", params.sort_by);

      const res = await fetch(`${API_BASE}/foods?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch foods");
      return await res.json();
    } catch (e) {
      let filtered = [...FALLBACK_FOODS];
      if (params.category && params.category !== "All") {
        filtered = filtered.filter(f => f.category.toLowerCase() === params.category.toLowerCase());
      }
      if (params.status && params.status !== "All") {
        filtered = filtered.filter(f => f.freshness_status.toLowerCase() === params.status.toLowerCase());
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(f => f.name.toLowerCase().includes(s) || f.batch_id.toLowerCase().includes(s));
      }
      if (params.sort_by === "expiry_date") {
        filtered.sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
      } else if (params.sort_by === "freshness_score") {
        filtered.sort((a, b) => b.freshness_score - a.freshness_score);
      } else if (params.sort_by === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
      return filtered;
    }
  },

  getFoodById: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/foods/${id}`);
      if (!res.ok) throw new Error("Failed to fetch food details");
      return await res.json();
    } catch (e) {
      return FALLBACK_FOODS.find(f => f.id === id) || FALLBACK_FOODS[0];
    }
  },

  createFood: async (foodData) => {
    try {
      const res = await fetch(`${API_BASE}/foods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(foodData),
      });
      if (!res.ok) throw new Error("Failed to create food item");
      return await res.json();
    } catch (e) {
      const newItem = {
        id: `food-${FALLBACK_FOODS.length + 1}`,
        ...foodData,
        freshness_score: foodData.freshness_score || 90,
        freshness_status: foodData.freshness_status || "Fresh",
        estimated_shelf_life_days: 7,
        confidence: 0.92,
        detected_issues: ["None"],
        recommendation: "Store in cool environment."
      };
      FALLBACK_FOODS.unshift(newItem);
      return newItem;
    }
  },

  updateFood: async (id, foodData) => {
    try {
      const res = await fetch(`${API_BASE}/foods/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(foodData),
      });
      if (!res.ok) throw new Error("Failed to update food item");
      return await res.json();
    } catch (e) {
      const idx = FALLBACK_FOODS.findIndex(f => f.id === id);
      if (idx !== -1) {
        FALLBACK_FOODS[idx] = { ...FALLBACK_FOODS[idx], ...foodData };
        return FALLBACK_FOODS[idx];
      }
      return foodData;
    }
  },

  deleteFood: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/foods/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete food item");
      return await res.json();
    } catch (e) {
      const idx = FALLBACK_FOODS.findIndex(f => f.id === id);
      if (idx !== -1) FALLBACK_FOODS.splice(idx, 1);
      return { success: true };
    }
  },

  // AI Analysis
  analyzeFood: async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/food/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("AI Analysis request failed");
      return await res.json();
    } catch (e) {
      const foodType = formData.get("food_type") || "Apple";
      const category = formData.get("category") || "Fruits";
      return {
        food_type: foodType,
        category: category,
        freshness_score: 87,
        freshness_category: "Fresh",
        spoilage_probability: 0.08,
        estimated_shelf_life_days: 5,
        confidence: 0.91,
        detected_issues: ["None"],
        recommendation: "Store in a cool refrigerated environment with controlled airflow.",
        storage_recommendation: "Keep refrigerated between 2°C and 6°C with 85% RH.",
        consumption_recommendation: "Best consumed within 5 days for peak freshness.",
        waste_reduction_recommendation: "Standard FIFO inventory rotation protocol.",
        risk_level: "Low",
        metrics: {
          chlorophyll_index: 0.88,
          surface_defect_ratio: "2.1%",
          ethylene_emission_est: "Low",
          color_uniformity: "94%"
        }
      };
    }
  },

  // Storage
  getStorageConditions: async () => {
    try {
      const res = await fetch(`${API_BASE}/storage`);
      if (!res.ok) throw new Error("Failed to fetch storage conditions");
      return await res.json();
    } catch (e) {
      return [
        {
          id: "zone-1",
          zone_name: "Cold Vault Alpha (Produce & Dairy)",
          temperature: 3.4,
          temperature_status: "Normal",
          humidity: 86.5,
          humidity_status: "Normal",
          air_circulation: "Optimal (1.2 m/s)",
          air_status: "Normal",
          light_exposure: "Low (15 Lux)",
          light_status: "Normal",
          storage_duration: "Continuous 24/7",
          overall_status: "Normal",
          last_updated: "Just now"
        },
        {
          id: "zone-2",
          zone_name: "Chilled Meat & Seafood Locker",
          temperature: 1.1,
          temperature_status: "Normal",
          humidity: 88.0,
          humidity_status: "Normal",
          air_circulation: "High (1.8 m/s)",
          air_status: "Normal",
          light_exposure: "Dark (2 Lux)",
          light_status: "Normal",
          storage_duration: "Continuous 24/7",
          overall_status: "Normal",
          last_updated: "Just now"
        },
        {
          id: "zone-3",
          zone_name: "Ambient Pantry & Bakery Depot",
          temperature: 19.8,
          temperature_status: "Normal",
          humidity: 52.0,
          humidity_status: "Normal",
          air_circulation: "Moderate (0.8 m/s)",
          air_status: "Normal",
          light_exposure: "Moderate (120 Lux)",
          light_status: "Normal",
          storage_duration: "Ambient Room 24/7",
          overall_status: "Normal",
          last_updated: "Just now"
        },
        {
          id: "zone-4",
          zone_name: "Loading Dock / Quarantine Bay",
          temperature: 11.2,
          temperature_status: "Warning",
          humidity: 78.0,
          humidity_status: "Normal",
          air_circulation: "Variable (0.4 m/s)",
          air_status: "Warning",
          light_exposure: "High (350 Lux)",
          light_status: "Warning",
          storage_duration: "Transit Only (< 4h)",
          overall_status: "Warning",
          last_updated: "Just now"
        }
      ];
    }
  },

  getStorageTrends: async () => {
    try {
      const res = await fetch(`${API_BASE}/storage/trends`);
      if (!res.ok) throw new Error("Failed to fetch storage trends");
      return await res.json();
    } catch (e) {
      return [
        { time: "00:00", temperature: 3.4, humidity: 86.5 },
        { time: "04:00", temperature: 3.2, humidity: 87.0 },
        { time: "08:00", temperature: 3.5, humidity: 85.8 },
        { time: "12:00", temperature: 3.8, humidity: 86.2 },
        { time: "16:00", temperature: 3.6, humidity: 87.4 },
        { time: "20:00", temperature: 3.3, humidity: 86.1 },
        { time: "24:00", temperature: 3.4, humidity: 86.5 }
      ];
    }
  },

  // Recommendations
  getRecommendations: async (category = "All", type = "All") => {
    try {
      const query = new URLSearchParams();
      if (category && category !== "All") query.append("category", category);
      if (type && type !== "All") query.append("rec_type", type);
      const res = await fetch(`${API_BASE}/recommendations?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return await res.json();
    } catch (e) {
      return [
        {
          id: "rec-001",
          food_name: "Atlantic Salmon Fillets",
          category: "Seafood",
          type: "consumption",
          title: "Immediate Consumption Priority",
          description: "Remaining shelf-life is estimated at 1 day. Distribute or prepare for same-day service.",
          priority: "High",
          action_text: "Mark for Immediate Kitchen / Retail Dispatch"
        },
        {
          id: "rec-002",
          food_name: "Cavendish Bananas",
          category: "Fruits",
          type: "inventory",
          title: "Front-of-Inventory Rotation",
          description: "Ethylene emission levels increasing. Rotate to display front.",
          priority: "High",
          action_text: "Move to Front Display / Bake Preparation"
        },
        {
          id: "rec-003",
          food_name: "Whole Pasteurized Milk",
          category: "Dairy Products",
          type: "storage",
          title: "Cold Chain Verification",
          description: "Ensure crates remain nested in Cold Vault Alpha away from door drafts.",
          priority: "Medium",
          action_text: "Relocate to Center Vault Shelving"
        }
      ];
    }
  },

  // Alerts
  getAlerts: async (type = "All", unreadOnly = false) => {
    try {
      const query = new URLSearchParams();
      if (type && type !== "All") query.append("alert_type", type);
      if (unreadOnly) query.append("unread_only", "true");
      const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return await res.json();
    } catch (e) {
      return [
        {
          id: "alt-001",
          title: "5 Products Expiring Soon",
          message: "Bananas, Salmon fillets, Sourdough bread, and Milk batches have <= 3 days of shelf life.",
          type: "Shelf-Life Warning",
          severity: "warning",
          timestamp: "12 minutes ago",
          is_read: false
        },
        {
          id: "alt-002",
          title: "Spoilage Threshold Exceeded",
          message: "Fresh Strawberries (Batch BATCH-SB-104) identified as Spoiled (Freshness score: 24/100).",
          type: "Spoilage Alert",
          severity: "critical",
          timestamp: "45 minutes ago",
          is_read: false
        },
        {
          id: "alt-003",
          title: "1 Storage Temperature Warning",
          message: "Loading Dock Bay experienced a transient spike to 11.2°C.",
          type: "Storage Condition Alert",
          severity: "warning",
          timestamp: "2 hours ago",
          is_read: false
        }
      ];
    }
  },

  markAlertRead: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/read`, { method: "PUT" });
      return await res.json();
    } catch (e) {
      return { success: true };
    }
  },

  markAllAlertsRead: async () => {
    try {
      const res = await fetch(`${API_BASE}/alerts/read-all`, { method: "PUT" });
      return await res.json();
    } catch (e) {
      return { success: true };
    }
  },

  // Reports
  getReports: async (reportType = "All") => {
    try {
      const query = new URLSearchParams();
      if (reportType && reportType !== "All") query.append("report_type", reportType);
      const res = await fetch(`${API_BASE}/reports?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return await res.json();
    } catch (e) {
      return [
        {
          id: "rep-001",
          title: "Comprehensive Weekly Freshness & Quality Audit",
          report_type: "Freshness Report",
          created_at: "2026-08-31",
          generated_by: "Food Quality Inspector",
          summary: "128 total items monitored; 82 Fresh (64%), 18 Near Spoilage (14%), 8 Spoiled (6%). Average Freshness 84%.",
          status: "Ready",
          data: { total_items: 128, avg_freshness: 84, fresh_ratio: "64%", compliance_rate: "96.5%" }
        },
        {
          id: "rep-002",
          title: "Shelf-Life Forecast & Expiry Horizon",
          report_type: "Shelf-Life Report",
          created_at: "2026-09-01",
          generated_by: "Retail Manager",
          summary: "Identified critical items expiring within 72 hours. Recommended FIFO dispatch strategies.",
          status: "Ready",
          data: { critical_expiring_count: 8, est_preventable_loss_usd: "$1,450.00" }
        }
      ];
    }
  },

  generateReport: async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      return await res.json();
    } catch (e) {
      return {
        id: `rep-${Date.now()}`,
        title: payload.title || "Custom Generated Report",
        report_type: payload.report_type || "Freshness Report",
        created_at: new Date().toISOString().split("T")[0],
        generated_by: payload.generated_by || "Quality Inspector",
        summary: "Custom on-demand quality evaluation.",
        status: "Ready",
        data: { generated: true }
      };
    }
  }
};
