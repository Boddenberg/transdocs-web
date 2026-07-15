export type StatusDocumento =
  | "pendente"
  | "processando"
  | "concluido"
  | "erro_leitura"
  | "erro_arquivo"
  | "erro_openai"
  | "erro_interno";

export interface ItemExtraido {
  valor: string | null;
  tipo: string;
  pagina: number | null;
  trecho: string | null;
  confianca: number;
  precisa_revisao: boolean;
  confirmado: boolean;
  editado: boolean;
  papel?: string | null;
}

export interface ResultadoExtracao {
  tipo_documento: string | null;
  resumo: string | null;
  pessoas: ItemExtraido[];
  empresas: ItemExtraido[];
  documentos_identificados: ItemExtraido[];
  enderecos: ItemExtraido[];
  datas: ItemExtraido[];
  valores: ItemExtraido[];
  imoveis: ItemExtraido[];
  campos_adicionais: ItemExtraido[];
  alertas: string[];
  campos_nao_encontrados: string[];
}

export interface ExtracaoDocumento {
  id: string;
  documento_id: string;
  usuario_id: string;
  resultado: ResultadoExtracao;
  modelo_ia: string | null;
  versao_schema: number;
  criado_em: string;
  atualizado_em: string;
}

export interface DadoPrincipalDocumento {
  rotulo: string;
  valor: string;
}

export interface AnaliseDocumento {
  tokens_entrada: number;
  tokens_saida: number;
  tokens_total: number;
  custo_estimado_usd: number;
  custo_estimado_brl: number;
  cotacao_usd_brl: number;
  modelo_ia: string | null;
  estrategia: string | null;
  concluido_em: string | null;
}

export interface Documento {
  id: string;
  usuario_id: string;
  nome_original: string;
  nome_seguro: string;
  tipo_mime: string;
  tipo_arquivo: "pdf" | "imagem";
  tamanho_bytes: number;
  total_paginas: number | null;
  somente_primeira_pagina: boolean;
  status: StatusDocumento;
  revisado: boolean;
  codigo_erro: string | null;
  criado_em: string;
  atualizado_em: string;
  ultima_alteracao_em: string;
  tipo_documento?: string | null;
  dados_principais?: DadoPrincipalDocumento[];
  analise?: AnaliseDocumento | null;
}

export interface DocumentoDetalhe extends Documento {
  extracao: ExtracaoDocumento | null;
}

export interface UrlDocumento {
  url: string;
  expira_em_segundos: number;
}

export const gruposExtracao = [
  "pessoas",
  "empresas",
  "documentos_identificados",
  "enderecos",
  "datas",
  "valores",
  "imoveis",
  "campos_adicionais"
] as const;

export type GrupoExtracao = (typeof gruposExtracao)[number];

export interface CorrecaoCampo {
  grupo: GrupoExtracao;
  indice: number;
  valor?: string | null;
  confirmado?: boolean;
}
