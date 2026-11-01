import type { Metadata } from "next";
import "./globals.css";
import "./modern.css";
import "./dark-theme.css";
import "./route-loading.css";

export const metadata: Metadata = {
  title: "FluxHub | Gestão Mercado Livre",
  description: "Gestão integrada de catálogo, estoque, rentabilidade, fabricantes, compras e dados do Mercado Livre.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
