# Estilo da casa — RP News (padrão aprovado pelo cliente)

Este é o padrão de todo carrossel, a menos que o usuário peça outro estilo.
Template pronto: `templates/rp-news.html`. Aprovado em 07/11/2026 a partir da edição
do RP News #01 (GP de São Paulo).

## A experiência
Editorial, jornalística e premium. Quem manda é a **foto real da ativação**; o design
fica neutro e some para a notícia aparecer. Nada de enfeite, nada de cor gratuita.
Lê-se como uma revista de mercado: manchete forte, texto limpo e foto que comprova.

## Cores (só estas)
| Uso | Cor |
|---|---|
| Fundo padrão | Preto `#0B0B0B` |
| Texto | Branco `#FFFFFF` (destaque = **negrito branco**, nunca outra cor) |
| Ênfase | Azul `#0025CC`, **só** no fundo do slide que precisa de ênfase (no máximo 1 por carrossel, normalmente o dado principal) e nos itens de lista sobre preto |

Proibido: vermelho, verde, amarelo ou qualquer cor de destaque em palavras, sublinhados,
barras coloridas e pílulas preenchidas.

## Elementos fixos
- **Topo:** área vazia de 110 px e uma linha branca de 2 px em y=110, de ponta a ponta.
  **Sem logo, sem "#01" e sem @** no topo.
- **Rodapé:** linha branca de 2 px em y≈1253; abaixo, à esquerda, o tema ("GP de São Paulo")
  em Inter Tight 400, 26 px, branco; à direita, a seta →. No último slide fica sem seta e sem data.
- Margem lateral de 72 px.

## Tipografia (Inter Tight)
- Manchete da capa: 700, cerca de 104 px, entrelinha cerca de 1.08, tracking -0.03em, toda branca
- Título de slide: 800, 58 px, CAIXA ALTA, tracking -0.035em
- Corpo: **400**, 38 px, entrelinha 1.5, tracking -0.01em; destaques em 700 branco
- Kicker (sobretítulo): 700, 28 px, caixa alta, tracking +0.06em, branco
- Itens de lista sobre preto: 700, 30 px, **azul `#0025CC`**, sem fundo, um por linha
- Título e corpo ficam colados (espaço de 12–16 px), não espaçados

## FORMATO OFICIAL — CARROSSEL DE ASSUNTO ÚNICO (fixado pelo cliente)
O formato de assunto único é **exatamente** o das 5 imagens em
`references/exemplos/assunto-unico/01.jpg` a `05.jpg` (RP News #01, GP de São Paulo, versão
editada e aprovada pelo cliente). **Antes de montar qualquer carrossel de assunto único,
abra essas 5 imagens e reproduza a mesma estrutura, na mesma ordem:**

| # | Slide | Como é |
|---|---|---|
| 1 | Capa | Foto real cheia da ação principal, linha branca no topo (y=110), degradê preto subindo do rodapé; sobretítulo em caixa alta (ex.: "GP DE SÃO PAULO · EDIÇÃO 2026") e manchete branca em 3 linhas curtas com ponto final; barra preta no rodapé com a linha de apoio + seta → |
| 2 | Contexto | Fundo preto; faixa de foto no topo (y=112 a 675) em **mosaico de 3 fotos** das marcas/ativações; título em CAIXA ALTA ("A F1 VIROU EXPERIÊNCIA") + 2 frases com destaques em negrito |
| 3 | Ênfase azul | Fundo azul #0025CC; número gigante à direita ("10"), título em CAIXA ALTA, texto alinhado à direita; foto da ação na metade de baixo, com o rodapé por cima |
| 4 | Coluna | Fundo preto; texto à esquerda (título, texto e lista de 3 itens em azul); foto em coluna à direita, entre as duas linhas |
| 5 | Fechamento | Foto cheia; sobretítulo "O QUE FICA" e frase final grande alinhados à direita, em branco; rodapé com o tema e **sem seta** |

Fixos em todos: linha branca no topo e linha branca acima do rodapé; rodapé com o tema
(ex.: "GP de São Paulo") à esquerda e seta → à direita (exceto no último); sem logo.
Quando houver mais conteúdo, repita os layouts 2–4 alternando; capa e fechamento são sempre
esses. CTA, quando pedido, entra no slide de fechamento.
Exemplos produzidos nesse formato: `carrosseis/rp-news-01-gp-sao-paulo/`, `carrosseis/gta-vi/`.

