import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Manya — Unify ✦ Collaborate ✦ Impact",
  description:
    "A living circle where enterprises, founders, inventors, researchers, teachers and explorers find each other, form communities, convene voice-first Conclaves, and connect by permission — passkey, QR, or seven characters.",
  keywords: ["Manya", "communities", "founders", "Conclave", "connection", "intelligences", "innovation"],
  authors: [{ name: "Manya" }],
  icons: {
    icon: "/emblem.svg",
  },
  openGraph: {
    title: "Manya — Unify ✦ Collaborate ✦ Impact",
    description: "Reach is finding. Connection is permission. Sign into something already alive.",
    siteName: "Manya",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
