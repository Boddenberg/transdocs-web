"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  Home,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, criarPreenchimento } from "@/lib/api";
import { formatarTamanho } from "@/lib/formatadores";
import type {
  AnaliseImovel,
  CampoPreenchimento,
  ComponentePagamento,
  DadosNegociacao,
  DadoAnaliseImovel,
  FonteSelecionada,
  MeioPagamento,
  ModeloPreenchimento,
  OnusRestricao,
  Preenchimento,
  ResultadoPreenchimento,
  TipoPreenchimento
} from "@/types/preenchimentos";

const CHAVE_RASCUNHO = "thdocs:rascunho-escritura-v2";
const CHAVE_ULTIMO = "thdocs:ultimo-preenchimento";

const ETAPAS = [
  { numero: 1, nome: "Vendedores", icone: Users },
  { numero: 2, nome: "Compradores", icone: Users },
  { numero: 3, nome: "Imóvel", icone: Home },
  { numero: 4, nome: "Negociação", icone: WalletCards },
  { numero: 5, nome: "Revisão", icone: FileCheck2 },
  { numero: 6, nome: "Minuta", icone: FileText }
] as const;

const NOMES_MEIOS: Record<MeioPagamento, string> = {
  transferencia: "Transferência bancária",
  pix: "Pix",
  cheque_administrativo: "Cheque administrativo",
  financiamento: "Financiamento",
  sinal: "Sinal",
  parcelamento: "Parcelamento",
  outro: "Outro"
};

const ANALISE_VAZIA: AnaliseImovel = {
  identificacao: [],
  descricao: [],
  proprietarios_atuais: [],
  forma_aquisicao: [],
  valor_venal: [],
  atos_registrais: [],
  onus_restricoes: [],
  divergencias: [],
  alertas: []
};

function novoComponente(): ComponentePagamento {
  return {
    meio: "transferencia",
    valor: "",
    descricao: "",
    vencimento: "",
    favorecido: ""
  };
}

function novosDadosNegociacao(): DadosNegociacao {
  return {
    preco_total: "",
    moeda: "BRL",
    componentes: [novoComponente()],
    imissao_posse: "",
    clausulas_adicionais: "",
    observacoes: ""
  };
}

function possuiResultado(
  preenchimento: Preenchimento | null
): preenchimento is Preenchimento & { resultado: ResultadoPreenchimento } {
  return Boolean(preenchimento && "campos" in preenchimento.resultado);
}

function centavos(valor: string): number | null {
  const limpo = valor.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(limpo)
      ? limpo.replace(/\./g, "")
      : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) : null;
}

function formatarCentavos(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valor / 100);
}

function camposPorGrupo(campos: CampoPreenchimento[]) {
  const encontrar = (...nomes: string[]) =>
    campos.filter((campo) => nomes.some((nome) => campo.rotulo.includes(nome)));
  return [
    { titulo: "Vendedores", campos: encontrar("QUALIFICACAO_VENDEDORES") },
    { titulo: "Compradores", campos: encontrar("QUALIFICACAO_COMPRADORES") },
    {
      titulo: "Imóvel e aquisição",
      campos: encontrar("DESCRICAO_DO_IMOVEL", "TITULO_AQUISITIVO")
    },
    {
      titulo: "Preço, pagamento e posse",
      campos: encontrar("PRECO_E_FORMA_DE_PAGAMENTO", "TRANSMISSAO_E_POSSE")
    },
    {
      titulo: "Demais cláusulas",
      campos: campos.filter(
        (campo) =>
          ![
            "QUALIFICACAO_VENDEDORES",
            "QUALIFICACAO_COMPRADORES",
            "DESCRICAO_DO_IMOVEL",
            "TITULO_AQUISITIVO",
            "PRECO_E_FORMA_DE_PAGAMENTO",
            "TRANSMISSAO_E_POSSE"
          ].some((nome) => campo.rotulo.includes(nome))
      )
    }
  ].filter((grupo) => grupo.campos.length);
}

