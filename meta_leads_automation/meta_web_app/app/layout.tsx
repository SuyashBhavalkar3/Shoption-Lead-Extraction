import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meta Leads Automation",
  description: "Secure Lead Capture & Export Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans bg-slate-900 text-slate-100">{children}</body>
    </html>
  );
}
