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

## 2b. Variação "reluzente" e tamanho sutil
- `"gradiente": "vermelho-reluz"` em `config`: a ênfase fica em vermelho sólido em repouso, e um reflexo de luz atravessa a palavra logo depois da entrada (como o dourado usado na MRC), com brilho vermelho em volta. Para um vermelho mais vivo, renderize com `--cor-destaque "#F2261A"`.
- Versão menor e mais sutil: `"tamanho_destaque_max": 0.125, "tamanho_base": 0.047, "brilho": 14, "desfoque": 5, "deslocamento": 0.012`.

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

## 5. Campanhas com parceiro (ex.: Feirão BV) — motion e azul
Para vídeos de campanha em parceria, use as legendas em branco com ênfase `"gradiente": "azul-bv"`
(degradê do branco para o azul, brilho com `--cor-brilho "rgba(70,120,255,.85)"`) e os motions de
`assets/motion/` via `scripts/motion.py` (renderize com `--escala 2` para 4K):
- `tela-azul`: tela inteira azul curta (1,4–1,8 s) com linha fina + título + pílula, bolhas e reflexo. Use em UMA frase-chave (o nome da campanha). Som: `subida_tonal` com o acorde caindo no título.
- `quadrado-azul`: quadrado de vidro azul atrás da cabeça (`"profundidade": "atras"` em camadas.json), com texto digitando na faixa de cima. Som: `virada` na entrada + `tecla_*` a cada 2 letras.
- `bolhas`: bolhas de vidro com os benefícios, uma por fala, sem legenda duplicada no trecho. Som: `bolha_1..4` em cada entrada e estouro no fim.
Movimento sutil da pessoa: gere uma base com aproximação/afastamento suave de 4,5% por plano (scale+crop no ffmpeg, sem mexer na cor) e rode `recortar.py`/`rostos.py` nessa base, para o recorte acompanhar o movimento.

### Ajustes aprovados no Feirão BV (preferências da marca)
- Ênfase azul: `"gradiente": "azul-reluz"` — azul sólido (`--cor-destaque "#2547E8"`) com um reflexo BRANCO passando; nada de degradê azul→branco e nada de brilho colorido em volta. Sombra só preta e quase invisível: `--cor-brilho "rgba(0,0,0,.22)"` com `"brilho": 6`.
- Letras menores: `"tamanho_destaque_max": 0.11, "tamanho_base": 0.045`.
- Bolhas aparecem SEM som de bolha.
- Não repetir a mesma informação em dois motions (ex.: tela azul e quadrado dizendo "Megha"): escolha um. A tela azul pode durar a frase inteira (`pilula_em` faz a pílula entrar quando a segunda parte é falada).
- Recorte da pessoa pode pegar objetos atrás da cabeça (laço vermelho do carro): confira a camada "atrás" nos planos abertos; se pegar, coloque a ênfase na frente, acima da cabeça.

## 6. Tela preta longa → motion 3D (`tela-3d`)
Quando o vídeo traz um trecho de tela preta (3–5 s), substitua por `motion.py tela-3d`: fundo
"preto brilhante" (preto → azul profundo com halo e chão iluminado), feixe de luz, elementos 3D
reais flutuando (three.js local em `assets/motion/lib`: moedas com aro azul, esferas de vidro/cromo
e um símbolo 3D extrudado, ex. "%") e cenas de texto que entram e saem (`cenas`: linha, número
com contador `contar`/`casas`, `sufixo`, `rodape`). Sincronize cada cena com a fala.
Sons do motion: `inspiracao` terminando na entrada, `cascata` no contador, `virada` na troca de
cena, `lamina` na última. Paleta Banco Pan: legenda branca e ênfase azul escuro `#2246E2` com
`azul-reluz` (reflexo branco) e sombra preta suave.

### Preferências aprovadas (Black Feirão Pan)
- Efeitos SECOS/comerciais: gere com `scripts/secar_sfx.py` e use `legendas.py sfx ... --seco` (sem cauda de reverb, cortes curtos). Também nos sons do motion (`assets/sfx/seco/`).
- Nenhuma palavra sobre o rosto e, nesta marca, ênfases sempre NA FRENTE e fora do rosto (abaixo do queixo ou acima da cabeça). Se `rostos.py` subestimar o rosto (pessoa sentada no carro), ajuste `y` e `rosto` do grupo à mão e confira na prévia.
- Evite a animação `partir` em grupos com linha de apoio acima e abaixo: as metades podem desalinhar. Prefira `flip`.
