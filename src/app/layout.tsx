import type { Metadata } from "next";
import IconSprite from "@/components/IconSprite";
import "./globals.css";

export const metadata: Metadata = {
  title: "新-cha-",
  description:
    "チャット・写真・PDFで業務内容を学べる新人サポートアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* 見出し=Zen Kaku Gothic New(極太) / ロゴ=Zen Maru Gothic(丸ゴシック)。
            マスコットのセリフだけ手書き調の Klee One を残している。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Zen+Maru+Gothic:wght@300;400;500&family=Klee+One:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-paper text-ink">
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
