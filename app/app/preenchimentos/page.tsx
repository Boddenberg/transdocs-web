"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileArchive,
  FileAudio2,
  FileCheck2,
  FilePenLine,
  FilePlus2,
  FileText,
  Loader2,
  MessageSquareText,
  Mic,
  ImagePlus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  UploadCloud,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  adicionarFontesPreenchimento,
  api,
  criarModeloPreenchimento,
  criarPreenchimento,
  transcreverAudioPreenchimento
} from "@/lib/api";
import { formatarTamanho } from "@/lib/formatadores";
import type {
  CampoPreenchimento,
  CategoriaFontePreenchimento,
  FonteSelecionada,
  ModeloPreenchimento,
  ModoCriacaoPreenchimento,
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
          (campo.autoaplicavel || campo.editado_pelo_usuario || anteriores.has(campo.id))
      )
      .map((campo) => campo.id)
  );
}

function humanizarAlerta(alerta: string, campos: CampoPreenchimento[]) {
  let mensagem = alerta;
  campos.forEach((campo, indice) => {
    mensagem = mensagem.replaceAll(campo.id, `Lacuna ${indice + 1}`);
  });
  return mensagem.replace(/\bcampo_[0-9a-f]{16}\b/gi, "Uma lacuna");
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
  const [modoCriacao, setModoCriacao] = useState<ModoCriacaoPreenchimento>(
    "documento_completo"
  );
  const [modelos, setModelos] = useState<ModeloPreenchimento[]>([]);
  const [modeloId, setModeloId] = useState("");
  const [arquivoBase, setArquivoBase] = useState<File | null>(null);
  const [instrucoesNegociacao, setInstrucoesNegociacao] = useState("");
  const [fontes, setFontes] = useState<Record<string, File[]>>({});
  const [preenchimento, setPreenchimento] = useState<Preenchimento | null>(null);
  const [historico, setHistorico] = useState<Preenchimento[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipo = tipos.find((item) => item.id === tipoId) || tipos[0];
  const fontesNovas = useMemo(() => fontesSelecionadas(fontes), [fontes]);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.preenchimentos.tipos(),
      api.preenchimentos.modelos(),
      api.preenchimentos.listar()
    ])
      .then(async ([catalogo, biblioteca, recentes]) => {
        if (!ativo) return;
        setTipos(catalogo);
        setTipoId(catalogo[0]?.id || "");
        setModelos(biblioteca);
        setModeloId(
          biblioteca.find((item) => item.tipo_documento === catalogo[0]?.id)?.id || ""
        );
        setHistorico(recentes);
        const ultimo = window.localStorage.getItem(CHAVE_ULTIMO);
        if (ultimo) {
          try {
            const detalhe = await api.preenchimentos.buscar(ultimo);
            if (ativo) {
              setPreenchimento(detalhe);
              setSelecionados(selecaoComprovada(detalhe));
              setValoresEditados({});
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

  function mudarTipo(proximoTipo: string) {
    setTipoId(proximoTipo);
    setModeloId(
      modelos.find((modelo) => modelo.tipo_documento === proximoTipo)?.id || ""
    );
  }

  function mudarModo(proximoModo: ModoCriacaoPreenchimento) {
    setModoCriacao(proximoModo);
    setErro(null);
    if (proximoModo === "documento_completo") setArquivoBase(null);
  }

  async function criarModelo(arquivo: File, nome: string) {
    if (!tipo || salvandoModelo) return;
    setSalvandoModelo(true);
    setErro(null);
    try {
      const criado = await criarModeloPreenchimento(tipo.id, nome, "", arquivo);
      setModelos((atuais) => [
        ...atuais.filter((item) => item.id !== criado.id),
        criado
      ]);
      setModeloId(criado.id);
      setModoCriacao("documento_completo");
    } catch (falha) {
      setErro(
        falha instanceof Error ? falha.message : "Não foi possível salvar o modelo."
      );
      throw falha;
    } finally {
      setSalvandoModelo(false);
    }
  }

  async function excluirModelo(modelo: ModeloPreenchimento) {
    if (modelo.origem !== "usuario") return;
    if (!window.confirm(`Excluir o modelo “${modelo.nome}” da sua biblioteca?`)) return;
    setErro(null);
    try {
      await api.preenchimentos.excluirModelo(modelo.id);
      const restantes = modelos.filter((item) => item.id !== modelo.id);
      setModelos(restantes);
      if (modeloId === modelo.id) {
        setModeloId(
          restantes.find((item) => item.tipo_documento === tipoId)?.id || ""
        );
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível excluir o modelo.");
    }
  }

  function atualizarFotosPrompt(fotos: File[]) {
    setFontes((atuais) => {
      const outrosArquivos = (atuais.documentos_caso || []).filter(
        (arquivo) => !arquivo.type.startsWith("image/")
      );
      return { ...atuais, documentos_caso: [...outrosArquivos, ...fotos] };
    });
  }

  function adicionarTranscricao(texto: string) {
    const atual = instrucoesNegociacao.trim();
    const proximo = atual ? `${atual}\n\n${texto.trim()}` : texto.trim();
    if (proximo.length > 8000) {
      setErro("A declaração ultrapassaria 8.000 caracteres. Resuma o texto antes de adicionar outro áudio.");
      return;
    }
    setInstrucoesNegociacao(proximo);
    setErro(null);
  }

  async function iniciar() {
    const origemValida = modoCriacao === "documento_completo" ? modeloId : arquivoBase;
    if (!tipo || !origemValida || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const criado = await criarPreenchimento(
        tipo.id,
        modoCriacao === "completar_minuta" ? arquivoBase : null,
        modoCriacao === "documento_completo" ? modeloId : null,
        instrucoesNegociacao,
        fontesNovas
      );
      setPreenchimento(criado);
      setSelecionados(new Set());
      setValoresEditados({});
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
      setValoresEditados({});
      setFontes({});
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar as fontes.");
    } finally {
      setEnviando(false);
    }
  }

  function alternarCampo(campo: CampoPreenchimento) {
    const valor = valoresEditados[campo.id] ?? campo.valor ?? "";
    if (!valor.trim()) return;
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(campo.id)) proximos.delete(campo.id);
      else proximos.add(campo.id);
      return proximos;
    });
  }

  function atualizarValorCampo(campo: CampoPreenchimento, valor: string) {
    setValoresEditados((atuais) => {
      const proximos = { ...atuais };
      if (valor === (campo.valor ?? "")) delete proximos[campo.id];
      else proximos[campo.id] = valor;
      return proximos;
    });
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (valor.trim()) proximos.add(campo.id);
      else proximos.delete(campo.id);
      return proximos;
    });
  }

  function definirSelecionados(ids: string[]) {
    setSelecionados(new Set(ids));
  }

  async function gerar(permitirIncompleto: boolean, camposIncluir?: string[]) {
    if (!preenchimento || gerando) return;
    const idsSelecionados = new Set(camposIncluir ?? Array.from(selecionados));
    setGerando(true);
    setErro(null);
    try {
      const valoresSelecionados = Object.fromEntries(
        Object.entries(valoresEditados).filter(([campoId]) => idsSelecionados.has(campoId))
      );
      const atualizado = await api.preenchimentos.gerar(
        preenchimento.id,
        Array.from(idsSelecionados),
        valoresSelecionados,
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
      setValoresEditados({});
      setFontes({});
      window.localStorage.setItem(CHAVE_ULTIMO, detalhe.id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir.");
    }
  }

  function novo() {
    setPreenchimento(null);
    setArquivoBase(null);
    setModoCriacao("documento_completo");
    setModeloId(
      modelos.find((modelo) => modelo.tipo_documento === tipoId)?.id || ""
    );
    setInstrucoesNegociacao("");
    setFontes({});
    setSelecionados(new Set());
    setValoresEditados({});
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
          <h1>Dos documentos à escritura pronta.</h1>
          <p>Use um modelo da biblioteca para criar o ato inteiro ou envie uma minuta para completar. Conte a negociação e a IA monta somente o que estiver comprovado.</p>
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
              aoMudarTipo={mudarTipo}
              tipo={tipo}
              modoCriacao={modoCriacao}
              aoMudarModo={mudarModo}
              modelos={modelos.filter((modelo) => modelo.tipo_documento === tipo?.id)}
              modeloId={modeloId}
              aoMudarModelo={setModeloId}
              aoCriarModelo={criarModelo}
              aoExcluirModelo={excluirModelo}
              salvandoModelo={salvandoModelo}
              arquivoBase={arquivoBase}
              aoMudarBase={setArquivoBase}
              instrucoesNegociacao={instrucoesNegociacao}
              aoMudarInstrucoes={setInstrucoesNegociacao}
              fotosPrompt={(fontes.documentos_caso || []).filter((arquivo) => arquivo.type.startsWith("image/"))}
              aoMudarFotosPrompt={atualizarFotosPrompt}
              aoAdicionarTranscricao={adicionarTranscricao}
              aoErro={setErro}
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
              valoresEditados={valoresEditados}
              aoAlternar={alternarCampo}
              aoMudarValor={atualizarValorCampo}
              aoDefinirSelecionados={definirSelecionados}
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
              <span><strong>{item.modelo_nome || item.nome_minuta}</strong><small>{nomeStatus(item)} · {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(item.atualizado_em))}</small></span>
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
  modoCriacao,
  aoMudarModo,
  modelos,
  modeloId,
  aoMudarModelo,
  aoCriarModelo,
  aoExcluirModelo,
  salvandoModelo,
  arquivoBase,
  aoMudarBase,
  instrucoesNegociacao,
  aoMudarInstrucoes,
  fotosPrompt,
  aoMudarFotosPrompt,
  aoAdicionarTranscricao,
  aoErro,
  fontes,
  aoMudarCategoria,
  enviando,
  aoIniciar
}: {
  tipos: TipoPreenchimento[];
  tipoId: string;
  aoMudarTipo(valor: string): void;
  tipo?: TipoPreenchimento;
  modoCriacao: ModoCriacaoPreenchimento;
  aoMudarModo(valor: ModoCriacaoPreenchimento): void;
  modelos: ModeloPreenchimento[];
  modeloId: string;
  aoMudarModelo(valor: string): void;
  aoCriarModelo(arquivo: File, nome: string): Promise<void>;
  aoExcluirModelo(modelo: ModeloPreenchimento): Promise<void>;
  salvandoModelo: boolean;
  arquivoBase: File | null;
  aoMudarBase(arquivo: File | null): void;
  instrucoesNegociacao: string;
  aoMudarInstrucoes(valor: string): void;
  fotosPrompt: File[];
  aoMudarFotosPrompt(arquivos: File[]): void;
  aoAdicionarTranscricao(texto: string): void;
  aoErro(mensagem: string | null): void;
  fontes: Record<string, File[]>;
  aoMudarCategoria(categoria: string, arquivos: File[]): void;
  enviando: boolean;
  aoIniciar(): void;
}) {
  const [entradaOcupada, setEntradaOcupada] = useState(false);
  const [arquivoModelo, setArquivoModelo] = useState<File | null>(null);
  const [nomeModelo, setNomeModelo] = useState("");
  const origemPronta = modoCriacao === "documento_completo" ? Boolean(modeloId) : Boolean(arquivoBase);

  async function salvarModelo() {
    if (!arquivoModelo || !nomeModelo.trim() || salvandoModelo) return;
    try {
      await aoCriarModelo(arquivoModelo, nomeModelo.trim());
      setArquivoModelo(null);
      setNomeModelo("");
    } catch {
      // A mensagem do backend já é exibida pelo componente pai.
    }
  }

  return (
    <>
      <section className="etapa-preenchimento">
        <header><span>01</span><div><p className="rotulo">Tipo de documento</p><h2>Escolha o ato que será preparado</h2></div></header>
        <label className="seletor-tipo-preenchimento">
          <FilePenLine size={21} />
          <span><small>Documento selecionado</small><strong>{tipo?.nome || "Selecione"}</strong><em>{tipo?.descricao}</em></span>
          <select value={tipoId} onChange={(evento) => aoMudarTipo(evento.target.value)} aria-label="Tipo de documento">
            {tipos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
          </select>
        </label>
      </section>

      <section className="etapa-preenchimento">
        <header><span>02</span><div><p className="rotulo">Ponto de partida</p><h2>Crie o documento inteiro ou complete uma minuta</h2><p>O modelo pronto dispensa o envio de uma minuta. A opção de completar preserva tudo o que já existe no seu DOCX.</p></div></header>
        <div className="modos-criacao">
          <button type="button" className={modoCriacao === "documento_completo" ? "ativo" : ""} onClick={() => aoMudarModo("documento_completo")} aria-pressed={modoCriacao === "documento_completo"}>
            <span><FileArchive size={20} /></span>
            <strong>Usar modelo pronto <small>Recomendado</small></strong>
            <p>Parte de um modelo da biblioteca e substitui todos os blocos variáveis comprovados.</p>
            {modoCriacao === "documento_completo" && <CheckCircle2 size={17} />}
          </button>
          <button type="button" className={modoCriacao === "completar_minuta" ? "ativo" : ""} onClick={() => aoMudarModo("completar_minuta")} aria-pressed={modoCriacao === "completar_minuta"}>
            <span><FilePenLine size={20} /></span>
            <strong>Completar minha minuta</strong>
            <p>Usa o seu DOCX e mexe somente nas lacunas e marcadores explícitos.</p>
            {modoCriacao === "completar_minuta" && <CheckCircle2 size={17} />}
          </button>
        </div>

        {modoCriacao === "documento_completo" ? (
          <div className="biblioteca-modelos">
            <div className="biblioteca-modelos__cabecalho"><div><strong>Modelo que será usado</strong><small>Você pode guardar vários padrões do cartório.</small></div><span>{modelos.length} modelo{modelos.length === 1 ? "" : "s"}</span></div>
            <div className="lista-modelos">
              {modelos.map((modelo) => (
                <article key={modelo.id} className={modeloId === modelo.id ? "ativo" : ""}>
                  <button type="button" className="modelo-principal" onClick={() => aoMudarModelo(modelo.id)}>
                    <span><FileText size={18} /></span>
                    <div><strong>{modelo.nome}</strong><p>{modelo.descricao || modelo.nome_arquivo}</p><small>{modelo.total_blocos} bloco{modelo.total_blocos === 1 ? "" : "s"} estruturado{modelo.total_blocos === 1 ? "" : "s"} · {modelo.origem === "sistema" ? "Modelo do sistema" : "Minha biblioteca"}</small></div>
                    {modeloId === modelo.id && <Check size={16} />}
                  </button>
                  {modelo.origem === "usuario" && <button type="button" className="excluir-modelo" onClick={() => void aoExcluirModelo(modelo)} aria-label={`Excluir ${modelo.nome}`}><X size={14} /></button>}
                </article>
              ))}
            </div>
            <details className="novo-modelo">
              <summary><Plus size={15} /> Adicionar outro modelo do cartório</summary>
              <div>
                <label className={`upload-modelo ${arquivoModelo ? "pronto" : ""}`}>
                  <input type="file" accept=".docx" hidden onChange={(evento) => { const arquivo = evento.target.files?.[0] || null; setArquivoModelo(arquivo); if (arquivo) setNomeModelo(arquivo.name.replace(/\.docx$/i, "")); }} />
                  <UploadCloud size={18} /><span><strong>{arquivoModelo?.name || "Selecionar modelo DOCX"}</strong><small>Use marcadores como [PREENCHER:QUALIFICACAO_VENDEDORES]</small></span>
                </label>
                <label className="nome-modelo"><span>Nome na biblioteca</span><input value={nomeModelo} onChange={(evento) => setNomeModelo(evento.target.value)} maxLength={120} placeholder="Ex.: Escritura com pagamento parcelado" /></label>
                <button className="botao botao--secundario" type="button" onClick={() => void salvarModelo()} disabled={!arquivoModelo || !nomeModelo.trim() || salvandoModelo}>{salvandoModelo ? <><Loader2 size={14} className="girando" /> Salvando…</> : <><FilePlus2 size={14} /> Salvar modelo</>}</button>
              </div>
            </details>
            <p className="dica-marcadores"><ShieldCheck size={15} /> O texto jurídico fixo permanece. A IA substitui todos os blocos variáveis do modelo, mas deixa pendente qualquer bloco sem dados comprovados.</p>
          </div>
        ) : (
          <div className="minuta-propria">
            <label className={`upload-minuta ${arquivoBase ? "upload-minuta--pronta" : ""}`}>
              <input type="file" accept=".docx" hidden onChange={(evento) => aoMudarBase(evento.target.files?.[0] || null)} />
              {arquivoBase ? <><FileCheck2 size={28} /><span><strong>{arquivoBase.name}</strong><small>{formatarTamanho(arquivoBase.size)} · o original não será alterado</small></span><button type="button" onClick={(evento) => { evento.preventDefault(); aoMudarBase(null); }} aria-label="Remover minuta"><X size={16} /></button></> : <><UploadCloud size={29} /><span><strong>Solte ou selecione a minuta</strong><small>DOCX pronto ou parcial; só as lacunas explícitas serão modificadas</small></span></>}
            </label>
            <p className="dica-marcadores"><Sparkles size={15} /> A minuta pode usar sublinhados, <code>&lt;&lt;NOME_DO_CAMPO&gt;&gt;</code> ou blocos <code>[PREENCHER:NOME_DO_BLOCO]</code>.</p>
          </div>
        )}
      </section>

      <section className="etapa-preenchimento">
        <header><span>03</span><div><p className="rotulo">Prompt do preenchimento</p><h2>Escreva, fale ou mostre a negociação</h2><p>Explique quem vende, quem compra, preço, pagamento e condições. Áudios viram texto para sua revisão; fotos entram como evidência do caso.</p></div></header>
        <EntradaNegociacao
          valor={instrucoesNegociacao}
          aoMudar={aoMudarInstrucoes}
          fotos={fotosPrompt}
          aoMudarFotos={aoMudarFotosPrompt}
          aoAdicionarTranscricao={aoAdicionarTranscricao}
          aoErro={aoErro}
          aoMudarOcupado={setEntradaOcupada}
        />
      </section>

      {tipo && <section className="etapa-preenchimento">
        <header><span>04</span><div><p className="rotulo">Documentos do caso</p><h2>Envie tudo junto ou organize por tipo</h2><p>Você pode usar a primeira área para todos os arquivos. As categorias abaixo continuam disponíveis quando quiser organizar as fontes.</p></div></header>
        <GradeFontes tipo={tipo} fontes={fontes} aoMudar={aoMudarCategoria} />
      </section>}

      <footer className="acoes-inicio-preenchimento">
        <span><ShieldCheck size={16} /> Papéis declarados orientam a montagem; dados pessoais continuam exigindo fonte.</span>
        <button className="botao botao--primario" type="button" onClick={aoIniciar} disabled={!origemPronta || enviando || entradaOcupada}>{enviando ? <><Loader2 size={16} className="girando" /> Enviando…</> : entradaOcupada ? <><Loader2 size={16} className="girando" /> Finalizando entrada…</> : modoCriacao === "documento_completo" ? <><Sparkles size={16} /> Criar escritura para revisar</> : <><Sparkles size={16} /> Completar minuta para revisar</>}</button>
      </footer>
    </>
  );
}

function EntradaNegociacao({ valor, aoMudar, fotos, aoMudarFotos, aoAdicionarTranscricao, aoErro, aoMudarOcupado }: { valor: string; aoMudar(valor: string): void; fotos: File[]; aoMudarFotos(arquivos: File[]): void; aoAdicionarTranscricao(texto: string): void; aoErro(mensagem: string | null): void; aoMudarOcupado(ocupado: boolean): void }) {
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const fluxoRef = useRef<MediaStream | null>(null);
  const partesRef = useRef<Blob[]>([]);

  useEffect(() => {
    aoMudarOcupado(gravando || transcrevendo);
  }, [aoMudarOcupado, gravando, transcrevendo]);

  useEffect(() => () => {
    if (gravadorRef.current?.state === "recording") {
      gravadorRef.current.onstop = null;
      gravadorRef.current.stop();
    }
    fluxoRef.current?.getTracks().forEach((trilha) => trilha.stop());
  }, []);

  async function processarAudio(arquivo: File) {
    if (arquivo.size > 25 * 1024 * 1024) {
      aoErro("O áudio deve ter no máximo 25 MB.");
      return;
    }
    setTranscrevendo(true);
    aoErro(null);
    try {
      const resposta = await transcreverAudioPreenchimento(arquivo);
      aoAdicionarTranscricao(resposta.texto);
    } catch (falha) {
      aoErro(falha instanceof Error ? falha.message : "Não foi possível transcrever o áudio.");
    } finally {
      setTranscrevendo(false);
    }
  }

  async function iniciarGravacao() {
    if (!("MediaRecorder" in window) || !navigator.mediaDevices?.getUserMedia) {
      aoErro("Este navegador não oferece gravação de áudio. Use a opção Enviar áudio.");
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipoPreferido = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const gravador = new MediaRecorder(
        fluxo,
        tipoPreferido ? { mimeType: tipoPreferido } : undefined
      );
      fluxoRef.current = fluxo;
      gravadorRef.current = gravador;
      partesRef.current = [];
      gravador.ondataavailable = (evento) => {
        if (evento.data.size) partesRef.current.push(evento.data);
      };
      gravador.onstop = () => {
        fluxo.getTracks().forEach((trilha) => trilha.stop());
        fluxoRef.current = null;
        setGravando(false);
        const tipo = gravador.mimeType || "audio/webm";
        const extensao = tipo.includes("mp4") ? "mp4" : "webm";
        const arquivo = new File(
          [new Blob(partesRef.current, { type: tipo })],
          `relato-negociacao-${Date.now()}.${extensao}`,
          { type: tipo }
        );
        if (arquivo.size) void processarAudio(arquivo);
        else aoErro("A gravação ficou vazia. Tente novamente.");
      };
      gravador.start();
      setGravando(true);
      aoErro(null);
    } catch {
      aoErro("Não foi possível acessar o microfone. Autorize o acesso ou envie um áudio pronto.");
    }
  }

  function pararGravacao() {
    if (gravadorRef.current?.state === "recording") gravadorRef.current.stop();
  }

  return <div className="entrada-negociacao">
    <label className="narrativa-negociacao">
      <span><MessageSquareText size={18} /> Prompt do caso <small>editável</small></span>
      <textarea
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        placeholder="Ex.: João da Silva e Maria da Silva são casados e vendedores. Ana Souza e Carlos Souza são os compradores. O preço é de R$ 500.000,00, pago por transferência na assinatura."
        maxLength={8000}
        rows={5}
      />
      <small>{valor.length}/8.000 caracteres · confira nomes, valores e condições, inclusive quando vierem de áudio</small>
    </label>
    <div className="acoes-entrada-negociacao">
      <button type="button" onClick={gravando ? pararGravacao : iniciarGravacao} disabled={transcrevendo} className={gravando ? "gravando" : ""}>{gravando ? <><Square size={15} /> Parar gravação</> : <><Mic size={16} /> Gravar áudio</>}</button>
      <label className={transcrevendo ? "desabilitado" : ""}><input type="file" hidden disabled={transcrevendo || gravando} accept=".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm,.aac,audio/*" onChange={(evento) => { const arquivo = evento.target.files?.[0]; if (arquivo) void processarAudio(arquivo); evento.target.value = ""; }} /><FileAudio2 size={16} /> Enviar áudio</label>
      <label><input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(evento) => { aoMudarFotos([...fotos, ...Array.from(evento.target.files || [])]); evento.target.value = ""; }} /><ImagePlus size={16} /> Adicionar foto</label>
      {transcrevendo && <span className="estado-entrada"><Loader2 size={14} className="girando" /> Transcrevendo para revisão…</span>}
      {gravando && <span className="estado-entrada estado-entrada--gravando"><i /> Ouvindo… fale naturalmente</span>}
    </div>
    {fotos.length > 0 && <div className="fotos-prompt">{fotos.map((foto, indice) => <span key={`${foto.name}-${foto.lastModified}-${indice}`}><ImagePlus size={13} /><em>{foto.name}</em><button type="button" onClick={() => aoMudarFotos(fotos.filter((_, atual) => atual !== indice))} aria-label={`Remover ${foto.name}`}><X size={12} /></button></span>)}</div>}
    <p className="regra-entrada"><ShieldCheck size={14} /> Áudio vira texto e precisa ser revisado. Foto é evidência visual. Nenhum dos dois autoriza a IA a inventar dados.</p>
  </div>;
}

function GradeFontes({ tipo, fontes, aoMudar }: { tipo: TipoPreenchimento; fontes: Record<string, File[]>; aoMudar(categoria: string, arquivos: File[]): void }) {
  return <div className="grade-fontes">{tipo.fontes.map((categoria) => <SeletorFonte key={categoria.id} categoria={categoria} arquivos={fontes[categoria.id] || []} aoMudar={(arquivos) => aoMudar(categoria.id, arquivos)} />)}</div>;
}

function SeletorFonte({ categoria, arquivos, aoMudar }: { categoria: CategoriaFontePreenchimento; arquivos: File[]; aoMudar(arquivos: File[]): void }) {
  const classes = [
    "fonte-upload",
    categoria.id === "documentos_caso" ? "fonte-upload--geral" : "",
    arquivos.length ? "fonte-upload--com-arquivo" : ""
  ].filter(Boolean).join(" ");
  return (
    <article className={classes}>
      <label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple hidden onChange={(evento) => aoMudar([...arquivos, ...Array.from(evento.target.files || [])])} />
        <span><FilePlus2 size={18} /></span><strong>{categoria.nome}</strong><p>{categoria.descricao}</p><small>{arquivos.length ? `${arquivos.length} arquivo${arquivos.length > 1 ? "s" : ""}` : "Opcional"}</small>
      </label>
      {arquivos.length > 0 && <div className="arquivos-fonte">{arquivos.map((arquivo, indice) => <span key={`${arquivo.name}-${arquivo.lastModified}`}><FileText size={13} /><em>{arquivo.name}</em><button type="button" onClick={() => aoMudar(arquivos.filter((_, atual) => atual !== indice))} aria-label={`Remover ${arquivo.name}`}><X size={12} /></button></span>)}</div>}
    </article>
  );
}

function Processando({ preenchimento }: { preenchimento: Preenchimento }) {
  return <section className="estado-preenchimento"><span className="orbe-preenchimento"><Loader2 size={30} className="girando" /></span><p className="rotulo">{preenchimento.status === "pendente" ? "Na fila segura" : "Montagem documental"}</p><h2>{preenchimento.status === "pendente" ? "Preparando a minuta…" : "Atribuindo papéis e comparando cada dado com as fontes…"}</h2><p>A declaração orienta a estrutura do negócio. Cada dado incluído continua ligado à sua origem. A página atualiza sozinha.</p><div className="trilha-processamento"><span className="feito"><Check size={13} /> Minuta preservada</span><span className={preenchimento.status === "processando" ? "ativo" : ""}><RefreshCw size={13} /> Evidências</span><span><FileCheck2 size={13} /> DOCX</span></div></section>;
}

function EstadoErro({ preenchimento, aoNovo }: { preenchimento: Preenchimento; aoNovo(): void }) {
  return <section className="estado-preenchimento estado-preenchimento--erro"><span className="orbe-preenchimento"><AlertCircle size={30} /></span><p className="rotulo">{nomeStatus(preenchimento)}</p><h2>A minuta não foi modificada.</h2><p>{preenchimento.status === "erro_arquivo" ? "Confirme se o arquivo é uma escritura pública de venda e compra em DOCX válido." : "Tente novamente mais tarde ou inicie um novo preenchimento."}</p><button className="botao botao--secundario" onClick={aoNovo}>Novo preenchimento</button></section>;
}

function RevisaoPreenchimento({ preenchimento, tipo, fontes, aoMudarCategoria, fontesNovas, selecionados, valoresEditados, aoAlternar, aoMudarValor, aoDefinirSelecionados, aoAdicionar, aoGerar, aoNovo, enviando, gerando }: { preenchimento: Preenchimento & { resultado: ResultadoPreenchimento }; tipo?: TipoPreenchimento; fontes: Record<string, File[]>; aoMudarCategoria(categoria: string, arquivos: File[]): void; fontesNovas: FonteSelecionada[]; selecionados: Set<string>; valoresEditados: Record<string, string>; aoAlternar(campo: CampoPreenchimento): void; aoMudarValor(campo: CampoPreenchimento, valor: string): void; aoDefinirSelecionados(ids: string[]): void; aoAdicionar(): void; aoGerar(incompleto: boolean, camposIncluir?: string[]): void; aoNovo(): void; enviando: boolean; gerando: boolean }) {
  const { resultado } = preenchimento;
  const valorAtual = (campo: CampoPreenchimento) => valoresEditados[campo.id] ?? campo.valor ?? "";
  const camposComValor = resultado.campos.filter((campo) => valorAtual(campo).trim());
  const camposSemValor = resultado.campos.filter((campo) => !valorAtual(campo).trim());
  const idsTodosCampos = resultado.campos.map((campo) => campo.id);
  const blocosCompostosNaoSelecionados = camposComValor.filter(
    (campo) => campo.modo_preenchimento === "composto" && !selecionados.has(campo.id)
  );
  const todosComValorSelecionados = camposComValor.length > 0 && camposComValor.every((campo) => selecionados.has(campo.id));
  const documentoCompleto = resultado.campos.every((campo) => valorAtual(campo).trim() && selecionados.has(campo.id));
  const alertasHumanizados = resultado.alertas.map((alerta) => humanizarAlerta(alerta, resultado.campos));
  const mensagemGeracao = camposSemValor.length
    ? `Faltam valores em ${camposSemValor.length} lacuna${camposSemValor.length === 1 ? "" : "s"}. Preencha os campos ou gere somente o que já selecionou.`
    : blocosCompostosNaoSelecionados.length
      ? `Revise e selecione ${blocosCompostosNaoSelecionados.length} bloco${blocosCompostosNaoSelecionados.length === 1 ? "" : "s"} redigido${blocosCompostosNaoSelecionados.length === 1 ? "" : "s"} pela IA antes de gerar a versão completa.`
    : documentoCompleto
      ? `Tudo pronto: ${resultado.campos.length} campo${resultado.campos.length === 1 ? "" : "s"} serão aplicados ao DOCX.`
      : `Os ${resultado.campos.length} valores estão prontos. O botão principal selecionará todos e gerará o DOCX.`;
  return (
    <>
      <section className="resumo-preenchimento">
        <div><p className="rotulo">Mapa da minuta</p><h2>{resultado.total_pendentes ? "Há dados que ainda precisam de fonte." : "Todas as lacunas têm evidência."}</h2><p>{preenchimento.nome_minuta}</p></div>
        <div className="numeros-preenchimento"><span><strong>{resultado.total_campos}</strong><small>lacunas</small></span><span className="positivo"><strong>{resultado.total_encontrados}</strong><small>com fonte</small></span><span className={resultado.total_pendentes ? "pendente" : "positivo"}><strong>{resultado.total_pendentes}</strong><small>pendentes</small></span></div>
      </section>
      {preenchimento.instrucoes_negociacao?.trim() && <section className="declaracao-caso"><MessageSquareText size={17} /><div><strong>Negociação informada</strong><p>{preenchimento.instrucoes_negociacao}</p></div></section>}
      {alertasHumanizados.length > 0 && <div className="alertas-preenchimento"><strong><AlertCircle size={15} /> Pontos para conferir</strong>{alertasHumanizados.map((alerta, indice) => <p key={`${indice}-${alerta}`}>{alerta}</p>)}</div>}
      <section className="campos-preenchimento">
        <header><div><p className="rotulo">Conferência antes de escrever</p><h2>Revise, edite e escolha o que será escrito</h2></div><div className="acoes-selecao-campos"><small>{selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}</small><button type="button" onClick={() => aoDefinirSelecionados(todosComValorSelecionados ? [] : camposComValor.map((campo) => campo.id))} disabled={!camposComValor.length}>{todosComValorSelecionados ? "Limpar seleção" : `Selecionar ${camposComValor.length} com valor`}</button></div></header>
        {resultado.campos.length ? resultado.campos.map((campo, indice) => <CampoMapeado key={campo.id} numero={indice + 1} campo={campo} valor={valorAtual(campo)} editado={Object.hasOwn(valoresEditados, campo.id)} selecionado={selecionados.has(campo.id)} aoAlternar={() => aoAlternar(campo)} aoMudarValor={(valor) => aoMudarValor(campo, valor)} />) : <div className="sem-lacunas"><CheckCircle2 size={25} /><strong>Nenhum marcador de preenchimento foi encontrado.</strong><p>Você pode devolver uma cópia idêntica da minuta.</p></div>}
      </section>
      {resultado.total_pendentes > 0 && tipo && <section className="fontes-complementares"><header><span><Plus size={17} /></span><div><p className="rotulo">Continuar depois</p><h2>Recebeu um documento que faltava?</h2><p>Adicione novas fontes; este caso já está salvo e será analisado novamente.</p></div></header><GradeFontes tipo={tipo} fontes={fontes} aoMudar={aoMudarCategoria} /><button className="botao botao--secundario" type="button" onClick={aoAdicionar} disabled={!fontesNovas.length || enviando}>{enviando ? <><Loader2 size={15} className="girando" /> Reanalisando…</> : <><RefreshCw size={15} /> Adicionar e reanalisar</>}</button></section>}
      <footer className="acoes-geracao">
        <button className="botao botao--secundario" type="button" onClick={aoNovo}>Novo caso</button>
        <div><p>{mensagemGeracao}</p>{selecionados.size > 0 && !documentoCompleto && <button className="botao botao--secundario" type="button" onClick={() => aoGerar(true)} disabled={gerando}>{gerando ? <Loader2 className="girando" size={15} /> : <Download size={15} />} Gerar só {selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}</button>}<button className="botao botao--primario" type="button" onClick={() => { aoDefinirSelecionados(idsTodosCampos); aoGerar(false, idsTodosCampos); }} disabled={gerando || camposSemValor.length > 0 || blocosCompostosNaoSelecionados.length > 0}>{gerando ? <><Loader2 className="girando" size={15} /> Gerando…</> : camposSemValor.length ? <><AlertCircle size={15} /> Falta{camposSemValor.length === 1 ? "" : "m"} {camposSemValor.length} valor{camposSemValor.length === 1 ? "" : "es"}</> : blocosCompostosNaoSelecionados.length ? <><AlertCircle size={15} /> Revise {blocosCompostosNaoSelecionados.length} bloco{blocosCompostosNaoSelecionados.length === 1 ? "" : "s"}</> : documentoCompleto ? <><FileCheck2 size={15} /> Gerar documento completo</> : <><FileCheck2 size={15} /> Selecionar {resultado.campos.length} e gerar</>}</button></div>
      </footer>
    </>
  );
}

function CampoMapeado({ numero, campo, valor, editado, selecionado, aoAlternar, aoMudarValor }: { numero: number; campo: CampoPreenchimento; valor: string; editado: boolean; selecionado: boolean; aoAlternar(): void; aoMudarValor(valor: string): void }) {
  const encontrado = campo.status === "encontrado";
  const ajusteManual = editado || Boolean(campo.editado_pelo_usuario);
  const composto = campo.modo_preenchimento === "composto";
  const temValor = Boolean(valor.trim());
  const evidencias = campo.evidencias?.length
    ? campo.evidencias
    : campo.fonte_id && campo.fonte_nome && campo.categoria_fonte && campo.trecho
      ? [{
          fonte_id: campo.fonte_id,
          fonte_nome: campo.fonte_nome,
          categoria_fonte: campo.categoria_fonte,
          pagina: campo.pagina,
          trecho: campo.trecho
        }]
      : [];
  const etiqueta = ajusteManual
    ? "Ajuste manual"
    : composto
      ? "Bloco composto"
      : campo.status === "encontrado"
        ? campo.autoaplicavel ? "Evidência textual" : "Revisão visual"
        : campo.status === "ambiguo" ? "Ambíguo" : "Sem fonte";

  return <article className={`campo-mapeado campo-mapeado--${campo.status} ${selecionado ? "campo-mapeado--selecionado" : ""} ${composto ? "campo-mapeado--composto" : ""}`}>
    <button type="button" className="selecao-campo" onClick={aoAlternar} disabled={!temValor} aria-label={temValor ? `${selecionado ? "Remover" : "Incluir"} ${campo.rotulo}` : `Preencha ${campo.rotulo} para incluir`}>{selecionado ? <Check size={14} /> : temValor ? <span /> : <AlertCircle size={14} />}</button>
    <div className="campo-mapeado__conteudo">
      <header><span className={`etiqueta-campo ${ajusteManual ? "etiqueta-campo--manual" : composto ? "etiqueta-campo--composto" : `etiqueta-campo--${campo.status}`}`}>{etiqueta}</span><span className="numero-lacuna">Lacuna {String(numero).padStart(2, "0")}</span><code>{campo.marcador}</code></header>
      <h3>{campo.rotulo}</h3>
      {composto && <p className="aviso-bloco-composto"><AlertCircle size={13} /> Texto redigido pela IA com as evidências abaixo. Leia o bloco inteiro e marque-o somente após conferir.</p>}
      <label className="edicao-valor-campo"><span>Valor que será escrito</span><textarea value={valor} onChange={(evento) => aoMudarValor(evento.target.value)} placeholder="Digite o valor manualmente" maxLength={8000} rows={composto || valor.length > 90 ? 4 : 1} /></label>
      {editado && campo.valor && campo.valor !== valor && <p className="valor-original-campo">Valor salvo anteriormente: {campo.valor}</p>}
      {campo.valor_original && <p className="valor-original-campo">Sugestão documental original: {campo.valor_original}</p>}
      {encontrado && evidencias.length ? <div className="lista-evidencias-campo">{evidencias.map((evidencia, indice) => <div key={`${evidencia.fonte_id}-${indice}`}><p className="origem-preenchimento"><ShieldCheck size={13} />{evidencia.fonte_nome}{evidencia.pagina ? ` · página ${evidencia.pagina}` : ""}{indice === 0 ? ` · ${Math.round(campo.confianca * 100)}%` : ""}</p><blockquote>“{evidencia.trecho}”</blockquote></div>)}</div> : <><p className="justificativa-campo">{campo.justificativa}</p><p className="contexto-campo">{campo.contexto}</p></>}
    </div>
  </article>;
}