export function AssistenteEscritura() {
  const [etapa, setEtapa] = useState(1);
  const [tipos, setTipos] = useState<TipoPreenchimento[]>([]);
  const [modelos, setModelos] = useState<ModeloPreenchimento[]>([]);
  const [historico, setHistorico] = useState<Preenchimento[]>([]);
  const [vendedores, setVendedores] = useState<File[]>([]);
  const [compradores, setCompradores] = useState<File[]>([]);
  const [matriculas, setMatriculas] = useState<File[]>([]);
  const [valoresVenais, setValoresVenais] = useState<File[]>([]);
  const [observacoesVendedores, setObservacoesVendedores] = useState("");
  const [observacoesCompradores, setObservacoesCompradores] = useState("");
  const [negociacao, setNegociacao] = useState<DadosNegociacao>(novosDadosNegociacao);
  const [preenchimento, setPreenchimento] = useState<Preenchimento | null>(null);
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});
  const [revisaoConfirmada, setRevisaoConfirmada] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const totalPagamento = useMemo(
    () => negociacao.componentes.reduce((total, item) => total + (centavos(item.valor) || 0), 0),
    [negociacao.componentes]
  );
  const precoCentavos = centavos(negociacao.preco_total) || 0;
  const pagamentoFecha = precoCentavos > 0 && totalPagamento === precoCentavos;

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.preenchimentos.tipos(),
      api.preenchimentos.modelos(),
      api.preenchimentos.listar()
    ])
      .then(async ([catalogo, biblioteca, recentes]) => {
        if (!ativo) return;
        try {
          const salvo = window.localStorage.getItem(CHAVE_RASCUNHO);
          if (salvo) {
            const rascunho = JSON.parse(salvo) as {
              negociacao?: DadosNegociacao;
              observacoesVendedores?: string;
              observacoesCompradores?: string;
            };
            if (rascunho.negociacao) setNegociacao(rascunho.negociacao);
            setObservacoesVendedores(rascunho.observacoesVendedores || "");
            setObservacoesCompradores(rascunho.observacoesCompradores || "");
          }
        } catch {
          window.localStorage.removeItem(CHAVE_RASCUNHO);
        }
        setTipos(catalogo);
        setModelos(biblioteca);
        setHistorico(recentes);
        const ultimo = window.localStorage.getItem(CHAVE_ULTIMO);
        if (!ultimo) return;
        try {
          const detalhe = await api.preenchimentos.buscar(ultimo);
          if (!ativo) return;
          abrirCaso(detalhe);
        } catch {
          window.localStorage.removeItem(CHAVE_ULTIMO);
        }
      })
      .catch((falha) => {
        if (ativo) {
          setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o assistente.");
        }
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (preenchimento) return;
    window.localStorage.setItem(
      CHAVE_RASCUNHO,
      JSON.stringify({ negociacao, observacoesVendedores, observacoesCompradores })
    );
  }, [negociacao, observacoesVendedores, observacoesCompradores, preenchimento]);

  useEffect(() => {
    if (!preenchimento || !["pendente", "processando"].includes(preenchimento.status)) return;
    let ativo = true;
    const temporizador = window.setTimeout(() => {
      api.preenchimentos
        .buscar(preenchimento.id)
        .then((dados) => ativo && abrirCaso(dados))
        .catch((falha) => {
          if (ativo) setErro(falha instanceof Error ? falha.message : "Falha ao atualizar.");
        });
    }, document.visibilityState === "visible" ? 2500 : 10000);
    return () => {
      ativo = false;
      window.clearTimeout(temporizador);
    };
  }, [preenchimento]);

  function abrirCaso(caso: Preenchimento) {
    setPreenchimento(caso);
    setValoresEditados({});
    setRevisaoConfirmada(false);
    setEtapa(caso.status === "concluido" ? 6 : 5);
    window.localStorage.setItem(CHAVE_ULTIMO, caso.id);
  }

  function continuar() {
    setErro(null);
    if (etapa === 1 && !vendedores.length) {
      setErro("Adicione ao menos um documento dos vendedores para continuar.");
      return;
    }
    if (etapa === 2 && !compradores.length) {
      setErro("Adicione ao menos um documento dos compradores para continuar.");
      return;
    }
    if (etapa === 3 && !matriculas.length) {
      setErro("Adicione a matrícula do imóvel para continuar.");
      return;
    }
    setEtapa((atual) => Math.min(4, atual + 1));
  }

  function alterarPreco(valor: string) {
    setNegociacao((atual) => {
      const componentes = atual.componentes.map((item, indice) =>
        indice === 0 && atual.componentes.length === 1 && (!item.valor || item.valor === atual.preco_total)
          ? { ...item, valor }
          : item
      );
      return { ...atual, preco_total: valor, componentes };
    });
  }

  function alterarComponente(indice: number, alteracoes: Partial<ComponentePagamento>) {
    setNegociacao((atual) => ({
      ...atual,
      componentes: atual.componentes.map((item, atualIndice) =>
        atualIndice === indice ? { ...item, ...alteracoes } : item
      )
    }));
  }

  function removerComponente(indice: number) {
    setNegociacao((atual) => ({
      ...atual,
      componentes: atual.componentes.filter((_, atualIndice) => atualIndice !== indice)
    }));
  }

  async function analisar() {
    if (enviando) return;
    if (!pagamentoFecha) {
      setErro("A soma das formas de pagamento precisa ser igual ao preço total.");
      return;
    }
    const tipo = tipos[0];
    const modelo = modelos.find(
      (item) => item.origem === "sistema" && item.tipo_documento === tipo?.id
    );
    if (!tipo || !modelo) {
      setErro("O modelo padrão de escritura não está disponível agora.");
      return;
    }
    const fontes: FonteSelecionada[] = [
      ...vendedores.map((arquivo) => ({ categoria: "documentos_vendedores", arquivo })),
      ...compradores.map((arquivo) => ({ categoria: "documentos_compradores", arquivo })),
      ...matriculas.map((arquivo) => ({ categoria: "matricula_imovel", arquivo })),
      ...valoresVenais.map((arquivo) => ({ categoria: "valor_venal", arquivo }))
    ];
    if (fontes.length > 20) {
      setErro("Este caso tem mais de 20 arquivos. Remova alguns documentos repetidos.");
      return;
    }
    const observacoes = [
      observacoesVendedores && `Vendedores: ${observacoesVendedores}`,
      observacoesCompradores && `Compradores: ${observacoesCompradores}`
    ]
      .filter(Boolean)
      .join("\n");
    setEnviando(true);
    setErro(null);
    try {
      const criado = await criarPreenchimento(
        tipo.id,
        null,
        modelo.id,
        observacoes,
        negociacao,
        fontes
      );
      setHistorico((atuais) => [criado, ...atuais.filter((item) => item.id !== criado.id)]);
      abrirCaso(criado);
      window.localStorage.removeItem(CHAVE_RASCUNHO);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível iniciar a análise.");
    } finally {
      setEnviando(false);
    }
  }

  function valorDoCampo(campo: CampoPreenchimento) {
    return valoresEditados[campo.id] ?? campo.valor ?? "";
  }

  async function gerarMinuta() {
    if (!possuiResultado(preenchimento) || !revisaoConfirmada || gerando) return;
    const camposComValor = preenchimento.resultado.campos.filter((campo) =>
      valorDoCampo(campo).trim()
    );
    const editados = Object.fromEntries(
      camposComValor
        .filter((campo) => valorDoCampo(campo) !== (campo.valor || ""))
        .map((campo) => [campo.id, valorDoCampo(campo)])
    );
    setGerando(true);
    setErro(null);
    try {
      const atualizado = await api.preenchimentos.gerar(
        preenchimento.id,
        camposComValor.map((campo) => campo.id),
        editados,
        true,
        true
      );
      setPreenchimento(atualizado);
      setEtapa(6);
      setHistorico((atuais) => [atualizado, ...atuais.filter((item) => item.id !== atualizado.id)]);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível gerar a minuta.");
    } finally {
      setGerando(false);
    }
  }

  async function baixar() {
    if (!preenchimento) return;
    setErro(null);
    try {
      const arquivo = await api.preenchimentos.arquivo(preenchimento.id);
      const link = document.createElement("a");
      link.href = arquivo.url;
      link.download = arquivo.nome_arquivo;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível baixar a minuta.");
    }
  }

  function novaMinuta() {
    setEtapa(1);
    setVendedores([]);
    setCompradores([]);
    setMatriculas([]);
    setValoresVenais([]);
    setObservacoesVendedores("");
    setObservacoesCompradores("");
    setNegociacao(novosDadosNegociacao());
    setPreenchimento(null);
    setValoresEditados({});
    setRevisaoConfirmada(false);
    setErro(null);
    window.localStorage.removeItem(CHAVE_ULTIMO);
    window.localStorage.removeItem(CHAVE_RASCUNHO);
  }

  if (carregando) {
    return (
      <main className="pagina-app pagina-assistente">
        <div className="assistente-carregando"><Loader2 className="girando" /> Preparando sua minuta…</div>
      </main>
    );
  }

  return (
    <main className="pagina-app pagina-assistente">
      <header className="assistente-cabecalho">
        <div>
          <p className="rotulo">Nova escritura de compra e venda</p>
          <h1>Vamos fazer uma etapa de cada vez.</h1>
          <p>Você envia os documentos. O ThiagoDocs organiza. No final, você confere tudo antes de gerar a minuta.</p>
        </div>
        {historico.length > 0 && (
          <label className="retomar-caso">
            <span>Continuar uma minuta salva</span>
            <span className="retomar-caso__seletor">
              <FileText size={18} />
              <select
                value={preenchimento?.id || ""}
                onChange={async (evento) => {
                  if (!evento.target.value) return;
                  try {
                    abrirCaso(await api.preenchimentos.buscar(evento.target.value));
                  } catch (falha) {
                    setErro(falha instanceof Error ? falha.message : "Não foi possível abrir.");
                  }
                }}
              >
                <option value="">Escolha uma minuta</option>
                {historico.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.modelo_nome || item.nome_minuta} · {new Intl.DateTimeFormat("pt-BR").format(new Date(item.criado_em))}
                  </option>
                ))}
              </select>
              <ChevronDown size={17} />
            </span>
          </label>
        )}
      </header>

      <NavegacaoEtapas etapa={etapa} bloqueada={Boolean(preenchimento)} />

      {erro && <div className="assistente-aviso assistente-aviso--erro" role="alert"><AlertCircle size={20} />{erro}</div>}

      <section className="cartao-etapa">
        {etapa === 1 && (
          <EtapaPessoas
            numero="1"
            titulo="Quem está vendendo?"
            descricao="Envie os documentos de todas as pessoas que vão vender o imóvel. Pode adicionar vários arquivos."
            arquivos={vendedores}
            aoMudar={setVendedores}
            observacoes={observacoesVendedores}
            aoMudarObservacoes={setObservacoesVendedores}
            exemplo="Ex.: há dois vendedores, são casados entre si ou existe uma procuração."
          />
        )}
        {etapa === 2 && (
          <EtapaPessoas
            numero="2"
            titulo="Quem está comprando?"
            descricao="Agora envie os documentos de todas as pessoas que vão comprar o imóvel."
            arquivos={compradores}
            aoMudar={setCompradores}
            observacoes={observacoesCompradores}
            aoMudarObservacoes={setObservacoesCompradores}
            exemplo="Ex.: os compradores são casados entre si ou uma pessoa representa a empresa."
          />
        )}
        {etapa === 3 && (
          <EtapaImovel
            matriculas={matriculas}
            aoMudarMatriculas={setMatriculas}
            valoresVenais={valoresVenais}
            aoMudarValoresVenais={setValoresVenais}
          />
        )}
        {etapa === 4 && (
          <EtapaNegociacao
            dados={negociacao}
            aoMudar={setNegociacao}
            aoMudarPreco={alterarPreco}
            aoMudarComponente={alterarComponente}
            aoRemoverComponente={removerComponente}
            totalPagamento={totalPagamento}
            pagamentoFecha={pagamentoFecha}
          />
        )}
        {etapa === 5 && preenchimento && (
          <EtapaRevisao
            preenchimento={preenchimento}
            valoresEditados={valoresEditados}
            aoMudarValor={(campo, valor) =>
              setValoresEditados((atuais) => ({ ...atuais, [campo.id]: valor }))
            }
            revisaoConfirmada={revisaoConfirmada}
            aoConfirmar={setRevisaoConfirmada}
            aoGerar={gerarMinuta}
            gerando={gerando}
            aoNovo={novaMinuta}
          />
        )}
        {etapa === 6 && preenchimento && (
          <EtapaConcluida aoBaixar={baixar} aoNovo={novaMinuta} />
        )}

        {etapa < 4 && (
          <footer className="acoes-etapa">
            {etapa > 1 ? (
              <button className="botao-grande botao-grande--secundario" type="button" onClick={() => { setErro(null); setEtapa((atual) => atual - 1); }}>
                <ArrowLeft size={20} /> Voltar
              </button>
            ) : <span />}
            <button className="botao-grande" type="button" onClick={continuar}>
              Continuar <ArrowRight size={20} />
            </button>
          </footer>
        )}
        {etapa === 4 && (
          <footer className="acoes-etapa">
            <button className="botao-grande botao-grande--secundario" type="button" onClick={() => { setErro(null); setEtapa(3); }}>
              <ArrowLeft size={20} /> Voltar
            </button>
            <button className="botao-grande" type="button" onClick={analisar} disabled={!pagamentoFecha || enviando}>
              {enviando ? <><Loader2 className="girando" size={20} /> Enviando documentos…</> : <>Analisar documentos <ArrowRight size={20} /></>}
            </button>
          </footer>
        )}
      </section>

      <p className="aviso-juridico"><ShieldCheck size={16} /> A minuta é um rascunho de apoio e sempre exige revisão humana antes do uso.</p>
    </main>
  );
}

