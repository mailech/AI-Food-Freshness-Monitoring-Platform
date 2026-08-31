"use client";

import { use, useEffect, useState } from "react";

const CATEGORY_STYLES = {
  Fresh: "bg-green-100 text-green-800",
  Good: "bg-lime-100 text-lime-800",
  Acceptable: "bg-amber-100 text-amber-800",
  "Near Spoilage": "bg-orange-100 text-orange-800",
  Spoiled: "bg-red-100 text-red-800",
};

export default function ItemDetailPage({ params }) {
  const { itemId } = use(params);
  const [item, setItem] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token")}` });

  async function load() {
    setError("");
    try {
      const itemRes = await fetch(`/api/v1/inventory/items/${itemId}`, { headers: headers() });
      if (itemRes.status === 404) throw new Error("Item not found");
      if (!itemRes.ok) throw new Error("Failed to load item");
      setItem(await itemRes.json());

      const imgRes = await fetch(`/api/v1/inventory/items/${itemId}/images`, { headers: headers() });
      if (imgRes.ok) setImages(await imgRes.json());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/v1/inventory/items/${itemId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        body,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Upload failed");
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <a href="/inventory" className="text-sm text-blue-600 hover:underline">&larr; Back to inventory</a>

      {item && (
        <header className="mt-3 mb-6">
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-sm text-gray-500">{item.category?.name} · {item.packaging_type || "No packaging info"}</p>
        </header>
      )}

      <div className="mb-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-3 font-semibold">Freshness assessment</h2>
        <label
          className={`inline-block cursor-pointer rounded-xl px-5 py-2.5 font-medium text-white transition ${
            uploading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Analyzing…" : "Upload food photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={handleUpload} disabled={uploading} />
        </label>
        <p className="mt-2 text-xs text-gray-400">JPEG / PNG / WebP, max 10 MB. The CNN classifies fresh vs rotten.</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="space-y-4">
        {images.map((img) => (
          <div key={img.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.file_path.replace(/^.*uploads/, "/uploads")} alt="food"
              className="h-28 w-28 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">{new Date(img.uploaded_at).toLocaleString()}</p>
              {img.assessment ? (
                <>
                  <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${CATEGORY_STYLES[img.assessment.freshness_category] || "bg-gray-100"}`}>
                    {img.assessment.freshness_category}
                  </span>
                  <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full ${img.assessment.is_fresh ? "bg-green-500" : "bg-red-500"}`}
                      style={{ width: `${img.assessment.freshness_score}%` }} />
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Score {img.assessment.freshness_score}/100 · spoilage risk {(img.assessment.spoilage_probability * 100).toFixed(1)}% · confidence {(img.assessment.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">Detected: {img.assessment.predicted_class}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Not assessed yet</p>
              )}
            </div>
          </div>
        ))}
        {!uploading && images.length === 0 && !error && (
          <p className="text-center text-gray-400">No images uploaded yet.</p>
        )}
      </div>
    </main>
  );
}
