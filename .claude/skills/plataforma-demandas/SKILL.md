---
name: plataforma-demandas
description: Desenvolve, mantém, publica e opera a plataforma de demandas da Alldres (app com a identidade da Alldres e três empresas com páginas e visuais próprios: Alldres, RP e Citrino Luz), que fica em plataforma/ e roda no Cloudflare Workers + D1 + R2. Use sempre que o usuário pedir para mudar, corrigir, adicionar recurso, publicar (deploy) ou configurar essa plataforma; mexer no quadro de demandas, status, notificações push no celular, aprovação, agendamento/publicação no Instagram, prévia do feed, perfil ao vivo, calendário, equipe ou login; conectar o Instagram da RP ou da Citrino Luz; ou criar, atualizar, anexar arquivos e mandar para aprovação demandas pela API (por exemplo depois de montar um carrossel com a skill editor-carrossel). Também use quando pedirem um sistema parecido para outra empresa.
---

# Plataforma Alldres · demandas da Alldres, RP e Citrino Luz

Código em `plataforma/`. Leia `plataforma/README.md` antes de mexer: ele traz o passo a passo de implantação e de conexão com o Instagram.

## Regras do projeto

1. **O app é da Alldres; uma página por empresa.** Login, início, configurações, ícone e manifesto usam a identidade Alldres (tema padrão `:root` / `data-marca="alldres"`). `/alldres`, `/rp` e `/citrino` são a mesma aplicação com tema diferente; nas páginas da RP e da Citrino Luz a pílula da Alldres no topo leva de volta ao início. O tema vem de `html[data-marca]`, definido no servidor por HTMLRewriter (`src/index.js → paginas`) e no front pela rota. Nunca misture dados das duas marcas: toda demanda tem `empresa` e toda consulta filtra por ela.
2. **Identidade visual:** os tokens ficam em `public/styles.css`.
   - **Alldres (padrão do app):** fundo `#0c0b0b`, vermelho `#e8320f` → `#c01b06`, texto `#f7f2ef`, títulos em Outfit, fundo degradê granulado `public/marca/alldres-fundo.jpg`. Logos: `alldres-pilula.png` (oficial, pílula branca), `alldres-logo-branco.png`, `alldres-logo-vermelho.png`. Ícones `alldres-192/512/apple.png`.
   - **RP:** fundo `#0e0e0e`, creme `#fefaf0`, títulos em Fredoka, cantos bem arredondados (22px). Logo creme em `public/marca/rp-logo.png`.
   - **Citrino Luz:** fundo branco, dourado `#c8b28d`, traço fino preto `#1d1d1b`, títulos em Poiret One maiúsculos com espaçamento largo, texto em Jost, cantos retos (2–4px). Logo em `public/marca/citrino-logo.png`, estrela em `citrino-estrela.png`.
   - Novos componentes usam só as variáveis (`--bg`, `--surface`, `--accent`…). Nada de cor fixa.
3. **Plano gratuito do Cloudflare:**
   - Limite de CPU curto por requisição: nada de laços pesados, PBKDF2 fica em 20 mil iterações.
   - Até 100 mil requisições por dia.
   - R2 com 10 GB e corpo de upload de até 100 MB (a plataforma limita a 95 MB).
   - Cron: `*/5 * * * *` (publicação, lembretes, feed) e `0 12 * * *` (9h de Brasília: prazos, renovação de token, limpeza).
4. **Sem framework e sem build.** O front é JavaScript puro em `public/app.js`, com o helper `h()` para criar elementos. Use sempre `textContent` ou `h()`, nunca `innerHTML` com dado do usuário. O back é um Worker em `src/`.
5. **Banco auto-migrável:** as tabelas ficam em `src/db.js` (`SCHEMA`, com `CREATE TABLE IF NOT EXISTS`).
   - Para coluna nova em tabela que já existe em produção, acrescente um `ALTER TABLE … ADD COLUMN` protegido. Rode num try/catch separado, porque o SQLite não tem `ADD COLUMN IF NOT EXISTS`.
   - Nunca apague colunas.
6. **Toda mudança de estado de uma demanda:**
   - registra no `historico` (`registrar()`);
   - avisa a equipe com `notificar()` dentro de `ctx.waitUntil`, sem avisar o autor.
7. Textos da interface em **português do Brasil**, curtos e diretos. Datas em `America/Sao_Paulo`.

## Arquitetura (onde mexer)

| Arquivo | Responsabilidade |
|---|---|
| `src/index.js` | Roteador da API, login/sessões (cookie `sessao`, 30 dias), equipe, push, notificações, demandas, anexos, Instagram, `publicarDemanda`, `rotinaFrequente`, `rotinaDiaria` |
| `src/db.js` | Schema, `EMPRESAS`, `STATUS`, `TIPOS`, `getConfig`/`setConfig` |
| `src/instagram.js` | OAuth do Instagram (API com login do Instagram, escopos `instagram_business_*`), troca/renovação do token de 60 dias, leitura de perfil e feed, publicação em 2 etapas (container → `media_publish`) |
| `src/push.js` | Web Push RFC 8291/8292 com WebCrypto. As chaves VAPID são geradas sozinhas e guardadas na tabela `config` |
| `src/notificar.js` | Grava a notificação no app e manda push aos aparelhos (filtrando por marca) |
| `public/app.js` | Telas: login/primeiro acesso, início (escolha de marca), quadro/lista, painel da demanda, calendário, perfil do Instagram com prévia, equipe/configurações |
| `public/sw.js` | Service worker: exibe o push e abre a demanda ao tocar |
| `public/manifest-*.webmanifest` | Um app instalável por marca (ícones em `public/marca/`) |

