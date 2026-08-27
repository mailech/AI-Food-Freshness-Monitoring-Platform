import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Check if we are running in docker-compose production or local dev
    const targetBackend = process.env.NODE_ENV === "production" || process.env.DOCKER_ENV === "true"
      ? "http://backend:8000"
      : "http://localhost:8000";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${targetBackend}/api/v1/:path*`,
      },
      {
        source: "/static/uploads/:path*",
        destination: `${targetBackend}/static/uploads/:path*`,
      },
      {
        source: "/docs",
        destination: `${targetBackend}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${targetBackend}/openapi.json`,
      },
      {
        source: "/health",
        destination: `${targetBackend}/health`,
      },
    ];
  },
};

export default nextConfig;
