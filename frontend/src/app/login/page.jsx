"use client";

import { useEffect, useState } from "react";

const ROLES = [
  "Consumer",
  "Retail Manager",
  "Warehouse Operator",
  "Food Quality Inspector",
  "Administrator",
];

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "Consumer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Surface OAuth errors passed back via query param from the callback page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "google_auth_failed") {
      setError("Google sign-in failed. Please try again or use email/password.");
    }
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.fullName,
            role: form.role,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || "Registration failed");
        }
      }
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Invalid email or password");
      }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Food Freshness Monitoring Platform
        </p>

        {mode === "login" && (
          <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <span className="font-semibold">Demo:</span> use any email and password (8+ chars) to sign in.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>

        <a
          href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/google/login`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" />
          </svg>
          Sign in with Google
        </a>

        <button
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
        >
          {mode === "login"
            ? "No account yet? Register"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
