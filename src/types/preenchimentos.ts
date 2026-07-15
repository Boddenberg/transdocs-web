export type StatusPreenchimento =
  | "pendente"
  | "processando"
  | "aguardando_dados"
  | "pronto_para_gerar"
  | "concluido"
  | "erro_arquivo"
  | "erro_openai"
  | "erro_interno";

export type StatusCampoPreenchimento = "encontrado" | "ausente" | "ambiguo";
export type ModoPreenchimento = "literal" | "composto";

export interface CategoriaFontePreenchimento {
  id: string;
  nome: string;
  descricao: string;
  multiplo: boolean;
  obrigatorio: boolean;
}

export interface TipoPreenchimento {
  id: string;
  nome: string;
  descricao: string;
  arquivo_base: {
    rotulo: string;
    descricao: string;
    obrigatorio: boolean;
    aceita: string[];
  };
  fontes: CategoriaFontePreenchimento[];
  formatos_fontes: string[];
}

export interface LocalizadorCampoDocx {
  parte: string;
  paragrafo: number;
  inicio: number;
  fim: number;
  marcador: string;
}

export interface EvidenciaCampoPreenchimento {
  fonte_id: string;
  fonte_nome: string;
  categoria_fonte: string;
  pagina: number | null;
  trecho: string;
}

export interface CampoPreenchimento {
  id: string;
  rotulo: string;
  marcador: string;
  contexto: string;
  status: StatusCampoPreenchimento;
  valor: string | null;
  valor_original?: string | null;
  editado_pelo_usuario?: boolean;
  modo_preenchimento?: ModoPreenchimento;
  evidencias?: EvidenciaCampoPreenchimento[];
  fonte_id: string | null;
  fonte_nome: string | null;
  categoria_fonte: string | null;
  pagina: number | null;
  trecho: string | null;
  confianca: number;
  autoaplicavel: boolean;
  justificativa: string;
  localizador: LocalizadorCampoDocx;
}

export interface ResultadoPreenchimento {
  tipo_documento: string;
  campos: CampoPreenchimento[];
  alertas: string[];
  total_campos: number;
  total_encontrados: number;
  total_pendentes: number;
}

export interface FontePreenchimento {
  id: string;
  preenchimento_id: string;
  categoria: string;
  nome_original: string;
  tipo_mime: string;
  tipo_arquivo: "pdf" | "imagem";
  tamanho_bytes: number;
  hash_sha256: string;
  criado_em: string;
}

export interface Preenchimento {
  id: string;
  usuario_id: string;
  tipo_documento: string;
  nome_minuta: string;
  hash_minuta: string;
  tamanho_minuta_bytes: number;
  instrucoes_negociacao?: string;
  status: StatusPreenchimento;
  resultado: ResultadoPreenchimento | Record<string, never>;
  nome_resultado: string | null;
  modelo_ia: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  codigo_erro: string | null;
  criado_em: string;
  atualizado_em: string;
  fontes?: FontePreenchimento[];
}

export interface ArquivoPreenchimento {
  url: string;
  nome_arquivo: string;
  expira_em_segundos: number;
}

export interface TranscricaoAudio {
  texto: string;
}

export interface FonteSelecionada {
  categoria: string;
  arquivo: File;
}
