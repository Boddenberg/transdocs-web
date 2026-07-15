"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { useAutenticacao } from "@/contexts/autenticacao";

export default function Login() {
  const { entrar, usuario, carregando, configurado } = useAutenticacao();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && usuario) router.replace("/app");
  }, [carregando, router, usuario]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
      router.replace("/app");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="form-auth__cabecalho">
        <p className="rotulo">Acesso seguro</p>
        <h2>Retome sua bancada.</h2>
        <p>Entre para continuar a conferência dos seus documentos.</p>
      </header>
      {!configurado && (
        <div className="aviso aviso--atencao" role="alert">
          O Supabase ainda não foi configurado neste ambiente.
        </div>
      )}
      <form className="form-auth" onSubmit={enviar}>
        <label className="campo">
          <span>E-mail</span>
          <span className="campo__controle">
            <Mail size={18} />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@cartorio.com.br"
              required
            />
          </span>
        </label>
        <div className="campo">
          <label htmlFor="senha-login">Senha</label>
          <span className="campo__controle">
            <LockKeyhole size={18} />
            <input
              id="senha-login"
              type={mostrar ? "text" : "password"}
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Sua senha"
              minLength={8}
              required
            />
            <button
              className="campo__acao"
              type="button"
              onClick={() => setMostrar((valor) => !valor)}
              aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </div>
        <div className="form-auth__apoio">
          <span />
          <Link href="/auth/recuperar">Esqueci minha senha</Link>
        </div>
        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
        <button className="botao botao--primario botao--largo" disabled={enviando || !configurado}>
          {enviando ? "Entrando…" : "Entrar"}
          {!enviando && <ArrowRight size={18} />}
        </button>
      </form>
      <p className="form-auth__rodape">
        Primeira vez por aqui? <Link href="/auth/cadastro">Criar acesso</Link>
      </p>
    </>
  );
}
