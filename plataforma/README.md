# Plataforma de demandas · RP e Citrino Luz

Sistema próprio da equipe para as duas empresas da mesma dona. Cada marca tem a sua página, com o visual dela:

- **/rp**: preto e creme, formas arredondadas como a logo.
- **/citrino**: branco, dourado e traço fino preto.

O que a plataforma faz:

| Recurso | Como funciona |
|---|---|
| Quadro de demandas | Briefing → Em produção → Em aprovação → Ajustes → Aprovado → Agendado → Publicado. Arraste os cartões ou use os botões. |
| Notificações no celular | Avisa a equipe quando uma demanda é criada, muda de status, recebe comentário, é agendada ou publicada. Cada pessoa ativa no próprio aparelho, com permissão. |
| Arquivos e links | Fotos, carrosséis (a ordem dos arquivos é a ordem dos slides), vídeos, PDFs e links do Drive, Canva, YouTube, Instagram, Figma etc. |
| Aprovação | Quem é **Aprovador** ou **Administrador** aprova ou pede ajuste com comentário. |
| Agendar no Instagram | Depois de aprovada, a demanda pode ser agendada e sai sozinha na hora marcada (até 5 min depois), ou ser publicada na hora. Também existe a opção de só receber um lembrete. |
| Perfil ao vivo | Uma réplica do perfil do Instagram (foto, bio, números e grade), atualizada sozinha a cada 10 min. |
| Prévia do feed | Os posts em aprovação, aprovados e agendados aparecem na grade real antes de serem publicados. |
| Calendário | Visão do mês com prazos, agendamentos e publicações. |
| Métricas rápidas | Seguidores, curtidas por post, engajamento e dias desde o último post. |
| Lembretes de prazo | Todo dia às 9h, aviso de demandas atrasadas, que vencem hoje ou amanhã. |
| Equipe | Login individual. O administrador convida, define papéis e redefine senhas. |

Custo: **R$ 0** no plano gratuito do Cloudflare (Workers, D1 e R2 até 10 GB de arquivos).

---

## Passo 1 · Criar a conta e os recursos no Cloudflare

1. Crie uma conta grátis em **dash.cloudflare.com**.
2. **Banco de dados:** menu **Storage & Databases → D1 SQL Database → Create**.
   - Nome: `plataforma-alldres`.
   - Copie o **Database ID** e cole no `wrangler.toml`, no lugar de `00000000-0000-0000-0000-000000000000`.
   - As tabelas são criadas sozinhas no primeiro acesso.
3. **Arquivos:** menu **R2 Object Storage**.
   - Ative o R2. O Cloudflare pede um cartão, mas não cobra até 10 GB.
   - **Create bucket** com o nome `plataforma-alldres-midia`.

## Passo 2 · Publicar o sistema

1. Menu **Workers & Pages → Create → Import a repository** e conecte este repositório do GitHub.
2. Em **Root directory**, coloque `plataforma`.
3. Deploy command: `npx wrangler deploy`. Deixe o build command vazio.
4. Salve. O Cloudflare publica e mostra o endereço, algo como `https://plataforma-alldres.SEU-USUARIO.workers.dev`.
5. A cada alteração enviada ao GitHub, a plataforma se atualiza sozinha.

Abra o endereço. No **primeiro acesso**, você cria o administrador (seu nome, e-mail e senha). Depois convide a equipe em **⚙︎ Equipe e configurações**.

> Se preferir um domínio próprio, como `demandas.suaempresa.com.br`, adicione em **Settings → Domains & Routes** do Worker.

## Passo 3 · Conectar o Instagram (login do Instagram, sem Página do Facebook)

Antes de tudo, as duas contas precisam ser **conta profissional**. No app do Instagram de cada marca: **Configurações → Tipo de conta e ferramentas → Mudar para conta profissional → Empresa**.

### 3.1 Criar o app na Meta (uma vez só)

