import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Care Agent · 健康手记",
  description: "结合 Oura 数据与日常生活的中文健康手记。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
