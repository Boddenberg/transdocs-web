"use client";

import { AlertTriangle, Building2, CalendarDays, CircleDollarSign, FileBadge, Home, ListPlus, MapPin, SearchCheck, UserRound, WandSparkles } from "lucide-react";
import { useState } from "react";

import { CampoExtraido } from "@/components/documentos/campo-extraido";
import type { CorrecaoCampo, GrupoExtracao, ResultadoExtracao } from "@/types/documentos";

const grupos: Array<{ chave: GrupoExtracao; rotulo: string; icone: typeof UserRound }> = [
  { chave: "pessoas", rotulo: "Pessoas e papéis", icone: UserRound },
  { chave: "empresas", rotulo: "Empresas", icone: Building2 },
  { chave: "documentos_identificados", rotulo: "Identificadores", icone: FileBadge },
  { chave: "enderecos", rotulo: "Endereços", icone: MapPin },
  { chave: "datas", rotulo: "Datas", icone: CalendarDays },
  { chave: "valores", rotulo: "Valores", icone: CircleDollarSign },
  { chave: "imoveis", rotulo: "Imóveis", icone: Home },
  { chave: "campos_adicionais", rotulo: "Outros achados", icone: ListPlus }
];

export function PainelExtracao({
  resultado,
  aoCorrigir,
  aoAbrirPagina
}: {
  resultado: ResultadoExtracao;
  aoCorrigir(dados: CorrecaoCampo): Promise<void>;
  aoAbrirPagina(pagina: number): void;
}) {
  const [aba, setAba] = useState<"achados" | "alertas">("achados");
  const [somenteRevisao, setSomenteRevisao] = useState(false);
  const total = grupos.reduce((soma, grupo) => soma + resultado[grupo.chave].length, 0);
  const revisoes = grupos.reduce((soma, grupo) => soma + resultado[grupo.chave].filter((i) => i.precisa_revisao && !i.confirmado).length, 0);

  return (
    <section className="painel-extracao">
      <header className="painel-extracao__cabecalho">
        <div><span className="painel-extracao__icone"><WandSparkles size={19} /></span><div><p className="rotulo">Leitura estruturada</p><h2>{resultado.tipo_documento || "Documento analisado"}</h2></div></div>
        <span className="contador-achados">{total} achados</span>
      </header>
      <nav className="abas-extracao"><button className={aba === "achados" ? "ativo" : ""} onClick={() => setAba("achados")}><SearchCheck size={15} /> Achados</button><button className={aba === "alertas" ? "ativo" : ""} onClick={() => setAba("alertas")}><AlertTriangle size={15} /> Alertas {revisoes > 0 && <span>{revisoes}</span>}</button></nav>
      {aba === "achados" ? <div className="painel-extracao__conteudo">
        {resultado.resumo && <div className="resumo-extracao"><span>Resumo factual</span><p>{resultado.resumo}</p></div>}
        <label className="filtro-revisao"><input type="checkbox" checked={somenteRevisao} onChange={(e) => setSomenteRevisao(e.target.checked)} /><span /> Mostrar apenas o que precisa de revisão</label>
        {grupos.map((grupo) => {
          const itens = resultado[grupo.chave].map((item, indice) => ({ item, indice })).filter(({ item }) => !somenteRevisao || (item.precisa_revisao && !item.confirmado));
          if (!itens.length) return null;
          return <section className="grupo-extracao" key={grupo.chave}><header><grupo.icone size={16} /><h3>{grupo.rotulo}</h3><span>{itens.length}</span></header><div>{itens.map(({ item, indice }) => <CampoExtraido key={`${grupo.chave}-${indice}`} item={item} grupo={grupo.chave} indice={indice} aoCorrigir={aoCorrigir} aoAbrirPagina={aoAbrirPagina} />)}</div></section>;
        })}
        {!total && <div className="estado-vazio"><SearchCheck size={27} /><strong>Nenhum dado identificado com segurança</strong><p>Confira os alertas e o documento original.</p></div>}
      </div> : <div className="painel-extracao__conteudo painel-alertas">
        <div className="alerta-principal"><AlertTriangle size={20} /><div><strong>Conferência humana obrigatória</strong><p>A extração organiza a leitura, mas não comprova validade ou autenticidade jurídica.</p></div></div>
        <section><h3>Alertas da leitura</h3>{resultado.alertas.length ? <ul>{resultado.alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}</ul> : <p className="sem-alertas">Nenhuma divergência específica foi sinalizada.</p>}</section>
        <section><h3>Campos não encontrados</h3>{resultado.campos_nao_encontrados.length ? <div className="etiquetas-ausentes">{resultado.campos_nao_encontrados.map((campo) => <span key={campo}>{campo}</span>)}</div> : <p className="sem-alertas">O modelo não listou campos ausentes.</p>}</section>
      </div>}
    </section>
  );
}

