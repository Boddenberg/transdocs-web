"use client";

import { Check, Database, KeyRound, LockKeyhole, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { useAutenticacao } from "@/contexts/autenticacao";

export default function Configuracoes() {
  const { usuario, atualizarPerfil, sair } = useAutenticacao();
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const tarefa = window.setTimeout(
      () => setNome(String(usuario?.user_metadata?.nome || "")),
      0
    );
    return () => window.clearTimeout(tarefa);
  }, [usuario]);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await atualizarPerfil(nome);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1600);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  }

  return (
    <main className="pagina-app pagina-configuracoes">
      <header className="cabecalho-pagina"><div><p className="rotulo">Preferências e privacidade</p><h1>Configurações</h1><p>Gerencie sua identificação e entenda como seus documentos são protegidos.</p></div></header>
      <div className="grade-configuracoes">
        <section className="cartao-config cartao-config--perfil">
          <header><span><UserRound size={19} /></span><div><h2>Seu perfil</h2><p>Informações usadas apenas para personalizar sua experiência.</p></div></header>
          <form onSubmit={salvar}>
            <label className="campo"><span>Nome</span><span className="campo__controle"><UserRound size={17} /><input value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} required /></span></label>
            <label className="campo"><span>E-mail de acesso</span><span className="campo__controle campo__controle--bloqueado"><KeyRound size={17} /><input value={usuario?.email || ""} readOnly /></span></label>
            {erro && <div className="aviso aviso--erro">{erro}</div>}
            <button className="botao botao--primario" disabled={salvando}>{salvo ? <Check size={16} /> : <Save size={16} />}{salvando ? "Salvando…" : salvo ? "Salvo" : "Salvar perfil"}</button>
          </form>
        </section>
        <section className="cartao-config">
          <header><span><ShieldCheck size={19} /></span><div><h2>Proteção documental</h2><p>Controles ativos desde o primeiro arquivo.</p></div></header>
          <ul className="lista-protecao"><li><LockKeyhole size={16} /><div><strong>Armazenamento privado</strong><p>Arquivos sem endereço público; visualização por link temporário.</p></div></li><li><Database size={16} /><div><strong>Dados isolados por usuário</strong><p>Políticas de banco impedem o acesso entre contas.</p></div></li><li><ShieldCheck size={16} /><div><strong>Decisão humana</strong><p>Nenhuma extração é tratada como validação jurídica automática.</p></div></li></ul>
        </section>
        <section className="cartao-config cartao-config--retencao">
          <header><span><Database size={19} /></span><div><h2>Retenção e exclusão</h2><p>Na primeira versão, os documentos permanecem até você excluí-los. A exclusão remove arquivo, extração, correções e histórico técnico associado.</p></div></header>
        </section>
        <section className="cartao-config cartao-config--sessao">
          <div><LogOut size={18} /><span><strong>Encerrar sessão</strong><small>Saia deste navegador com segurança.</small></span></div><button className="botao botao--secundario" onClick={sair}>Sair do ThiagoDocs</button>
        </section>
      </div>
    </main>
  );
}
