import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Modern Monochrome Graphite & Grey Surfaces
        surface: {
          50: "#27272a",   // zinc-800: elevated chips, dropdowns, inputs
          100: "#1e1e21",  // panel headers, modal surface
          200: "#161618",  // card background, canvas base
          300: "#111113",  // root deep dark grey
        },
        // Re-map slate to elegant neutral grey tones (Zinc/Graphite)
        slate: {
          950: "#0b0b0d",
          900: "#141416",
          850: "#1c1c1f",
          800: "#242428",
          750: "#2d2d33",
          700: "#36363d",
          600: "#4e4e58",
          500: "#71717a",
          400: "#a1a1aa",
          300: "#d4d4d8",
          200: "#e4e4e7",
          100: "#f4f4f5",
          50: "#fafafa",
        },
        brand: {
          green: "#10b981",
          red: "#ef4444",
          blue: "#71717a",   // Sleek slate-grey accent
          purple: "#52525b", // Neutral graphite
          gold: "#d97706",
          zinc: "#3f3f46",
          silver: "#a1a1aa",
        }
      },
    },
  },
  plugins: [],
};
export default config;
