"use client";

import { Check, Clipboard, Copy, List } from "lucide-react";
import { useState } from "react";

import { gruposApresentacao } from "@/components/documentos/grupos-extracao";
import type { ResultadoExtracao } from "@/types/documentos";

export function ResumoExtracao({
  resultado
}: {
  resultado: ResultadoExtracao;
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
        <div className="resumo-rapido__acoes-copia">
          <button
            className={copiado === "rotulos" ? "copiado" : ""}
            onClick={() => copiar(montarTextoComRotulos(resultado), "rotulos")}
            disabled={!total}
            title="Copiar cada dado com seu título"
          >
            {copiado === "rotulos" ? <Check size={15} /> : <Copy size={15} />}
            {copiado === "rotulos" ? "Copiado" : "Com títulos"}
          </button>
          <button
            className={copiado === "valores" ? "copiado" : ""}
            onClick={() => copiar(montarTextoSomenteValores(resultado), "valores")}
            disabled={!total}
            title="Copiar somente os valores, um por linha"
          >
            {copiado === "valores" ? <Check size={15} /> : <List size={15} />}
            {copiado === "valores" ? "Copiado" : "Só dados"}
          </button>
        </div>
      </header>

      {resultado.resumo && (
        <section className="resumo-sintese">
          <strong>Síntese</strong>
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
                      <span className="resumo-item__rotulo">
                        {item.tipo}{item.papel ? ` · ${item.papel}` : ""}
                      </span>
                      <strong title={item.valor || undefined}>{item.valor}</strong>
                      <button
                        className={copiado === identificador ? "copiado" : ""}
                        onClick={() => copiar(item.valor!, identificador)}
                        aria-label={`Copiar ${item.tipo}`}
                        title={`Copiar ${item.tipo}`}
                      >
                        {copiado === identificador ? <Check size={14} /> : <Clipboard size={14} />}
                      </button>
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

function montarTextoComRotulos(resultado: ResultadoExtracao) {
  return listarItensCopiaveis(resultado)
    .map((item) => `${item.tipo}: ${item.valor}`)
    .join("\n");
}

function montarTextoSomenteValores(resultado: ResultadoExtracao) {
  return listarItensCopiaveis(resultado)
    .map((item) => abreviarValorQuandoNecessario(item.tipo, item.valor))
    .join("\n");
}

function listarItensCopiaveis(resultado: ResultadoExtracao) {
  return gruposApresentacao.flatMap((grupo) =>
    resultado[grupo.chave]
      .filter((item): item is typeof item & { valor: string } => Boolean(item.valor))
      .map((item) => ({ tipo: item.tipo, valor: item.valor }))
  );
}

function abreviarValorQuandoNecessario(tipo: string, valor: string) {
  const campo = normalizar(tipo);
  if (!campo.includes("sexo") && !campo.includes("genero")) return valor;

  const sexo = normalizar(valor);
  if (sexo.startsWith("feminin")) return "F";
  if (sexo.startsWith("masculin")) return "M";
  return valor;
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}
