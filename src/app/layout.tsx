import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import PushManager from "@/components/PushManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CheckYourDrip — Dashboard",
  description: "Système de détection de tenues vestimentaires inappropriées",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} min-h-screen bg-surface`}>
        <header className="sticky top-0 z-40 border-b border-gray-700/50 bg-surface/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-lg font-bold tracking-tight text-white"
              >
                CheckYourDrip
              </Link>
              <span className="hidden sm:inline-block rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/20">
                LIVE
              </span>
            </div>
            <nav className="flex items-center gap-3">
              <PushManager />
              <Link
                href="/settings"
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
              >
                Paramètres
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
