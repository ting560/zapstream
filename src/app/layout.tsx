import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "FilmeStream - IPTV na Web",
  description: "Assista IPTV diretamente do seu navegador.",
  keywords: ["FilmeStream", "IPTV", "Next.js", "TypeScript", "Tailwind CSS"],
  openGraph: {
    title: "FilmeStream - IPTV na Web",
    description: "Assista IPTV diretamente do seu navegador.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FilmeStream - IPTV na Web",
    description: "Assista IPTV diretamente do seu navegador.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
