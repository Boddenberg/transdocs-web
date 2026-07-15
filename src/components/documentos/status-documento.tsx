import { AlertTriangle, Check, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";

import type { StatusDocumento as Status } from "@/types/documentos";

const dados = {
  pendente: { rotulo: "Na fila", icone: Clock3 },
  processando: { rotulo: "Lendo", icone: LoaderCircle },
  concluido: { rotulo: "Pronto", icone: Check },
  erro_leitura: { rotulo: "Revisar arquivo", icone: AlertTriangle },
  erro_arquivo: { rotulo: "Arquivo inválido", icone: AlertTriangle },
  erro_openai: { rotulo: "Tentar novamente", icone: AlertTriangle },
  erro_interno: { rotulo: "Indisponível", icone: AlertTriangle }
} satisfies Record<Status, { rotulo: string; icone: typeof Check }>;

export function StatusDocumento({ status, revisado }: { status: Status; revisado?: boolean }) {
  if (revisado) return <span className="status status--revisado"><ShieldCheck size={13} /> Revisado</span>;
  const atual = dados[status];
  return <span className={`status status--${status}`}><atual.icone size={13} />{atual.rotulo}</span>;
}

