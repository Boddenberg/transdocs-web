"use client";

import { ArrowRight, LockKeyhole, Mail, MailCheck, RefreshCw, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { useAutenticacao } from "@/contexts/autenticacao";

export default function Cadastro() {
  const { cadastrar, configurado, reenviarConfirmacao } = useAutenticacao();
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resultado = await cadastrar(nome, email, senha);
      if (resultado.confirmacaoEmailNecessaria) {
        setAguardandoConfirmacao(true);
        return;
      }
      setSucesso("Acesso criado. Preparando sua bancada…");
      setTimeout(() => router.replace("/app"), 900);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível criar o acesso.");
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro(null);
    setSucesso(null);
    setReenviando(true);
    try {
      await reenviarConfirmacao(email);
      setSucesso("Novo e-mail enviado. Confira também a caixa de spam.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível reenviar o e-mail.");
    } finally {
      setReenviando(false);
    }
  }

  if (aguardandoConfirmacao) {
    return (
      <>
        <header className="form-auth__cabecalho">
          <p className="rotulo">Só falta uma etapa</p>
          <h2>Confirme seu e-mail.</h2>
          <p>Isso protege seus documentos e garante que somente você acesse a bancada.</p>
        </header>
        <section className="confirmacao-email" aria-live="polite">
          <span className="confirmacao-email__icone"><MailCheck size={28} /></span>
          <p>Enviamos um link de confirmação para:</p>
          <strong>{email}</strong>
          <p>Abra o e-mail e clique em <b>Confirmar meu e-mail</b>. Depois, você será levado ao TransDocs.</p>
          {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
          {sucesso && <div className="aviso aviso--sucesso" role="status">{sucesso}</div>}
          <button
            className="botao botao--secundario botao--largo"
            type="button"
            onClick={reenviar}
            disabled={reenviando}
          >
            <RefreshCw size={17} />{reenviando ? "Reenviando…" : "Reenviar e-mail"}
          </button>
        </section>
        <p className="form-auth__rodape">Já confirmou? <Link href="/auth/login">Entrar</Link></p>
      </>
    );
  }

  return (
    <>
      <header className="form-auth__cabecalho">
        <p className="rotulo">Seu espaço privado</p>
        <h2>Comece com precisão.</h2>
        <p>Crie seu acesso para manter arquivos, leituras e revisões organizados.</p>
      </header>
      <form className="form-auth" onSubmit={enviar}>
        <label className="campo">
          <span>Como podemos chamar você?</span>
          <span className="campo__controle"><UserRound size={18} /><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" minLength={2} required /></span>
        </label>
        <label className="campo">
          <span>E-mail</span>
          <span className="campo__controle"><Mail size={18} /><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@cartorio.com.br" required /></span>
        </label>
        <label className="campo">
          <span>Senha</span>
          <span className="campo__controle"><LockKeyhole size={18} /><input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 8 caracteres" minLength={8} required /></span>
        </label>
        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
        {sucesso && <div className="aviso aviso--sucesso">{sucesso}</div>}
        <button className="botao botao--primario botao--largo" disabled={enviando || !configurado}>
          {enviando ? "Criando…" : "Criar meu acesso"}<ArrowRight size={18} />
        </button>
      </form>
      <p className="form-auth__rodape">Já possui acesso? <Link href="/auth/login">Entrar</Link></p>
    </>
  );
}
