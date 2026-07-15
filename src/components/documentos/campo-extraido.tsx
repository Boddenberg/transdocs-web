"use client";

import { Check, CheckCircle2, Clipboard, ExternalLink, Pencil, Save, X } from "lucide-react";
import { useState } from "react";

import type { CorrecaoCampo, GrupoExtracao, ItemExtraido } from "@/types/documentos";

export function CampoExtraido({
  item,
  grupo,
  indice,
  aoCorrigir,
  aoAbrirPagina
}: {
  item: ItemExtraido;
  grupo: GrupoExtracao;
  indice: number;
  aoCorrigir(dados: CorrecaoCampo): Promise<void>;
  aoAbrirPagina(pagina: number): void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(item.valor || "");
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const confianca = Math.round(item.confianca * 100);

  async function salvar(dados: CorrecaoCampo) {
    setSalvando(true);
    try { await aoCorrigir(dados); setEditando(false); }
    finally { setSalvando(false); }
  }

  async function copiar() {
    if (!item.valor) return;
    await navigator.clipboard.writeText(item.valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1200);
  }

  return (
    <article className={`campo-extraido ${item.precisa_revisao ? "campo-extraido--revisao" : ""} ${item.confirmado ? "campo-extraido--confirmado" : ""}`}>
      <div className="campo-extraido__topo">
        <span className="campo-extraido__tipo">{item.tipo}{item.papel ? ` · ${item.papel}` : ""}</span>
        <span className={`confianca ${confianca < 80 ? "confianca--baixa" : ""}`}><i style={{ "--confianca": `${confianca}%` } as React.CSSProperties} />{confianca}%</span>
      </div>
      {editando ? <div className="edicao-campo"><textarea value={valor} onChange={(e) => setValor(e.target.value)} autoFocus /><button onClick={() => salvar({ grupo, indice, valor })} disabled={salvando} aria-label="Salvar"><Save size={16} /></button><button onClick={() => { setEditando(false); setValor(item.valor || ""); }} aria-label="Cancelar"><X size={16} /></button></div> : <p className="campo-extraido__valor">{item.valor || "Não identificado"}</p>}
      {item.trecho && <blockquote>“{item.trecho}”</blockquote>}
      <footer className="campo-extraido__rodape">
        <button className="origem-campo" onClick={() => item.pagina && aoAbrirPagina(item.pagina)} disabled={!item.pagina}><ExternalLink size={13} />{item.pagina ? `Página ${item.pagina}` : "Página não indicada"}</button>
        <div className="acoes-campo">
          <button onClick={copiar} disabled={!item.valor} aria-label="Copiar valor">{copiado ? <Check size={15} /> : <Clipboard size={15} />}</button>
          <button onClick={() => setEditando(true)} aria-label="Editar valor"><Pencil size={15} /></button>
          <button className={item.confirmado ? "confirmado" : ""} onClick={() => salvar({ grupo, indice, confirmado: !item.confirmado })} disabled={salvando} aria-label={item.confirmado ? "Remover confirmação" : "Confirmar campo"}><CheckCircle2 size={16} /><span>{item.confirmado ? "Confirmado" : "Confirmar"}</span></button>
        </div>
      </footer>
    </article>
  );
}

