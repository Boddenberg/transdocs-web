import { configuracao } from "@/lib/configuracao";
import { supabase } from "@/lib/supabase";
import type {
  CorrecaoCampo,
  Documento,
  DocumentoDetalhe,
  ExtracaoDocumento,
  StatusDocumento,
  UrlDocumento
} from "@/types/documentos";
import type { NovaSugestao, SugestaoCriada } from "@/types/sugestoes";
import type {
  ArquivoPreenchimento,
  DadosNegociacao,
  FonteSelecionada,
  ModeloPreenchimento,
  Preenchimento,
  TranscricaoAudio,
  TipoPreenchimento
} from "@/types/preenchimentos";

type Metodo = "GET" | "POST" | "PATCH" | "DELETE";

interface Opcoes {
  metodo?: Metodo;
  corpo?: unknown;
  sinal?: AbortSignal;
  repetirAposRefresh?: boolean;
  semCorpo?: boolean;
}

interface ErroBackend {
  erro?: { codigo?: string; mensagem?: string };
}

const requisicoesGet = new Map<string, Promise<unknown>>();
let renovacaoEmAndamento: Promise<string | null> | null = null;

export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo?: string
  ) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const metodo = opcoes.metodo || "GET";
  if (metodo === "GET") {
    const chave = `${caminho}`;
    const existente = requisicoesGet.get(chave) as Promise<T> | undefined;
    if (existente) return existente;
    const requisicao = executar<T>(caminho, opcoes).finally(() => requisicoesGet.delete(chave));
    requisicoesGet.set(chave, requisicao);
    return requisicao;
  }
  return executar<T>(caminho, opcoes);
}

async function executar<T>(caminho: string, opcoes: Opcoes): Promise<T> {
  const token = await obterToken();
  const cabecalhos = new Headers({ Accept: "application/json" });
  if (token) cabecalhos.set("Authorization", `Bearer ${token}`);
  if (opcoes.corpo !== undefined) cabecalhos.set("Content-Type", "application/json");

  let resposta: Response;
  try {
    resposta = await fetch(`${configuracao.apiUrl}${caminho}`, {
      method: opcoes.metodo || "GET",
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      signal: opcoes.sinal
    });
  } catch (erro) {
    if (erro instanceof Error && erro.name === "AbortError") throw erro;
    throw new ErroApi("Não foi possível conectar ao ThiagoDocs.", 0);
  }

  if (resposta.status === 401 && !opcoes.repetirAposRefresh) {
    const renovado = await renovarToken();
    if (renovado) return executar<T>(caminho, { ...opcoes, repetirAposRefresh: true });
  }
  if (!resposta.ok) throw await criarErro(resposta);
  if (opcoes.semCorpo || resposta.status === 204) return undefined as T;
  return resposta.json() as Promise<T>;
}

async function obterToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function renovarToken(): Promise<string | null> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = supabase.auth
      .refreshSession()
      .then(({ data }) => data.session?.access_token || null)
      .finally(() => {
        renovacaoEmAndamento = null;
      });
  }
  return renovacaoEmAndamento;
}

async function criarErro(resposta: Response): Promise<ErroApi> {
  let dados: ErroBackend = {};
  try {
    dados = (await resposta.json()) as ErroBackend;
  } catch {
    // Uma página de erro do proxy nunca é mostrada diretamente à pessoa usuária.
  }
  const mensagem =
    dados.erro?.mensagem ||
    (resposta.status === 401
      ? "Sua sessão expirou. Entre novamente."
      : resposta.status === 403
        ? "Você não tem permissão para esta ação."
        : resposta.status >= 500
          ? "O ThiagoDocs está temporariamente indisponível."
          : "Não foi possível concluir a operação.");
  return new ErroApi(mensagem, resposta.status, dados.erro?.codigo);
}

function consulta(parametros: Record<string, string | number | undefined>) {
  const busca = new URLSearchParams();
  Object.entries(parametros).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== "") busca.set(chave, String(valor));
  });
  const texto = busca.toString();
  return texto ? `?${texto}` : "";
}

