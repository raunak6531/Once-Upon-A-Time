import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
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
    <html lang="en" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
