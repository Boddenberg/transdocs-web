"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { useAutenticacao } from "@/contexts/autenticacao";

export default function RecuperarSenha() {
  const { recuperar, configurado } = useAutenticacao();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      await recuperar(email);
      setMensagem("Se o e-mail estiver cadastrado, as instruções chegarão em instantes.");
    } catch (falha) {
      setMensagem(falha instanceof Error ? falha.message : "Não foi possível enviar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="form-auth__cabecalho">
        <p className="rotulo">Recuperação segura</p>
        <h2>Vamos recuperar seu acesso.</h2>
        <p>Informe seu e-mail e enviaremos um link de redefinição.</p>
      </header>
      <form className="form-auth" onSubmit={enviar}>
        <label className="campo">
          <span>E-mail</span>
          <span className="campo__controle"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@cartorio.com.br" required /></span>
        </label>
        {mensagem && <div className="aviso aviso--sucesso" role="status">{mensagem}</div>}
        <button className="botao botao--primario botao--largo" disabled={enviando || !configurado}>{enviando ? "Enviando…" : "Enviar instruções"}</button>
      </form>
      <p className="form-auth__rodape"><Link href="/auth/login"><ArrowLeft size={15} /> Voltar para o login</Link></p>
    </>
  );
}

