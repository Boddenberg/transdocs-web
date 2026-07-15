"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Documento, StatusDocumento } from "@/types/documentos";

interface Filtros {
  busca?: string;
  status?: StatusDocumento;
  limite?: number;
  atualizarEnquantoProcessa?: boolean;
}

export function useDocumentos(filtros: Filtros = {}) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const busca = filtros.busca;
  const status = filtros.status;
  const limite = filtros.limite;
  const atualizarEnquantoProcessa = filtros.atualizarEnquantoProcessa;

  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);

  useEffect(() => {
    const controlador = new AbortController();
    let temporizador: number | undefined;
    const inicio = window.setTimeout(() => {
      setCarregando(true);
      setErro(null);
    }, 0);
    api.documentos
      .listar({ busca, status, limite }, controlador.signal)
      .then((dados) => {
        setDocumentos(dados);
        if (
          atualizarEnquantoProcessa &&
          dados.some((documento) => documento.status === "pendente" || documento.status === "processando")
        ) {
          const intervalo = document.visibilityState === "visible" ? 3000 : 12000;
          temporizador = window.setTimeout(recarregar, intervalo);
        }
      })
      .catch((falha) => {
        if (falha instanceof Error && falha.name === "AbortError") return;
        setErro(falha instanceof Error ? falha.message : "Não foi possível carregar.");
      })
      .finally(() => setCarregando(false));
    return () => {
      window.clearTimeout(inicio);
      if (temporizador) window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [atualizarEnquantoProcessa, busca, limite, recarregar, status, versao]);

  return { documentos, carregando, erro, recarregar };
}
