import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Pépite de l'Enfer (Édition Leboncoin)",
  description: "Party game: trouve la meilleure (pire) annonce de voiture selon des critères."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="relative min-h-screen overflow-x-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-lbc-orange/25 blur-3xl anim-float" />
            <div className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-lbc-navy/10 blur-3xl anim-float" />
            <div className="absolute left-1/4 top-[55%] h-80 w-80 rounded-full bg-sky-400/15 blur-3xl anim-float" />
            <div className="absolute right-1/4 top-[72%] h-72 w-72 rounded-full bg-amber-300/18 blur-3xl anim-float" />
            <div className="absolute left-8 top-28 rotate-[-8deg] rounded-blob border border-lbc-navy/10 bg-white/30 px-4 py-2 text-xs font-black text-lbc-navy/70 shadow-sm">
              PARTY MODE
            </div>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
