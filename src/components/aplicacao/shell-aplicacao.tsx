"use client";

import { Archive, ChevronDown, LogOut, ScanLine, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Marca } from "@/components/marca";
import { useAutenticacao } from "@/contexts/autenticacao";

const navegacao = [
  { href: "/app", rotulo: "Bancada", icone: ScanLine },
  { href: "/app/documentos", rotulo: "Documentos", icone: Archive },
  { href: "/app/configuracoes", rotulo: "Configurações", icone: Settings2 }
];

export function ShellAplicacao({ children }: { children: ReactNode }) {
  const { usuario, carregando, sair } = useAutenticacao();
  const [menuAberto, setMenuAberto] = useState(false);
  const caminho = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/auth/login");
  }, [carregando, router, usuario]);

  if (carregando || !usuario) {
    return (
      <div className="carregamento-raiz">
        <span className="orbe-carregando" />
        <p>Preparando sua bancada segura…</p>
      </div>
    );
  }

  const nome = String(usuario.user_metadata?.nome || usuario.email?.split("@")[0] || "Usuário");

  async function encerrar() {
    await sair();
    router.replace("/auth/login");
  }

  return (
    <div className="aplicacao">
      <header className="barra-app">
        <Link href="/app"><Marca compacta /></Link>
        <nav className="navegacao-app" aria-label="Navegação principal">
          {navegacao.map((item) => {
            const ativo = item.href === "/app" ? caminho === item.href : caminho.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={ativo ? "ativo" : ""}>
                <item.icone size={16} />{item.rotulo}
              </Link>
            );
          })}
        </nav>
        <div className="conta-app">
          <button className="conta-app__botao" onClick={() => setMenuAberto((v) => !v)} aria-expanded={menuAberto}>
            <span className="avatar">{nome.slice(0, 1).toUpperCase()}</span>
            <span className="conta-app__texto"><strong>{nome}</strong><small>Sessão protegida</small></span>
            <ChevronDown size={15} />
          </button>
          {menuAberto && (
            <div className="conta-app__menu">
              <Link href="/app/configuracoes" onClick={() => setMenuAberto(false)}><Settings2 size={16} /> Configurações</Link>
              <button onClick={encerrar}><LogOut size={16} /> Sair</button>
            </div>
          )}
        </div>
      </header>
      <div className="aviso-humano"><span /> IA para leitura, conferência sempre humana.</div>
      <div className="conteudo-app">{children}</div>
    </div>
  );
}

