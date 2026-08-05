/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',      // Slate 900
          card: '#1E293B',    // Slate 800
          border: '#334155',  // Slate 700
          text: '#F8FAFC'     // Slate 50
        },
        brand: {
          green: '#10B981',   // Emerald 500
          orange: '#F59E0B',  // Amber 500
          red: '#EF4444',     // Red 500
          primary: '#6366F1'  // Indigo 500
        }
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        glow: '0 0 15px rgba(99, 102, 241, 0.4)'
      }
    },
  },
  plugins: [],
}
