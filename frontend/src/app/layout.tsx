import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Audio Notes Platform",
  description: "Upload audio and get transcripts with AI summaries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 min-h-screen selection:bg-indigo-500/30`}>
        <nav className="border-b border-white/10 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg tracking-tight flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
              AudioNotes
            </a>
            <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
              <a href="/" className="hover:text-white transition-colors">Home</a>
              <a href="/history" className="hover:text-white transition-colors">History</a>
              <a href="/architecture" className="hover:text-white transition-colors">Architecture</a>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
