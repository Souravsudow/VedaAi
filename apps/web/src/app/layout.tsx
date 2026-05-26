import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VEDAai Assessment Studio",
  description: "Teacher-facing AI assessment generation workflow"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
