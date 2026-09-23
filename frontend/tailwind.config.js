/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme tokens are RGB channels defined per theme in index.css, so opacity
        // modifiers like bg-nexus-accent/10 keep working in both light and dark.
        nexus: {
          bg: 'rgb(var(--nx-bg) / <alpha-value>)',
          surface: 'rgb(var(--nx-surface) / <alpha-value>)',
          panel: 'rgb(var(--nx-panel) / <alpha-value>)',
          border: 'rgb(var(--nx-border) / <alpha-value>)',
          accent: 'rgb(var(--nx-accent) / <alpha-value>)',
          'accent-light': 'rgb(var(--nx-accent-light) / <alpha-value>)',
          glow: 'rgb(var(--nx-glow) / <alpha-value>)',
          cyan: 'rgb(var(--nx-cyan) / <alpha-value>)',
          purple: 'rgb(var(--nx-purple) / <alpha-value>)',
          text: 'rgb(var(--nx-text) / <alpha-value>)',
          muted: 'rgb(var(--nx-muted) / <alpha-value>)',
          heading: 'rgb(var(--nx-heading) / <alpha-value>)',
          // Neutral tint for hover/pressed layers: white on dark, ink on light
          overlay: 'rgb(var(--nx-overlay) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'nexus-gradient': 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #22d3ee 100%)',
      },
    },
  },
  plugins: [],
};
