/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#52944d",
          dark: "#3f7539",
          light: "#e8f3e7",
          soft: "#c8ddc7",
          glow: "#6aad65",
        },
        ink: {
          DEFAULT: "#1a2318",
          soft: "#3d4a38",
          muted: "#5f6f58",
        },
        surface: "#f4f7f2",
        panel: "#ffffff",
        line: "#e2e9dc",
        line2: "#d0dbd0",
      },
      boxShadow: {
        card: "0 1px 3px rgba(26,35,24,0.06), 0 8px 24px rgba(26,35,24,0.04)",
        float: "0 4px 20px rgba(82,148,77,0.12)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
