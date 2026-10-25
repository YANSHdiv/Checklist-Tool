import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReleaseCheck - Your all-in-one release checklist tool",
  description: "A reliable, responsive developer release checklist management tool.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100 min-h-screen text-slate-900">
        {children}
      </body>
    </html>
  );
}
