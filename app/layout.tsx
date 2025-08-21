import "./globals.css";
import React from "react";

export const metadata = {
  title: "결투장 해",
  description: "던파M 길드 랭킹 사이트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="text-gray-800 bg-gray-50 antialiased">
        <div className="min-h-screen">
          <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-gray-200 shadow-sm">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-center">
              <a href="/" className="font-bold text-xl text-gray-800">
                결투장 해
              </a>
            </div>
          </header>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
