import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
