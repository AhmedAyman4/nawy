import type { Metadata } from "next";
import { NTR, Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const ntrFont = NTR({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ntr",
});

export const metadata: Metadata = {
  title: "Property Recommender",
  description: "AI-powered property recommendations for the Egyptian real estate market.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${ntrFont.variable} font-sans antialiased`}
      >
        <FavoritesProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </div>
        </FavoritesProvider>
      </body>
    </html>
  );
}
