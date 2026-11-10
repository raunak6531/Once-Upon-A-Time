import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "Once Upon A Time — Your Cloud EPUB Reader",
  description:
    "A beautiful cloud-synced EPUB reader with dynamic theming that adapts to your book's cover art.",
  keywords: ["epub reader", "ebook", "cloud reader", "dynamic theme"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
