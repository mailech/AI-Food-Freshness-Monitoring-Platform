/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  allowedDevOrigins: ["192.168.137.1"],
  async rewrites() {
    if (process.env.USE_MOCK_API === "1") {
      return [
        {
          source: "/api/v1/:path*",
          destination: "/api/mock/:path*",
        },
      ];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
