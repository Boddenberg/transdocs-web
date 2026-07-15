"use client";

import { AlertOctagon, ArrowLeft, CheckCircle2, Files, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EstadoProcessamento } from "@/components/documentos/estado-processamento";
import { ModalNovaAnalise } from "@/components/documentos/modal-nova-analise";
import { PainelExtracao } from "@/components/documentos/painel-extracao";
import { StatusDocumento } from "@/components/documentos/status-documento";
import { VisualizadorDocumento } from "@/components/documentos/visualizador-documento";
import { useDocumento } from "@/hooks/use-documento";
import { api } from "@/lib/api";
import { formatarData, formatarTamanho } from "@/lib/formatadores";
import type { CorrecaoCampo } from "@/types/documentos";

export default function AnaliseDocumento() {
  const { id } = useParams<{ id: string }>();
  const { documento, url, carregando, erro, recarregar, atualizarExtracao, atualizarDocumento } = useDocumento(id);
  const [pagina, setPagina] = useState(1);
  const [salvandoRevisao, setSalvandoRevisao] = useState(false);
  const [novaAnaliseAberta, setNovaAnaliseAberta] = useState(false);

  async function corrigir(dados: CorrecaoCampo) {
    const extracao = await api.documentos.corrigir(id, dados);
    atualizarExtracao(extracao);
  }

  async function revisar() {
    if (!documento) return;
    setSalvandoRevisao(true);
    try {
      const atualizado = await api.documentos.revisar(id, !documento.revisado);
      atualizarDocumento({ revisado: atualizado.revisado });
    } finally { setSalvandoRevisao(false); }
  }

  async function reprocessar() {
    const atualizado = await api.documentos.reprocessar(id);
    atualizarDocumento({ status: atualizado.status, codigo_erro: null });
    recarregar();
  }

  if (carregando) return <main className="pagina-analise"><div className="analise-skeleton"><span /><span /></div></main>;
  if (erro || !documento) return <main className="pagina-analise"><div className="erro-pagina"><AlertOctagon size={31} /><h1>Não foi possível abrir este documento.</h1><p>{erro}</p><Link className="botao botao--secundario" href="/app/documentos"><ArrowLeft size={16} /> Voltar ao histórico</Link></div></main>;

  const emProcessamento = documento.status === "pendente" || documento.status === "processando";
  const comErro = documento.status.startsWith("erro_");

  return (
    <main className="pagina-analise">
      <header className="cabecalho-analise">
        <Link className="voltar-analise" href="/app/documentos"><ArrowLeft size={17} /></Link>
        <div className="titulo-analise"><strong>{documento.nome_original}</strong><span>{formatarTamanho(documento.tamanho_bytes)} · enviado em {formatarData(documento.criado_em)}</span></div>
        <StatusDocumento status={documento.status} revisado={documento.revisado} />
        <button className="botao-nova-analise" type="button" onClick={() => setNovaAnaliseAberta(true)}><Files size={16} /> Analisar outro</button>
        {documento.status === "concluido" && <button className={`botao-revisao ${documento.revisado ? "ativo" : ""}`} onClick={revisar} disabled={salvandoRevisao}>{documento.revisado ? <ShieldCheck size={16} /> : <CheckCircle2 size={16} />}{salvandoRevisao ? "Salvando…" : documento.revisado ? "Revisado" : "Marcar como revisado"}</button>}
      </header>
      {emProcessamento ? <div className="workspace-analise workspace-analise--espera"><VisualizadorDocumento documento={documento} url={url} pagina={pagina} aoMudarPagina={setPagina} /><EstadoProcessamento status={documento.status} /></div> : comErro ? <div className="workspace-analise workspace-analise--espera"><VisualizadorDocumento documento={documento} url={url} pagina={pagina} aoMudarPagina={setPagina} /><div className="erro-processamento"><AlertOctagon size={28} /><p className="rotulo">Leitura interrompida</p><h2>O documento precisa de uma nova tentativa.</h2><p>O arquivo continua protegido. Tente novamente; se o problema persistir, confira se ele abre normalmente e não possui senha.</p><button className="botao botao--primario" onClick={reprocessar}><RefreshCw size={16} /> Tentar novamente</button></div></div> : documento.extracao ? <div className="workspace-analise"><VisualizadorDocumento documento={documento} url={url} pagina={pagina} aoMudarPagina={setPagina} /><PainelExtracao resultado={documento.extracao.resultado} aoCorrigir={corrigir} aoAbrirPagina={(nova) => { setPagina(nova); window.scrollTo({ top: 0, behavior: "smooth" }); }} /></div> : <div className="erro-processamento"><AlertOctagon size={28} /><h2>Resultado ainda indisponível.</h2><button className="botao botao--secundario" onClick={recarregar}>Atualizar</button></div>}
      <ModalNovaAnalise aberto={novaAnaliseAberta} aoFechar={() => setNovaAnaliseAberta(false)} />
    </main>
  );
}
