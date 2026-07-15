"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  Plus,
  UploadCloud,
  X
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { enviarDocumento } from "@/lib/api";
import { formatarTamanho } from "@/lib/formatadores";
import type { Documento } from "@/types/documentos";

const TIPOS = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const LIMITE_PDF = 50 * 1024 * 1024;
const LIMITE_ANALISE_COMPLETA = 25 * 1024 * 1024;
const LIMITE_IMAGEM = 25 * 1024 * 1024;
const LIMITE_ARQUIVOS = 10;

type EstadoFila = "aguardando" | "enviando" | "enviado" | "erro";

interface ItemFila {
  id: string;
  arquivo: File;
  somentePrimeiraPagina: boolean;
  estado: EstadoFila;
  progresso: number;
  documento?: Documento;
  erro?: string;
}

interface PropriedadesZonaUpload {
  aoEnviar?(documento: Documento): void;
  aoConcluir?(documentos: Documento[]): void;
  compacto?: boolean;
}

function criarId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function chaveArquivo(arquivo: File) {
  return `${arquivo.name}:${arquivo.size}:${arquivo.lastModified}`;
}

function validarArquivo(arquivo: File): string | null {
  if (!TIPOS.includes(arquivo.type)) return `${arquivo.name}: use PDF, JPG, PNG ou WEBP.`;
  const pdf = arquivo.type === "application/pdf";
  if (arquivo.size > (pdf ? LIMITE_PDF : LIMITE_IMAGEM)) {
    return `${arquivo.name}: ${pdf ? "o PDF deve ter até 50 MB" : "a imagem deve ter até 25 MB"}.`;
  }
  return null;
}

