"use client";

import { ChevronLeft, ChevronRight, ExternalLink, FileWarning, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

import type { Documento } from "@/types/documentos";

export function VisualizadorDocumento({
  documento,
  url,
  pagina,
  aoMudarPagina
}: {
  documento: Documento;
  url: string | null;
  pagina: number;
  aoMudarPagina(pagina: number): void;
}) {
  const [zoom, setZoom] = useState(1);
  const total = documento.total_paginas || 1;
  const origem = url && documento.tipo_arquivo === "pdf" ? `${url}#page=${pagina}&view=FitH` : url;

  return (
    <section className="visualizador">
      <header className="visualizador__barra">
        <div className="controle-pagina">
          <button onClick={() => aoMudarPagina(Math.max(1, pagina - 1))} disabled={pagina <= 1} aria-label="Página anterior"><ChevronLeft size={16} /></button>
          <span>Página <strong>{pagina}</strong> de {total}</span>
          <button onClick={() => aoMudarPagina(Math.min(total, pagina + 1))} disabled={pagina >= total} aria-label="Próxima página"><ChevronRight size={16} /></button>
        </div>
        <div className="controle-zoom">
          {documento.tipo_arquivo === "imagem" && <><button onClick={() => setZoom((v) => Math.max(.6, v - .15))} aria-label="Reduzir"><ZoomOut size={16} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((v) => Math.min(2.2, v + .15))} aria-label="Ampliar"><ZoomIn size={16} /></button><button onClick={() => setZoom(1)} aria-label="Restaurar zoom"><RotateCcw size={15} /></button></>}
          {url && <a href={url} target="_blank" rel="noreferrer" aria-label="Abrir documento em nova guia"><ExternalLink size={16} /></a>}
        </div>
      </header>
      <div className="visualizador__palco">
        {!origem ? (
          <div className="visualizador__indisponivel"><FileWarning size={28} /><p>Preparando acesso temporário ao arquivo…</p></div>
        ) : documento.tipo_arquivo === "pdf" ? (
          <iframe key={origem} src={origem} title={`Visualização de ${documento.nome_original}`} referrerPolicy="no-referrer" />
        ) : (
          <div className="imagem-documento">
            <div style={{ transform: `scale(${zoom})` }}>
              {/* A URL assinada é temporária e pertence a um host Supabase configurável. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={origem} alt={`Documento ${documento.nome_original}`} referrerPolicy="no-referrer" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
