"use client";

import { FileCheck2, FileImage, FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";

import { enviarDocumento } from "@/lib/api";
import { formatarTamanho } from "@/lib/formatadores";
import type { Documento } from "@/types/documentos";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const LIMITE_PDF = 50 * 1024 * 1024;
const LIMITE_ANALISE_COMPLETA = 25 * 1024 * 1024;
const LIMITE_IMAGEM = 25 * 1024 * 1024;

export function ZonaUpload({ aoEnviar }: { aoEnviar(documento: Documento): void }) {
  const input = useRef<HTMLInputElement>(null);
  const cancelamento = useRef<AbortController | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [somentePrimeiraPagina, setSomentePrimeiraPagina] = useState(false);

  function selecionar(novo: File | undefined) {
    setErro(null);
    if (!novo) return;
    if (!TIPOS.includes(novo.type)) return setErro("Use um arquivo PDF, JPG, PNG ou WEBP.");
    const pdf = novo.type === "application/pdf";
    const limite = pdf ? LIMITE_PDF : LIMITE_IMAGEM;
    if (novo.size > limite) {
      return setErro(
        pdf ? "O PDF deve ter no máximo 50 MB." : "A imagem deve ter no máximo 25 MB."
      );
    }
    setArquivo(novo);
    setSomentePrimeiraPagina(pdf && novo.size > LIMITE_ANALISE_COMPLETA);
  }

  async function enviar() {
    if (!arquivo || enviando) return;
    setEnviando(true);
    setErro(null);
    setProgresso(0);
    cancelamento.current = new AbortController();
    try {
      const documento = await enviarDocumento(
        arquivo,
        { somentePrimeiraPagina },
        setProgresso,
        cancelamento.current.signal
      );
      setProgresso(100);
      aoEnviar(documento);
    } catch (falha) {
      if (falha instanceof Error && falha.name === "AbortError") setErro("Envio cancelado.");
      else setErro(falha instanceof Error ? falha.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
      cancelamento.current = null;
    }
  }

  return (
    <section
      className={`zona-upload ${arrastando ? "zona-upload--ativa" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); selecionar(e.dataTransfer.files[0]); }}
    >
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => selecionar(e.target.files?.[0])} hidden />
      {!arquivo ? (
        <button className="zona-upload__seletor" onClick={() => input.current?.click()} type="button">
          <span className="zona-upload__icone"><UploadCloud size={27} /></span>
          <span><strong>Solte um documento para começar</strong><small>ou clique para escolher no computador</small></span>
          <span className="zona-upload__formatos"><FileText size={14} /> PDF até 50 MB <FileImage size={14} /> Imagens até 25 MB</span>
        </button>
      ) : (
        <div className="arquivo-pronto">
          <span className="arquivo-pronto__icone"><FileCheck2 size={26} /></span>
          <span className="arquivo-pronto__conteudo">
            <span className="arquivo-pronto__dados"><strong>{arquivo.name}</strong><small>{formatarTamanho(arquivo.size)} · pronto para leitura</small></span>
            {arquivo.type === "application/pdf" && (
              <label className={`arquivo-pronto__opcao ${arquivo.size > LIMITE_ANALISE_COMPLETA ? "arquivo-pronto__opcao--obrigatoria" : ""}`}>
                <input
                  type="checkbox"
                  checked={somentePrimeiraPagina}
                  disabled={enviando || arquivo.size > LIMITE_ANALISE_COMPLETA}
                  onChange={(evento) => setSomentePrimeiraPagina(evento.target.checked)}
                />
                <span>
                  <strong>Analisar somente a primeira página</strong>
                  <small>{arquivo.size > LIMITE_ANALISE_COMPLETA ? "Obrigatório para PDFs acima de 25 MB." : "Reduz o tempo e o consumo desta análise."}</small>
                </span>
              </label>
            )}
          </span>
          {!enviando && <button className="icone-botao" onClick={() => { setArquivo(null); setSomentePrimeiraPagina(false); }} aria-label="Remover arquivo"><X size={17} /></button>}
          <button className="botao botao--primario" onClick={enviar} disabled={enviando}>{enviando ? `Enviando ${progresso}%` : "Enviar e analisar"}</button>
          {enviando && <div className="progresso-upload"><span style={{ width: `${progresso}%` }} /></div>}
          {enviando && <button className="link-botao" onClick={() => cancelamento.current?.abort()}>Cancelar envio</button>}
        </div>
      )}
      {erro && <div className="aviso aviso--erro zona-upload__erro" role="alert">{erro}</div>}
    </section>
  );
}
