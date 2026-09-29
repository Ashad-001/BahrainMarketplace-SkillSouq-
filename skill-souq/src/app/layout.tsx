import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar"; 
import { LanguageProvider } from '@/context/LanguageContext';
import GoogleTranslator from '@/components/GoogleTranslator';
import SpaceBackground from '@/components/SpaceBackground';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Skill Souq | Bahrain's Premium Skill Marketplace",
  description: "Connect with verified local professionals, document clearance agencies, and freelancers in Bahrain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* We are adding suppressHydrationWarning to the body tag too! */}
      <body className={`${inter.className} antialiased bg-white dark:bg-transparent text-zinc-900 dark:text-zinc-50 transition-colors duration-300`} suppressHydrationWarning>
        <GoogleTranslator />
        <SpaceBackground />
        <Toaster position="bottom-right" />
        <LanguageProvider>
          <Navbar />
          <div className="pt-20"> 
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}