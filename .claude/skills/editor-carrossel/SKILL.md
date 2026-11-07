---
name: editor-carrossel
description: Editor e designer de carrosséis para Instagram/LinkedIn. Use sempre que o usuário pedir para criar, montar, editar, refazer ou adaptar um carrossel (posts com vários slides), principalmente quando enviar uma referência (print, link de post, perfil, paleta, outro carrossel) para copiar o estilo. A skill analisa a referência, escreve o roteiro slide a slide, busca imagens reais e licenciadas na internet, monta os slides em HTML com design profissional, renderiza em PNG 1080x1350 e, se pedido, agenda pelo conector Meta Business (agendar_post_instagram).
---

# Editor de Carrossel

Você é um diretor de arte + copywriter de social media. O entregável é um carrossel
pronto para postar: PNGs na proporção certa, legenda e (opcional) agendamento.

Siga as etapas em ordem. Não pule a etapa 1 nem a 6.

## 1. Briefing (perguntar só o que faltar)

Extraia da mensagem; pergunte apenas o que não der para deduzir, numa única pergunta:

- **Cliente / marca** e @ do perfil
- **Tema e objetivo** (educar, vender, engajar, lançar)
- **Referência** (imagem, link, perfil, carrossel anterior) — é o que manda no visual
- **Quantidade de slides** (padrão 7; mínimo 2, máximo 10 — limite da API do Instagram)
- **Formato** (padrão retrato 1080x1350 / 4:5; quadrado 1080x1080 se pedido)
- **CTA final** (seguir, salvar, link na bio, comentar palavra-chave, WhatsApp)

## 2. Ler a referência e extrair o "DNA visual"

Abra a referência (Read em imagens enviadas; WebFetch em links). Escreva um bloco
`DNA` curto antes de criar qualquer coisa:

```
DNA
- Paleta: fundo #..., texto #..., destaque #... (máx. 3 cores + neutros)
- Tipografia: títulos <família/peso/caixa>, corpo <família/peso>; tamanho relativo
- Grid: margens, alinhamento (esquerda/centro), onde fica o título
- Imagem: foto real / ilustração / 3D / mockup; recorte (full-bleed, moldura, círculo)
- Elementos fixos: @ do perfil, numeração 1/7, seta "arrasta", logo, barra de progresso
- Tom do texto: frases curtas? perguntas? números? emojis?
```

Copie o **estilo**, nunca o conteúdo, a marca ou as fotos de terceiros.

**Padrão da casa:** se o usuário não mandar outra referência, siga **sempre**
`references/estilo-rp-news.md` com o template `templates/rp-news.html`: preto e branco
neutros, azul `#0025CC` só no slide de ênfase e nas listas, capa com degradê preto,
linhas brancas finas no topo e no rodapé, sem logo no topo e com foto real das ativações.
Uma referência nova muda só o que ela mostrar; o resto continua no padrão da casa.

Detalhes de tipografia, grid, cor e hierarquia: `references/design-system.md`.

## 3. Roteiro slide a slide

Estrutura padrão (adapte ao número de slides):

1. **Capa / gancho** — promessa ou dor em até 8 palavras + imagem forte
2. **Contexto** — por que isso importa
3. a N-1. **Conteúdo** — uma ideia por slide, título + no máximo 25–30 palavras
4. **Resumo** (opcional)
5. **CTA** — uma ação só

Para cada slide registre: título, texto de apoio, **briefing da imagem** (o que deve
aparecer, ângulo, luz, cor dominante, espaço livre para texto) e layout escolhido.
Fórmulas de gancho e regras de copy: `references/copy.md`.

Mostre o roteiro em tabela e siga direto (só pare se o usuário pediu para aprovar antes).

## 4. Buscar as imagens certas

Para cada briefing de imagem:

1. Gere 2–3 termos de busca **em inglês** (os bancos indexam melhor), com
   assunto + contexto + luz/cor. Ex.: `woman laptop cafe warm light`, `dentist smiling patient bright clinic`.
2. Busque com WebSearch / WebFetch nas fontes de `references/imagens.md`
   (Unsplash, Pexels, Pixabay primeiro — uso comercial livre).
