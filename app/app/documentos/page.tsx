"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { ListaDocumentos } from "@/components/documentos/lista-documentos";
import { api } from "@/lib/api";
import { useDocumentos } from "@/hooks/use-documentos";
import type { Documento, StatusDocumento } from "@/types/documentos";

export default function HistoricoDocumentos() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<StatusDocumento | "">("");
  const [excluir, setExcluir] = useState<Documento | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const buscaAdiada = useDeferredValue(busca);
  const { documentos, carregando, erro, recarregar } = useDocumentos({ busca: buscaAdiada, status: status || undefined, limite: 100 });

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try { await api.documentos.excluir(excluir.id); setExcluir(null); recarregar(); }
    finally { setExcluindo(false); }
  }

  return (
    <main className="pagina-app">
      <header className="cabecalho-pagina"><div><p className="rotulo">Arquivo privado</p><h1>Seus documentos</h1><p>Busque, filtre e retome uma conferência de onde parou.</p></div></header>
      <div className="barra-filtros">
        <label className="busca-documentos"><Search size={18} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome do arquivo…" />{busca && <button onClick={() => setBusca("")} aria-label="Limpar busca"><X size={15} /></button>}</label>
        <label className="filtro-status"><SlidersHorizontal size={16} /><select value={status} onChange={(e) => setStatus(e.target.value as StatusDocumento | "")}><option value="">Todos os estados</option><option value="pendente">Na fila</option><option value="processando">Em leitura</option><option value="concluido">Prontos</option><option value="erro_openai">Precisam tentar novamente</option><option value="erro_leitura">Problema de leitura</option></select></label>
      </div>
      {erro && <div className="aviso aviso--erro">{erro}</div>}
      <ListaDocumentos documentos={documentos} carregando={carregando} aoExcluir={setExcluir} />
      {excluir && <div className="modal-fundo" role="presentation" onMouseDown={() => !excluindo && setExcluir(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-excluir" onMouseDown={(e) => e.stopPropagation()}><p className="rotulo">Exclusão permanente</p><h2 id="titulo-excluir">Excluir este documento?</h2><p><strong>{excluir.nome_original}</strong> e todos os dados extraídos serão removidos do banco e do armazenamento privado.</p><div className="modal__acoes"><button className="botao botao--secundario" onClick={() => setExcluir(null)} disabled={excluindo}>Cancelar</button><button className="botao botao--perigo" onClick={confirmarExclusao} disabled={excluindo}>{excluindo ? "Excluindo…" : "Excluir permanentemente"}</button></div></section></div>}
    </main>
  );
}

