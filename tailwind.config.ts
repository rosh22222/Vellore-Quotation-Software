import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#241D22",
        navy: "#512B46",
        gold: "#C08A3E",
        wine: "#9C3151",
        line: "#D8CCD2",
        panel: "#F7F4F5",
        mist: "#E7DCE2",
        cloud: "#DCE8ED",
        blush: "#F2E7D4",
        rose: "#F5DDE4"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(36, 29, 34, 0.11)"
      }
    }
  },
  plugins: []
};

export default config;
