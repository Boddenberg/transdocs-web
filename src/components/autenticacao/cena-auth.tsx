import { CheckCircle2, Fingerprint, ScanSearch } from "lucide-react";
import type { ReactNode } from "react";

import { Marca } from "@/components/marca";

export function CenaAuth({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <section className="auth__manifesto">
        <div className="auth__halo" />
        <Marca />
        <div className="auth__texto">
          <p className="rotulo">Leitura inteligente · decisão humana</p>
          <h1>O documento fala. Você confere o que importa.</h1>
          <p>
            Extraia nomes, números, datas e valores com origem, confiança e um fluxo
            desenhado para revisão cuidadosa.
          </p>
        </div>
        <div className="auth__pilha" aria-hidden="true">
          <div className="folha folha--fundo" />
          <div className="folha folha--meio" />
          <div className="folha folha--frente">
            <span className="folha__cabecalho" />
            <span className="folha__linha folha__linha--longa" />
            <span className="folha__linha" />
            <span className="folha__destaque">
              <ScanSearch size={17} /> CPF · 98% de confiança
            </span>
            <span className="folha__linha folha__linha--curta" />
          </div>
        </div>
        <div className="auth__garantias">
          <span><Fingerprint size={16} /> Arquivos privados</span>
          <span><CheckCircle2 size={16} /> Conferência rastreável</span>
        </div>
      </section>
      <section className="auth__painel">
        <div className="auth__formulario">{children}</div>
        <p className="auth__nota">
          O ThiagoDocs auxilia a leitura. A validação final permanece sempre com você.
        </p>
      </section>
    </main>
  );
}
