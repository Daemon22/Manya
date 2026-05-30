import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "uSINGA - API NEXUS",
  description: "Universal API wallet and intelligence platform."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

