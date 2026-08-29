import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5EF",
        surface: "#FFFFFF",
        surface2: "#EFEDE2",
        ink: "#23281E",
        inksoft: "#5C6353",
        inkfaint: "#8B917E",
        line: "#DAD7C8",
        pencil: "#9B9686",
        tea: {
          DEFAULT: "#4F7A5C",
          strong: "#345943",
          soft: "#E2E8DC",
        },
        hojicha: {
          DEFAULT: "#8C6A3F",
          soft: "#F0E4D3",
        },
      },
      fontFamily: {
        display: ["Shippori Mincho", "serif"],
        body: ["Zen Kaku Gothic New", "Hiragino Sans", "sans-serif"],
        hand: ["Klee One", "cursive"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
