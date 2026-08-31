"use client";

import { useEffect } from "react";

export default function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      window.location.replace("/dashboard");
    } else {
      window.location.replace("/login?error=google_auth_failed");
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center text-gray-500">
      Completing sign-in…
    </main>
  );
}
