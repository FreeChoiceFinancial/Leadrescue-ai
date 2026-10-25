import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1915",
        paper: "#f3eee6",
        cream: "#fbf7f1",
        copper: {
          DEFAULT: "#c4622d",
          dark: "#8e4318",
        },
        pine: "#1d6b45",
        stamp: "#8d2f2a",
        line: "#e4d9c8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        ticket: "0 18px 50px rgba(28, 25, 21, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
