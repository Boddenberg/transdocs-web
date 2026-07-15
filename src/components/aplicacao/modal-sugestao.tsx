"use client";

import { CheckCircle2, ImagePlus, Loader2, MessageSquarePlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { enviarSugestao } from "@/lib/api";
import { formatarTamanho } from "@/lib/formatadores";
import type { CategoriaSugestao } from "@/types/sugestoes";

const CATEGORIAS: Array<{ valor: CategoriaSugestao; rotulo: string }> = [
  { valor: "sugestao", rotulo: "Sugestão" },
  { valor: "erro", rotulo: "Encontrei um erro" },
  { valor: "dificuldade", rotulo: "Tive dificuldade" },
  { valor: "outro", rotulo: "Outro" }
];
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const LIMITE_ANEXO = 10 * 1024 * 1024;

interface AnexoLocal {
  arquivo: File;
  url: string;
}

export function ModalSugestao({ aberto, aoFechar }: { aberto: boolean; aoFechar(): void }) {
  const caminho = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const anexosAtuais = useRef<AnexoLocal[]>([]);
  const [categoria, setCategoria] = useState<CategoriaSugestao>("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [anexos, setAnexos] = useState<AnexoLocal[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) aoFechar();
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [aberto, aoFechar, enviando]);

  useEffect(() => {
    anexosAtuais.current = anexos;
  }, [anexos]);

  useEffect(() => () => {
    anexosAtuais.current.forEach((anexo) => URL.revokeObjectURL(anexo.url));
  }, []);

  if (!aberto) return null;

  function escolher(arquivos: FileList | null) {
    setErro(null);
    if (!arquivos) return;
    const espaco = 3 - anexos.length;
    const novos: AnexoLocal[] = [];
    for (const arquivo of Array.from(arquivos).slice(0, Math.max(0, espaco))) {
      if (!TIPOS.includes(arquivo.type)) {
        setErro("Use imagens JPG, PNG ou WEBP.");
        continue;
      }
      if (arquivo.size > LIMITE_ANEXO) {
        setErro("Cada imagem pode ter no máximo 10 MB.");
        continue;
      }
      novos.push({ arquivo, url: URL.createObjectURL(arquivo) });
    }
    if (arquivos.length > espaco) setErro("Você pode anexar até 3 imagens.");
    setAnexos((atuais) => [...atuais, ...novos]);
    if (input.current) input.current.value = "";
  }

  function remover(indice: number) {
    setAnexos((atuais) => {
      URL.revokeObjectURL(atuais[indice].url);
      return atuais.filter((_, atual) => atual !== indice);
    });
  }

  function fechar() {
    if (enviando) return;
    if (enviado) {
      anexos.forEach((anexo) => URL.revokeObjectURL(anexo.url));
      setCategoria("sugestao");
      setMensagem("");
      setAnexos([]);
      setEnviado(false);
    }
    setErro(null);
    aoFechar();
  }

  async function enviar() {
    const texto = mensagem.trim();
    if (texto.length < 3) return setErro("Conte um pouco mais para conseguirmos entender.");
    setEnviando(true);
    setErro(null);
    try {
      await enviarSugestao({
        categoria,
        mensagem: texto,
        paginaOrigem: caminho,
        anexos: anexos.map((anexo) => anexo.arquivo)
      });
      setEnviado(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar sua mensagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fundo" onMouseDown={(evento) => evento.target === evento.currentTarget && fechar()}>
      <section className="modal modal-sugestao" role="dialog" aria-modal="true" aria-labelledby="titulo-sugestao">
        <button className="modal__fechar" type="button" onClick={fechar} aria-label="Fechar"><X size={18} /></button>
        {enviado ? (
          <div className="sugestao-enviada">
            <span><CheckCircle2 size={30} /></span>
            <p className="rotulo">Mensagem recebida</p>
            <h2 id="titulo-sugestao">Obrigado por ajudar a melhorar.</h2>
            <p>Seu relato, a página de origem e os anexos ficaram salvos com segurança.</p>
            <button className="botao botao--primario" type="button" onClick={fechar}>Continuar usando</button>
          </div>
        ) : (
          <>
            <span className="modal-sugestao__icone"><MessageSquarePlus size={22} /></span>
            <p className="rotulo">Fale direto com o produto</p>
            <h2 id="titulo-sugestao">O que podemos melhorar?</h2>
            <p>Sugestão, erro ou dificuldade: escreva aqui e, se ajudar, mande um print.</p>
            <div className="categorias-sugestao" role="radiogroup" aria-label="Tipo da mensagem">
              {CATEGORIAS.map((item) => (
                <button key={item.valor} type="button" className={categoria === item.valor ? "ativo" : ""} onClick={() => setCategoria(item.valor)}>{item.rotulo}</button>
              ))}
            </div>
            <label className="campo-sugestao">
              <span>Mensagem</span>
              <textarea value={mensagem} maxLength={5000} onChange={(evento) => setMensagem(evento.target.value)} placeholder="Conte o que aconteceu ou o que deixaria seu trabalho mais rápido…" autoFocus />
              <small>{mensagem.length}/5.000</small>
            </label>
            <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp" multiple hidden onChange={(evento) => escolher(evento.target.files)} />
            <div className="anexos-sugestao">
              {anexos.map((anexo, indice) => (
                <article key={`${anexo.arquivo.name}-${indice}`}>
                  <span style={{ backgroundImage: `url(${anexo.url})` }} />
                  <div><strong>{anexo.arquivo.name}</strong><small>{formatarTamanho(anexo.arquivo.size)}</small></div>
                  <button type="button" onClick={() => remover(indice)} aria-label={`Remover ${anexo.arquivo.name}`}><X size={14} /></button>
                </article>
              ))}
              {anexos.length < 3 && <button className="anexos-sugestao__adicionar" type="button" onClick={() => input.current?.click()}><ImagePlus size={17} /><span><strong>Anexar print ou foto</strong><small>JPG, PNG ou WEBP · até 10 MB</small></span></button>}
            </div>
            {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
            <div className="modal__acoes">
              <button className="botao botao--secundario" type="button" onClick={fechar}>Cancelar</button>
              <button className="botao botao--primario" type="button" onClick={enviar} disabled={enviando || mensagem.trim().length < 3}>{enviando ? <><Loader2 className="girando" size={16} /> Enviando…</> : "Enviar mensagem"}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
