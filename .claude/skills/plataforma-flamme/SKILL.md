---
name: plataforma-flamme
description: Desenvolve, mantém, publica e opera a plataforma da agência Flamme (social media completo por cliente) que fica em plataforma-flamme/ e roda no Cloudflare Workers + D1 + R2 numa conta própria, separada da Alldres. Use sempre que o usuário pedir para mudar, corrigir, adicionar recurso, publicar (deploy) ou configurar a plataforma da Flamme. Isso inclui clientes da agência, estratégia do mês, quadro de demandas, aprovação pelo link do cliente, Estúdio IA (legendas, roteiros, carrosséis, stories, hashtags, temas em alta, insights), cérebro da IA de cada cliente, painel do Instagram, organização estilo Notion, calendário, notificações e conexão do Instagram. Use também para operar a plataforma pela API: criar cliente, cadastrar estratégia, criar demandas, anexar artes (por exemplo depois da skill editor-carrossel), gerar conteúdo com a IA e mandar o link de aprovação. Vale ainda para as próximas fases: gerador de carrossel, Google Drive, fluxo com o CapCut, TikTok, LinkedIn, avaliações do Google e tráfego pago.
---

# Plataforma Flamme · social media completo por cliente

Código em `plataforma-flamme/`. Leia `plataforma-flamme/README.md` antes de mexer, porque ele tem a implantação passo a passo. A plataforma da Alldres (`plataforma/`, skill `plataforma-demandas`) é outro app: nunca misture código, banco ou conta do Cloudflare das duas.

## Regras do projeto

1. **Um app, vários clientes.**
   - Os clientes não são fixos no código: ficam na tabela `clientes`, e a página de cada um é `/c/:slug`.
   - Toda tabela de conteúdo tem `cliente_id`, e toda consulta filtra por ele.
   - Nunca misture dados de dois clientes.
2. **Identidade Flamme.** Os tokens ficam em `public/styles.css` (`:root`):
   - terracota `#922f11` (accent), branco quente `#fcfbf6` (bg), quase preto `#1e1310` (text);
   - títulos em Fraunces, texto em DM Sans;
   - logos em `public/marca/` (`flamme-logo-*`, `flamme-wordmark-*`, `flamme-simbolo-*`, ícones `flamme-192/512/apple`).

   Cada cliente tem `cor` própria. Ela só aparece em detalhes (faixa do cartão, avatar e o accent da página pública de aprovação). Componentes novos usam só variáveis CSS.
3. **Sem framework e sem build no front.**
   - `public/app.js` é JavaScript puro com o helper `h()`.
   - Nunca use `innerHTML` com dado do usuário.
   - `replaceChildren`/`append` foram ajustados para ignorar `null`.
   - O back é um Worker em `src/`. O wrangler empacota o `@anthropic-ai/sdk`.
4. **Banco auto-migrável:**
   - as tabelas ficam em `src/db.js` (`SCHEMA`);
   - coluna nova em tabela existente entra em `ALTERACOES`, com `ALTER TABLE … ADD COLUMN`, e cada uma roda num try/catch;
   - nunca apague colunas.
5. **Toda mudança de estado de uma demanda:**
   - registra no `historico` com `registrar()`. Ações do cliente pelo link usam `autor_externo`;
   - avisa a equipe com `notificar(env, { clienteId, demandaId, ... })` dentro de `ctx.waitUntil`.
6. Textos da interface em **português do Brasil**, curtos e diretos. Datas em `America/Sao_Paulo`. Use `hojeSP()` e `mesSP()`.
7. **IA:** fica em `src/ia.js`.
   - Modelo `claude-opus-5-5` com `fallbacks: 'default'` (beta `server-side-fallback-2026-07-01`), streaming e `.finalMessage()`.
   - O system tem duas partes: a base fixa e o cliente (cérebro + estratégia do mês), com `cache_control`.
   - "Temas" usa `web_search_20260209` e trata `pause_turn`.
   - Modos com JSON (`temas`, `estrategia`) pedem um bloco ```json, lido por `extrairJson`.
   - Para um modo novo, crie a entrada em `MODOS` e o texto em `instrucao()`.
   - Para um campo novo no cérebro, inclua em `CEREBRO` (`src/db.js`). A tela e o prompt usam essa lista sozinhos.
8. **Plano do Cloudflare:** recomendado o Workers Paid.
   - O cron de 5 min sincroniza **um** perfil por rodada (o mais antigo), para não estourar subrequests.
   - Os insights do painel são lidos sob demanda, com cache de 6 h (`instagram.painel`).

## Arquitetura

| Arquivo | Responsabilidade |
|---|---|
| `src/index.js` | Rotas da API, login/sessões, equipe, push, `resumo` da agência, clientes + estratégias, demandas, anexos, aprovações (links), rotas públicas `/api/publico/aprovacao/:token`, páginas (Notion), IA, Instagram, `publicarDemanda`, rotinas |
| `src/db.js` | `SCHEMA`, `ALTERACOES`, `STATUS`, `TIPOS`, `CEREBRO`, utilidades de data |
| `src/ia.js` | `gerar()`, `MODOS`, prompts por modo, `extrairJson` |
| `src/instagram.js` | OAuth, token de 60 dias, perfil/feed (+ `ig_diario`), `lerPainel` (insights da conta e dos posts), publicação em 2 etapas |
| `public/app.js` | Início da agência, página do cliente com 8 abas (visao, demandas, calendario, aprovacao, ia, painel, organizacao, cliente), página pública `/aprovar/:token`, `/organizacao` da agência, `/config` |

Status, em ordem: `briefing`, `producao`, `aprovacao`, `ajustes`, `aprovado`, `agendado`, `publicado`.

- `aprovado` só pode ser marcado por admin, aprovador ou pelo próprio cliente no link.
- `agendado` só entra por `/agendar` ou `/publicar-agora`.

Papéis:

- `admin`: tudo. É o padrão de quem é convidado.
- `aprovador`: aprova.
- `equipe`: cria e move demandas.

Cliente não tem login. Ele aprova pelo link, que expira e cujo token só é guardado como hash.

## Testar antes de entregar

```bash
cd plataforma-flamme && npm install
printf 'IG_APP_ID=x\nIG_APP_SECRET=x\nAPI_TOKEN=teste-local-123456789\n' > .dev.vars
npx wrangler dev --port 8788 --test-scheduled &
```

- Teste a API com `-H 'authorization: Bearer teste-local-123456789'`.
- **IA sem gastar:** suba um servidor SSE simulado e coloque `ANTHROPIC_API_KEY=x` e `ANTHROPIC_BASE_URL=http://localhost:9999` em `.dev.vars`. Confira o corpo enviado (modelo, tools, system).
- **Instagram simulado:** insira uma linha em `instagram`, com `perfil`, `midias` e `painel` em JSON e `sincronizado_em`/`painel_em` no futuro, mais algumas linhas em `ig_diario`. Use `npx wrangler d1 execute DB --local --file ...`.
- **Prints com Playwright** em 1360px e em `devices['iPhone 13']`:
  - passe por todas as abas, pela página `/aprovar/:token` e pelo editor de páginas, digitando com atalhos (`[] `, `## `);
  - confira que não há `pageerror` e que `scrollWidth` é igual à largura da tela.

