"use client";

import { Files, X } from "lucide-react";

import { ZonaUpload } from "@/components/documentos/zona-upload";

export function ModalNovaAnalise({ aberto, aoFechar }: { aberto: boolean; aoFechar(): void }) {
  if (!aberto) return null;
  return (
    <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && aoFechar()}>
      <section className="modal modal--nova-analise" role="dialog" aria-modal="true" aria-labelledby="titulo-nova-analise">
        <button className="modal__fechar" type="button" onClick={aoFechar} aria-label="Fechar"><X size={18} /></button>
        <span className="modal-sugestao__icone"><Files size={22} /></span>
        <p className="rotulo">Próxima leitura</p>
        <h2 id="titulo-nova-analise">Continue sem sair desta tela.</h2>
        <p>Envie um documento ou monte uma fila com até dez arquivos. Você pode abrir cada resultado assim que quiser.</p>
        <ZonaUpload compacto />
      </section>
    </div>
  );
}
