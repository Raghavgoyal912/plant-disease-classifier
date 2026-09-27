import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAF7",
        surface: "#FFFFFF",
        ink: "#1F2A22",
        muted: "#5B6B5E",
        forest: "#2F5233",
        forestDark: "#20391F",
        rust: "#A6461F",
        ochre: "#C08A1E",
        line: "#DCE0D6",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
