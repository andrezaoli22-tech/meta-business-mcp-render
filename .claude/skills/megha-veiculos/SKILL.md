---
name: megha-veiculos
description: Legendas e edição no padrão visual da Megha Veículos (loja de seminovos), copiado do formato de referência aprovado pela marca — frase fina em minúsculas surgindo palavra a palavra, blocos de ênfase com linha pequena em CAIXA ALTA + palavra gigante Poppins Black em VERMELHO BRILHANTE com brilho, conectores em itálico fino, letras que se espalham e se juntam, letra a letra, letras em ordem aleatória, máscara, palavra a palavra. Use sempre que o vídeo for da Megha Veículos ou o usuário pedir "padrão Megha", "legenda vermelha da Megha" ou "no formato da referência da Megha", inclusive quando ele só mandar o vídeo de um carro da Megha pedindo legenda. Para outras marcas use a skill edicao-reels-cinematico.
compatibility: ffmpeg/ffprobe, Python 3 (faster-whisper, numpy, scipy, onnxruntime instalados sob demanda), Node com Playwright/Chromium. Fontes Poppins e Montserrat Alternates baixadas do Google Fonts na primeira vez.
---

# Megha Veículos — legendas no formato da referência

Skill independente: tem cópia própria de todos os scripts (não depende nem altera a skill `edicao-reels-cinematico`). O formato foi tirado de um vídeo de referência de loja de seminovos e adaptado à cor da Megha: **vermelho brilhante**. Leia `references/formato.md` antes de montar as legendas: ele descreve cada elemento da referência e quando usar cada animação.

Scripts em `scripts/` (rode com `python3 <skill>/scripts/X.py`; cada um tem `--help`).

## Fluxo para um vídeo já editado (o caso comum: só legenda + efeitos)
Quando o vídeo já vem com cortes, cor, trilha e transições, **não altere nada disso** — só legendas e efeitos sonoros nas ênfases, e o volume original do áudio intacto.

1. **Transcrever** (use o modelo `medium` para nomes de carro e marca):
   ```bash
   python3 scripts/transcrever.py video.mov --saida trabalho/palavras.json --modelo medium \
           --vocabulario "Megha Veículos, Megha, financiamento, seminovos, <modelo do carro>"
   ```
   Leia `palavras.txt`, corrija palavras mal transcritas e confirme com o usuário o que ficou duvidoso.
2. **Recortar a pessoa e achar o rosto** (para nenhuma palavra cair no rosto):
   ```bash
   python3 scripts/recortar.py video.mov --saida trabalho/matte.mkv
   python3 scripts/rostos.py trabalho/matte.mkv --saida trabalho/rostos.json
   ```
3. **Montar os grupos** em `legendas.json` (estilo `megha`). Cada frase vira um grupo; as frases fortes viram **bloco de ênfase**: as palavras antes da ênfase formam a linha pequena em CAIXA ALTA, a ênfase é a palavra grande vermelha, e o que vem depois vira a linha de apoio embaixo. Marque `"conector": true` quando a linha de cima for um conector curto ("pensando em", "e não", "e tem") — ela sai em itálico fino. Dê a cada ênfase uma `animacao` diferente (ver `references/formato.md`) e inclua `rosto` (caixa do rosto no intervalo do grupo, de `rostos.json`). Depois posicione com `posicionar_por_matte` de `scripts/legendas.py` (alterna atrás/na frente; palavra que cruzaria o rosto vai para trás da pessoa).
4. **Prévia, conferir, renderizar**:
   ```bash
   python3 scripts/legendas.py render trabalho/legendas.json --estilo megha --fps 24 \
           --previa 1.2,3.4 --fundo-video video.mov --saida trabalho/leg.mov
   python3 scripts/legendas.py render trabalho/legendas.json --estilo megha --fps 24 --escala 2 --saida trabalho/leg.mov
   ```
   Gera `leg.mov` (frente) e `leg_atras.mov` (atrás da pessoa). `--escala 2` = 4K nativo.
5. **Efeitos sonoros só nas ênfases** (cada animação tem o seu som) e mixagem sem mexer no volume original:
   ```bash
   python3 scripts/legendas.py sfx trabalho/legendas.json --saida trabalho/sfx.json --db -8
   python3 scripts/mixar.py --voz video.mov --tratar-voz nenhum --manter-nivel --sfx trabalho/sfx.json --saida trabalho/audio.wav
   ```
   Compare o volume do efeito com o do vídeo (8–10 dB abaixo da voz) com `ebur128`; ajuste `--db`.
6. **Montar** (4K a partir de 1080p):
   ```bash
   python3 scripts/montar.py --video video.mov --sem-cor --audio trabalho/audio.wav \
           --legendas trabalho/leg.mov --legendas-atras trabalho/leg_atras.mov --matte trabalho/matte.mkv \
           --escala-saida 2 --saida final_4K.mp4
   ```
7. **Conferir** os quadros (`scripts/analisar.py final_4K.mp4 --quadros 12`) antes de entregar: nenhuma palavra no rosto, nenhuma ênfase repetindo animação, texto dentro da área segura (12% de cima, 22% de baixo).

Para um vídeo bruto (sem edição), use `cortar.py`, `cor.py` e `montar.py` como na skill de edição completa; os scripts são os mesmos.

## Entrega
Arquivos 4K passam de 100 MB: para mandar por link, gere uma versão de até ~19 MB com codificação em duas passadas (bitrate = 18,6 MB × 8 / duração − 330 kbps) e publique numa página privada com download.
