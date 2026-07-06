import type { Metadata } from "next";
import "./globals.css";

// Metadati globali dell'applicazione (visibili nel tab del browser e nei meta tag)
export const metadata: Metadata = {
  title: "Vytalia",
  description:
    "Piattaforma di monitoraggio dello stato di salute dei pazienti tramite Digital Twin.",
};

/*
 * Root layout minimale: fornisce solo la struttura HTML di base e i CSS globali.
 * La Sidebar è nel layout del route group (app), le pagine auth hanno il proprio layout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
