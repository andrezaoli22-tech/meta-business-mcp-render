# Plataforma Flamme · social media completo por cliente

App próprio da agência Flamme. É separado da plataforma da Alldres: tem Worker, banco D1, arquivos R2 e login próprios, numa conta própria do Cloudflare.

## O que já tem (fase 1)

- **Início da agência:** todos os clientes com o foco do mês, o que está em aberto, as aprovações e os seguidores. Mostra também o que está atrasado, vence hoje ou publica hoje.
- **Página de cada cliente** (`/c/nome-do-cliente`), com estas abas:
  - **Visão geral:** a estratégia do mês resumida no topo, os números principais, o que aguarda aprovação, os próximos 7 dias, a produção do mês contra as metas e as redes do cliente.
  - **Demandas:** quadro e lista com status, responsável, pilar, arquivos, legenda, prévia do post e comentários. A IA fica dentro de cada demanda: roteiro, copy, legenda e hashtags.
  - **Calendário:** prazos, agendados e publicados.
  - **Aprovação:** gera um link para o cliente aprovar sem login. Ele vê as artes e a legenda e aprova ou pede ajuste em cada post. A equipe recebe o aviso na hora.
  - **Estúdio IA:**
    - temas em alta (pesquisa na web);
    - roteiro de Reels, carrossel, legenda, post, stories e hashtags;
    - insights dos números e pedido livre.

    Tudo fica no histórico e vira demanda com um clique.
  - **Painel:** números do Instagram em 30 dias:
    - seguidores, alcance, visualizações, interações e cliques no link;
    - gráficos de seguidores e de alcance;
    - alcance médio por formato;
    - tabela dos posts e feed com os planejados.
  - **Organização:** páginas estilo Notion (títulos, listas, tarefas, destaques, subpáginas e modelos prontos). A agência também tem a sua, em `/organizacao`.
  - **Cliente:** dados, logo, cor, @ das redes, conexão do Instagram, metas do mês e o **cérebro da IA**: 18 campos de estilo (copy, legenda, Reels, carrossel, formato visual, edição de vídeo, hashtags, fontes, referências, exemplos…).
- **Publicação no Instagram:** post, carrossel, Reels e Stories. Pode publicar na hora ou ser agendado para sair sozinho.
- **Notificações no celular** (Web Push) e app instalável com o ícone da Flamme.

## Próximas fases

- **Fase 2:**
  - gerador de carrossel (notícia → copy → design no formato do cliente → JPGs para aprovação);
  - conexão com o Google Drive (pasta por cliente);
  - fluxo de vídeo com o CapCut: pacote de edição → CapCut → pasta "Prontos" → aprovação → agendamento.
- **Fase 3:**
  - TikTok e LinkedIn;
  - avaliações do Google, com sugestão de campanha todo mês;
  - painel de tráfego pago (Meta Ads).

## Passo 1 · Criar tudo na conta nova do Cloudflare

Recomendado: o plano **Workers Paid** (US$ 5/mês). A IA e os painéis fazem chamadas longas e muitas consultas, e o plano gratuito pode cortar no meio.

1. **Banco:** menu **Storage & Databases → D1 → Create**.
   - Dê o nome `plataforma-flamme`.
   - Copie o **Database ID** e cole em `wrangler.toml`, no lugar de `COLE-AQUI-O-ID-DO-BANCO-D1`.
2. **Arquivos:** menu **R2 Object Storage**.
   - Ative o R2.
   - Clique em **Create bucket** e dê o nome `plataforma-flamme-midia`.
3. **Publicar:** menu **Workers & Pages → Create → Import a repository** e escolha este repositório.
   - Root directory: `plataforma-flamme`.
   - Deploy command: `npx wrangler deploy`.
   - A cada alteração enviada ao GitHub, a plataforma se atualiza sozinha.
4. Abra o endereço que o Cloudflare mostrar, algo como `https://plataforma-flamme.SEU-USUARIO.workers.dev`. No **primeiro acesso** você cria a sua conta de administradora.

## Passo 2 · Ligar a IA

1. Em **console.anthropic.com → API Keys**, crie uma chave.
2. No Worker, vá em **Settings → Variables and Secrets → Add** e crie:
   - nome: `ANTHROPIC_API_KEY`;
   - tipo: **Secret**;
   - valor: a chave que você criou.

A IA usa o Claude Opus 5.5 e só cobra quando alguém clica em gerar. O que mais custa é "Temas em alta", porque pesquisa na web.

## Passo 3 · Conectar o Instagram

A conta precisa ser **profissional**. No app: **Configurações → Tipo de conta e ferramentas → Mudar para conta profissional** (Criador ou Empresa).

1. Em **developers.facebook.com → Meus apps → Criar app**:
   - caso de uso: **Gerenciar mensagens e conteúdo no Instagram**;
   - tipo: **Empresa**.
2. Abra **Instagram → Configuração da API com login do Instagram** e copie o **ID do app do Instagram** e a **Chave secreta**.
3. Em **URLs de redirecionamento OAuth**, coloque `https://SEU-ENDERECO/api/instagram/retorno`.
4. Em **Funções do app → Testadores do Instagram**, adicione o @ de cada cliente.
   - Aceite o convite em instagram.com → Configurações → **Apps e sites → Convites de testador**.
5. No Worker, crie:
   - `IG_APP_ID`, tipo **Text**;
   - `IG_APP_SECRET`, tipo **Secret**.
6. Na plataforma, abra o cliente, vá na aba **Cliente** e toque em **Entrar com Instagram**.
   - Alternativa sem login: gere o token no painel da Meta e cole na mesma tela.

O acesso dura 60 dias e a plataforma renova sozinha.

## Passo 4 · Opcional

- **`API_TOKEN` (Secret):** um código longo e aleatório para o Claude operar a plataforma pela API (skill `plataforma-flamme`).
- **Domínio próprio**, como `app.flamme.com.br`: configure no Worker, em **Settings → Domains & Routes**.

## Limites do Instagram

- Imagem só em JPG. A plataforma converte sozinha ao anexar.
- Carrossel com até 10 itens.
- Legenda com até 2.200 caracteres e 30 hashtags.
- Story com 1 arquivo.
- Música da biblioteca, enquete e figurinhas não passam pela API. Agende com **Publicar sozinho** desmarcado e você recebe um lembrete na hora.
- Até 95 MB por arquivo enviado.

## Desenvolvimento local

```bash
cd plataforma-flamme
npm install
printf 'IG_APP_ID=x\nIG_APP_SECRET=x\nAPI_TOKEN=teste-local-123456789\n' > .dev.vars
npx wrangler dev --test-scheduled            # http://localhost:8787
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"
```

Para testar a IA sem gastar, aponte `ANTHROPIC_BASE_URL` (em `.dev.vars`) para um servidor simulado. Em produção essa variável não existe.

```
plataforma-flamme/
  wrangler.toml       Cloudflare (banco, arquivos, agendador)
  src/index.js        rotas, login, clientes, estratégia, demandas, aprovação, páginas, IA, Instagram, rotinas
  src/db.js           tabelas (criadas sozinhas), status, tipos e campos do cérebro da IA
  src/ia.js           IA (Claude): instruções por modo, cérebro do cliente + estratégia
  src/instagram.js    login do Instagram, perfil/feed, painel (insights) e publicação
  src/push.js         notificações push
  src/notificar.js    avisa a equipe (no app e no celular)
  public/             telas (index.html, app.js, styles.css), service worker, ícones da Flamme
```
