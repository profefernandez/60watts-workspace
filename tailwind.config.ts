import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#08090C",
          50: "#2C303D",
          100: "#222530",
          200: "#1A1D26",
          300: "#14161C",
          400: "#0E1015",
          500: "#08090C",
        },
        "rose-gold": {
          DEFAULT: "#E8A87C",
          light: "#F2C4A0",
          dark: "#C0825E",
          mid: "#D4956C",
        },
        cream: {
          DEFAULT: "#FAF5EF",
          100: "#F0E8DC",
          200: "#E6DCCF",
          300: "#D4C8B8",
        },
      },
      fontFamily: {
        display: ["'Clash Display'"],
        body: ["'Satoshi'"],
        mono: ["'JetBrains Mono'"],
      },
      animation: {
        "orb-drift": "orbDrift 8s ease-in-out infinite",
        sparkle: "sparkle 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        orbDrift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(30px, -20px)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0.6", transform: "translateY(0)" },
          "50%": { opacity: "1", transform: "translateY(-4px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px #E8A87C40" },
          "50%": { boxShadow: "0 0 40px #E8A87C60" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
