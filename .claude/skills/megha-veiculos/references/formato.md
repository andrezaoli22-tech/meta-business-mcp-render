# Formato das legendas Megha (analisado da referência)

A referência é um reels de loja de seminovos (apresentadora + planos de carros). Este é o sistema de legendas dela, quadro a quadro, com a troca do laranja pelo vermelho da Megha.

## 1. Frase comum (legenda corrida)
- Fonte geométrica fina, minúsculas como falado: **Montserrat Alternates Light** (o "a" de um andar da referência).
- Branca, sem caixa, sombra suave. Tamanho ~5,8% da largura.
- Entra **palavra por palavra**: cada palavra surge desfocada e um pouco menor e cresce até o tamanho final (`modo: "crescer"`).
- Fica no meio da tela ou abaixo do rosto; nunca sobre o rosto.
- Ex.: "Cada veículo", "do nosso estoque", "Clique no botão abaixo", "linha de seminovos".

## 2. Bloco de ênfase
```
     TEM GENTE QUE VENDE      ← linha de cima: Poppins SemiBold, CAIXA ALTA, branca, letras juntas
        CARROS                ← ênfase: Poppins Black, CAIXA ALTA, vermelho sólido
 PROCEDÊNCIA E TRANQUILIDADE  ← (opcional) linha de baixo: igual à de cima
```
- A linha de cima ocupa quase a largura da palavra grande; tudo centralizado (`lockup: "empilhado"`).
- **Conector** em vez de linha de cima quando a frase começa com ligação curta: "pensando em", "e não", "e tem" — Poppins Light Itálico, minúsculas (`"conector": true`).
- Vermelho **sólido, sem degradê**: #C8281C (tirado da peça de marca "Condições Especiais"), **com brilho vermelho em volta** só na palavra de ênfase.
- Letras **juntas** em tudo: frase comum com tracking -0,055em, linhas em caixa alta -0,035em. Nada de espaçamento aberto.
- Frequência: uma ênfase por frase forte (a cada 3–6 s).

## 3. Animações da ênfase (uma diferente para cada ênfase do vídeo)
| `animacao` | na referência | movimento | som |
|---|---|---|---|
| `espalhar` | CARROS, SONHOS | letras afastadas e girando no eixo vertical se juntam no centro | passagem (whoosh) |
| `revelar` | QUALIDADE | letra a letra da esquerda para a direita, caindo levemente | lâmina |
| `mascara` | FELICIDADE | revelada por máscara da esquerda para a direita (sem traço) | subida tonal |
| `aleatorio` | DE PREOCUPAÇÃO | letras acendem em ordem embaralhada com um pequeno pulo | dedilhado |
| `palavras` | PRÓXIMO CARRO | cada palavra da ênfase sobe e entra em sequência | virada |

As linhas pequenas (cima/baixo) entram palavra por palavra, antes da ênfase. A saída do bloco é um esmaecer com desfoque rápido (0,15–0,2 s), no corte de cena.

Se o vídeo tiver mais ênfases que animações, repita só depois de usar todas, nunca duas iguais seguidas. Os efeitos da skill de edição (`impacto`, `deslize`, `flip`, `abrir`, `partir`, `digitar`, `subir`, `letras`) também funcionam aqui como variação extra.

## 4. Posição e profundidade
- Bloco de ênfase na altura do peito/cintura da pessoa ou no centro dos planos sem pessoa.
- Regra do rosto (obrigatória): nenhuma palavra sobre o rosto. Frase comum desce para baixo do rosto; palavra do bloco que cruzaria o rosto vai para trás da pessoa (camada `_atras` + matte).
- Intercale ênfases atrás e na frente para dar profundidade.
