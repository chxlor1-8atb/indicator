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
        // Precision Terminal Dark Surfaces (Obsidian & Graphite)
        surface: {
          50: "#181B22",   // elevated chips, dropdowns, inputs, active states
          100: "#12151C",  // panel headers, modal surface, toolbars
          150: "#0E1117",  // subpane base
          200: "#0A0C10",  // card background, canvas base
          300: "#060709",  // root deep obsidian dark
        },
        // Re-map slate to ultra-clean neutral graphite/zinc tones
        slate: {
          950: "#07080B",
          900: "#0E1015",
          850: "#14171F",
          800: "#1E222B",
          750: "#272C38",
          700: "#333A48",
          600: "#4B5565",
          500: "#6B7280",
          400: "#9CA3AF",
          300: "#D1D5DB",
          200: "#E5E7EB",
          100: "#F3F4F6",
          50: "#F9FAFB",
        },
        brand: {
          primary: "#2563EB", // Institutional Cobalt CTA
          green: "#10B981",   // Buy / Bullish
          red: "#F43F5E",     // Sell / Bearish
          blue: "#3B82F6",    // Accent
          gold: "#F59E0B",    // Warning / Wait
          purple: "#6366F1",  // Secondary
          zinc: "#27272A",
          silver: "#9CA3AF",
        }
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
        badge: "4px",
        xl: "8px",
        "2xl": "8px",
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};
export default config;
