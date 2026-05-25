// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeakUp",
  description: "Learn English with SpeakUp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
        {/* Google Identity Services — load conditionally di client */}
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <script src="https://accounts.google.com/gsi/client" async defer />
        )}
      </head>
      <body className="bg-[#0d0f14] text-on-background font-body-large antialiased">
        {children}
      </body>
    </html>
  );
}