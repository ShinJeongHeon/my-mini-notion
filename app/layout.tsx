import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppProvider } from "@/lib/store";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "미니 노션",
  description: "나만의 가벼운 업무 관리 공간",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전 테마 적용(no-FOUC) — preventing-flash-before-hydration.md */}
        <ThemeScript />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
