"use client";

import { ArrowRight, FileCheck2, Files, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ListaDocumentos } from "@/components/documentos/lista-documentos";
import { ZonaUpload } from "@/components/documentos/zona-upload";
import { useAutenticacao } from "@/contexts/autenticacao";
import { useDocumentos } from "@/hooks/use-documentos";

export default function Bancada() {
  const { usuario } = useAutenticacao();
  const { documentos, carregando, erro } = useDocumentos({ limite: 5 });
  const router = useRouter();
  const nome = String(usuario?.user_metadata?.nome || "").split(" ")[0];
  const prontos = documentos.filter((d) => d.status === "concluido").length;
  const revisados = documentos.filter((d) => d.revisado).length;

  return (
    <main className="pagina-app pagina-bancada">
      <header className="cabecalho-pagina cabecalho-pagina--bancada">
        <div><p className="rotulo">Bancada de conferência</p><h1>{nome ? `Olá, ${nome}.` : "Olá."} O que vamos ler?</h1><p>Envie um documento e acompanhe cada achado até a confirmação.</p></div>
        <div className="sinal-sistema"><span /> Ambiente privado</div>
      </header>
      <ZonaUpload aoEnviar={(documento) => router.push(`/app/documentos/${documento.id}`)} />
      <section className="resumo-bancada">
        <article><span><Files size={18} /></span><div><strong>{documentos.length}</strong><small>recentes</small></div></article>
        <article><span><Sparkles size={18} /></span><div><strong>{prontos}</strong><small>leituras prontas</small></div></article>
        <article><span><FileCheck2 size={18} /></span><div><strong>{revisados}</strong><small>conferidos</small></div></article>
        <p>Os números consideram os documentos carregados nesta visão recente.</p>
      </section>
      <section className="secao-app">
        <header className="secao-app__cabecalho"><div><p className="rotulo">Continuidade</p><h2>Documentos recentes</h2></div><Link href="/app/documentos">Ver histórico <ArrowRight size={15} /></Link></header>
        {erro && <div className="aviso aviso--erro">{erro}</div>}
        <ListaDocumentos documentos={documentos} carregando={carregando} />
      </section>
    </main>
  );
}

