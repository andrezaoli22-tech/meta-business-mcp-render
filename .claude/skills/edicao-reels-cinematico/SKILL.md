---
name: edicao-reels-cinematico
description: Edita vídeos do zero com acabamento profissional e cinematográfico, principalmente Reels/TikTok/Shorts 9:16. Cobre decupagem (cortar silêncios, vícios e takes errados), reenquadramento, legendas dinâmicas de 2–3 palavras com palavras destacadas em lockup tipográfico, correção e grade de cor, trilha com ducking, efeitos sonoros, B-roll, motion graphics (títulos, lower thirds, CTA, números) e exportação final. Use sempre que o usuário pedir para editar, cortar, decupar, legendar, colorir, sonorizar, animar ou finalizar um vídeo, reels, criativo de anúncio em vídeo ou corte de podcast/depoimento, mesmo que ele cite só uma dessas etapas ou só mande o arquivo bruto dizendo "edita isso".
compatibility: ffmpeg/ffprobe, Python 3 (faster-whisper é instalado sob demanda), Node com Playwright/Chromium (motion e legendas). Fontes do Google Fonts são baixadas na primeira vez.
---

# Edição de Reels com cara de cinema

O objetivo é um vídeo que pareça feito por um editor com intenção. Não deve parecer saído de um gerador automático. As ferramentas daqui fazem o trabalho mecânico. O que separa um vídeo profissional de um "com cara de IA" são as **decisões**: o que cortar, onde dar punch-in, qual palavra merece destaque, quando a música respira, quando não colocar nada. Essas decisões são suas. Antes de começar, leia `references/direcao.md`: ele traz os critérios que guiam cada escolha abaixo.

Todos os scripts ficam em `scripts/`. Rode-os com `python3 <skill>/scripts/X.py` (e `node` para o `.cjs`). Cada um tem `--help` com o formato completo dos arquivos.

## Fluxo

Trabalhe numa pasta de projeto (ex.: `projeto/`), com os intermediários em `projeto/trabalho/`. As etapas são encadeadas, mas você pode entrar em qualquer uma: se o usuário só quer legenda, comece no passo 2 e pule para o 5.

### 1. Entender o material
```bash
python3 scripts/analisar.py bruto.mp4 --saida projeto/analise
```
Abra `analise/folha.png` com Read para **ver** o material: enquadramento, luz, onde está o rosto (isso define `foco_y`) e se há dominante de cor. Leia `info.json` para resolução, fps e loudness. Se vierem vários arquivos (takes, B-roll), analise cada um.

Se o usuário não disse o objetivo do vídeo (vender, ensinar, institucional), o público e a duração-alvo, pergunte. Isso muda o ritmo inteiro. Se ele mandou arquivos de música/SFX, ouça a descrição deles pelo nome e pela duração. Você não ouve áudio, então peça ao usuário o BPM, o clima ou o ponto do drop se isso for importante.

### 2. Transcrever
```bash
python3 scripts/transcrever.py bruto.mp4 --saida projeto/trabalho/palavras.json \
        --vocabulario "nome da marca, produto, pessoas"
```
Leia `palavras.txt`. Palavras com baixa confiança aparecem marcadas: confira se são vícios mal transcritos (o Whisper costuma transformar "hum" em "bom" e "ahn" em "ah"). Use `--modelo medium` se a transcrição vier ruim.

### 3. Decupar
```bash
python3 scripts/decupar.py projeto/trabalho/palavras.json --saida projeto/trabalho/edl.json \
        --punch-in 1.12 [--remover-indices 0-6,41-47]
```
O script corta silêncios e vícios. **Takes repetidos são com você**: leia a transcrição, identifique frases ditas duas vezes (geralmente o último take é o bom) e remova os índices das palavras descartadas. Depois edite `edl.json` à mão para:
- reordenar e trazer a frase mais forte para o começo (gancho nos 1,5 s iniciais);
- ajustar `zoom`/`foco_x`/`foco_y` por segmento. Punch-in só onde há jump cut ou ênfase, não alternando mecanicamente;
- adicionar segmentos de outros arquivos com `"fonte"` própria.

Leia `edl.txt` e confira se a fala continua fazendo sentido depois dos cortes.

### 4. Cortar e reenquadrar
```bash
python3 scripts/cortar.py projeto/trabalho/edl.json --palavras projeto/trabalho/palavras.json \
        --saida-dir projeto/trabalho
```
Gera `corte.mkv`, `voz.wav`, `palavras_editado.json` (tempos já na nova linha do tempo) e `cortes.json` (instantes de cada corte, úteis para SFX e motion).

### 5. Legendas
```bash
python3 scripts/legendas.py agrupar projeto/trabalho/palavras_editado.json \
        --saida projeto/trabalho/legendas.json [--destaques "tudo,agora"]
python3 scripts/legendas.py render projeto/trabalho/legendas.json --estilo editorial \
        --previa 2.1,5.4 --fundo-video projeto/trabalho/corte.mkv --saida projeto/trabalho/legendas.mov
python3 scripts/legendas.py render projeto/trabalho/legendas.json --estilo editorial \
        --saida projeto/trabalho/legendas.mov
```
O padrão são 2–3 palavras por vez, reveladas conforme a fala. **Só destaque palavras quando o usuário pedir** (ou quando ele pedir que você escolha). Aí escolha poucas: a palavra que carrega o sentido da frase, uma a cada 5–8 s no máximo. A palavra destacada vira um lockup, grande no centro, com as palavras de apoio pequenas encaixadas na largura dela. Para marcar à mão, ponha `"destaque": true` na palavra em `legendas.json`. Revise os grupos ali também: junte ou separe onde o sentido pedir.