## Publicar

- O Cloudflare Workers Builds da conta da Flamme publica sozinho a cada push, com root directory `plataforma-flamme`.
- Para publicar manualmente: `npx wrangler deploy`, com `CLOUDFLARE_API_TOKEN` da conta da Flamme (peça pela ferramenta de credenciais, nunca no chat).
- Segredos ficam no painel do Worker: `ANTHROPIC_API_KEY`, `IG_APP_SECRET`, `API_TOKEN`. A variável `IG_APP_ID` também.

## Operar pela API (Claude como social media)

Use `Authorization: Bearer <API_TOKEN>`. As ações aparecem como feitas por "Claude".

```
GET   /api/clientes                                lista (id, slug, nome, @)
POST  /api/clientes                                {nome, segmento, instagram, tiktok, linkedin, cor}
GET   /api/clientes/:id                            completo (cérebro, metas, estratégia atual, ig)
PATCH /api/clientes/:id                            campos, {cerebro:{campo:texto}}, {metas:{posts,reels,carrosseis,stories}}
PUT   /api/clientes/:id/estrategias/AAAA-MM        {foco, objetivos:[..], resumo:[..], texto}
POST  /api/clientes/:id/estrategias/AAAA-MM/anexo  corpo = PDF (content-type, x-nome)
POST  /api/clientes/:id/estrategias/AAAA-MM/resumir   IA preenche foco/objetivos/resumo
POST  /api/demandas                                {cliente_id, titulo, tipo, pilar, prazo, descricao, legenda, links}
PATCH /api/demandas/:id · POST /api/demandas/:id/anexos · /anexos/ordem · /status · /comentarios · /agendar · /publicar-agora
POST  /api/ia                                      {cliente_id, modo: legenda|roteiro|carrossel|post|stories|hashtags|temas|insights|livre, pedido, demanda_id?}
POST  /api/aprovacoes                              {cliente_id, demanda_ids:[..], titulo, mensagem, dias} → {url}
GET   /api/resumo                                  visão da agência
```

**Fluxo com a skill `editor-carrossel`:**

1. Monte o carrossel no formato visual do cliente. O formato está no campo `formato_carrossel` do cérebro.
2. Converta os slides para JPG.
3. Crie a demanda com `tipo:"carrossel"`.
4. Anexe os slides em ordem.
5. Gere a legenda com `POST /api/ia` (`modo:"legenda"`, `demanda_id`).
6. Mova para `aprovacao`.
7. Se o usuário pedir, gere o link de aprovação e entregue a URL.

Não aprove nem agende sozinho.

## Limites conhecidos

- Os limites do Instagram são os mesmos da Alldres:
  - imagem só em JPG;
  - até 10 itens no carrossel;
  - legenda com até 2.200 caracteres e 30 hashtags;
  - Story com 1 arquivo;
  - sem música, enquete e figurinhas pela API;
  - token de 60 dias, renovado na rotina diária.
- Perfil precisa ser profissional (Criador ou Empresa).
- **CapCut não tem API aberta.** O plano da fase 2 é este:
  1. a plataforma gera o "pacote de edição" (roteiro, cortes, textos na tela, .srt) a partir de `formato_video`;
  2. a pessoa edita no CapCut;
  3. o vídeo é exportado para a pasta "Prontos" do Drive;
  4. a plataforma puxa o vídeo e manda para aprovação e agendamento.

  Para edição automática, use um serviço de modelos (Creatomate ou Shotstack).
- **TikTok:** publicar exige que o TikTok audite o app. Antes disso, os posts saem privados.
- **LinkedIn:** o perfil pessoal publica com `w_member_social`, mas a API não dá os números do perfil pessoal.
- **Google:** a nota e as avaliações recentes vêm da Places API. A lista completa precisa do acesso ao Business Profile.