Status, em ordem: `briefing`, `producao`, `aprovacao`, `ajustes`, `aprovado`, `agendado`, `publicado`.

- `aprovado` só pode ser marcado por admin ou aprovador.
- `agendado` só entra pelo endpoint `/agendar` ou `/publicar-agora`.

Papéis:

- `admin`: tudo, inclusive convidar a equipe e conectar o Instagram.
- `aprovador`: aprova.
- `equipe`: cria e move demandas.

## Testar antes de entregar

```bash
cd plataforma && npm install
printf 'IG_APP_ID=x\nIG_APP_SECRET=x\nAPI_TOKEN=teste-local-123456789\n' > .dev.vars
npx wrangler dev --port 8787 --test-scheduled &
curl -s localhost:8787/api/estado
```

- Teste o fluxo pela API com `-H 'authorization: Bearer teste-local-123456789'`.
- Rode as rotinas com `curl "localhost:8787/__scheduled?cron=*/5+*+*+*+*"`.
- Tire prints com Playwright em 1360px e em `devices['iPhone 13']`. Confira que `document.documentElement.scrollWidth` é igual à largura da tela e que não há `pageerror`.
- Para simular um Instagram conectado, insira uma linha em `instagram` com `npx wrangler d1 execute DB --local --command "…"`, com `perfil`/`midias` em JSON e `sincronizado_em` no futuro.
- Se mexer na criptografia do push, valide decifrando com a biblioteca `http_ece` numa pasta temporária.

## Publicar (deploy)

- O Cloudflare Workers Builds publica sozinho a cada push na branch configurada, com root directory `plataforma`.
- Para publicar manualmente: `npx wrangler deploy`, com `CLOUDFLARE_API_TOKEN` (peça a credencial do host `api.cloudflare.com` com a ferramenta de credenciais, nunca no chat).
- Segredos ficam no painel do Worker: `IG_APP_SECRET`, `API_TOKEN`. A variável `IG_APP_ID` também.

## Operar pela API (criar demandas pelo Claude)

Com o segredo `API_TOKEN` configurado, mande `Authorization: Bearer <API_TOKEN>`. As ações aparecem como feitas por "Claude" e a equipe é notificada.

```
POST /api/demandas                      {empresa:"alldres"|"rp"|"citrino", titulo, tipo, prazo:"AAAA-MM-DD", descricao, legenda, links:[{url,titulo}], responsavel_id}
PATCH /api/demandas/:id                 qualquer campo acima
POST /api/demandas/:id/anexos           corpo = arquivo; headers content-type (image/jpeg, video/mp4…) e x-nome (encodeURIComponent)
POST /api/demandas/:id/anexos/ordem     {ids:[...]}   ordem do carrossel
POST /api/demandas/:id/status           {status, comentario?}
POST /api/demandas/:id/comentarios      {texto}
POST /api/demandas/:id/agendar          {agendado_para: ISO, publicar_auto: true|false}
POST /api/demandas/:id/publicar-agora
GET  /api/demandas?empresa=alldres      lista (alldres, rp ou citrino)
GET  /api/demandas/:id                  detalhe com anexos, comentários e histórico
GET  /api/usuarios                      para achar responsavel_id
```

**Fluxo com a skill `editor-carrossel`:**

1. Monte o carrossel.
2. Converta os PNG para **JPG** (o Instagram só aceita JPG):
   `python3 -c "from PIL import Image; Image.open('s1.png').convert('RGB').save('s1.jpg', quality=92)"`
3. Crie a demanda com `tipo:"carrossel"` e a legenda.
4. Anexe os slides em ordem.
5. Mova para `aprovacao`.
6. **Não aprove nem agende sozinho**: a aprovação é da equipe ou da cliente, a não ser que o usuário peça explicitamente.

## Limites do Instagram

- Imagem só JPG (até 8 MB).
- Carrossel com no máximo 10 itens.
- Legenda até 2.200 caracteres e 30 hashtags.
- Story com 1 arquivo.
- Reels precisa de vídeo.
- A API não oferece música da biblioteca, enquete nem figurinhas. Para esses casos, agende com `publicar_auto:false`, que manda um lembrete na hora.
- O token dura 60 dias e é renovado pela rotina diária.
- O feed não tem webhook de post novo, por isso a sincronização roda a cada 10 min.
- Os links `media_url` do Instagram expiram. Nunca guarde esses links como definitivos: a sincronização os renova.

## Ideias já mapeadas para próximas versões

- Métricas por post (alcance e salvamentos via `/insights`).
- Modelos de demanda recorrente, como o RP News semanal.
- Link de aprovação para quem não tem login.
- Arrastar para reordenar a grade planejada.
- Exportar o relatório do mês em PDF.
