import { NextResponse } from "next/server";

const MOCK_USER = {
  id: 1,
  email: "demo@freshfood.app",
  full_name: "Demo User",
  role: "Administrator",
  is_active: true,
  created_at: "2026-01-10T09:00:00Z",
};

const MOCK_DASHBOARD = {
  total_items: 24,
  average_freshness_score: 78,
  health_distribution: {
    Fresh: 9,
    Good: 6,
    Acceptable: 4,
    "Near Spoilage": 3,
    Spoiled: 2,
  },
  consume_first: [
    { item_id: 1, name: "Fresh Strawberries", overall_score: 42, health_category: "Near Spoilage", remaining_days: 1, category: "Fruits" },
    { item_id: 2, name: "Whole Milk 2%", overall_score: 55, health_category: "Near Spoilage", remaining_days: 2, category: "Dairy" },
    { item_id: 3, name: "Baby Spinach", overall_score: 60, health_category: "Acceptable", remaining_days: 2, category: "Vegetables" },
    { item_id: 4, name: "Salmon Fillet", overall_score: 35, health_category: "Near Spoilage", remaining_days: 1, category: "Seafood" },
  ],
  expiring_soon: [
    { item_id: 1, name: "Fresh Strawberries", remaining_days: 1, category: "Fruits" },
    { item_id: 2, name: "Whole Milk 2%", remaining_days: 2, category: "Dairy" },
    { item_id: 4, name: "Salmon Fillet", remaining_days: 1, category: "Seafood" },
    { item_id: 5, name: "Greek Yogurt", remaining_days: 2, category: "Dairy" },
  ],
  waste_insights: {
    at_risk_items: 4,
    spoiled_items: 2,
    quantity_at_risk: 9,
    projected_monthly_waste_kg: 6.4,
  },
  storage_compliance: {
    compliant_items: 15,
    with_readings: 19,
    top_violations: [
      "Dairy cooler temp 6.8°C exceeds 4°C limit (Whole Milk 2%)",
      "Seafood storage humidity 78% below 85% target (Salmon Fillet)",
    ],
  },
  categories: [
    { category: "Fruits", avg_score: 82, count: 5 },
    { category: "Vegetables", avg_score: 75, count: 6 },
    { category: "Dairy", avg_score: 68, count: 4 },
    { category: "Meat & Poultry", avg_score: 71, count: 3 },
    { category: "Seafood", avg_score: 58, count: 2 },
    { category: "Bakery", avg_score: 88, count: 2 },
    { category: "Packaged Foods", avg_score: 91, count: 2 },
  ],
  admin_stats: {
    total_users: 12,
    total_items: 24,
    total_assessments: 86,
    total_storage_readings: 412,
  },
};

const MOCK_CATEGORIES = [
  { id: 1, name: "Fruits" },
  { id: 2, name: "Vegetables" },
  { id: 3, name: "Dairy" },
  { id: 4, name: "Meat & Poultry" },
  { id: 5, name: "Seafood" },
  { id: 6, name: "Bakery" },
  { id: 7, name: "Packaged Foods" },
  { id: 8, name: "Beverages" },
];

// In-memory inventory store for the demo session
let mockItems = [
  { id: 1, name: "Fresh Strawberries", category_id: 1, category: { id: 1, name: "Fruits" }, packaging_type: "Punnet", owner_id: 1, created_at: "2026-08-28T10:00:00Z" },
  { id: 2, name: "Whole Milk 2%", category_id: 3, category: { id: 3, name: "Dairy" }, packaging_type: "Carton", owner_id: 1, created_at: "2026-08-27T08:30:00Z" },
  { id: 3, name: "Baby Spinach", category_id: 2, category: { id: 2, name: "Vegetables" }, packaging_type: "Bag", owner_id: 1, created_at: "2026-08-29T14:00:00Z" },
  { id: 4, name: "Salmon Fillet", category_id: 5, category: { id: 5, name: "Seafood" }, packaging_type: "Vacuum Sealed", owner_id: 1, created_at: "2026-08-30T09:00:00Z" },
  { id: 5, name: "Greek Yogurt", category_id: 3, category: { id: 3, name: "Dairy" }, packaging_type: "Tub", owner_id: 1, created_at: "2026-08-26T11:00:00Z" },
];
let nextItemId = 6;

function getPath(params) {
  const segments = params?.path ?? [];
  return "/" + (Array.isArray(segments) ? segments.join("/") : segments);
}

export async function GET(request, { params }) {
  const path = getPath(await params);
  const url = new URL(request.url);

  if (path === "/auth/me") {
    return NextResponse.json(MOCK_USER);
  }

  if (path === "/analytics/dashboard") {
    return NextResponse.json(MOCK_DASHBOARD);
  }

  if (path === "/inventory/categories") {
    return NextResponse.json(MOCK_CATEGORIES);
  }

  if (path === "/inventory/items") {
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "10");
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("category_id");

    let filtered = mockItems;
    if (search) {
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (categoryId) {
      filtered = filtered.filter((i) => i.category_id === parseInt(categoryId));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return NextResponse.json({ total, page, page_size: pageSize, items });
  }

  // Item images
  const imagesMatch = path.match(/^\/inventory\/items\/(\d+)\/images$/);
  if (imagesMatch) {
    return NextResponse.json([]);
  }

  // Single item
  const itemMatch = path.match(/^\/inventory\/items\/(\d+)$/);
  if (itemMatch) {
    const item = mockItems.find((i) => i.id === parseInt(itemMatch[1]));
    if (!item) return NextResponse.json({ detail: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  }

  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

export async function POST(request, { params }) {
  const path = getPath(await params);

  if (path === "/auth/login") {
    return NextResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
    });
  }

  if (path === "/auth/register") {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
      ...MOCK_USER,
      email: body.email || MOCK_USER.email,
      full_name: body.full_name || MOCK_USER.full_name,
      role: body.role || MOCK_USER.role,
    }, { status: 201 });
  }

  if (path === "/auth/refresh") {
    return NextResponse.json({ access_token: "mock-access-token", token_type: "bearer" });
  }

  if (path === "/inventory/items") {
    const body = await request.json().catch(() => ({}));
    const category = MOCK_CATEGORIES.find((c) => c.id === parseInt(body.category_id));
    const newItem = {
      id: nextItemId++,
      name: body.name,
      category_id: parseInt(body.category_id),
      category: category || null,
      packaging_type: body.packaging_type || null,
      owner_id: 1,
      created_at: new Date().toISOString(),
    };
    mockItems.push(newItem);
    return NextResponse.json(newItem, { status: 201 });
  }

  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

export async function DELETE(request, { params }) {
  const path = getPath(await params);

  const itemMatch = path.match(/^\/inventory\/items\/(\d+)$/);
  if (itemMatch) {
    const id = parseInt(itemMatch[1]);
    const idx = mockItems.findIndex((i) => i.id === id);
    if (idx === -1) return NextResponse.json({ detail: "Not found" }, { status: 404 });
    mockItems.splice(idx, 1);
    return new Response(null, { status: 204 });
  }

  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}
