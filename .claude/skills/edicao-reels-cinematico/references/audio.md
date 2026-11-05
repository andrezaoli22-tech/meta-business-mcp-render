# Áudio

## Níveis de referência (depois da normalização em -14 LUFS)
| elemento | nível | observação |
|---|---|---|
| voz | referência | sempre a coisa mais alta e clara |
| trilha sob a fala | `--musica-db -20` a `-24` | o ducking ainda tira de 6 a 10 dB quando há voz |
| trilha sem fala | `-10` a `-14` | interstícios, abertura, B-roll sem narração |
| whoosh/transição | `-18` a `-24` | quase subliminar; se você "nota" o som, está alto |
| impacto/hit grave | `-10` a `-16` | entrada de título, número, virada |
| risers | `-16` a `-22` | use `termina_em` para o pico cair no corte |
| UI/clique/pop | `-20` a `-26` | CTA, contador, check |

## Trilha
- Peça ao usuário a trilha e, se possível, o instante do drop ou do refrão. Com `--musica-inicio` você pula direto para a parte boa, e com `--marcar-drop T` alinha esse ponto a um momento do vídeo (o gancho, a virada).
- O ducking `medio` serve para quase tudo. Use `forte` para trilhas com vocal e `leve` quando a música é parte da emoção (vídeo de marca, depoimento emocionante).
- O fade final de 1,2 s é o padrão. Se o vídeo terminar num corte seco de impacto, use `--fade-musica 0.05`.
- Trilha mais curta que o vídeo entra em loop automaticamente. Mesmo assim, avise o usuário, porque o loop pode ficar audível.

## Efeitos sonoros (sfx.json)
```json
[
  {"arquivo": "sfx/whoosh.wav", "termina_em": 4.00, "db": -20},
  {"arquivo": "sfx/hit.wav",    "em": 0.18,         "db": -12, "fade_out": 0.5},
  {"arquivo": "sfx/pop.wav",    "em": 7.05,         "db": -22}
]
```
- Os tempos são da linha do tempo editada. Use `cortes.json` (instantes dos cortes) e o `em` de cada camada de motion.
- Um whoosh **termina** no corte: o movimento sonoro leva para dentro da próxima imagem.
- Um impacto entra **junto** com o quadro do título ou número (alguns ms antes soa mais "colado").
- Não ponha SFX em todo corte. Escolha os momentos estruturais: abertura, viradas de bloco, dado importante, CTA.

## Voz
- `--tratar-voz padrao`: passa-alta 85 Hz, redução de ruído leve, presença em 3,2 kHz, ar em 11 kHz, compressão 3:1 e de-esser.
- `leve`: para áudio de lapela/estúdio que já vem bom.
- `nenhum`: quando o áudio já foi tratado fora.
- Se houver ruído forte (ar-condicionado, rua), avise o usuário que a limpeza tem limite. Não tente salvar com redução agressiva: a voz fica robótica, e isso é um dos maiores sinais de amadorismo.

## Entrega
Saída em -14 LUFS integrados e pico de -1 dBTP: o padrão de Instagram, TikTok e YouTube. Para anúncios Meta, mantenha assim. Para TV/broadcast seria -23/-24 LUFS (`--lufs -23`).
