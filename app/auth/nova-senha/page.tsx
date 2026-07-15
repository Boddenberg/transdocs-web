"use client";

import { CheckCircle2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { useAutenticacao } from "@/contexts/autenticacao";

export default function NovaSenha() {
  const { atualizarSenha } = useAutenticacao();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (senha !== confirmacao) return setMensagem("As senhas precisam ser iguais.");
    setEnviando(true);
    try {
      await atualizarSenha(senha);
      setConcluido(true);
      setMensagem("Senha atualizada com segurança.");
    } catch (falha) {
      setMensagem(falha instanceof Error ? falha.message : "Não foi possível atualizar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="form-auth__cabecalho">
        <p className="rotulo">Nova credencial</p>
        <h2>Defina sua nova senha.</h2>
        <p>Use pelo menos 8 caracteres e guarde-a em um local seguro.</p>
      </header>
      <form className="form-auth" onSubmit={enviar}>
        {(["Nova senha", "Repita a senha"] as const).map((rotulo, indice) => (
          <label className="campo" key={rotulo}>
            <span>{rotulo}</span>
            <span className="campo__controle"><LockKeyhole size={18} /><input type="password" autoComplete="new-password" value={indice ? confirmacao : senha} onChange={(e) => indice ? setConfirmacao(e.target.value) : setSenha(e.target.value)} minLength={8} required /></span>
          </label>
        ))}
        {mensagem && <div className={`aviso ${concluido ? "aviso--sucesso" : "aviso--erro"}`}><CheckCircle2 size={16} />{mensagem}</div>}
        {concluido ? <Link className="botao botao--primario botao--largo" href="/app">Ir para a bancada</Link> : <button className="botao botao--primario botao--largo" disabled={enviando}>{enviando ? "Salvando…" : "Atualizar senha"}</button>}
      </form>
    </>
  );
}

