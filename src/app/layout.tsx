import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATC Secure Voting | SOATECO Elections",
  description: "Blockchain-based secure online voting system for Arusha Technical College Student General Elections",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50">
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
