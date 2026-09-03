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
        surface: {
          50: "#181d28",
          100: "#131722",
          200: "#0f121a",
          300: "#0b0d13",
        },
        brand: {
          green: "#089981",
          red: "#f23645",
          blue: "#2962ff",
          purple: "#7b2cbf",
          gold: "#f59e0b",
        }
      },
    },
  },
  plugins: [],
};
export default config;
