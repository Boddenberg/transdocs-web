"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { DocumentoDetalhe, ExtracaoDocumento } from "@/types/documentos";

export function useDocumento(id: string) {
  const [documento, setDocumento] = useState<DocumentoDetalhe | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  const recarregar = useCallback(() => setVersao((valor) => valor + 1), []);
  const atualizarExtracao = useCallback((extracao: ExtracaoDocumento) => {
    setDocumento((atual) => atual ? { ...atual, extracao } : atual);
  }, []);
  const atualizarDocumento = useCallback((dados: Partial<DocumentoDetalhe>) => {
    setDocumento((atual) => atual ? { ...atual, ...dados } : atual);
  }, []);

  useEffect(() => {
    let ativo = true;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const controlador = new AbortController();

    async function carregar() {
      try {
        const dados = await api.documentos.buscar(id, controlador.signal);
        if (!ativo) return;
        setDocumento(dados);
        setErro(null);
        setCarregando(false);
        if (dados.status === "pendente" || dados.status === "processando") {
          const intervalo = document.visibilityState === "visible" ? 3000 : 12000;
          temporizador = setTimeout(carregar, intervalo);
        }
      } catch (falha) {
        if (!ativo || (falha instanceof Error && falha.name === "AbortError")) return;
        setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o documento.");
        setCarregando(false);
      }
    }

    carregar();
    api.documentos.arquivo(id).then((dados) => ativo && setUrl(dados.url)).catch(() => null);
    return () => {
      ativo = false;
      controlador.abort();
      if (temporizador) clearTimeout(temporizador);
    };
  }, [id, versao]);

  return {
    documento,
    url,
    carregando,
    erro,
    recarregar,
    atualizarExtracao,
    atualizarDocumento
  };
}