Gere a prévia sobre o vídeo e abra as imagens antes do render completo. Verifique contraste, tamanho e se nada colide com o rosto ou com os grafismos. Se um CTA ou título ocupar a área da legenda, use `--zona de:ate:0.36` (sobe a legenda) ou `--zona de:ate:ocultar`. Estilos e regras de tipografia estão em `references/legendas.md`.

### 6. Cor
```bash
python3 scripts/cor.py projeto/trabalho/corte.mkv --todos --comparar 1.5,6
python3 scripts/cor.py projeto/trabalho/corte.mkv --preset cinema-quente --comparar 1.5,6 --grao 3
```
Abra as comparações e escolha olhando: a pele precisa parecer pele. A grade só é aplicada na montagem final. Receitas, LUTs e ajustes finos estão em `references/cor.md`.

### 7. Motion
```bash
python3 scripts/motion.py listar
python3 scripts/motion.py titulo --params '{"titulo":"…","subtitulo":"…"}' --previa 0.5,1.5 --saida projeto/trabalho/titulo.mov
python3 scripts/motion.py titulo --params '{"titulo":"…","subtitulo":"…"}' --saida projeto/trabalho/titulo.mov
```
Templates disponíveis: `titulo`, `lower-terco`, `cta`, `numero` e `palavra` (interstício em tela cheia). Para algo sob medida, escreva um HTML novo seguindo o contrato de `references/motion.md`. Ele é renderizado quadro a quadro com transparência. Sempre gere a prévia e olhe antes de renderizar.

### 8. Áudio
```bash
python3 scripts/mixar.py --voz projeto/trabalho/voz.wav --musica trilha.mp3 --musica-db -20 \
        --sfx projeto/sfx.json --saida projeto/trabalho/mix.wav
```
A voz é tratada (limpeza, presença e compressão), a trilha abaixa sob a fala (ducking) e o resultado é normalizado a -14 LUFS. O usuário fornece os arquivos de música e SFX. Se não vierem, pergunte, ou entregue só com a voz tratada e diga isso. Para posicionar SFX, use `cortes.json` e os instantes dos motions. Regras de volume e de onde usar cada som estão em `references/audio.md`.

### 9. Montagem e revisão
```bash
python3 scripts/montar.py --video projeto/trabalho/corte.mkv --audio projeto/trabalho/mix.wav \
        --cor cinema-quente --camadas projeto/camadas.json --legendas projeto/trabalho/legendas.mov \
        --qualidade rascunho --trecho 0:6 --saida projeto/previa.mp4
python3 scripts/montar.py ... --saida projeto/final.mp4
python3 scripts/analisar.py projeto/final.mp4 --saida projeto/qa --quadros 12
```
`camadas.json` reúne B-roll, motion, flashes e push-ins (formato no `--help`). Faça um rascunho de um trecho primeiro. Na versão final, **abra `qa/folha.png` e confira** legenda sobre rosto, grafismo cortado, B-roll fora de cor, quadro preto e loudness perto de -14 LUFS. Só entregue depois disso. Ao entregar, diga ao usuário o que foi feito e quais decisões você tomou (o que cortou, por que destacou tal palavra, qual grade usou), para ele poder pedir ajustes.

## Formatos e entregas
- Formato no `edl.json`: `"9:16"` (padrão), `"4:5"`, `"1:1"` ou `"16:9"`. Para várias versões, rode `cortar.py` com EDLs que mudam só `formato` e `foco_*`, e renderize legenda e motion no tamanho certo (`--largura/--altura`).
- Safe zone do Reels: nada importante nos 12% de cima, nos 22% de baixo e nos 12% da direita (botões). As legendas já ficam em 64% da altura por padrão.
- Exportação: H.264 High, BT.709, AAC 320k, 48 kHz, `+faststart`. É o que Instagram, TikTok e Meta Ads aceitam sem recomprimir mal.

## Quando algo não sai como esperado
- Fonte não carregou (a legenda aparece em Inter/sans): o Google Fonts estava inacessível. Coloque o `.ttf`/`.otf` em `assets/fontes/` e passe `--fonte-destaque "NomeDoArquivo"`.
- Áudio e vídeo dessincronizados depois do corte: confira se o bruto tem fps variável (comum em celular). Reconverta antes com `ffmpeg -i bruto.mov -r 30 -c:v libx264 -crf 14 -c:a pcm_s16le bruto_cfr.mkv`.
- Vídeo HDR de iPhone (`transfer` = `arib-std-b67` ou `smpte2084` em `info.json`): converta para SDR antes, ou as cores ficam lavadas. Os comandos estão em `references/cor.md`.
