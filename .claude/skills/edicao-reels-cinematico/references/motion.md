# Motion em HTML/CSS

Os grafismos são páginas HTML renderizadas **quadro a quadro** pelo Chromium (`scripts/render_html.cjs`), com fundo transparente. A saída é um `.mov` com alfa que o `montar.py` sobrepõe no instante certo. Como o tempo é controlado pelo script, o resultado é determinístico: nada depende da velocidade da máquina.

## Templates prontos (`motion.py listar`)
| template | parâmetros principais | uso |
|---|---|---|
| `titulo` | titulo, subtitulo, tamanho, posicao_y, alinhamento | abertura, capítulos |
| `lower-terco` | nome, cargo, cor_acento | identificar quem fala |
| `cta` | texto, apoio, cor_fundo, cor_texto | chamada final, "link na bio" |
| `numero` | valor, prefixo, sufixo, casas, rotulo | dados, resultados, preço |
| `palavra` | texto, fundo (cor, "escurecer" ou "nenhum"), estilo | interstício de impacto |

Todos aceitam `cor`, as fontes (`fonte_*`) e `duracao`. As fontes Inter, Instrument Serif, Anton e Cormorant Garamond já vêm carregadas. Outras do Google Fonts entram com `--fontes "Playfair Display:ital@1|DM Sans:wght@500"`.

## Contrato para um template novo
```html
<!DOCTYPE html><html><head><meta charset="utf-8">
<!-- descrição curta + lista de parâmetros (aparece em `motion.py listar`) -->
<style>/*__FONTES__*/ html,body{margin:0;background:transparent;overflow:hidden;width:100vw;height:100vh} ...</style>
</head><body>
  ...elementos...
<script>window.PARAMS=/*__PARAMS__*/{}; window.PADRAO={duracao:3, /* padrões */};</script>
<script>/*__BASE__*/</script>          <!-- injeta M (curvas, clamp, p(), envelope()) -->
<script>
  const P = M.P;                        // PADRAO + PARAMS
  window.PRONTO = document.fonts.ready.then(() => { /* medir e posicionar */ renderFrame(0); });
  window.renderFrame = t => { /* define o estado exato no tempo t (s) */ };
</script></body></html>
```
Regras:
- `renderFrame(t)` precisa ser **pura em relação a t**: o mesmo t sempre gera o mesmo quadro. Não use `Date.now()`, `setTimeout` ou animações CSS rodando sozinhas. Se usar `@keyframes`, não defina `renderFrame`, e o renderizador congela e posiciona as animações em t.
- Meça textos só depois de `document.fonts.ready`, dentro de `PRONTO`.
- Unidades relativas ao quadro (`innerWidth/100`) fazem o mesmo template servir em 9:16, 4:5 e 16:9.
- Use `M.p(t, inicio, duracao, curva)` para progresso e `M.expo`/`M.quart`/`M.inOut` como curvas. Evite overshoot.
- Teste com `--previa t1,t2,t3` e abra os PNGs. Confira o meio da entrada, o estado estável e o meio da saída.

## Técnicas que funcionam bem
- **Revelação por máscara**: o texto sobe de dentro de um `overflow:hidden` (`translateY(100%)` até 0).
- **Tracking que fecha**: o `letter-spacing` vai de +0,3em até o valor final enquanto a opacidade sobe.
- **Clip-path**: uma pílula ou barra se desenha do centro para fora (`inset(0 50% 0 50%)` até `inset(0)`).
- **Desfoque de entrada**: `blur(8px)` até 0 nos primeiros 30% da animação.
- **Contadores**: o valor é calculado por `M.quart` até o alvo, com `font-variant-numeric: tabular-nums` para os dígitos não pularem.
- Para formas e ícones, use SVG inline animando `stroke-dashoffset` (traço que se desenha).

## Posicionamento na timeline (camadas.json)
```json
{"tipo": "motion", "arquivo": "trabalho/titulo.mov", "em": 0.0}
```
`em` é o instante, na linha do tempo editada, em que o quadro 0 do motion aparece. Para entrar junto com uma palavra, use o `inicio` dela em `palavras_editado.json` menos ~0,1 s.
