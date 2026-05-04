import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1A5FD4",
          "blue-dark": "#0D3D8E",
          "blue-deeper": "#071F4A",
          navy: "#050E21",
          gold: "#C9A84C",
          "gold-light": "#E8CC7A",
          "gold-dark": "#9C7A2A",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "luxury-gradient":
          "linear-gradient(135deg, #050E21 0%, #0D3D8E 50%, #1A5FD4 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #9C7A2A 0%, #C9A84C 50%, #E8CC7A 100%)",
        "card-gradient":
          "linear-gradient(145deg, rgba(26,95,212,0.15) 0%, rgba(5,14,33,0.8) 100%)",
      },
      boxShadow: {
        luxury: "0 8px 32px rgba(26, 95, 212, 0.25)",
        gold: "0 4px 20px rgba(201, 168, 76, 0.35)",
        card: "0 2px 24px rgba(0,0,0,0.35)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
        float: "float 3s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
