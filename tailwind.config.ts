import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        veolia: {
          50: "#EEF3F8",
          100: "#D5E1EE",
          200: "#A9C0D7",
          300: "#7DA0C0",
          400: "#517FA9",
          500: "#2C5F8E",
          600: "#1F4E79",
          700: "#163A5A",
          800: "#0E263C",
          900: "#07131E",
        },
        slate: {
          25: "#FAFBFC",
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
