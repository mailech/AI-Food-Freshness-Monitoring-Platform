/** Tailwind configuration — design tokens for the platform.
 *
 * Visual direction: "Apple-level cleanliness + modern AI dashboard +
 * futuristic food laboratory". Neutral, layered surfaces carry the interface;
 * green is an intelligent accent, never wallpaper.
 *
 * Surfaces and text are driven by CSS variables (see index.css) so light and
 * dark are genuinely different designs rather than an inversion.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ---- semantic surfaces (theme-aware, from CSS variables) --------
        surface: {
          base: 'rgb(var(--surface-base) / <alpha-value>)',
          sunken: 'rgb(var(--surface-sunken) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          overlay: 'rgb(var(--surface-overlay) / <alpha-value>)',
          inverted: 'rgb(var(--surface-inverted) / <alpha-value>)',
        },
        content: {
          primary: 'rgb(var(--content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--content-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--content-tertiary) / <alpha-value>)',
          inverted: 'rgb(var(--content-inverted) / <alpha-value>)',
        },
        edge: {
          subtle: 'rgb(var(--edge-subtle) / <alpha-value>)',
          DEFAULT: 'rgb(var(--edge-default) / <alpha-value>)',
          strong: 'rgb(var(--edge-strong) / <alpha-value>)',
        },

        // ---- brand: deep green -> fresh green -> mint -------------------
        leaf: {
          50: '#eefbf3',
          100: '#d6f5e3',
          200: '#b0eacb',
          300: '#7bd9ab',
          400: '#45c187',
          500: '#20a76b',
          600: '#128756',
          700: '#0e6b46',
          800: '#0f553a',
          900: '#0d4632',
          950: '#04271c',
        },
        mint: {
          50: '#f2fbf8',
          100: '#dcf5ee',
          200: '#bbe9dd',
          300: '#8bd6c6',
          400: '#54bbaa',
          500: '#34a091',
          600: '#268076',
          700: '#22665f',
          800: '#20524e',
          900: '#1e4541',
        },

        // ---- warm neutrals: cream -> charcoal ---------------------------
        cream: {
          50: '#fdfcf9',
          100: '#faf8f2',
          200: '#f4f0e6',
          300: '#e9e3d4',
          400: '#d5cdb9',
          500: '#b8ad94',
        },
        char: {
          50: '#f6f6f5',
          100: '#e7e7e5',
          200: '#d1d1cd',
          300: '#b0b0aa',
          400: '#88887f',
          500: '#6d6d64',
          600: '#575751',
          700: '#474743',
          800: '#2a2a28',
          900: '#1c1c1b',
          950: '#121211',
          1000: '#0a0a09',
        },

        // ---- status: amber warning, soft red spoilage -------------------
        amber: {
          50: '#fffaeb',
          100: '#fdf0c8',
          200: '#fbe08c',
          300: '#f8c950',
          400: '#f5b229',
          500: '#e9910f',
          600: '#ce6b0a',
          700: '#a94b0c',
          800: '#8a3b11',
          900: '#733111',
        },
        rose: {
          50: '#fef4f3',
          100: '#fde6e4',
          200: '#fbd0cd',
          300: '#f7aea9',
          400: '#f07f78',
          500: '#e3554c',
          600: '#cf382f',
          700: '#ad2b24',
          800: '#8f2721',
          900: '#772722',
        },
        // ---- cool accent for cold chain / storage -----------------------
        chill: {
          50: '#f0f9ff',
          100: '#dff2fe',
          200: '#b8e7fe',
          300: '#79d5fd',
          400: '#32bef8',
          500: '#08a5e9',
          600: '#0083c7',
          700: '#0168a1',
          800: '#065885',
          900: '#0b496e',
        },
      },

      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      // Expressive display sizes down to dense technical text.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.65rem' }],
        xl: ['1.25rem', { lineHeight: '1.8rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.018em' }],
        '3xl': ['1.875rem', { lineHeight: '2.3rem', letterSpacing: '-0.022em' }],
        '4xl': ['2.375rem', { lineHeight: '2.75rem', letterSpacing: '-0.028em' }],
        '5xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.032em' }],
        '6xl': ['3.75rem', { lineHeight: '3.9rem', letterSpacing: '-0.036em' }],
        display: ['4.5rem', { lineHeight: '4.6rem', letterSpacing: '-0.04em' }],
      },

      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },

      boxShadow: {
        // Layered, low-opacity shadows read as depth rather than as a drop shadow.
        xs: '0 1px 2px 0 rgb(var(--shadow-rgb) / 0.05)',
        sm: '0 1px 3px 0 rgb(var(--shadow-rgb) / 0.06), 0 1px 2px -1px rgb(var(--shadow-rgb) / 0.08)',
        card: '0 1px 2px 0 rgb(var(--shadow-rgb) / 0.04), 0 4px 12px -3px rgb(var(--shadow-rgb) / 0.07)',
        raised:
          '0 2px 4px -1px rgb(var(--shadow-rgb) / 0.05), 0 12px 28px -8px rgb(var(--shadow-rgb) / 0.12)',
        float:
          '0 4px 8px -2px rgb(var(--shadow-rgb) / 0.06), 0 24px 48px -12px rgb(var(--shadow-rgb) / 0.18)',
        glass: 'inset 0 1px 0 0 rgb(255 255 255 / 0.08), 0 8px 32px -8px rgb(var(--shadow-rgb) / 0.16)',
        'glow-leaf': '0 0 0 1px rgb(32 167 107 / 0.25), 0 8px 28px -6px rgb(32 167 107 / 0.28)',
        'glow-amber': '0 0 0 1px rgb(245 178 41 / 0.28), 0 8px 28px -6px rgb(245 178 41 / 0.28)',
        'glow-rose': '0 0 0 1px rgb(227 85 76 / 0.28), 0 8px 28px -6px rgb(227 85 76 / 0.28)',
        ring: '0 0 0 3px rgb(32 167 107 / 0.18)',
      },

      backgroundImage: {
        // A very faint fibre grain; keeps large surfaces from looking plastic.
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        'mesh-leaf':
          'radial-gradient(at 18% 12%, rgb(32 167 107 / 0.10) 0px, transparent 55%), radial-gradient(at 82% 8%, rgb(52 160 145 / 0.08) 0px, transparent 50%), radial-gradient(at 68% 88%, rgb(245 178 41 / 0.05) 0px, transparent 45%)',
        'sheen-x':
          'linear-gradient(100deg, transparent 20%, rgb(255 255 255 / 0.14) 45%, transparent 70%)',
      },

      transitionTimingFunction: {
        // Slight overshoot: reads as physical without feeling springy.
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
        snap: 'cubic-bezier(0.34, 1.42, 0.64, 1)',
      },

      transitionDuration: {
        // §47 timing scale.
        micro: '180ms',
        card: '280ms',
        page: '340ms',
        scene: '560ms',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        // Vertical sweep used by the AI scanning overlay.
        'scan-y': {
          '0%': { transform: 'translateY(-8%)', opacity: '0' },
          '12%': { opacity: '1' },
          '88%': { opacity: '1' },
          '100%': { transform: 'translateY(108%)', opacity: '0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.55' },
          '80%,100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'drift-slow': {
          '0%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -2%, 0) scale(1.06)' },
          '100%': { transform: 'translate3d(0,0,0) scale(1)' },
        },
        'sweep-x': { from: { transform: 'translateX(-120%)' }, to: { transform: 'translateX(220%)' } },
        'draw-ring': { from: { strokeDashoffset: 'var(--dash)' }, to: { strokeDashoffset: 'var(--offset)' } },
      },

      animation: {
        'fade-up': 'fade-up 340ms cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 240ms ease-out both',
        'scale-in': 'scale-in 220ms cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.7s infinite',
        'scan-y': 'scan-y 2.1s cubic-bezier(0.4,0,0.6,1) infinite',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.24,0,0.38,1) infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        'drift-slow': 'drift-slow 26s ease-in-out infinite',
        'sweep-x': 'sweep-x 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
      },

      backdropBlur: { xs: '2px' },

      // Used by the 3D tilt utilities.
      perspective: { near: '600px', DEFAULT: '1000px', far: '1600px' },
    },
  },
  plugins: [],
};
