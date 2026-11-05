# Cor

## Ordem de trabalho
1. **Normalizar a fonte.** Se `info.json` mostrar `transfer` = `arib-std-b67` (HLG) ou `smpte2084` (PQ), o vídeo é HDR (iPhone, Android topo de linha). Converta para SDR antes de qualquer coisa:
   ```bash
   ffmpeg -i bruto.mov -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" -c:v libx264 -crf 14 -c:a copy bruto_sdr.mp4
   ```
   Se o `zscale` não existir no ffmpeg, use `-vf "colorspace=all=bt709:iall=bt2020:fast=1"` (pior, mas funciona).
2. **Corrigir**: exposição, contraste e dominante de cor. Use `--balanco` só quando houver dominante errada (luz fluorescente esverdeada, tungstênio laranja demais). Ele neutraliza cores intencionais.
3. **Estilizar** com um preset ou LUT.
4. **Unificar** com grão e vinheta, que ajudam cenas de câmeras diferentes a parecerem do mesmo filme.

## Presets (`cor.py --listar`)
- `neutro`: só contraste suave. Use quando o material já está bom ou quando a marca pede cor fiel (produto, comida).
- `cinema-quente`: sombras levemente frias, pele dourada e preto suave. É o mais versátil para pessoas.
- `teal-laranja`: contraste complementar de cinema. Funciona com pele e céu/ambiente frio. Evite com fundos verdes.
- `filme`: preto lavado, altas roladas e grão. Para nostalgia, lifestyle e moda.
- `frio-moderno`: limpo e azulado. Para tech, corporativo premium e arquitetura.
- `noir`: preto e branco. Para trechos de contraste dramático, não para o vídeo inteiro.

## Ajustes finos (somam ao preset)
`--exposicao` (-1..1), `--contraste` (0,8..1,3), `--saturacao` (multiplica, 0,8..1,15), `--temperatura` (-1 frio..+1 quente), `--grao` (0..10) e `--vinheta` (0..1).

## LUTs
Arquivos `.cube` vão em `assets/luts/` ou em qualquer caminho. `--lut arquivo.cube --intensidade 0.6` mistura o LUT com a imagem. A maioria dos LUTs "criativos" fica melhor entre 40% e 70%. LUTs de conversão de log (S-Log3, V-Log, C-Log) são técnicos: use em 100% e antes de qualquer estilo. Nesse caso, rode com `--preset neutro`.

## Como julgar
Gere `--todos` e depois compare 2–3 finalistas em quadros diferentes: rosto em close, plano aberto e B-roll. Procure por:
- pele esverdeada, magenta ou laranja demais;
- preto esmagado (detalhes do cabelo e da roupa escura sumiram);
- branco estourado (céu, janela, camisa);
- B-roll que "não pertence" ao resto. Se acontecer, rode `cor.py` no B-roll isolado e ajuste `--temperatura` e `--saturacao` dele, ou aceite um preset mais neutro para tudo.
