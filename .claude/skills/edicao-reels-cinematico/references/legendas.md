# Legendas cinéticas

## Sistema
- **Grupos de 2–3 palavras** (até cerca de 18 caracteres). O grupo quebra em pontuação final, vírgula (a partir de 2 palavras) e pausas acima de 0,45 s.
- **Revelação palavra a palavra** (`modo: revelar`, o padrão): cada palavra entra quando é falada, com desfoque e um leve deslocamento. O grupo some 120 ms antes do próximo, sem nunca se sobrepor a ele. Use `--modo grupo` quando a fala for muito rápida e a revelação ficar nervosa.
- Pontuação some, exceto `?` e `!`, que mudam o sentido.

## Destaques (lockup)
Só quando pedido. A palavra destacada vira o centro de um bloco tipográfico:
```
      MUDA          ← apoio: caixa-alta, tracking aberto, largura igual à da palavra grande
     tudo           ← destaque: 3–4× maior, fonte de destaque (serifada itálica no "editorial")
      NO
```
- O agrupador puxa a palavra anterior para cima do destaque ("muda / TUDO" em vez de "TUDO / no seu").
- O apoio tem tamanho limitado: no mínimo 16% e no máximo 36% do tamanho do destaque. Se o apoio ficar longo demais, prefira deixar o destaque sozinho e editar o grupo em `legendas.json`.
- **Critério para escolher a palavra:** a que carrega a promessa, o contraste ou o número da frase ("**melhores**", "**grátis**", "**3x**", "**nunca**"). Evite artigos, verbos fracos e palavras longas demais (mais de 12 letras ficam pequenas porque precisam caber em 80% da largura).
- Frequência: 1 destaque a cada 5–8 s. Mais que isso e o destaque deixa de destacar.

## Estilos (`legendas.py estilos`)
| estilo | frase | destaque | quando usar |
|---|---|---|---|
| editorial | Inter 600 | Instrument Serif itálico | padrão sofisticado: educação, marca pessoal, serviços |
| impacto | Inter 800 caixa-alta | Anton | fitness, esporte, lançamento, urgência |
| moderno | Inter 600 | Inter 900 apertado | tech, SaaS, criador de conteúdo |
| luxo | Cormorant 600 | Cormorant itálico, tracking largo | moda, imóveis, gastronomia, beleza premium |
| dourado | Open Sans 700, letras juntas | Open Sans 800 CAIXA ALTA dourada com reflexo de luz e brilho | automotivo, imóveis, vendas premium |

O estilo `dourado` usa o lockup **encaixado**: as palavras de apoio são pequenas, leves e coladas na palavra grande (antes dela: acima e à esquerda; depois: abaixo e à direita). Nada fica solto. A ênfase entra subindo, ganhando foco e cor, recebe um reflexo de luz que atravessa as letras e cresce devagar enquanto está na tela. Os mesmos recursos valem para qualquer estilo pela chave `config`: `"lockup": "encaixe"`, `"animacao": "subir"`, `"brilho": 20` (px de brilho em volta), `"gradiente": "ouro"`, `"deriva": 0.04`.

Personalize com `--cor-destaque`, `--cor-base`, `--fonte-base`, `--fonte-destaque` e `--posicao-y`. Uma fonte da marca vai em `assets/fontes/` e é chamada pelo nome do arquivo.

## Variações de movimento (para vídeos da mesma série não ficarem iguais)
Combine as três chaves em `config` do `legendas.json`. Cada combinação dá uma "assinatura" diferente com a mesma tipografia:

| chave | opções | efeito |
|---|---|---|
| `animacao` (ênfase) | `subir` | entra subindo, ganhando foco e cor; reflexo de luz atravessa |
| | `letras` | onda de letras: cada letra sobe, gira de leve e ganha foco em cascata (o tempo se ajusta ao grupo) |
| | `mascara` | revela da esquerda para a direita, espaçamento fecha, traço dourado se desenha embaixo |
| `lockup` | `encaixe` | apoio pequeno colado: antes acima-esquerda, depois abaixo-direita |
| | `empilhado` | apoio centralizado acima/abaixo, ajustado à largura da ênfase |
| | `lateral` | apoio em coluna à esquerda da ênfase, alinhado à direita |
| `modo` (legenda pequena) | `revelar` | palavra por palavra conforme a fala |
| | `karaoke` | frase inteira aparece; cada palavra acende quando é falada |
| | `deslizar` | frase entra por máscara da esquerda e sai pela direita |

Exemplo usado numa série de 3 vídeos: (1) `subir` + `encaixe` + `revelar`; (2) `letras` + `empilhado` + `karaoke`; (3) `mascara` + `lateral` + `deslizar`.

Grupos de ênfase precisam de tempo na tela (mais de ~1 s depois da palavra): se o grupo seguinte começa logo, junte as palavras seguintes no mesmo grupo como apoio (`"aqui faz DINHEIRO de verdade"`).

## Ajustes avançados
Em `legendas.json`, a chave `"config"` aceita: `tamanho_base` (fração da largura, padrão 0,07), `tamanho_destaque_max` (0,21–0,28), `largura_max` (0,80), `posicao_y` (0,64), `entrada`, `entrada_destaque`, `saida`, `antecipacao`, `desfoque`, `deslocamento`, `modo` e `zonas` (`[{"de":6.8,"ate":8.8,"posicao_y":0.36}]` ou `{"ocultar":true}`).

## Profundidade
Com `--matte` no `agrupar`, cada lockup recebe `profundidade` (`atras`/`frente`), `y` e `x`. Atrás: a palavra grande fica no topo da cabeça, centrada na pessoa, com a parte de baixo escondida atrás do cabelo — nunca cruzando o rosto. Só palavras de 6+ letras vão para trás (curtas sumiriam); a curta vai para a frente e a próxima longa assume a vez. Só a palavra grande vai para trás: as de apoio ficam sempre na frente. Na frente: altura do peito (nunca sobre o rosto), centralizado. A intercalação deixa o vídeo dinâmico sem repetir o truque. Para forçar um lado em um grupo, edite `profundidade` em `legendas.json`; para todos, use `--profundidade atras|frente`.

## Legibilidade
- A sombra é difusa e não há contorno grosso. Se o fundo for muito claro ou movimentado, aumente o contraste escurecendo levemente a área com a vinheta da grade, em vez de pôr caixa atrás do texto.
- Olhe a prévia sobre o vídeo real (`--fundo-video`). Destaque claro sobre fundo claro some.
- Confira a grafia de nomes próprios em `legendas.json` antes do render.

## Arquivo .srt
Se o usuário quiser também a legenda em arquivo (para acessibilidade ou upload), gere a partir de `legendas.json`:
```python
import json; d=json.load(open("legendas.json"))
f=lambda t:f"{int(t//3600):02d}:{int(t%3600//60):02d}:{int(t%60):02d},{int(t%1*1000):03d}"
open("legendas.srt","w").write("\n".join(f"{k+1}\n{f(g['inicio'])} --> {f(g['fim'])}\n"+" ".join(p['texto'] for p in g['palavras'])+"\n" for k,g in enumerate(d["grupos"])))
```
