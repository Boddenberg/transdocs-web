"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileArchive,
  FileCheck2,
  FilePenLine,
  FilePlus2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  adicionarFontesPreenchimento,
  api,
  criarPreenchimento
} from "@/lib/api";
import { formatarTamanho } from "@/lib/formatadores";
import type {
  CampoPreenchimento,
  CategoriaFontePreenchimento,
  FonteSelecionada,
  Preenchimento,
  ResultadoPreenchimento,
  TipoPreenchimento
} from "@/types/preenchimentos";

const CHAVE_ULTIMO = "thdocs:ultimo-preenchimento";

function possuiResultado(
  preenchimento: Preenchimento | null
): preenchimento is Preenchimento & { resultado: ResultadoPreenchimento } {
  return Boolean(preenchimento && "campos" in preenchimento.resultado);
}

function fontesSelecionadas(fontes: Record<string, File[]>): FonteSelecionada[] {
  return Object.entries(fontes).flatMap(([categoria, arquivos]) =>
    arquivos.map((arquivo) => ({ categoria, arquivo }))
  );
}

function selecaoComprovada(
  preenchimento: Preenchimento,
  anteriores: Set<string> = new Set()
) {
  if (!("campos" in preenchimento.resultado)) return new Set<string>();
  return new Set(
    preenchimento.resultado.campos
      .filter(
        (campo) =>
          campo.status === "encontrado" &&
          (campo.autoaplicavel || anteriores.has(campo.id))
      )
      .map((campo) => campo.id)
  );
}

function nomeStatus(preenchimento: Preenchimento) {
  return {
    pendente: "Na fila",
    processando: "Comparando fontes",
    aguardando_dados: "Aguardando dados",
    pronto_para_gerar: "Pronto para gerar",
    concluido: "Documento gerado",
    erro_arquivo: "Problema na minuta",
    erro_openai: "Análise indisponível",
    erro_interno: "Não foi possível concluir"
  }[preenchimento.status];
}

