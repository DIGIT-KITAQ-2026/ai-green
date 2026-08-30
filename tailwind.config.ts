import type { Config } from "tailwindcss";

/**
 * 配色は image/ の完成イメージ（Canva）から採取した3色を基準にしている。
 *   濃緑 #2E6417 … サイドバー・見出しバー・タイル
 *   青   #5170FF … 「新規追加」「登録」など主要アクション
 *   黄   #FBBF02 … 業務内容一覧のフォルダ
 * そこに元実装の和紙色（paper / surface2）と落ち着いた文字色を残し、
 * 完成イメージの強い色面が浮かないようにしている。
 */
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
        matcha: {
          DEFAULT: "#2E6417",
          deep: "#224D0F",
          mid: "#437C2A",
          soft: "#E5EDDE",
          line: "#C4D7B7",
        },
        accent: {
          DEFAULT: "#5170FF",
          strong: "#3B57E0",
          soft: "#E9EDFF",
        },
        folder: {
          DEFAULT: "#FBBF02",
          deep: "#E2A400",
          tab: "#F7B200",
        },
        // 湯呑みの抹茶色。マスコット周りの装飾に使う。
        cup: "#D2DCC4",
      },
      fontFamily: {
        // 完成イメージの見出しは極太ゴシック。
        display: ["Zen Kaku Gothic New", "Hiragino Sans", "sans-serif"],
        // ロゴ「新-cha-」は丸ゴシック。
        logo: ["Zen Maru Gothic", "Hiragino Sans", "sans-serif"],
        body: ["Zen Kaku Gothic New", "Hiragino Sans", "sans-serif"],
        hand: ["Klee One", "cursive"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      borderRadius: {
        card: "14px",
        tile: "18px",
      },
      boxShadow: {
        tile: "0 2px 0 0 rgba(34, 77, 15, 0.35)",
        lift: "0 6px 18px -8px rgba(35, 40, 30, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
