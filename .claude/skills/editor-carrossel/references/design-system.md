# Design system de carrossel

## Formato
- Retrato 4:5 → **1080x1350** (padrão; ocupa mais tela no feed)
- Quadrado → 1080x1080
- Margem de segurança: **80 px** nas laterais, 96 px em cima/embaixo. Nada importante
  fora disso (o Instagram corta a grade do perfil em 3:4 no centro).
- Todos os slides do mesmo carrossel têm o mesmo tamanho.

## Tipografia
- No máximo **2 famílias** (1 display + 1 texto). Pares que funcionam:
  - Inter / Inter (limpo, corporativo)
  - Playfair Display + Inter (editorial, premium)
  - Montserrat 800 + Montserrat 400 (impacto, varejo)
  - Space Grotesk + DM Sans (tech, moderno)
  - DM Serif Display + DM Sans (saúde, beleza, estética)
  - Bebas Neue + Roboto (esporte, promo)
- Escala (1080 de largura):
  - Título capa: 88–120 px, peso 700–900, entrelinha 1.0–1.05, tracking -1 a -2%
  - Título slide: 64–80 px
  - Corpo: 34–42 px, entrelinha 1.3–1.4 (nunca abaixo de 30 px — é lido no celular)
  - Rodapé/@/numeração: 24–28 px
- Até ~8 palavras por título, 6–7 linhas de corpo no máximo.
- Destaque 1–3 palavras com a cor de destaque, marca-texto ou sublinhado — não frases inteiras.

## Cor
- 60/30/10: fundo / apoio / destaque.
- Contraste texto-fundo ≥ 4.5:1 (corpo) e ≥ 3:1 (títulos grandes).
- Texto sobre foto: overlay escuro 40–65% ou gradiente na metade do texto.
- Alternar fundo claro/escuro entre slides só se a referência fizer isso; senão mantenha consistência.

## Grid e hierarquia
- Um ponto focal por slide. Ordem de leitura: título → imagem → corpo → rodapé.
- Alinhamento à esquerda para textos longos; centro só para capa, citação ou número.
- Espaçamento em múltiplos de 8 (16, 24, 32, 48, 64).
- Repetir a mesma posição de título em todos os slides de conteúdo = sensação de "sistema".

## Elementos que dão acabamento profissional
- Numeração `02/07` ou barra de progresso no topo
- Seta/"arrasta →" no canto inferior direito (exceto último slide)
- @ do perfil + foto/logo pequenos no rodapé
- Elemento que "vaza" de um slide para o outro (forma, linha) para incentivar o swipe
- Ícones de uma única família (Lucide, Phosphor) com mesmo traço
- Cantos arredondados consistentes (ex.: 24 px) em fotos e cards
- Sombras suaves ou nenhuma — nunca sombra dura padrão
- Textura sutil (grão 3–5%) em fundos chapados quando a referência for "orgânica"

## Erros que denunciam amadorismo
- Mais de 2 fontes, texto centralizado longo, fotos de banco genéricas ("aperto de mão")
- Texto colado na borda, imagem esticada/pixelada, marca d'água
- Cada slide com um layout diferente sem motivo
- Emojis como ícones em layout sério
