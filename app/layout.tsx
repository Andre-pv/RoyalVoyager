import type { Metadata } from "next";
import "./globals.css";
import FloatingAIChat from "@/components/FloatingAIChat";
import { Toaster } from "sonner";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: "Royal Voyager — Luxury Cruise Booking",
  description: "Discover world-class cruise experiences. Book your luxury voyage today.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 antialiased">
        <Providers>
          <Toaster theme="dark" position="bottom-center" />
          {children}
          {/* Global AI Orchestrator — persists across all pages */}
          <FloatingAIChat />
        </Providers>
      </body>
    </html>
  );
}
