# Meta Business MCP — flamme.

Conector próprio para o Claude publicar e agendar posts no **Facebook** e no **Instagram** dos clientes, usando as APIs oficiais da Meta.

Ferramentas que o Claude passa a ter:

| Ferramenta | O que faz |
|---|---|
| `listar_contas` | Mostra as Páginas e os Instagrams que você pode publicar |
| `agendar_post_instagram` | Imagem, carrossel, reels ou story, agora ou na data marcada |
| `agendar_post_facebook` | Texto/link, foto, várias fotos ou vídeo, agora ou agendado |
| `listar_agendados` | O que está na fila, por cliente |
| `cancelar_agendamento` | Tira um post da fila |

No Facebook o agendamento é nativo (fica na própria Página). No Instagram a API da Meta não aceita agendamento, então o servidor guarda o post e publica sozinho na hora marcada.

---

## Passo 1 — Criar o app na Meta

1. Entre em **developers.facebook.com** → **Meus apps** → **Criar app**.
2. Escolha o tipo **Empresa (Business)** e vincule ao portfólio empresarial da flamme.
3. Adicione os casos de uso/produtos de **Páginas** e **Instagram** (API do Instagram com login do Facebook).

## Passo 2 — Gerar o token (usuário do sistema)

O token de usuário do sistema não expira e não depende da sua conta pessoal.

1. Em **business.facebook.com** → **Configurações** → **Usuários** → **Usuários do sistema** → **Adicionar** (função: Admin).
2. Clique em **Atribuir ativos** e marque as **Páginas** dos clientes (com permissão de criar conteúdo) e o **app** do passo 1. As Páginas dos clientes precisam estar compartilhadas com o portfólio da flamme.
3. Clique em **Gerar token**, escolha o app, expiração **Nunca** e marque as permissões:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.
4. Copie o token. É ele que vai em `META_ACCESS_TOKEN`. Guarde em lugar seguro.

> Dependendo do caso, a Meta pode exigir verificação do negócio ou revisão do app para essas permissões. Se aparecer erro de permissão ao publicar, é por aí.

## Passo 3 — Colocar no ar (Railway)

1. Suba esta pasta para um repositório **privado** no GitHub.
2. Em **railway.app** → **New Project** → **Deploy from GitHub repo** → escolha o repositório.
3. Em **Variables**, adicione:
   - `MCP_SECRET` → um código longo e aleatório (ex.: rode `openssl rand -hex 24`)
   - `META_ACCESS_TOKEN` → o token do passo 2
   - `DATA_DIR` → `/data`
4. Em **Settings**, adicione um **Volume** montado em `/data` (sem isso, os agendamentos do Instagram somem quando o servidor reinicia).
5. Em **Networking**, clique em **Generate Domain**. Abra o endereço: deve aparecer "Meta Business MCP da flamme. está no ar."

## Passo 4 — Conectar no Claude

1. No Claude: **Configurações** → **Conectores** → remova o "Mate Bussines" antigo.
2. **Adicionar conector personalizado**:
   - Nome: `Meta Business`
   - URL: `https://SEU-DOMINIO.up.railway.app/mcp/SEU_MCP_SECRET`
3. Salve e ative o conector na conversa.

O `MCP_SECRET` no final da URL funciona como senha: quem tiver a URL completa consegue publicar nas contas. Não compartilhe.

---

## Como usar

Exemplos de pedidos:

- "Lista as contas do Meta Business."
- "Agenda no Instagram da Pizzaria WW um carrossel com essas 3 imagens para sexta às 18h, legenda: …"
- "Agenda esse reels na Reflexos para 05/11 às 12h e o mesmo vídeo no Facebook da Página."
- "O que está agendado para a MRC esta semana?"
- "Cancela o agendamento ig_3fa91c02b7."

## Limitações importantes

- **As mídias precisam de link público e direto** (a Meta baixa o arquivo pelo link). Links de visualização do Google Drive geralmente não funcionam. O servidor avisa quando o link parece não ser direto.
- Posts do Instagram agendados por aqui **não aparecem no Planejador do Business Suite**. Use `listar_agendados`.
- O servidor precisa ficar ligado para publicar os posts do Instagram na hora certa.
- Se o servidor reiniciar no meio de uma publicação, o post vai para "erro" em vez de tentar de novo (para evitar post duplicado). Confira no Instagram antes de reagendar.
- A Meta limita quantos posts por dia uma conta pode publicar via API.
- Vídeo no Facebook é publicado como vídeo da Página, não como Reels do Facebook.

---

## Skill: Editor de Carrossel

Em `.claude/skills/editor-carrossel/` há uma skill do Claude Code que cria carrosséis a partir de uma referência: extrai o estilo (paleta, fontes, grid), escreve o roteiro, busca imagens licenciadas (Unsplash, Pexels, Pixabay), monta os slides em HTML e renderiza em PNG 1080x1350. Se você pedir, ela agenda o post com `agendar_post_instagram`.

Como usar: abra o Claude Code nesta pasta e peça, por exemplo, *"cria um carrossel de 7 slides sobre clareamento dental para @clinica, no estilo desta referência"* (anexe a imagem). Para renderizar manualmente:

```bash
node .claude/skills/editor-carrossel/scripts/render.mjs carrosseis/<pasta>/carrossel.html
```

Requer Playwright (`npm i -D playwright && npx playwright install chromium`).
