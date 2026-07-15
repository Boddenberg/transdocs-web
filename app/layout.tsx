import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { ProvedorAutenticacao } from "@/contexts/autenticacao";

export const metadata: Metadata = {
  title: { default: "TransDocs", template: "%s · TransDocs" },
  description: "Leitura inteligente de documentos com conferência humana.",
  applicationName: "TransDocs"
};

export default function LayoutRaiz({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorAutenticacao>{children}</ProvedorAutenticacao>
      </body>
    </html>
  );
}
