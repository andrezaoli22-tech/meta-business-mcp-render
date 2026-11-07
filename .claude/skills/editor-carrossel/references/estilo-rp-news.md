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
