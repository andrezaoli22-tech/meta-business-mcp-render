# Direção: o que faz um Reels parecer profissional (e não "feito por IA")

A "cara de IA" vem de **uniformidade sem intenção**: todo corte com whoosh, toda palavra com emoji, zoom alternando a cada frase, legenda pulando com bounce, música no mesmo volume do começo ao fim, grade laranja-e-azul saturada. Um editor bom faz escolhas que variam conforme o conteúdo, e muitas vezes escolhe **não** fazer nada.

## Ritmo e corte
- **Gancho nos primeiros 1–1,5 s.** Comece na frase mais forte, mesmo que ela esteja no meio do bruto. Nada de "oi, gente", logo ou respiração no começo.
- **Corte no ataque da palavra, não no silêncio.** O respiro padrão de 60 ms antes e depois evita cortar consoantes. Se a fala soar "picotada", aumente `--respiro` para 0,08–0,10.
- **Varie o ritmo.** Um trecho rápido (cortes a cada 1–2 s) seguido de um plano que respira (3–5 s) dá contraste. Ritmo constante cansa, mesmo quando é rápido.
- **Punch-in tem função:** disfarçar o jump cut entre dois trechos do mesmo plano ou enfatizar uma frase. Use 1,08–1,15. Não alterne mecanicamente: às vezes dois cortes seguidos ficam no mesmo enquadramento, e uma frase de impacto pode ganhar um push-in lento (`zoom` em camadas.json) em vez de corte.
- **B-roll cobre, não decora.** Ele entra para mostrar o que a voz descreve ou para esconder um corte feio. Planos de 1,2–2,5 s, com rampa de zoom leve (1,04–1,08) para não ficarem estáticos.
- **Final com intenção:** termine numa frase completa e num quadro limpo. Para Reels, um final que "emenda" no começo favorece o replay.

## Hierarquia visual
- Um elemento principal por vez. Se entrou um título, a legenda some ou sobe (`--zona`). Se há número na tela, não há lockup de legenda ao mesmo tempo.
- No máximo duas famílias tipográficas no vídeo inteiro: a da legenda e, no máximo, a dos títulos. Os estilos já combinam sans e serifada; mantenha.
- Paleta curta: branco/off-white e **uma** cor de destaque, tirada da marca ou da própria imagem (um tom que já existe na cena). Destaque amarelo-gema ou verde-neon só se for da marca.

## Movimento
- Curvas de saída rápidas e assentamento lento (expo/quart out). Nada de bounce, elástico ou "pop" com overshoot: é o maior sinal de template barato.
- Entradas de 200–350 ms e saídas mais curtas que as entradas (100–150 ms).
- Desfoque de movimento sutil (blur que some na entrada) vende física real. Os templates já fazem isso.
- Deriva lenta (escala de 1,00 a 1,04 ao longo do plano) dá vida a planos e grafismos parados.

## Som
- O som é metade da percepção de qualidade. Voz limpa e alta, trilha **embaixo**, SFX quase subliminares.
- SFX só onde há movimento visual que o justifique (entrada de título, transição de bloco, número subindo). Três a seis por minuto é muito; um por corte é amador.
- Deixe a trilha respirar: um momento sem voz (B-roll, interstício `palavra`) é a hora de a música subir.

## Cor
- Primeiro corrigir, depois estilizar. Pele natural é inegociável.
- Grade sutil é melhor que grade forte: na dúvida, `--intensidade 0.6` no LUT e saturação ≤ 1.
- Grão leve (2–4) une cenas de câmeras diferentes e tira a cara "digital lisa" do celular.

## Checklist antes de entregar
1. Os 2 primeiros segundos prendem a atenção sem contexto?
2. Algum corte ficou audível (estalo, palavra comida)?
3. A legenda está correta palavra por palavra, incluindo nomes próprios?
4. Alguma legenda ou grafismo cai sobre o rosto ou na área dos botões?
5. A trilha atrapalha a compreensão em algum ponto?
6. A cor da pele está natural em todos os planos, inclusive no B-roll?
7. A loudness final está perto de -14 LUFS e o pico abaixo de -1 dBTP?
