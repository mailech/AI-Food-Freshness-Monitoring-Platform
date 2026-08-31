import "./globals.css";

export const metadata = {
  title: "Food Freshness Monitoring Platform",
  description:
    "AI-powered food freshness monitoring, shelf-life prediction, and storage recommendations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
