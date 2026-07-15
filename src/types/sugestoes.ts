export type CategoriaSugestao = "sugestao" | "erro" | "dificuldade" | "outro";

export interface NovaSugestao {
  categoria: CategoriaSugestao;
  mensagem: string;
  paginaOrigem?: string;
  anexos: File[];
}

export interface SugestaoCriada {
  id: string;
  usuario_id: string;
  usuario_email: string | null;
  categoria: CategoriaSugestao;
  mensagem: string;
  pagina_origem: string | null;
  status: "nova" | "lida" | "resolvida" | "arquivada";
  criado_em: string;
  anexos: Array<{
    id: string;
    nome_original: string;
    tipo_mime: string;
    tamanho_bytes: number;
  }>;
}