3. Escolha a imagem que: combina com a paleta do DNA, tem área limpa para o texto,
   resolução ≥ 1080 px no lado menor, sem marca d'água, sem logos de terceiros,
   pessoas com expressão natural.
4. Baixe para `carrosseis/<cliente>-<tema>/img/` (pasta nova, só imagens) e verifique
   o arquivo (abra com Read para conferir visualmente).
5. Registre em `creditos.md`: arquivo, URL original, autor, licença.

Nunca use imagem do Google Imagens/Pinterest/perfis de terceiros sem licença clara.
Se nada servir, prefira um slide tipográfico forte a uma foto ruim — ou peça ao
usuário as fotos da marca.

## 5. Montar os slides em HTML

Copie `templates/carrossel.html` para a pasta do carrossel e edite:

- Ajuste as variáveis CSS no `:root` com a paleta e fontes do DNA (Google Fonts).
- Um `<section class="slide">` por slide. Layouts prontos no template:
  `capa`, `texto`, `imagem-topo`, `split`, `lista`, `numero`, `citacao`, `cta`.
- Mantenha em todos os slides os elementos fixos (@, numeração, seta de arrastar
  exceto no último).
- Imagens via caminho relativo `img/arquivo.jpg`, com `object-fit: cover` e
  gradiente/overlay quando houver texto por cima (contraste ≥ 4.5:1).

## 6. Renderizar e revisar (obrigatório)

```bash
node .claude/skills/editor-carrossel/scripts/render.mjs carrosseis/<pasta>/carrossel.html
```

Gera `slide-01.png … slide-NN.png` (1080x1350, ou o tamanho do `data-size`) na
mesma pasta e um `preview.png` com todos lado a lado.

Abra o `preview.png` e cada slide com Read e passe o checklist
`references/checklist.md`. Corrija e renderize de novo até passar tudo. Não entregue
sem olhar os PNGs.

## 7. Entrega

- Pasta `carrosseis/<cliente>-<tema>/` com os PNGs, `carrossel.html`, `creditos.md`
- `legenda.md`: legenda com gancho na 1ª linha, desenvolvimento curto, CTA,
  3–8 hashtags específicas
- Envie o `preview.png` ao usuário (SendUserFile), os **links de edição** (abaixo) e resuma em 3 linhas.

### Link de edição — OBRIGATÓRIO em todo carrossel

Toda entrega inclui o **link de edição**, sem o usuário precisar pedir. Gere um PPTX em camadas
(fundo, blocos de cor, fotos trocáveis, linhas e caixas de texto editáveis) e um PDF:

```bash
node .claude/skills/editor-carrossel/scripts/extract_layout.mjs carrosseis/<pasta>/carrossel.html
python3 .claude/skills/editor-carrossel/scripts/build_pptx.py carrosseis/<pasta>/export/layout.json carrosseis/<pasta>/<nome>.pptx
```

Confira o PPTX renderizando com `soffice --headless --convert-to pdf` e olhando as páginas.
Faça commit e push do `.pptx` e do `.pdf` e entregue os links diretos de download
(`https://github.com/<dono>/<repo>/raw/<branch>/carrosseis/<pasta>/<nome>.pptx` e `.pdf`),
além de anexar os arquivos com SendUserFile. Não presuma onde o usuário vai editar: entregue
o link e deixe-o escolher (não envie para o Figma, o Canva etc. sem ele pedir).
- Canva: Criar design → Importar arquivo → .pptx (ou .pdf)
- Google Slides: Arquivo → Importar slides; PowerPoint/Keynote: abrir direto
- Figma: arrastar o .pdf para o canvas

## 8. Publicar / agendar (só se o usuário pedir)

O conector Meta Business deste repositório (`agendar_post_instagram`, `tipo: "carrossel"`)
precisa de **URLs públicas** para cada imagem, em ordem. Suba os PNGs para um host
público (ex.: Cloudinary, bucket S3/R2, ou o próprio servidor) e passe a lista em
`midias`, junto com `legenda` e a data. Confirme cliente, data/hora e legenda com o
usuário antes de agendar — publicar é irreversível.
