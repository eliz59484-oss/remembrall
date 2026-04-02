import type { Metadata, Viewport } from "next";
import { Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif({ 
  subsets: ["cyrillic", "latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
});

const manrope = Manrope({ 
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Remembrall — Magical Memory Assistant",
  description: "Ваш магический помощник памяти | Your magical memory assistant. Напоминания, Помодоро, продуктивность.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Remembrall",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06060f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${notoSerif.variable} ${manrope.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
