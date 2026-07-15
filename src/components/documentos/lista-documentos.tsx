"use client";

import { ChevronRight, FileImage, FileText, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";

import { StatusDocumento } from "@/components/documentos/status-documento";
import {
  formatarCusto,
  formatarData,
  formatarNumero,
  formatarTamanho
} from "@/lib/formatadores";
import type { Documento } from "@/types/documentos";

export function ListaDocumentos({
  documentos,
  carregando,
  aoExcluir
}: {
  documentos: Documento[];
  carregando?: boolean;
  aoExcluir?(documento: Documento): void;
}) {
  if (carregando) {
    return <div className="lista-skeleton">{[1, 2, 3].map((i) => <span key={i} />)}</div>;
  }
  if (!documentos.length) {
    return <div className="estado-vazio"><SearchX size={28} /><strong>Nenhum documento por aqui</strong><p>Envie o primeiro arquivo ou ajuste os filtros da busca.</p></div>;
  }
  return (
    <div className="lista-documentos">
      {documentos.map((documento) => (
        <article className="linha-documento" key={documento.id}>
          <Link className="linha-documento__principal" href={`/app/documentos/${documento.id}`}>
            <span className="linha-documento__icone">{documento.tipo_arquivo === "pdf" ? <FileText size={21} /> : <FileImage size={21} />}</span>
            <span className="linha-documento__nome">
              <strong>{documento.nome_original}</strong>
              <small>
                {formatarTamanho(documento.tamanho_bytes)} · {formatarData(documento.criado_em)}
                {documento.somente_primeira_pagina ? " · só página 1" : ""}
              </small>
              {documento.tipo_documento && <em>{documento.tipo_documento}</em>}
            </span>
            <span className="linha-documento__destaques">
              {documento.dados_principais?.map((dado) => (
                <span key={`${dado.rotulo}-${dado.valor}`}><b>{dado.rotulo}:</b> {dado.valor}</span>
              ))}
            </span>
            {documento.analise ? (
              <span
                className="linha-documento__uso"
                title={`${formatarNumero(documento.analise.tokens_entrada)} tokens de entrada + ${formatarNumero(documento.analise.tokens_saida)} de saída · ${documento.analise.modelo_ia || "modelo não informado"} · dólar a R$ ${documento.analise.cotacao_usd_brl.toFixed(2).replace(".", ",")}`}
              >
                <strong>{formatarNumero(documento.analise.tokens_total)} tokens</strong>
                <small>≈ {formatarCusto(documento.analise.custo_estimado_brl)}</small>
              </span>
            ) : <span className="linha-documento__uso" />}
            <StatusDocumento status={documento.status} revisado={documento.revisado} />
          </Link>
          {aoExcluir && <button className="icone-botao linha-documento__excluir" onClick={() => aoExcluir(documento)} aria-label={`Excluir ${documento.nome_original}`}><Trash2 size={16} /></button>}
          <Link className="linha-documento__abrir" href={`/app/documentos/${documento.id}`} aria-label={`Abrir ${documento.nome_original}`}><ChevronRight size={18} /></Link>
        </article>
      ))}
    </div>
  );
}