export const api = {
  documentos: {
    listar: (
      parametros: { busca?: string; status?: StatusDocumento; limite?: number } = {},
      sinal?: AbortSignal
    ) =>
      requisitar<Documento[]>(`/api/v1/documentos${consulta(parametros)}`, {
        sinal
      }),
    buscar: (id: string, sinal?: AbortSignal) =>
      requisitar<DocumentoDetalhe>(`/api/v1/documentos/${id}`, { sinal }),
    arquivo: (id: string) =>
      requisitar<UrlDocumento>(`/api/v1/documentos/${id}/arquivo`),
    corrigir: (id: string, dados: CorrecaoCampo) =>
      requisitar<ExtracaoDocumento>(`/api/v1/documentos/${id}/resultado`, {
        metodo: "PATCH",
        corpo: dados
      }),
    revisar: (id: string, revisado = true) =>
      requisitar<Documento>(`/api/v1/documentos/${id}/revisao`, {
        metodo: "PATCH",
        corpo: { revisado }
      }),
    reprocessar: (id: string) =>
      requisitar<Documento>(`/api/v1/documentos/${id}/reprocessar`, {
        metodo: "POST"
      }),
    excluir: (id: string) =>
      requisitar<void>(`/api/v1/documentos/${id}`, {
        metodo: "DELETE",
        semCorpo: true
      })
  },
  preenchimentos: {
    tipos: () => requisitar<TipoPreenchimento[]>("/api/v1/preenchimentos/tipos"),
    modelos: (tipoDocumento?: string) =>
      requisitar<ModeloPreenchimento[]>(
        `/api/v1/preenchimentos/modelos${tipoDocumento ? `?tipo_documento=${encodeURIComponent(tipoDocumento)}` : ""}`
      ),
    excluirModelo: (id: string) =>
      requisitar<{ excluido: boolean }>(`/api/v1/preenchimentos/modelos/${id}`, {
        metodo: "DELETE"
      }),
    listar: () => requisitar<Preenchimento[]>("/api/v1/preenchimentos?limite=20"),
    buscar: (id: string, sinal?: AbortSignal) =>
      requisitar<Preenchimento>(`/api/v1/preenchimentos/${id}`, { sinal }),
    gerar: (
      id: string,
      camposIncluir: string[],
      valoresCampos: Record<string, string>,
      permitirIncompleto: boolean,
      revisaoConfirmada: boolean
    ) =>
      requisitar<Preenchimento>(`/api/v1/preenchimentos/${id}/gerar`, {
        metodo: "POST",
        corpo: {
          campos_incluir: camposIncluir,
          valores_campos: valoresCampos,
          permitir_incompleto: permitirIncompleto,
          revisao_confirmada: revisaoConfirmada
        }
      }),
    arquivo: (id: string) =>
      requisitar<ArquivoPreenchimento>(`/api/v1/preenchimentos/${id}/arquivo`)
  }
};

export async function criarPreenchimento(
  tipoDocumento: string,
  arquivoBase: File | null,
  modeloId: string | null,
  instrucoesNegociacao: string,
  dadosNegociacao: DadosNegociacao | null,
  fontes: FonteSelecionada[],
  repetirAposRefresh = false
): Promise<Preenchimento> {
  const formulario = new FormData();
  formulario.append("tipo_documento", tipoDocumento);
  if (arquivoBase) formulario.append("arquivo_base", arquivoBase);
  if (modeloId) formulario.append("modelo_id", modeloId);
  formulario.append("instrucoes_negociacao", instrucoesNegociacao);
  if (dadosNegociacao) {
    formulario.append("dados_negociacao", JSON.stringify(dadosNegociacao));
  }
  fontes.forEach((fonte) => {
    formulario.append("categorias_fontes", fonte.categoria);
    formulario.append("arquivos_fontes", fonte.arquivo);
  });
  return enviarFormularioPreenchimento(
    "/api/v1/preenchimentos",
    formulario,
    repetirAposRefresh,
    () =>
      criarPreenchimento(
        tipoDocumento,
        arquivoBase,
        modeloId,
        instrucoesNegociacao,
        dadosNegociacao,
        fontes,
        true
      )
  );
}

export async function criarModeloPreenchimento(
  tipoDocumento: string,
  nome: string,
  descricao: string,
  arquivo: File,
  repetirAposRefresh = false
): Promise<ModeloPreenchimento> {
  const formulario = new FormData();
  formulario.append("tipo_documento", tipoDocumento);
  formulario.append("nome", nome);
  formulario.append("descricao", descricao);
  formulario.append("arquivo", arquivo);
  return enviarFormularioPreenchimento(
    "/api/v1/preenchimentos/modelos",
    formulario,
    repetirAposRefresh,
    () => criarModeloPreenchimento(tipoDocumento, nome, descricao, arquivo, true)
  );
}

