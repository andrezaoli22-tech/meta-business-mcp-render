# RP News Semanal — resumo das campanhas e notícias da semana

Formato fixo do carrossel semanal. Template: `templates/rp-news-semanal.html`.
Segue o padrão da casa (`estilo-rp-news.md`) em cores, fontes e capa com degradê preto;
a estrutura do miolo vem do formato "melhores da semana" (uma notícia por slide).
Para carrossel de assunto único (como o GP de São Paulo), use `rp-news.html`.

## Estrutura
| Slide | Conteúdo |
|---|---|
| 1. Capa | Mosaico 2x2 com fotos de 4 cases da semana + degradê preto de baixo para cima; período ("03 a 09 de novembro") como sobretítulo; manchete branca centralizada "Campanhas e notícias mais criativas da semana"; barra preta no rodapé com "Edição #NN" e seta |
| 2 a N-1. Notícias | 1 case por slide, fundo branco (layout abaixo) |
| N. Fechamento | Fundo azul `#0025CC` (a única ênfase do carrossel): pergunta para comentários + convite para salvar |

Quantidade: a referência usa 16 notícias + capa. O app do Instagram aceita até 20 imagens,
mas a API de agendamento deste servidor historicamente aceita até 10. **Pergunte ao usuário
quantos cases entram e avise se passar de 10 para agendamento automático.**

## Slide de notícia (fundo branco, texto preto)
- **Cabeçalho (y≈80):** ícone do Instagram + @ do perfil (600, 26 px) à esquerda; contador
  "n/total" (cinza `#6E6E6E`) à direita. O contador conta só as notícias (sem a capa).
- **Manchete (y=150):** Inter Tight 800, 76 px, entrelinha 1.04, tracking -0.035em, preto
  `#111`, **até 3 linhas**.
- **Foto (y=420):** card de 920x500 com cantos de 28 px e sombra suave.
- **Texto (y=968):** Inter Tight 400, 31 px, entrelinha 1.45, cinza-escuro `#2A2A2A`,
  **60–75 palavras (máximo de 6 linhas)**.
- **Rodapé (fundo a 58 px):** "Melhores da semana" | **_Edição #NN_** (negrito itálico, centro) |
  "ARRASTE PARA O LADO".

## Fórmula da manchete
`[Marca] + [verbo no presente: lança, cria, junta, transforma, leva, escala] + [o quê] + [o detalhe curioso]`
- "Olympikus e Guaraná Antarctica lançam tênis inspirado na Amazônia"
- "Oreo cria óculos com biscoitos para esconder os sustos do terror"
Sem ponto final, sem pergunta e sem adjetivo genérico ("incrível", "inovador").

## Fórmula do texto (nesta ordem)
1. **Gancho** em 1 frase curta: imagem sensorial, contraste ou pergunta
   ("Verde da lata, vermelho do fruto maduro." / "Quem nunca tapou os olhos na cena mais tensa do filme?")
2. **O que** a marca fez e **com quem** (parceiros, collab)
3. **Créditos**: agência criativa, PR, produtora (quando houver)
4. **Números concretos**: preço, desconto, alcance, quantidade de peças, mídia
5. **Quando e onde**: data de lançamento, canais e lojas

Tudo factual e checado na fonte. Nunca invente data, preço, agência ou número; se não
achar, deixe de fora.

## Pesquisa e fotos
- O usuário envia o assunto ou a lista de cases. Para cada case, busque a fonte oficial
  (release, site da marca, perfil oficial, veículo de mercado) e registre o link em `fontes.md`.
- Use a **imagem oficial da campanha** (key visual, foto do produto, still do filme).
  Registre a origem em `creditos.md` e avise o usuário para confirmar o direito de uso.
- A capa usa 4 imagens dos cases mais visuais da edição.

## Legenda
Primeira linha com a pergunta de engajamento ("Qual desses cases mais chamou sua atenção?"),
seguida de 1 linha por case (marca + o que fez), CTA para salvar e 5–8 hashtags de mercado.

## Entrega
PNGs + `preview.png` + **link de edição** (PPTX + PDF), como em todo carrossel.
