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
          dark: "#D4956C",
          darker: "#C0825E",
        },
        cream: {
          DEFAULT: "#FAF5EF",
          100: "#F0E8DC",
          200: "#E6DCCF",
          300: "#D4C8B8",
        },
        glass: {
          DEFAULT: "rgba(255,255,255,0.04)",
          hover: "rgba(255,255,255,0.08)",
          border: "rgba(255,255,255,0.06)",
        },
        txt: {
          DEFAULT: "#FAF5EF",
          muted: "#C8BFB4",
          dim: "#8A8078",
          faint: "#5C554E",
        },
        accent: {
          red: "#E85D5D",
          green: "#5DE8A8",
        },
      },
      fontFamily: {
        display: ["'Clash Display'", "sans-serif"],
        body: ["'Satoshi'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        h1: ["40px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["28px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["20px", { lineHeight: "1.7" }],
        nav: ["16px", { lineHeight: "1.5" }],
      },
      backdropBlur: {
        glass: "24px",
      },
      borderRadius: {
        glass: "16px",
        btn: "12px",
      },
      animation: {
        "orb-drift": "orbDrift 8s ease-in-out infinite",
        "profe-sparkle": "profeSparkle 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 3s ease infinite",
      },
      keyframes: {
        orbDrift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -20px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 15px) scale(0.95)" },
        },
        profeSparkle: {
          "0%, 100%": { opacity: "1", transform: "translateY(0)" },
          "50%": { opacity: "0.7", transform: "translateY(-8px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px #E8A87C40" },
          "50%": { boxShadow: "0 0 40px #E8A87C60" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