function NavegacaoEtapas({ etapa, bloqueada }: { etapa: number; bloqueada: boolean }) {
  return (
    <nav className="passos-escritura" aria-label="Etapas da minuta">
      <ol>
        {ETAPAS.map((item) => {
          const Icone = item.icone;
          const concluida = item.numero < etapa;
          const atual = item.numero === etapa;
          return (
            <li key={item.numero} className={`${concluida ? "concluida" : ""} ${atual ? "atual" : ""}`} aria-current={atual ? "step" : undefined}>
              <span className="passo-escritura__icone">{concluida ? <Check size={18} /> : <Icone size={18} />}</span>
              <span><small>Etapa {item.numero}</small><strong>{item.nome}</strong></span>
              {item.numero < 6 && <i />}
            </li>
          );
        })}
      </ol>
      {bloqueada && etapa === 5 && <p>O caso já foi salvo. Você pode fechar esta tela e continuar depois.</p>}
    </nav>
  );
}

function CabecalhoEtapa({ numero, titulo, descricao }: { numero: string; titulo: string; descricao: string }) {
  return (
    <header className="cabecalho-etapa">
      <span>{numero}</span>
      <div><h2>{titulo}</h2><p>{descricao}</p></div>
    </header>
  );
}

function EtapaPessoas({ numero, titulo, descricao, arquivos, aoMudar, observacoes, aoMudarObservacoes, exemplo }: { numero: string; titulo: string; descricao: string; arquivos: File[]; aoMudar(arquivos: File[]): void; observacoes: string; aoMudarObservacoes(valor: string): void; exemplo: string }) {
  return (
    <>
      <CabecalhoEtapa numero={numero} titulo={titulo} descricao={descricao} />
      <UploadSimples titulo="Adicionar documentos" arquivos={arquivos} aoMudar={aoMudar} />
      <label className="campo-amplo">
        <span>Há algo importante que a IA precisa saber? <em>Opcional</em></span>
        <textarea value={observacoes} onChange={(evento) => aoMudarObservacoes(evento.target.value)} placeholder={exemplo} maxLength={2000} rows={3} />
      </label>
    </>
  );
}

