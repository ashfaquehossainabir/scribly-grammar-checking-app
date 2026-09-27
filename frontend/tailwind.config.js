/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefcf5",
          100: "#d6f7e4",
          200: "#adeecb",
          300: "#78dfab",
          400: "#43c988",
          500: "#22b26e",
          600: "#158f59",
          700: "#12704a",
          800: "#13593c",
          900: "#124a33",
          950: "#062a1d",
        },
        ink: {
          900: "#0f1414",
          800: "#1a2222",
          700: "#283232",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        premium: "0 20px 50px -12px rgba(18, 74, 51, 0.25)",
        card: "0 2px 10px rgba(15, 20, 20, 0.06)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
