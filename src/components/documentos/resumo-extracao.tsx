"use client";

import { Check, Clipboard, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import { gruposApresentacao } from "@/components/documentos/grupos-extracao";
import type { ResultadoExtracao } from "@/types/documentos";

export function ResumoExtracao({
  resultado,
  aoAbrirPagina
}: {
  resultado: ResultadoExtracao;
  aoAbrirPagina(pagina: number): void;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const total = gruposApresentacao.reduce(
    (soma, grupo) => soma + resultado[grupo.chave].filter((item) => item.valor).length,
    0
  );

  async function copiar(texto: string, identificador: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(identificador);
    setTimeout(() => setCopiado(null), 1400);
  }

  return (
    <div className="resumo-rapido">
      <header className="resumo-rapido__cabecalho">
        <div>
          <strong>Visão essencial</strong>
          <span>{total} {total === 1 ? "dado pronto" : "dados prontos"} para copiar</span>
        </div>
        <button
          className={copiado === "todos" ? "copiado" : ""}
          onClick={() => copiar(montarTextoCompleto(resultado), "todos")}
          disabled={!total && !resultado.resumo}
        >
          {copiado === "todos" ? <Check size={15} /> : <Copy size={15} />}
          {copiado === "todos" ? "Copiado" : "Copiar tudo"}
        </button>
      </header>

      {resultado.resumo && (
        <section className="resumo-sintese">
          <span>Em poucas palavras</span>
          <p>{resultado.resumo}</p>
        </section>
      )}

      <div className="resumo-rapido__grupos">
        {gruposApresentacao.map((grupo) => {
          const itens = resultado[grupo.chave]
            .map((item, indice) => ({ item, indice }))
            .filter(({ item }) => item.valor);
          if (!itens.length) return null;
          return (
            <section className="resumo-grupo" key={grupo.chave}>
              <header>
                <grupo.icone size={15} />
                <h3>{grupo.rotulo}</h3>
                <span>{itens.length}</span>
              </header>
              <div>
                {itens.map(({ item, indice }) => {
                  const identificador = `${grupo.chave}-${indice}`;
                  return (
                    <article className="resumo-item" key={identificador}>
                      <div className="resumo-item__texto">
                        <span>{item.tipo}{item.papel ? ` · ${item.papel}` : ""}</span>
                        <strong>{item.valor}</strong>
                      </div>
                      <div className="resumo-item__acoes">
                        {item.pagina && (
                          <button onClick={() => aoAbrirPagina(item.pagina!)} aria-label={`Abrir página ${item.pagina}`}>
                            <ExternalLink size={13} /> p. {item.pagina}
                          </button>
                        )}
                        <button
                          className={copiado === identificador ? "copiado" : ""}
                          onClick={() => copiar(item.valor!, identificador)}
                          aria-label={`Copiar ${item.tipo}`}
                        >
                          {copiado === identificador ? <Check size={15} /> : <Clipboard size={15} />}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {!total && !resultado.resumo && (
        <div className="estado-vazio estado-vazio--compacto">
          <Clipboard size={25} />
          <strong>Nenhum dado disponível para o resumo</strong>
          <p>Abra a visão detalhada ou confira os alertas.</p>
        </div>
      )}
    </div>
  );
}

function montarTextoCompleto(resultado: ResultadoExtracao) {
  const linhas: string[] = [];
  if (resultado.tipo_documento) linhas.push(`Tipo de documento: ${resultado.tipo_documento}`);
  if (resultado.resumo) linhas.push(`Resumo: ${resultado.resumo}`);

  for (const grupo of gruposApresentacao) {
    const itens = resultado[grupo.chave].filter((item) => item.valor);
    if (!itens.length) continue;
    linhas.push("", grupo.rotulo.toUpperCase());
    for (const item of itens) {
      const papel = item.papel ? ` · ${item.papel}` : "";
      const pagina = item.pagina ? ` [página ${item.pagina}]` : "";
      linhas.push(`${item.tipo}${papel}: ${item.valor}${pagina}`);
    }
  }

  if (resultado.alertas.length) {
    linhas.push("", "ALERTAS", ...resultado.alertas.map((alerta) => `- ${alerta}`));
  }
  if (resultado.campos_nao_encontrados.length) {
    linhas.push(
      "",
      "NÃO ENCONTRADOS",
      ...resultado.campos_nao_encontrados.map((campo) => `- ${campo}`)
    );
  }
  return linhas.join("\n").trim();
}
