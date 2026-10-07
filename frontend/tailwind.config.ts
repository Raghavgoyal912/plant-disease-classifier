import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#EAF3E1",
        "surface-raised": "#F3F8EC",
        card: "#E8D1EB",
        text: "#222222",
        accent: "#BFB33B",
        leaf: "#5E8C61",
        // Fallbacks mapped to new palette for legacy pages until updated
        canvas: "#EAF3E1",
        surface: "#F3F8EC",
        ink: "#222222",
        muted: "#5E8C61",
        forest: "#5E8C61",
        forestDark: "#222222",
        rust: "#222222",
        ochre: "#BFB33B",
        line: "#5E8C61",
      },
      fontFamily: {
        typewriter: ["var(--font-courier-prime)", "Courier Prime", "monospace"],
        sans: ["var(--font-plus-jakarta)", "Plus Jakarta Sans", "sans-serif"],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
      },
    },
  },
  plugins: [],
};

export default config;
