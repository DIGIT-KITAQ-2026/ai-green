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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Klee+One:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="bg-paper text-ink">
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
