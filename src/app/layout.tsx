import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoGestão | Gestão Mercado Livre",
  description: "Gestão integrada de catálogo, estoque, rentabilidade, fabricantes, compras e dados do Mercado Livre.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