## Estrutura dos slides
1. **Capa (sempre):** foto cheia + **degradê preto** de baixo para cima (do preto sólido
   no rodapé até transparente por volta de 40% da altura), para harmonizar com os slides pretos.
   Kicker, manchete branca e, na barra preta do rodapé, a linha de apoio + seta.
2. **Foto em cima + texto (fundo preto):** faixa de foto de y=112 a cerca de 675; pode ser
   **mosaico de 2–3 fotos verticais lado a lado** (uma por marca/ativação). Título e corpo embaixo.
3. **Ênfase (fundo azul):** texto alinhado à direita, número gigante opcional (ex.: "10"),
   título, corpo; foto na metade de baixo, com o rodapé por cima.
4. **Texto + coluna de foto (fundo preto):** texto à esquerda; foto em coluna à direita
   (cerca de 430 px de largura, entre as duas linhas); lista em azul.
5. **Fechamento:** foto cheia com escurecimento leve embaixo, kicker + frase final
   alinhados à direita, todos brancos.

## Degradê preto (regra do cliente)
Sempre que houver **letra branca sobre foto**, o degradê preto sobe alto: quase transparente
só no terço de cima, cerca de 72% de opacidade a 40% da altura e **preto sólido a partir
de cerca de 60%**. O texto inteiro precisa ficar sobre preto quase sólido. Na capa e no
fechamento isso é obrigatório. Em foto de base com rodapé branco por cima, use escurecimento
de 55% até 90% na faixa de baixo. Escolha fotos com o assunto principal na **metade de cima**
(ex.: a árvore, que é vertical) para ele não sumir no preto.

## Variações aprovadas
- Número gigante (ex.: "55 m", "400 mil") com foto embaixo: em azul quando é a ênfase do
  carrossel e em preto nos demais.
- Resumo semanal no layout de assunto único: 1 case por slide alternando foto em cima,
  número gigante e coluna de foto; fechamento em mosaico 2x2 com degradê alto e a pergunta.
- **Capa do resumo semanal (aprovada):** mosaico 2x2 com 4 fotos dos cases, título branco
  **centralizado no meio** ("Campanhas da semana que você precisa saber"), sobretítulo com
  o período, faixa central escura (cerca de 82–90%) atrás do texto e fotos visíveis em cima e
  embaixo; barra preta no rodapé com "Edição #NN". Exemplo: `carrosseis/rp-news-semanal-01-v2/`.

## Fotos
- Sempre fotos **reais das ativações e marcas citadas** (assessoria, site oficial,
  perfil oficial da marca ou imagem de imprensa fornecida pelo usuário). Banco de imagem
  só como último recurso, avisando o usuário.
- Sem texto do design sobre o rosto ou o logo principal da foto.
- Imagens de terceiros: registrar a origem em `creditos.md` e lembrar o usuário de
  confirmar o direito de uso.

## Entrega obrigatória
Todo carrossel sai com o **link de edição** (PPTX em camadas + PDF), além dos PNGs.
Veja o passo 7 do `SKILL.md`.

## Stories "como participar" (1080x1920)
- 1 story por case, **cada um com layout diferente** (o cliente pediu para não repetir).
  Layouts já usados (exemplo em `carrosseis/stories-semana-02/stories.html`): foto no topo +
  passos com números vazados; azul total com número gigante e 2 colunas; foto cheia + cartão
  branco com checklist; polaroid + ficha Onde/Quando/Como; tela de live com balões.
- Mais 5 layouts já usados (`carrosseis/stories-gta-vi/stories.html`): ingresso com picote;
  infográfico em fundo branco com barra de proporção; meio a meio (foto em cima, branco embaixo,
  selo azul e tags em pílula); linha do tempo vertical com pontos azuis; grade 2x2 de cards.
  Mais 7 (`carrosseis/stories-semana-03/stories.html`): nota fiscal; bilhete da sorte com bolas;
  crachá com cordão; capa de revista; mapa com pinos; HUD de videogame em pixel; calendário da semana.
  Para o próximo, invente um layout novo ou combine de forma diferente.
- Entrega no app Alldres (empresa RP): 1 demanda tipo "story" por arte, responsável Priscila
  (aprovadora), status "Em aprovação"; ver API em plataforma-alldres (/api/demandas, /anexos, /status).
- Conteúdo dentro da área segura: nada importante nos 250 px de cima e de baixo.
- Texto prático e verificado: onde, como, regras. Sem marca "RP News" e sem datas, salvo pedido.
- Mesmas cores da casa e degradê preto alto sob texto branco em foto.

