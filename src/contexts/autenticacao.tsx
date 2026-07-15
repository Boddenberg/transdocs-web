"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { supabaseConfigurado } from "@/lib/configuracao";
import { supabase } from "@/lib/supabase";

interface AutenticacaoContexto {
  usuario: User | null;
  sessao: Session | null;
  carregando: boolean;
  configurado: boolean;
  entrar(email: string, senha: string): Promise<void>;
  cadastrar(
    nome: string,
    email: string,
    senha: string
  ): Promise<{ confirmacaoEmailNecessaria: boolean }>;
  reenviarConfirmacao(email: string): Promise<void>;
  recuperar(email: string): Promise<void>;
  atualizarSenha(senha: string): Promise<void>;
  atualizarPerfil(nome: string): Promise<void>;
  sair(): Promise<void>;
}

const Contexto = createContext<AutenticacaoContexto | null>(null);

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) {
        setSessao(data.session);
        setCarregando(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
      setCarregando(false);
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo<AutenticacaoContexto>(
    () => ({
      usuario: sessao?.user || null,
      sessao,
      carregando,
      configurado: supabaseConfigurado,
      async entrar(email, senha) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error(traduzirErroAuth(error.message));
      },
      async cadastrar(nome, email, senha) {
        const redirecionamento = `${window.location.origin}/auth/login?confirmado=1`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome },
            emailRedirectTo: redirecionamento
          }
        });
        if (error) throw new Error(traduzirErroAuth(error.message));
        return { confirmacaoEmailNecessaria: !data.session };
      },
      async reenviarConfirmacao(email) {
        const redirecionamento = `${window.location.origin}/auth/login?confirmado=1`;
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirecionamento }
        });
        if (error) throw new Error(traduzirErroAuth(error.message));
      },
      async recuperar(email) {
        const destino = `${window.location.origin}/auth/nova-senha`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: destino
        });
        if (error) throw new Error(traduzirErroAuth(error.message));
      },
      async atualizarSenha(senha) {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw new Error(traduzirErroAuth(error.message));
      },
      async atualizarPerfil(nome) {
        const { error } = await supabase.auth.updateUser({ data: { nome: nome.trim() } });
        if (error) throw new Error("Não foi possível atualizar o perfil.");
      },
      async sair() {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error("Não foi possível encerrar a sessão.");
      }
    }),
    [carregando, sessao]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAutenticacao() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("Provedor de autenticação não encontrado.");
  return contexto;
}

function traduzirErroAuth(mensagem: string) {
  if (/invalid login/i.test(mensagem)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(mensagem)) return "Confirme seu e-mail antes de entrar.";
  if (/already registered/i.test(mensagem)) return "Este e-mail já está cadastrado.";
  if (/password/i.test(mensagem)) return "Use uma senha com pelo menos 8 caracteres.";
  if (/rate limit/i.test(mensagem)) return "Muitas tentativas. Aguarde um pouco.";
  if (/invalid api key/i.test(mensagem)) return "A configuração de autenticação está inválida.";
  return "Não foi possível autenticar agora.";
}
