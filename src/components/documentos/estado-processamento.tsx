import { Check, CircleDashed, FileSearch, ScanText, Sparkles } from "lucide-react";

import type { StatusDocumento } from "@/types/documentos";

const etapas = [
  { rotulo: "Arquivo protegido", icone: Check },
  { rotulo: "Leitura do conteúdo", icone: FileSearch },
  { rotulo: "Extração estruturada", icone: Sparkles },
  { rotulo: "Preparando conferência", icone: ScanText }
];

export function EstadoProcessamento({ status }: { status: StatusDocumento }) {
  const processando = status === "processando";
  return (
    <div className="estado-processamento">
      <span className="estado-processamento__orbe"><ScanText size={34} /></span>
      <p className="rotulo">Leitura em andamento</p>
      <h2>{processando ? "Separando fatos de incertezas." : "Seu documento entrou na fila."}</h2>
      <p>Você pode permanecer nesta tela. O resultado aparecerá automaticamente, sem atualizar a página.</p>
      <div className="etapas-processamento">
        {etapas.map((etapa, indice) => {
          const concluida = processando ? indice === 0 : false;
          const ativa = processando ? indice === 1 || indice === 2 : indice === 0;
          return <span key={etapa.rotulo} className={concluida ? "concluida" : ativa ? "ativa" : ""}>{concluida ? <Check size={15} /> : ativa ? <CircleDashed size={15} /> : <etapa.icone size={15} />}<small>{etapa.rotulo}</small></span>;
        })}
      </div>
    </div>
  );
}

