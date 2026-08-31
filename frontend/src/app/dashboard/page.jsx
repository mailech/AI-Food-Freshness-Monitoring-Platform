"use client";

import { useEffect, useState } from "react";

const BAND_COLORS = {
  Fresh: "bg-green-500",
  Good: "bg-lime-500",
  Acceptable: "bg-amber-500",
  "Near Spoilage": "bg-orange-500",
  Spoiled: "bg-red-500",
};

const BAND_BADGES = {
  Fresh: "bg-green-100 text-green-800",
  Good: "bg-lime-100 text-lime-800",
  Acceptable: "bg-amber-100 text-amber-800",
  "Near Spoilage": "bg-orange-100 text-orange-800",
  Spoiled: "bg-red-100 text-red-800",
};

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    fetch("/api/v1/auth/me", { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("auth"))))
      .then(setUser)
      .catch(() => (window.location.href = "/login"));
    fetch("/api/v1/analytics/dashboard?expiring_within_days=3", { headers })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load dashboard"))))
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <a
          href="/inventory"
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow transition hover:bg-blue-700"
        >
          Manage inventory
        </a>
      </div>
      {user && <p className="mt-1 text-sm text-gray-500">Signed in as {user.full_name} ({user.role})</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

      {!data && !error && <p className="mt-6 text-gray-400">Loading…</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Items in inventory" value={data.total_items} />
            <StatCard label="Avg freshness" value={`${data.average_freshness_score}/100`} />
            <StatCard
              label="Expiring ≤3 days"
              value={data.expiring_soon.length}
              sub="Check shelf-life alerts below"
            />
            <StatCard
              label="Waste risk"
              value={data.waste_insights.at_risk_items + data.waste_insights.spoiled_items}
              sub={`${data.waste_insights.quantity_at_risk} units at risk`}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <h2 className="mb-3 font-semibold">Freshness distribution</h2>
            {data.total_items === 0 ? (
              <p className="text-sm text-gray-400">No items yet — add items in your inventory.</p>
            ) : (
              <>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-100">
                  {Object.entries(data.health_distribution).map(([band, count]) =>
                    count > 0 ? (
                      <div
                        key={band}
                        title={`${band}: ${count}`}
                        className={BAND_COLORS[band]}
                        style={{ width: `${(count / data.total_items) * 100}%` }}
                      />
                    ) : null
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                  {Object.entries(data.health_distribution).map(([band, count]) => (
                    <span key={band} className="inline-flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${BAND_COLORS[band]}`} />
                      {band}: {count}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-3 font-semibold">Consume first</h2>
              {data.consume_first.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing here yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.consume_first.map((it) => (
                    <li key={it.item_id} className="flex items-center justify-between text-sm">
                      <a href={`/inventory/${it.item_id}`} className="font-medium text-blue-600 hover:underline">
                        {it.name}
                      </a>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BAND_BADGES[it.health_category] || "bg-gray-100"}`}>
                        {it.overall_score}/100 · ~{it.remaining_days}d
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-3 font-semibold">Shelf-life alerts</h2>
              {data.expiring_soon.length === 0 ? (
                <p className="text-sm text-gray-400">No items expiring within 3 days.</p>
              ) : (
                <ul className="space-y-2">
                  {data.expiring_soon.map((it) => (
                    <li key={it.item_id} className="flex items-center justify-between text-sm">
                      <a href={`/inventory/${it.item_id}`} className="font-medium text-blue-600 hover:underline">
                        {it.name}
                      </a>
                      <span className="text-xs font-semibold text-orange-600">~{it.remaining_days}d left</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-3 font-semibold">Storage compliance</h2>
              <p className="text-sm text-gray-600">
                {data.storage_compliance.compliant_items}/{data.storage_compliance.with_readings} monitored items compliant
              </p>
              {data.storage_compliance.top_violations.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-500">
                  {data.storage_compliance.top_violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="mb-3 font-semibold">Categories by freshness</h2>
              {data.categories.length === 0 ? (
                <p className="text-sm text-gray-400">No categories yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.categories.map((c) => (
                    <li key={c.category} className="flex justify-between">
                      <span>{c.category}</span>
                      <span className="text-gray-500">{c.avg_score}/100 · {c.count} item(s)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {data.admin_stats && (
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
              <h2 className="mb-3 font-semibold text-indigo-900">Platform admin stats</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Users" value={data.admin_stats.total_users} />
                <StatCard label="Items" value={data.admin_stats.total_items} />
                <StatCard label="Assessments" value={data.admin_stats.total_assessments} />
                <StatCard label="Storage readings" value={data.admin_stats.total_storage_readings} />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