export default function PaginaPreenchimentos() {
  const [tipos, setTipos] = useState<TipoPreenchimento[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [arquivoBase, setArquivoBase] = useState<File | null>(null);
  const [fontes, setFontes] = useState<Record<string, File[]>>({});
  const [preenchimento, setPreenchimento] = useState<Preenchimento | null>(null);
  const [historico, setHistorico] = useState<Preenchimento[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipo = tipos.find((item) => item.id === tipoId) || tipos[0];
  const fontesNovas = useMemo(() => fontesSelecionadas(fontes), [fontes]);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.preenchimentos.tipos(), api.preenchimentos.listar()])
      .then(async ([catalogo, recentes]) => {
        if (!ativo) return;
        setTipos(catalogo);
        setTipoId(catalogo[0]?.id || "");
        setHistorico(recentes);
        const ultimo = window.localStorage.getItem(CHAVE_ULTIMO);
        if (ultimo) {
          try {
            const detalhe = await api.preenchimentos.buscar(ultimo);
            if (ativo) {
              setPreenchimento(detalhe);
              setSelecionados(selecaoComprovada(detalhe));
            }
          } catch {
            window.localStorage.removeItem(CHAVE_ULTIMO);
          }
        }
      })
      .catch((falha) =>
        ativo && setErro(falha instanceof Error ? falha.message : "Não foi possível abrir.")
      )
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!preenchimento || !["pendente", "processando"].includes(preenchimento.status)) return;
    let ativo = true;
    const temporizador = window.setTimeout(() => {
      api.preenchimentos
        .buscar(preenchimento.id)
        .then((dados) => {
          if (!ativo) return;
          setPreenchimento(dados);
          setSelecionados((atuais) => selecaoComprovada(dados, atuais));
        })
        .catch((falha) =>
          ativo && setErro(falha instanceof Error ? falha.message : "Falha ao atualizar.")
        );
    }, document.visibilityState === "visible" ? 2500 : 10000);
    return () => {
      ativo = false;
      window.clearTimeout(temporizador);
    };
  }, [preenchimento]);

  function atualizarCategoria(categoria: string, arquivos: File[]) {
    setFontes((atuais) => ({ ...atuais, [categoria]: arquivos }));
  }

  async function iniciar() {
    if (!tipo || !arquivoBase || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const criado = await criarPreenchimento(
        tipo.id,
        arquivoBase,
        fontesNovas
      );
      setPreenchimento(criado);
      setSelecionados(new Set());
      setFontes({});
      setHistorico((atuais) => [criado, ...atuais.filter((item) => item.id !== criado.id)]);
      window.localStorage.setItem(CHAVE_ULTIMO, criado.id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível iniciar.");
    } finally {
      setEnviando(false);
    }
  }

  async function adicionarFontes() {
    if (!preenchimento || !fontesNovas.length || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const atualizado = await adicionarFontesPreenchimento(
        preenchimento.id,
        fontesNovas
      );
      setPreenchimento(atualizado);
      setSelecionados(new Set());
      setFontes({});
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar as fontes.");
    } finally {
      setEnviando(false);
    }
  }

  function alternarCampo(campo: CampoPreenchimento) {
    if (campo.status !== "encontrado") return;
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(campo.id)) proximos.delete(campo.id);
      else proximos.add(campo.id);
      return proximos;
    });
  }

  async function gerar(permitirIncompleto: boolean) {
    if (!preenchimento || gerando) return;
    setGerando(true);
    setErro(null);
    try {
      const atualizado = await api.preenchimentos.gerar(
        preenchimento.id,
        Array.from(selecionados),
        permitirIncompleto
      );
      setPreenchimento(atualizado);
      const arquivo = await api.preenchimentos.arquivo(preenchimento.id);
      const link = document.createElement("a");
      link.href = arquivo.url;
      link.download = arquivo.nome_arquivo;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível gerar o DOCX.");
    } finally {
      setGerando(false);
    }
  }

  async function abrirHistorico(item: Preenchimento) {
    setErro(null);
    try {
      const detalhe = await api.preenchimentos.buscar(item.id);
      setPreenchimento(detalhe);
      setSelecionados(selecaoComprovada(detalhe));
      setFontes({});
      window.localStorage.setItem(CHAVE_ULTIMO, detalhe.id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir.");
    }
  }

  function novo() {
    setPreenchimento(null);
    setArquivoBase(null);
    setFontes({});
    setSelecionados(new Set());
    setErro(null);
    window.localStorage.removeItem(CHAVE_ULTIMO);
  }

  if (carregando) {
    return (
      <main className="pagina-app pagina-preenchimento">
        <div className="preenchimento-carregando"><Loader2 className="girando" /> Preparando os tipos de documento…</div>
      </main>
    );
  }

  return (
    <main className="pagina-app pagina-preenchimento">
      <header className="cabecalho-pagina cabecalho-preenchimento">
        <div>
          <p className="rotulo">Preenchimento documental</p>
          <h1>Da minuta às lacunas comprovadas.</h1>
          <p>O texto existente fica intacto. Cada inclusão precisa apontar para um documento e um trecho.</p>
        </div>
        <span className="selo-sem-inferencia"><ShieldCheck size={16} /> Sem inferências</span>
      </header>

      {erro && <div className="aviso aviso--erro aviso-preenchimento" role="alert"><AlertCircle size={17} />{erro}</div>}

      <div className="grade-preenchimento">
        <section className="fluxo-preenchimento">
          {!preenchimento ? (
            <ConfiguracaoPreenchimento
              tipos={tipos}
              tipoId={tipoId}
              aoMudarTipo={setTipoId}
              tipo={tipo}
              arquivoBase={arquivoBase}
              aoMudarBase={setArquivoBase}
              fontes={fontes}
              aoMudarCategoria={atualizarCategoria}
              enviando={enviando}
              aoIniciar={iniciar}
            />
          ) : ["pendente", "processando"].includes(preenchimento.status) ? (
            <Processando preenchimento={preenchimento} />
          ) : preenchimento.status.startsWith("erro_") ? (
            <EstadoErro preenchimento={preenchimento} aoNovo={novo} />
          ) : possuiResultado(preenchimento) ? (
            <RevisaoPreenchimento
              preenchimento={preenchimento}
              tipo={tipo}
              fontes={fontes}
              aoMudarCategoria={atualizarCategoria}
              fontesNovas={fontesNovas}
              selecionados={selecionados}
              aoAlternar={alternarCampo}
              aoAdicionar={adicionarFontes}
              aoGerar={gerar}
              aoNovo={novo}
              enviando={enviando}
              gerando={gerando}
            />
          ) : null}
        </section>

        <aside className="historico-preenchimentos">
          <header><div><p className="rotulo">Continuidade</p><h2>Preenchimentos recentes</h2></div><Clock3 size={18} /></header>
          {historico.length ? historico.map((item) => (
            <button key={item.id} type="button" onClick={() => abrirHistorico(item)} className={preenchimento?.id === item.id ? "ativo" : ""}>
              <span><FileArchive size={16} /></span>
              <span><strong>{item.nome_minuta}</strong><small>{nomeStatus(item)} · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(item.atualizado_em))}</small></span>
              <ArrowRight size={15} />
            </button>
          )) : <div className="historico-vazio"><FilePenLine size={22} /><p>Seus casos salvos aparecerão aqui.</p></div>}
        </aside>
      </div>
    </main>
  );
}

