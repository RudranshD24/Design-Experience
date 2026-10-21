import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { Navbar } from "@/components/layout/Navbar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CargoChain — Academic Smart-Contract Logistics dApp",
  description: "Role-based logistics tracking, IPFS tamper-evident document anchoring, and conditional test-ETH escrow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans`}
      >
        <WalletProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-800 bg-slate-950 py-4 text-xs text-slate-400 font-mono">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-slate-300 font-semibold">CargoChain Core v1.9.0-rc1</span>
                <span className="text-slate-600">|</span>
                <span>EVM: Ganache 1337 (Localhost :8545)</span>
                <span className="text-slate-600">|</span>
                <span>Read Model: PostgreSQL 16</span>
                <span className="text-slate-600">|</span>
                <span>IPFS: Kubo v0.43.1 Online</span>
              </div>
              <div className="text-slate-500">
                Solo Engineering Project: <span className="text-slate-300">Rudransh Dubey</span> (B.Tech AI &amp; DS, NMIMS Indore)
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
