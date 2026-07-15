import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import "./globals.css";

import { ProvedorAutenticacao } from "@/contexts/autenticacao";

export async function generateMetadata(): Promise<Metadata> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") || cabecalhos.get("host");
  const protocolo = cabecalhos.get("x-forwarded-proto") || "https";
  const base = new URL(
    host ? `${protocolo}://${host}` : "https://transdocs-web-production.up.railway.app"
  );
  const titulo = "ThiagoDocs";
  const descricao = "Leitura inteligente de documentos com conferência humana.";

  return {
    metadataBase: base,
    title: { default: titulo, template: "%s · ThiagoDocs" },
    description: descricao,
    applicationName: titulo,
    openGraph: {
      type: "website",
      title: titulo,
      description: descricao,
      images: [{ url: "/og.png", width: 1734, height: 907, alt: "ThiagoDocs" }]
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: ["/og.png"]
    }
  };
}

export default function LayoutRaiz({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorAutenticacao>{children}</ProvedorAutenticacao>
      </body>
    </html>
  );
}
