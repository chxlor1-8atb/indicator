import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Market & News Confluence Indicator",
  description: "AI-Powered Technical Chart & Real-time Financial News Confluence Platform with Telegram Alerts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface-300 text-slate-100 min-h-screen antialiased selection:bg-brand-blue selection:text-white">
        {children}
      </body>
    </html>
  );
}