1. Entre em **developers.facebook.com → Meus apps → Criar app**.
2. Caso de uso: **Gerenciar mensagens e conteúdo no Instagram**. Tipo: **Empresa**.
3. No menu do app: **Instagram → Configuração da API com login do Instagram**.
4. Copie o **ID do app do Instagram** e a **Chave secreta do app do Instagram**. Não use o ID do app do Facebook, que fica no topo da página.
5. Na seção **Configurar login comercial do Instagram**, em **URLs de redirecionamento OAuth**, coloque:
   `https://SEU-ENDERECO/api/instagram/retorno`
6. Em **Funções do app → Funções → Testadores do Instagram**, adicione o @ da RP e o da Citrino Luz.
7. Aceite o convite em cada conta. No navegador: instagram.com → Configurações → **Apps e sites → Convites de testador**.

   Enquanto o app estiver em "modo de desenvolvimento", só as contas adicionadas aqui conseguem conectar. Isso é exatamente o que vocês precisam, e por isso não é necessária a revisão do app pela Meta.

### 3.2 Colocar as chaves no Cloudflare

No Worker, vá em **Settings → Variables and Secrets → Add**:

| Nome | Tipo | Valor |
|---|---|---|
| `IG_APP_ID` | Text | ID do app do Instagram |
| `IG_APP_SECRET` | Secret | Chave secreta do app do Instagram |
| `API_TOKEN` | Secret | Opcional: um código longo e aleatório para o Claude criar demandas pela API |

### 3.3 Conectar cada marca

Na plataforma, abra a marca → aba **Perfil** → **Entrar com Instagram** e faça login com a conta da marca. Repita na outra marca.

**Alternativa sem login:** no mesmo painel da Meta (3.1, item 3), em **Gerar tokens de acesso**, clique em **Gerar token** ao lado da conta. Depois cole o token em **Perfil → Ou conectar colando um token**.

O acesso dura 60 dias e a plataforma renova sozinha todo dia. Se algo der errado, os administradores recebem o aviso "Reconecte o Instagram".

## Passo 4 · Notificações no celular

- **Android e computador:** abra a plataforma e toque em **Ativar** no aviso do topo (ou em ⚙︎ → Notificações). Depois aceite a permissão do navegador.
- **iPhone (iOS 16.4 ou mais novo):**
  1. Abra no Safari.
  2. Toque em **Compartilhar → Adicionar à Tela de Início**.
  3. Abra pelo ícone e ative as notificações.

  A Apple só permite notificações de sites instalados na Tela de Início.
- Dá para instalar a RP e a Citrino Luz como dois ícones separados: adicione à Tela de Início estando em cada página.
- Em ⚙︎ cada pessoa escolhe de quais marcas quer receber avisos.

## Limites do Instagram (da própria Meta)

- **Imagens:** só JPG. A plataforma converte PNG e HEIC sozinha ao anexar.
- **Carrossel:** até 10 arquivos.
- **Legenda:** até 2.200 caracteres e 30 hashtags.
- **Recursos que a API não oferece:** música da biblioteca, enquetes, figurinhas e marcação de produtos. Para esses posts, agende com a opção **Publicar sozinho** desmarcada. Na hora, a equipe recebe um lembrete e publica pelo app.
- **Arquivos grandes:** até 95 MB por arquivo enviado. Para vídeos maiores, comprima ou deixe o link.

## Desenvolvimento local

```bash
cd plataforma
npm install
printf 'IG_APP_ID=x\nIG_APP_SECRET=x\nAPI_TOKEN=teste-local-123456789\n' > .dev.vars
npx wrangler dev --test-scheduled     # http://localhost:8787
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"   # roda a rotina de 5 min
```

Estrutura:

```
plataforma/
  wrangler.toml          configuração do Cloudflare (banco, arquivos, agendador)
  src/index.js           rotas, login, demandas, anexos, agendamento, rotinas
  src/db.js              tabelas (criadas sozinhas), status e tipos
  src/instagram.js       login do Instagram, perfil/feed e publicação
  src/push.js            notificações push (Web Push com criptografia própria)
  src/notificar.js       avisa a equipe (dentro do app e no celular)
  public/                telas (index.html, app.js, styles.css), service worker, ícones
```
