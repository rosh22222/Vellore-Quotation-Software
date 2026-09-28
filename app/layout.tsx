import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vellore Fitness Quotation",
  description: "Multi-store quotation management system for Vellore Fitness"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
