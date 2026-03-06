import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CSEView is Back",
  description: "ATM Service Call Manager for Technicians",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased bg-background text-foreground min-h-screen`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
