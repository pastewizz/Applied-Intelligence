/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        surface: "#0a0a0a",
        border: "#222222",
        brand: {
          cyan: "#00d2ff",
          blue: "#3a7bd5",
          purple: "#8a2be2"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(to right, #00d2ff, #3a7bd5, #8a2be2)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
