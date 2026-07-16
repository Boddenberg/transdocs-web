# ThiagoDocs Web

Aplicação Next.js para envio, leitura assistida, preenchimento e conferência humana de documentos.
O front é independente da Padoka e se comunica somente com a API `transdocs` e com um
projeto Supabase Auth exclusivo.

## Tecnologias

- Next.js 16, React 19 e TypeScript estrito;
- Supabase JS para cadastro, login, recuperação e renovação de sessão;
- Lucide para iconografia consistente;
- CSS próprio, sem kit visual genérico;
- Railway/Railpack com build standalone.

## Experiência e design

A identidade combina verde mineral e âmbar com superfícies claras na área de trabalho,
reduzindo o cansaço em conferências longas. A navegação é horizontal e a tela principal
prioriza o documento, evitando a aparência de painel administrativo comum.

Fluxos implementados:

- login, cadastro, confirmação com reenvio, recuperação e redefinição de senha;
- bancada inicial com upload por clique ou arrastar/soltar;
- progresso e cancelamento do upload;
- histórico com pesquisa por arquivo ou qualquer dado extraído, filtros e exclusão permanente;
- preenchimento de minuta DOCX por tipo, com fontes opcionais organizadas por categoria;
- assistente em seis etapas: vendedores, compradores, imóvel, negociação, revisão e minuta;
- escolha automática do modelo padrão no fluxo comum, com uma decisão principal por tela;
- preço estruturado, múltiplos meios de pagamento e conferência da soma antes do envio;
- cadeia registral, proprietário provável, aquisição, valor venal e ônus separados por estado;
- confirmação humana obrigatória antes da geração do Word;
- mapa de lacunas com valor, fonte, trecho, confiança e seleção explícita antes da geração;
- retomada de casos salvos, reenvio de documentos faltantes e download parcial ou completo;
- ficha resumida de alta densidade com cópia individual, com títulos ou somente valores, além da conferência detalhada;
- acompanhamento moderado de processamento (3 s em primeiro plano, 12 s oculto);
- visualizador de PDF/imagem e navegação por páginas;
- dados extraídos ao lado do documento;
- visão resumida com cópia individual ou de todos os dados estruturados;
- visão detalhada com origem, confiança, edição e confirmação;
- confiança, trecho e página de origem;
- filtro de itens incertos, alertas e campos ausentes;
- copiar, editar e confirmar valor;
- marcar documento como revisado;
- perfil, segurança, retenção e logout;
- estados vazios, carregamento e falha.

## Estrutura

```text
app/
├── auth/                       # entrada e recuperação
└── app/                        # área protegida, histórico, análise e preenchimento
src/
├── components/aplicacao/       # shell e navegação
├── components/autenticacao/    # cena de entrada
├── components/documentos/      # upload, lista, visualizador e extração
├── contexts/                   # sessão Supabase
├── hooks/                      # consultas e acompanhamento
├── lib/                        # cliente de API, Supabase e formatadores
└── types/                      # contratos equivalentes ao back-end
```

Chamadas HTTP não ficam espalhadas pelos componentes. `src/lib/api.ts` centraliza token,
refresh em single-flight, erros amigáveis, deduplicação de GET e upload com progresso.

## Configuração

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`.

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL da API `transdocs`, sem barra final |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do Supabase exclusivo |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública do mesmo projeto |

Nenhuma chave OpenAI ou service role pode ter prefixo `NEXT_PUBLIC_` ou existir neste
repositório.

No Supabase Auth, configure o domínio publicado como Site URL e inclua estas URLs
permitidas:

```text
http://localhost:3000/auth/nova-senha
http://localhost:3000/**
https://SEU-DOMINIO/**
```

## Scripts

```powershell
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

## Comunicação com o back-end

O access token Supabase é enviado em `Authorization: Bearer`. Em um `401`, o cliente
tenta uma única renovação compartilhada antes de apresentar expiração. O front nunca
consulta diretamente as tabelas ou o bucket; o back-end verifica propriedade e devolve
URLs temporárias.

O acompanhamento de documentos pendentes usa `setTimeout` após cada resposta, evitando
requisições sobrepostas. Ele para em qualquer estado terminal e reduz frequência quando a
aba fica oculta.

O preenchimento segue a mesma estratégia de acompanhamento. Valores encontrados em texto
só são pré-selecionados quando a evidência literal passa na validação do servidor; leituras
visuais permanecem desmarcadas para conferência humana. A revisão oferece seleção em lote,
edição dos valores sugeridos e preenchimento manual de lacunas ainda sem fonte; ajustes são
enviados ao servidor somente quando o campo correspondente está selecionado.

O assistente salva localmente os textos ainda não enviados e permite retomar casos processados
pelo histórico da conta. Arquivos precisam ser selecionados novamente se a página for recarregada
antes do primeiro envio; depois do envio, o caso permanece salvo no servidor.

## Deploy no Railway

O Railpack instala as dependências com `npm ci`; o `railway.json` executa o build,
inicia o Next em `$PORT` e usa `/health` como health check.

1. Crie um projeto/serviço `transdocs-web`, separado de qualquer Padoka.
2. Conecte este repositório na branch `main`.
3. Configure as três variáveis públicas antes do build.
4. Gere o domínio.
5. Adicione esse domínio aos redirects do Supabase e ao `CORS_ORIGINS` da API.
6. Valide login, upload, atualização de status, visualização e correção.

A sessão Railway CLI desta implementação estava expirada; o serviço e o domínio são as
etapas externas manuais restantes.

## Limitações atuais

- O front acompanha status por polling moderado; uma evolução pode usar Realtime/webhook.
- A visualização PDF usa o leitor nativo do navegador.
- Não há colaboração por cartório/organização nesta versão.
- A interface não afirma validade jurídica e sempre exige conferência humana.