function ConfiguracaoPreenchimento({
  tipos,
  tipoId,
  aoMudarTipo,
  tipo,
  arquivoBase,
  aoMudarBase,
  fontes,
  aoMudarCategoria,
  enviando,
  aoIniciar
}: {
  tipos: TipoPreenchimento[];
  tipoId: string;
  aoMudarTipo(valor: string): void;
  tipo?: TipoPreenchimento;
  arquivoBase: File | null;
  aoMudarBase(arquivo: File | null): void;
  fontes: Record<string, File[]>;
  aoMudarCategoria(categoria: string, arquivos: File[]): void;
  enviando: boolean;
  aoIniciar(): void;
}) {
  return (
    <>
      <section className="etapa-preenchimento">
        <header><span>01</span><div><p className="rotulo">Tipo de documento</p><h2>Escolha o contrato da minuta</h2></div></header>
        <label className="seletor-tipo-preenchimento">
          <FilePenLine size={21} />
          <span><small>Documento selecionado</small><strong>{tipo?.nome || "Selecione"}</strong><em>{tipo?.descricao}</em></span>
          <select value={tipoId} onChange={(evento) => aoMudarTipo(evento.target.value)} aria-label="Tipo de documento">
            {tipos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
      </section>

      <section className="etapa-preenchimento">
        <header><span>02</span><div><p className="rotulo">Arquivo que volta pronto</p><h2>Envie a minuta em DOCX</h2></div></header>
        <label className={`upload-minuta ${arquivoBase ? "upload-minuta--pronta" : ""}`}>
          <input type="file" accept=".docx" hidden onChange={(evento) => aoMudarBase(evento.target.files?.[0] || null)} />
          {arquivoBase ? <><FileCheck2 size={28} /><span><strong>{arquivoBase.name}</strong><small>{formatarTamanho(arquivoBase.size)} · o original não será alterado</small></span><button type="button" onClick={(evento) => { evento.preventDefault(); aoMudarBase(null); }} aria-label="Remover minuta"><X size={16} /></button></> : <><UploadCloud size={29} /><span><strong>Solte ou selecione a minuta</strong><small>DOCX com conteúdo pronto, parcial ou apenas marcadores</small></span></>}
        </label>
      </section>

      {tipo && <section className="etapa-preenchimento">
        <header><span>03</span><div><p className="rotulo">Fontes opcionais</p><h2>Adicione o que puder comprovar as lacunas</h2><p>Você pode começar sem nenhuma fonte e voltar quando receber os documentos faltantes.</p></div></header>
        <GradeFontes tipo={tipo} fontes={fontes} aoMudar={aoMudarCategoria} />
      </section>}

      <footer className="acoes-inicio-preenchimento">
        <span><ShieldCheck size={16} /> Nada será preenchido apenas porque “parece correto”.</span>
        <button className="botao botao--primario" type="button" onClick={aoIniciar} disabled={!arquivoBase || enviando}>{enviando ? <><Loader2 size={16} className="girando" /> Enviando…</> : <><Sparkles size={16} /> Mapear lacunas</>}</button>
      </footer>
    </>
  );
}

function GradeFontes({ tipo, fontes, aoMudar }: { tipo: TipoPreenchimento; fontes: Record<string, File[]>; aoMudar(categoria: string, arquivos: File[]): void }) {
  return <div className="grade-fontes">{tipo.fontes.map((categoria) => <SeletorFonte key={categoria.id} categoria={categoria} arquivos={fontes[categoria.id] || []} aoMudar={(arquivos) => aoMudar(categoria.id, arquivos)} />)}</div>;
}

function SeletorFonte({ categoria, arquivos, aoMudar }: { categoria: CategoriaFontePreenchimento; arquivos: File[]; aoMudar(arquivos: File[]): void }) {
  return (
    <article className={arquivos.length ? "fonte-upload fonte-upload--com-arquivo" : "fonte-upload"}>
      <label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple hidden onChange={(evento) => aoMudar([...arquivos, ...Array.from(evento.target.files || [])])} />
        <span><FilePlus2 size={18} /></span><strong>{categoria.nome}</strong><p>{categoria.descricao}</p><small>{arquivos.length ? `${arquivos.length} arquivo${arquivos.length > 1 ? "s" : ""}` : "Opcional"}</small>
      </label>
      {arquivos.length > 0 && <div className="arquivos-fonte">{arquivos.map((arquivo, indice) => <span key={`${arquivo.name}-${arquivo.lastModified}`}><FileText size={13} /><em>{arquivo.name}</em><button type="button" onClick={() => aoMudar(arquivos.filter((_, atual) => atual !== indice))} aria-label={`Remover ${arquivo.name}`}><X size={12} /></button></span>)}</div>}
    </article>
  );
}

function Processando({ preenchimento }: { preenchimento: Preenchimento }) {
  return <section className="estado-preenchimento"><span className="orbe-preenchimento"><Loader2 size={30} className="girando" /></span><p className="rotulo">{preenchimento.status === "pendente" ? "Na fila segura" : "Análise documental"}</p><h2>{preenchimento.status === "pendente" ? "Preparando a minuta…" : "Comparando cada lacuna com as fontes…"}</h2><p>Texto já preenchido não entra na lista de alterações. A página atualiza sozinha.</p><div className="trilha-processamento"><span className="feito"><Check size={13} /> Minuta preservada</span><span className={preenchimento.status === "processando" ? "ativo" : ""}><RefreshCw size={13} /> Evidências</span><span><FileCheck2 size={13} /> DOCX</span></div></section>;
}

function EstadoErro({ preenchimento, aoNovo }: { preenchimento: Preenchimento; aoNovo(): void }) {
  return <section className="estado-preenchimento estado-preenchimento--erro"><span className="orbe-preenchimento"><AlertCircle size={30} /></span><p className="rotulo">{nomeStatus(preenchimento)}</p><h2>A minuta não foi modificada.</h2><p>{preenchimento.status === "erro_arquivo" ? "Confirme se o arquivo é uma escritura pública de venda e compra em DOCX válido." : "Tente novamente mais tarde ou inicie um novo preenchimento."}</p><button className="botao botao--secundario" onClick={aoNovo}>Novo preenchimento</button></section>;
}

function RevisaoPreenchimento({ preenchimento, tipo, fontes, aoMudarCategoria, fontesNovas, selecionados, aoAlternar, aoAdicionar, aoGerar, aoNovo, enviando, gerando }: { preenchimento: Preenchimento & { resultado: ResultadoPreenchimento }; tipo?: TipoPreenchimento; fontes: Record<string, File[]>; aoMudarCategoria(categoria: string, arquivos: File[]): void; fontesNovas: FonteSelecionada[]; selecionados: Set<string>; aoAlternar(campo: CampoPreenchimento): void; aoAdicionar(): void; aoGerar(incompleto: boolean): void; aoNovo(): void; enviando: boolean; gerando: boolean }) {
  const { resultado } = preenchimento;
  const todosComprovadosSelecionados = resultado.campos.every((campo) => campo.status === "encontrado" && selecionados.has(campo.id));
  return (
    <>
      <section className="resumo-preenchimento">
        <div><p className="rotulo">Mapa da minuta</p><h2>{resultado.total_pendentes ? "Há dados que ainda precisam de fonte." : "Todas as lacunas têm evidência."}</h2><p>{preenchimento.nome_minuta}</p></div>
        <div className="numeros-preenchimento"><span><strong>{resultado.total_campos}</strong><small>lacunas</small></span><span className="positivo"><strong>{resultado.total_encontrados}</strong><small>com fonte</small></span><span className={resultado.total_pendentes ? "pendente" : "positivo"}><strong>{resultado.total_pendentes}</strong><small>pendentes</small></span></div>
      </section>
      {resultado.alertas.length > 0 && <div className="alertas-preenchimento">{resultado.alertas.map((alerta) => <p key={alerta}><AlertCircle size={14} />{alerta}</p>)}</div>}
      <section className="campos-preenchimento">
        <header><div><p className="rotulo">Conferência antes de escrever</p><h2>Valores e origem documental</h2></div><small>{selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}</small></header>
        {resultado.campos.length ? resultado.campos.map((campo) => <CampoMapeado key={campo.id} campo={campo} selecionado={selecionados.has(campo.id)} aoAlternar={() => aoAlternar(campo)} />) : <div className="sem-lacunas"><CheckCircle2 size={25} /><strong>Nenhum marcador de preenchimento foi encontrado.</strong><p>Você pode devolver uma cópia idêntica da minuta.</p></div>}
      </section>
      {resultado.total_pendentes > 0 && tipo && <section className="fontes-complementares"><header><span><Plus size={17} /></span><div><p className="rotulo">Continuar depois</p><h2>Recebeu um documento que faltava?</h2><p>Adicione novas fontes; este caso já está salvo e será analisado novamente.</p></div></header><GradeFontes tipo={tipo} fontes={fontes} aoMudar={aoMudarCategoria} /><button className="botao botao--secundario" type="button" onClick={aoAdicionar} disabled={!fontesNovas.length || enviando}>{enviando ? <><Loader2 size={15} className="girando" /> Reanalisando…</> : <><RefreshCw size={15} /> Adicionar e reanalisar</>}</button></section>}
      <footer className="acoes-geracao">
        <button className="botao botao--secundario" type="button" onClick={aoNovo}>Novo caso</button>
        <div><p>{resultado.total_pendentes ? "Você pode baixar agora; as lacunas sem prova permanecerão como estão." : "O servidor aplicará somente os campos selecionados."}</p>{resultado.total_pendentes > 0 && <button className="botao botao--secundario" type="button" onClick={() => aoGerar(true)} disabled={gerando}>{gerando ? <Loader2 className="girando" size={15} /> : <Download size={15} />} Gerar com dados disponíveis</button>}<button className="botao botao--primario" type="button" onClick={() => aoGerar(false)} disabled={gerando || !todosComprovadosSelecionados}>{gerando ? <Loader2 className="girando" size={15} /> : <FileCheck2 size={15} />} Gerar documento completo</button></div>
      </footer>
    </>
  );
}

function CampoMapeado({ campo, selecionado, aoAlternar }: { campo: CampoPreenchimento; selecionado: boolean; aoAlternar(): void }) {
  const encontrado = campo.status === "encontrado";
  return <article className={`campo-mapeado campo-mapeado--${campo.status} ${selecionado ? "campo-mapeado--selecionado" : ""}`}>
    <button type="button" className="selecao-campo" onClick={aoAlternar} disabled={!encontrado} aria-label={encontrado ? `${selecionado ? "Remover" : "Incluir"} ${campo.rotulo}` : `${campo.rotulo} sem evidência`}>{selecionado ? <Check size={14} /> : encontrado ? <span /> : <AlertCircle size={14} />}</button>
    <div className="campo-mapeado__conteudo"><header><span className={`etiqueta-campo etiqueta-campo--${campo.status}`}>{campo.status === "encontrado" ? campo.autoaplicavel ? "Evidência textual" : "Revisão visual" : campo.status === "ambiguo" ? "Ambíguo" : "Sem fonte"}</span><code>{campo.marcador}</code></header><h3>{campo.rotulo}</h3>{encontrado && campo.valor ? <><strong className="valor-campo">{campo.valor}</strong><p className="origem-preenchimento"><ShieldCheck size={13} />{campo.fonte_nome}{campo.pagina ? ` · página ${campo.pagina}` : ""} · {Math.round(campo.confianca * 100)}%</p>{campo.trecho && <blockquote>“{campo.trecho}”</blockquote>}</> : <><p className="justificativa-campo">{campo.justificativa}</p><p className="contexto-campo">{campo.contexto}</p></>}</div>
  </article>;
}
