"use client";

import { useCallback, useEffect, useState } from "react";

const CATEGORIES_FALLBACK = [];

export default function InventoryPage() {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState(CATEGORIES_FALLBACK);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", category_id: "", packaging_type: "" });
  const [showForm, setShowForm] = useState(false);

  const apiHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  });

  const load = useCallback(
    async (targetPage = page) => {
      setError("");
      const qs = new URLSearchParams({ page: targetPage, page_size: 10 });
      if (search) qs.set("search", search);
      if (categoryFilter) qs.set("category_id", categoryFilter);
      try {
        const res = await fetch(`/api/v1/inventory/items?${qs}`, { headers: apiHeaders() });
        if (!res.ok) throw new Error("Failed to load inventory");
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPageCount(Math.max(1, Math.ceil(data.total / data.page_size)));
      } catch (err) {
        setError(err.message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, search, categoryFilter]
  );

  useEffect(() => {
    fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setUser)
      .catch(() => (window.location.href = "/login"));
    fetch("/api/v1/inventory/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => {});
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createItem(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/v1/inventory/items", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          name: form.name,
          category_id: Number(form.category_id),
          packaging_type: form.packaging_type || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Could not create item");
      }
      setForm({ name: "", category_id: "", packaging_type: "" });
      setShowForm(false);
      load(1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteItem(id) {
    await fetch(`/api/v1/inventory/items/${id}`, { method: "DELETE", headers: apiHeaders() });
    load(page);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          {user && <p className="text-sm text-gray-500">{user.full_name} · {user.role} · {total} items</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            + Add item
          </button>
          <button onClick={logout} className="rounded-xl border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50">
            Sign out
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={createItem} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-4">
          <input required placeholder="Item name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-gray-300 px-3 py-2" />
          <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="rounded-xl border border-gray-300 px-3 py-2">
            <option value="">Category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input placeholder="Packaging (optional)" value={form.packaging_type}
            onChange={(e) => setForm({ ...form, packaging_type: e.target.value })}
            className="rounded-xl border border-gray-300 px-3 py-2" />
          <button type="submit" className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">
            Save
          </button>
        </form>
      )}

      <div className="mb-4 flex gap-3">
        <input placeholder="Search items…" value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
          className="w-64 rounded-xl border border-gray-300 px-3 py-2" />
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); }}
          className="rounded-xl border border-gray-300 px-3 py-2">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => load(1)} className="rounded-xl border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50">
          Filter
        </button>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Packaging</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => (window.location.href = `/inventory/${item.id}`)}>
                <td className="px-4 py-3 font-medium text-blue-600">{item.name}</td>
                <td className="px-4 py-3">{item.category?.name}</td>
                <td className="px-4 py-3">{item.packaging_type || "—"}</td>
                <td className="px-4 py-3">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No items yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40">Prev</button>
          <button disabled={page >= pageCount} onClick={() => load(page + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </main>
  );
}