export function ZonaUpload({ aoEnviar, aoConcluir, compacto = false }: PropriedadesZonaUpload) {
  const input = useRef<HTMLInputElement>(null);
  const cancelamento = useRef<AbortController | null>(null);
  const interromperFila = useRef(false);
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizar(id: string, dados: Partial<ItemFila>) {
    setItens((atuais) => atuais.map((item) => item.id === id ? { ...item, ...dados } : item));
  }

  function selecionar(lista: FileList | File[]) {
    setErro(null);
    const novos = Array.from(lista);
    if (!novos.length) return;
    const existentes = new Set(itens.map((item) => chaveArquivo(item.arquivo)));
    const espaco = LIMITE_ARQUIVOS - itens.length;
    const aceitos: ItemFila[] = [];
    const falhas: string[] = [];

    novos.slice(0, Math.max(0, espaco)).forEach((arquivo) => {
      const falha = validarArquivo(arquivo);
      if (falha) return falhas.push(falha);
      if (existentes.has(chaveArquivo(arquivo))) return;
      existentes.add(chaveArquivo(arquivo));
      aceitos.push({
        id: criarId(),
        arquivo,
        somentePrimeiraPagina:
          arquivo.type === "application/pdf" && arquivo.size > LIMITE_ANALISE_COMPLETA,
        estado: "aguardando",
        progresso: 0
      });
    });
    if (novos.length > espaco) falhas.push(`A fila aceita até ${LIMITE_ARQUIVOS} arquivos por vez.`);
    setItens((atuais) => [...atuais, ...aceitos]);
    if (falhas.length) setErro(falhas[0]);
    if (input.current) input.current.value = "";
  }

  function remover(id: string) {
    setItens((atuais) => atuais.filter((item) => item.id !== id));
  }

  function alternarPrimeiraPagina(id: string, valor: boolean) {
    atualizar(id, { somentePrimeiraPagina: valor });
  }

  function interromper() {
    interromperFila.current = true;
    cancelamento.current?.abort();
  }

  async function enviarFila() {
    if (enviando) return;
    const pendentes = itens.filter((item) => item.estado === "aguardando" || item.estado === "erro");
    if (!pendentes.length) return;
    setEnviando(true);
    setErro(null);
    interromperFila.current = false;
    const enviados: Documento[] = [];

    for (const item of pendentes) {
      if (interromperFila.current) break;
      const controlador = new AbortController();
      cancelamento.current = controlador;
      atualizar(item.id, { estado: "enviando", progresso: 0, erro: undefined });
      try {
        const documento = await enviarDocumento(
          item.arquivo,
          { somentePrimeiraPagina: item.somentePrimeiraPagina },
          (progresso) => atualizar(item.id, { progresso }),
          controlador.signal
        );
        enviados.push(documento);
        atualizar(item.id, { estado: "enviado", progresso: 100, documento });
        aoEnviar?.(documento);
      } catch (falha) {
        const cancelado = falha instanceof Error && falha.name === "AbortError";
        atualizar(item.id, {
          estado: cancelado ? "aguardando" : "erro",
          progresso: 0,
          erro: cancelado ? undefined : falha instanceof Error ? falha.message : "Falha no envio."
        });
      }
    }
    cancelamento.current = null;
    setEnviando(false);
    if (enviados.length) aoConcluir?.(enviados);
  }

  const pendentes = itens.filter((item) => item.estado !== "enviado").length;
  const concluidos = itens.length - pendentes;

  return (
    <section
      className={`zona-upload ${compacto ? "zona-upload--compacta" : ""} ${arrastando ? "zona-upload--ativa" : ""}`}
      onDragOver={(evento) => { evento.preventDefault(); if (!enviando) setArrastando(true); }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(evento) => {
        evento.preventDefault();
        setArrastando(false);
        if (!enviando) selecionar(evento.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        multiple
        disabled={enviando}
        onChange={(evento) => evento.target.files && selecionar(evento.target.files)}
        hidden
      />

      {!itens.length ? (
        <button className="zona-upload__seletor" onClick={() => input.current?.click()} type="button">
          <span className="zona-upload__icone"><UploadCloud size={27} /></span>
          <span>
            <strong>Solte um ou vários documentos</strong>
            <small>Eles entram numa fila e são enviados um por vez.</small>
          </span>
          <span className="zona-upload__formatos"><FileText size={14} /> PDF até 50 MB <FileImage size={14} /> Imagens até 25 MB</span>
        </button>
      ) : (
        <div className="fila-upload">
          <header className="fila-upload__cabecalho">
            <div>
              <span className="zona-upload__icone"><UploadCloud size={21} /></span>
              <span><strong>Fila de análises</strong><small>{concluidos ? `${concluidos} enviado${concluidos > 1 ? "s" : ""} · ` : ""}{pendentes} aguardando</small></span>
            </div>
            <button type="button" className="botao botao--secundario fila-upload__adicionar" onClick={() => input.current?.click()} disabled={enviando || itens.length >= LIMITE_ARQUIVOS}><Plus size={15} /> Adicionar</button>
          </header>
          <div className="fila-upload__itens">
            {itens.map((item, indice) => {
              const pdf = item.arquivo.type === "application/pdf";
              const obrigatoria = pdf && item.arquivo.size > LIMITE_ANALISE_COMPLETA;
              return (
                <article className={`item-fila item-fila--${item.estado}`} key={item.id}>
                  <span className="item-fila__ordem">{indice + 1}</span>
                  <span className="item-fila__icone">
                    {item.estado === "enviando" ? <Loader2 size={18} className="girando" /> : item.estado === "enviado" ? <CheckCircle2 size={18} /> : item.estado === "erro" ? <AlertCircle size={18} /> : pdf ? <FileText size={18} /> : <FileImage size={18} />}
                  </span>
                  <span className="item-fila__dados">
                    <strong>{item.arquivo.name}</strong>
                    <small>{formatarTamanho(item.arquivo.size)}{item.erro ? ` · ${item.erro}` : item.estado === "enviando" ? ` · enviando ${item.progresso}%` : item.estado === "enviado" ? " · análise iniciada" : " · aguardando envio"}</small>
                    {pdf && item.estado !== "enviado" && (
                      <label className={obrigatoria ? "obrigatoria" : ""}>
                        <input type="checkbox" checked={item.somentePrimeiraPagina} disabled={enviando || obrigatoria} onChange={(evento) => alternarPrimeiraPagina(item.id, evento.target.checked)} />
                        Somente a primeira página{obrigatoria ? " (obrigatório acima de 25 MB)" : ""}
                      </label>
                    )}
                    {item.estado === "enviando" && <span className="item-fila__progresso"><i style={{ width: `${item.progresso}%` }} /></span>}
                  </span>
                  {item.documento ? <Link className="item-fila__abrir" href={`/app/documentos/${item.documento.id}`}>Abrir</Link> : !enviando && <button className="icone-botao" type="button" onClick={() => remover(item.id)} aria-label={`Remover ${item.arquivo.name}`}><X size={15} /></button>}
                </article>
              );
            })}
          </div>
          <footer className="fila-upload__acoes">
            <small>O processamento continua em segundo plano depois de cada envio.</small>
            {enviando ? <button className="botao botao--secundario" type="button" onClick={interromper}>Pausar fila</button> : pendentes > 0 && <button className="botao botao--primario" type="button" onClick={enviarFila}>Enviar {pendentes} {pendentes === 1 ? "documento" : "documentos"}</button>}
          </footer>
        </div>
      )}
      {erro && <div className="aviso aviso--erro zona-upload__erro" role="alert">{erro}</div>}
    </section>
  );
}