function EtapaImovel({ matriculas, aoMudarMatriculas, valoresVenais, aoMudarValoresVenais }: { matriculas: File[]; aoMudarMatriculas(arquivos: File[]): void; valoresVenais: File[]; aoMudarValoresVenais(arquivos: File[]): void }) {
  return (
    <>
      <CabecalhoEtapa numero="3" titulo="Agora, os documentos do imóvel" descricao="A IA vai ler a matrícula inteira, organizar os registros e verificar quem aparece como proprietário atual." />
      <div className="duas-colunas-upload">
        <UploadSimples titulo="Matrícula do imóvel" subtitulo="Obrigatório · PDF ou foto" arquivos={matriculas} aoMudar={aoMudarMatriculas} />
        <UploadSimples titulo="Valor venal ou IPTU" subtitulo="Opcional · ajuda a comparar cadastro e valor" arquivos={valoresVenais} aoMudar={aoMudarValoresVenais} />
      </div>
      <div className="explicacao-ia"><Building2 size={22} /><div><strong>O que será verificado</strong><p>Descrição do imóvel, titularidade, forma de aquisição, ônus, cancelamentos, inscrição municipal e possíveis divergências.</p></div></div>
    </>
  );
}

function UploadSimples({ titulo, subtitulo = "PDF, JPG ou PNG · até 50 MB por arquivo", arquivos, aoMudar }: { titulo: string; subtitulo?: string; arquivos: File[]; aoMudar(arquivos: File[]): void }) {
  return (
    <div className="upload-simples">
      <label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple onChange={(evento) => { aoMudar([...arquivos, ...Array.from(evento.target.files || [])]); evento.target.value = ""; }} />
        <span><UploadCloud size={28} /></span>
        <strong>{titulo}</strong>
        <small>{subtitulo}</small>
        <em>Escolher arquivos</em>
      </label>
      {arquivos.length > 0 && (
        <ul className="arquivos-selecionados">
          {arquivos.map((arquivo, indice) => (
            <li key={`${arquivo.name}-${arquivo.lastModified}-${indice}`}>
              <FileText size={18} />
              <span><strong>{arquivo.name}</strong><small>{formatarTamanho(arquivo.size)}</small></span>
              <button type="button" onClick={() => aoMudar(arquivos.filter((_, atual) => atual !== indice))} aria-label={`Remover ${arquivo.name}`}><X size={18} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EtapaNegociacao({ dados, aoMudar, aoMudarPreco, aoMudarComponente, aoRemoverComponente, totalPagamento, pagamentoFecha }: { dados: DadosNegociacao; aoMudar(dados: DadosNegociacao): void; aoMudarPreco(valor: string): void; aoMudarComponente(indice: number, alteracoes: Partial<ComponentePagamento>): void; aoRemoverComponente(indice: number): void; totalPagamento: number; pagamentoFecha: boolean }) {
  return (
    <>
      <CabecalhoEtapa numero="4" titulo="Preço e forma de pagamento" descricao="Informe o valor combinado. Se houver mais de uma forma de pagamento, adicione cada parte separadamente." />
      <label className="campo-preco"><span>Preço total do imóvel</span><div><b>R$</b><input value={dados.preco_total} onChange={(evento) => aoMudarPreco(evento.target.value)} inputMode="decimal" placeholder="Ex.: 350.000,00" /></div><small>O valor por extenso será criado automaticamente.</small></label>

      <div className="bloco-pagamentos">
        <header><div><h3>Como será pago?</h3><p>A soma precisa ser igual ao preço total.</p></div><button type="button" onClick={() => aoMudar({ ...dados, componentes: [...dados.componentes, novoComponente()] })}><Plus size={18} /> Adicionar outra forma</button></header>
        {dados.componentes.map((item, indice) => (
          <article className="linha-pagamento" key={indice}>
            <span className="numero-pagamento">{indice + 1}</span>
            <label><span>Forma</span><select value={item.meio} onChange={(evento) => aoMudarComponente(indice, { meio: evento.target.value as MeioPagamento })}>{Object.entries(NOMES_MEIOS).map(([valor, nome]) => <option value={valor} key={valor}>{nome}</option>)}</select></label>
            <label><span>Valor</span><input value={item.valor} onChange={(evento) => aoMudarComponente(indice, { valor: evento.target.value })} inputMode="decimal" placeholder="0,00" /></label>
            <label><span>Quando será pago? <em>Opcional</em></span><input value={item.vencimento} onChange={(evento) => aoMudarComponente(indice, { vencimento: evento.target.value })} placeholder="Ex.: na assinatura" /></label>
            {dados.componentes.length > 1 && <button type="button" className="remover-pagamento" onClick={() => aoRemoverComponente(indice)} aria-label="Remover forma de pagamento"><Trash2 size={19} /></button>}
          </article>
        ))}
        <div className={`conferencia-soma ${pagamentoFecha ? "correta" : ""}`}><span>{pagamentoFecha ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}{pagamentoFecha ? "Os valores conferem" : "Confira a soma"}</span><strong>{formatarCentavos(totalPagamento)}</strong></div>
      </div>

      <div className="campos-negociacao-finais">
        <label className="campo-amplo"><span>Quando o comprador recebe a posse? <em>Opcional</em></span><input value={dados.imissao_posse} onChange={(evento) => aoMudar({ ...dados, imissao_posse: evento.target.value })} placeholder="Ex.: na assinatura da escritura" /></label>
        <label className="campo-amplo"><span>Cláusulas ou condições adicionais <em>Opcional</em></span><textarea value={dados.clausulas_adicionais} onChange={(evento) => aoMudar({ ...dados, clausulas_adicionais: evento.target.value })} placeholder="Escreva aqui qualquer condição que precise constar na minuta." rows={4} maxLength={6000} /></label>
      </div>
    </>
  );
}

function EtapaRevisao({ preenchimento, valoresEditados, aoMudarValor, revisaoConfirmada, aoConfirmar, aoGerar, gerando, aoNovo }: { preenchimento: Preenchimento; valoresEditados: Record<string, string>; aoMudarValor(campo: CampoPreenchimento, valor: string): void; revisaoConfirmada: boolean; aoConfirmar(valor: boolean): void; aoGerar(): void; gerando: boolean; aoNovo(): void }) {
  if (["pendente", "processando"].includes(preenchimento.status)) {
    return <div className="estado-analise"><span><Loader2 className="girando" size={34} /></span><p className="rotulo">Análise em andamento</p><h2>Estamos organizando os documentos.</h2><p>A matrícula será lida página por página. Você pode sair desta tela e voltar depois; o caso já está salvo.</p><div className="trilha-analise"><b>Partes</b><i /><b>Imóvel</b><i /><b>Pagamento</b><i /><b>Minuta</b></div></div>;
  }
  if (preenchimento.status.startsWith("erro_")) {
    return <div className="estado-analise estado-analise--erro"><span><AlertCircle size={34} /></span><p className="rotulo">Não foi possível concluir</p><h2>Vamos tentar de novo?</h2><p>Nenhuma minuta foi gerada. Revise os arquivos e inicie um novo caso.</p><button className="botao-grande" type="button" onClick={aoNovo}><RefreshCw size={20} /> Começar novamente</button></div>;
  }
  if (!possuiResultado(preenchimento)) return null;

  const resultado = preenchimento.resultado;
  const analise = resultado.analise_imovel || ANALISE_VAZIA;
  const pendencias = resultado.campos.filter((campo) => campo.status !== "encontrado").length;
  return (
    <>
      <CabecalhoEtapa numero="5" titulo="Confira antes de gerar" descricao="Leia os textos abaixo e corrija o que precisar. Nada será tratado como documento definitivo." />
      {(resultado.alertas.length > 0 || analise.alertas.length > 0 || analise.divergencias.length > 0) && (
        <div className="painel-alertas"><strong><AlertCircle size={19} /> Pontos que precisam de atenção</strong>{[...resultado.alertas, ...analise.alertas, ...analise.divergencias].map((alerta, indice) => <p key={indice}>{alerta}</p>)}</div>
      )}
      <ResumoImovel analise={analise} />
      <div className="revisao-blocos">
        {camposPorGrupo(resultado.campos).map((grupo) => (
          <section key={grupo.titulo}>
            <header><h3>{grupo.titulo}</h3><span>{grupo.campos.filter((campo) => campo.status === "encontrado").length} de {grupo.campos.length} preenchidos</span></header>
            {grupo.campos.map((campo) => (
              <CampoRevisao key={campo.id} campo={campo} valor={valoresEditados[campo.id] ?? campo.valor ?? ""} aoMudar={(valor) => aoMudarValor(campo, valor)} />
            ))}
          </section>
        ))}
      </div>
      <div className="confirmacao-final">
        <label><input type="checkbox" checked={revisaoConfirmada} onChange={(evento) => aoConfirmar(evento.target.checked)} /><span><Check size={18} /></span><strong>Revisei as informações e entendo que a minuta ainda precisa de conferência humana.</strong></label>
        {pendencias > 0 && <p><AlertCircle size={17} /> Há {pendencias} {pendencias === 1 ? "bloco sem informação" : "blocos sem informação"}. A minuta pode ser gerada como rascunho incompleto.</p>}
        <button className="botao-grande" type="button" onClick={aoGerar} disabled={!revisaoConfirmada || gerando}>{gerando ? <><Loader2 className="girando" size={20} /> Gerando minuta…</> : <>Gerar minuta em Word <ArrowRight size={20} /></>}</button>
      </div>
    </>
  );
}

function CampoRevisao({ campo, valor, aoMudar }: { campo: CampoPreenchimento; valor: string; aoMudar(valor: string): void }) {
  const evidencias = campo.evidencias?.length ? campo.evidencias : campo.fonte_nome && campo.trecho ? [{ fonte_id: campo.fonte_id || "", fonte_nome: campo.fonte_nome, categoria_fonte: campo.categoria_fonte || "", pagina: campo.pagina, trecho: campo.trecho }] : [];
  const ausente = campo.status !== "encontrado";
  return (
    <article className={`campo-revisao ${ausente ? "campo-revisao--pendente" : ""}`}>
      <div className="campo-revisao__titulo"><span>{ausente ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span><div><strong>{campo.rotulo.replaceAll("_", " ")}</strong><small>{ausente ? "Confira ou preencha manualmente" : `${Math.round(campo.confianca * 100)}% de confiança · editável`}</small></div></div>
      <textarea value={valor} onChange={(evento) => aoMudar(evento.target.value)} placeholder="Digite a informação que deve entrar na minuta" rows={Math.max(3, Math.min(8, Math.ceil(valor.length / 110)))} maxLength={8000} />
      {evidencias.length > 0 && <details><summary>Ver de onde veio esta informação</summary>{evidencias.map((evidencia, indice) => <blockquote key={indice}><strong>{evidencia.fonte_nome}{evidencia.pagina ? ` · página ${evidencia.pagina}` : ""}</strong><p>“{evidencia.trecho}”</p></blockquote>)}</details>}
      {ausente && campo.justificativa && <p className="justificativa-revisao">{campo.justificativa}</p>}
    </article>
  );
}

function ResumoImovel({ analise }: { analise: AnaliseImovel }) {
  const temAnalise = analise.identificacao.length || analise.proprietarios_atuais.length || analise.onus_restricoes.length;
  if (!temAnalise) return null;
  return (
    <section className="resumo-imovel-revisao">
      <header><div><p className="rotulo">Leitura da matrícula</p><h3>Situação do imóvel</h3></div><Building2 size={23} /></header>
      <div className="grade-resumo-imovel">
        <GrupoDadosImovel titulo="Identificação" dados={analise.identificacao} />
        <GrupoDadosImovel titulo="Proprietário atual provável" dados={analise.proprietarios_atuais} />
        <GrupoDadosImovel titulo="Forma de aquisição" dados={analise.forma_aquisicao} />
        <GrupoDadosImovel titulo="Valor venal" dados={analise.valor_venal} />
      </div>
      {analise.onus_restricoes.length > 0 && <div className="lista-onus"><h4>Ônus e restrições encontrados</h4>{analise.onus_restricoes.map((onus, indice) => <OnusEncontrado key={`${onus.ato}-${indice}`} onus={onus} />)}</div>}
      {analise.atos_registrais.length > 0 && <details className="cadeia-registral"><summary>Ver a cadeia registral completa ({analise.atos_registrais.length} atos)</summary><ol>{analise.atos_registrais.map((ato) => <li key={`${ato.ordem}-${ato.identificador}`}><span>{ato.identificador}</span><div><strong>{ato.data || ato.natureza}</strong><p>{ato.resumo}</p></div><em className={`situacao situacao--${ato.situacao}`}>{ato.situacao}</em></li>)}</ol></details>}
    </section>
  );
}

function GrupoDadosImovel({ titulo, dados }: { titulo: string; dados: DadoAnaliseImovel[] }) {
  if (!dados.length) return null;
  return <div><h4>{titulo}</h4>{dados.map((dado, indice) => <p key={`${dado.tipo}-${indice}`}><small>{dado.tipo.replaceAll("_", " ")}</small><strong>{dado.valor}</strong>{dado.precisa_revisao && <em>Revisar</em>}</p>)}</div>;
}

function OnusEncontrado({ onus }: { onus: OnusRestricao }) {
  return <article><span className={`situacao situacao--${onus.situacao}`}>{onus.situacao}</span><div><strong>{onus.tipo} · {onus.ato}</strong><p>{onus.resumo}</p>{onus.cancelado_por && <small>Cancelamento indicado em {onus.cancelado_por}</small>}</div></article>;
}

function EtapaConcluida({ aoBaixar, aoNovo }: { aoBaixar(): void; aoNovo(): void }) {
  return (
    <div className="minuta-concluida">
      <span><CheckCircle2 size={40} /></span>
      <p className="rotulo">Minuta criada</p>
      <h2>O arquivo em Word está pronto.</h2>
      <p>Baixe, leia o documento inteiro e faça os ajustes finais antes de qualquer utilização.</p>
      <div><button className="botao-grande" type="button" onClick={aoBaixar}><Download size={21} /> Baixar minuta em Word</button><button className="botao-grande botao-grande--secundario" type="button" onClick={aoNovo}><Plus size={20} /> Criar outra minuta</button></div>
      <aside><ShieldCheck size={20} /><span><strong>Revisão obrigatória</strong>Este arquivo é um rascunho assistido e não substitui a análise jurídica ou registral.</span></aside>
    </div>
  );
}