export async function adicionarFontesPreenchimento(
  id: string,
  fontes: FonteSelecionada[],
  repetirAposRefresh = false
): Promise<Preenchimento> {
  const formulario = new FormData();
  fontes.forEach((fonte) => {
    formulario.append("categorias_fontes", fonte.categoria);
    formulario.append("arquivos_fontes", fonte.arquivo);
  });
  return enviarFormularioPreenchimento(
    `/api/v1/preenchimentos/${id}/fontes`,
    formulario,
    repetirAposRefresh,
    () => adicionarFontesPreenchimento(id, fontes, true)
  );
}

export async function transcreverAudioPreenchimento(
  arquivo: File,
  repetirAposRefresh = false
): Promise<TranscricaoAudio> {
  const formulario = new FormData();
  formulario.append("arquivo", arquivo);
  const token = await obterToken();
  let resposta: Response;
  try {
    resposta = await fetch(
      `${configuracao.apiUrl}/api/v1/preenchimentos/transcrever-audio`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formulario
      }
    );
  } catch {
    throw new ErroApi("Não foi possível enviar o áudio para transcrição.", 0);
  }
  if (resposta.status === 401 && !repetirAposRefresh) {
    const renovado = await renovarToken();
    if (renovado) return transcreverAudioPreenchimento(arquivo, true);
  }
  if (!resposta.ok) throw await criarErro(resposta);
  return resposta.json() as Promise<TranscricaoAudio>;
}

async function enviarFormularioPreenchimento<T>(
  caminho: string,
  formulario: FormData,
  repetirAposRefresh: boolean,
  repetir: () => Promise<T>
): Promise<T> {
  const token = await obterToken();
  let resposta: Response;
  try {
    resposta = await fetch(`${configuracao.apiUrl}${caminho}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formulario
    });
  } catch {
    throw new ErroApi("Não foi possível enviar os arquivos do preenchimento.", 0);
  }
  if (resposta.status === 401 && !repetirAposRefresh) {
    const renovado = await renovarToken();
    if (renovado) return repetir();
  }
  if (!resposta.ok) throw await criarErro(resposta);
  return resposta.json() as Promise<T>;
}

export async function enviarDocumento(
  arquivo: File,
  opcoes: { somentePrimeiraPagina?: boolean },
  aoProgredir: (percentual: number) => void,
  sinal?: AbortSignal
): Promise<Documento> {
  const token = await obterToken();
  return new Promise((resolver, rejeitar) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${configuracao.apiUrl}/api/v1/documentos`);
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) aoProgredir(Math.round((evento.loaded / evento.total) * 100));
    };
    xhr.onerror = () => rejeitar(new ErroApi("Não foi possível enviar o documento.", 0));
    xhr.onabort = () => rejeitar(new DOMException("Envio cancelado", "AbortError"));
    xhr.onload = () => {
      let dados: unknown = {};
      try {
        dados = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        dados = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) resolver(dados as Documento);
      else {
        const erro = dados as ErroBackend;
        rejeitar(
          new ErroApi(
            erro.erro?.mensagem || "Não foi possível enviar o documento.",
            xhr.status,
            erro.erro?.codigo
          )
        );
      }
    };
    sinal?.addEventListener("abort", () => xhr.abort(), { once: true });
    const formulario = new FormData();
    formulario.append("arquivo", arquivo);
    formulario.append(
      "somente_primeira_pagina",
      String(Boolean(opcoes.somentePrimeiraPagina))
    );
    xhr.send(formulario);
  });
}

export async function enviarSugestao(
  dados: NovaSugestao,
  repetirAposRefresh = false
): Promise<SugestaoCriada> {
  const formulario = new FormData();
  formulario.append("categoria", dados.categoria);
  formulario.append("mensagem", dados.mensagem);
  if (dados.paginaOrigem) formulario.append("pagina_origem", dados.paginaOrigem);
  dados.anexos.forEach((anexo) => formulario.append("anexos", anexo));

  const token = await obterToken();
  let resposta: Response;
  try {
    resposta = await fetch(`${configuracao.apiUrl}/api/v1/sugestoes`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formulario
    });
  } catch {
    throw new ErroApi("Não foi possível enviar sua mensagem agora.", 0);
  }

  if (resposta.status === 401 && !repetirAposRefresh) {
    const renovado = await renovarToken();
    if (renovado) return enviarSugestao(dados, true);
  }
  if (!resposta.ok) throw await criarErro(resposta);
  return resposta.json() as Promise<SugestaoCriada>;
}
