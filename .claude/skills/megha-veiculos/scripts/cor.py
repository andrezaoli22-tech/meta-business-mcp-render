#!/usr/bin/env python3
"""Correção e grade de cor com FFmpeg. Gera comparações antes/depois para inspeção.

Uso:
  python cor.py VIDEO --preset cinema-quente --comparar 2.0,7.5 --saida-dir cor/
  python cor.py VIDEO --lut assets/luts/minha.cube --intensidade 0.7 --comparar 3
  python cor.py --listar

Este script NÃO renderiza o vídeo inteiro: ele produz quadros de comparação
(antes | depois) para você olhar e escolher. A grade escolhida é aplicada na
montagem final (montar.py --cor ... ), numa única codificação.

Ajustes finos (somam-se ao preset): --exposicao, --contraste, --saturacao,
--temperatura (-1 frio … +1 quente), --grao (0–10), --vinheta (0–1),
--balanco (corrige dominante de cor; desligado por padrão).
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import erro, rodar  # noqa: E402

# Cada preset é uma cadeia de filtros de correção + estilo. Todos foram pensados para
# preservar o tom de pele: saturação contida, contraste por curvas (não por "eq" pesado)
# e split-tone leve (sombras frias, altas quentes) em vez de filtros prontos de app.
PRESETS = {
    "neutro": {
        "desc": "Só correção: contraste suave, cor fiel. Base para tudo (some --balanco se houver dominante).",
        "filtros": "curves=all='0/0.02 0.25/0.23 0.5/0.5 0.75/0.77 1/0.98'",
        "sat": 1.02, "grao": 0, "vinheta": 0.0},
    "cinema-quente": {
        "desc": "Pele dourada, sombras levemente frias, preto suave. Ótimo para pessoas e lifestyle.",
        "filtros": ("curves=all='0/0.035 0.2/0.17 0.5/0.5 0.8/0.82 1/0.97',"
                    "colorbalance=rs=-0.03:gs=0.0:bs=0.05:rm=0.03:gm=0.0:bm=-0.02:"
                    "rh=0.04:gh=0.015:bh=-0.04"),
        "sat": 0.94, "grao": 3, "vinheta": 0.22},
    "teal-laranja": {
        "desc": "Contraste complementar clássico de cinema; sombras azul-petróleo, pele laranja.",
        "filtros": ("curves=all='0/0.03 0.22/0.18 0.5/0.5 0.78/0.81 1/0.97',"
                    "colorbalance=rs=-0.07:gs=-0.01:bs=0.07:rm=0.02:bm=-0.03:"
                    "rh=0.05:gh=0.01:bh=-0.05"),
        "sat": 0.98, "grao": 3, "vinheta": 0.25},
    "filme": {
        "desc": "Emulação de película: preto lavado, altas roladas, verde nas sombras, grão.",
        "filtros": ("curves=r='0/0.05 0.5/0.52 1/0.95':g='0/0.06 0.5/0.5 1/0.94':"
                    "b='0/0.07 0.5/0.47 1/0.9',"
                    "colorbalance=gs=0.02:bh=-0.03"),
        "sat": 0.88, "grao": 6, "vinheta": 0.3},
    "frio-moderno": {
        "desc": "Limpo e frio, tech/corporativo premium. Brancos neutros, sombras azuladas.",
        "filtros": ("curves=all='0/0.02 0.25/0.22 0.5/0.5 0.75/0.78 1/0.99',"
                    "colorbalance=rs=-0.02:bs=0.05:rm=-0.01:bm=0.02:rh=0.0:bh=0.01"),
        "sat": 0.92, "grao": 2, "vinheta": 0.15},
    "noir": {
        "desc": "Preto e branco contrastado com grão. Use em trechos, não no vídeo todo.",
        "filtros": "hue=s=0,curves=all='0/0.0 0.25/0.18 0.5/0.5 0.75/0.84 1/1'",
        "sat": 1.0, "grao": 7, "vinheta": 0.35},
}


def cadeia(preset="neutro", lut=None, intensidade=1.0, exposicao=0.0, contraste=1.0,
           saturacao=1.0, temperatura=0.0, grao=None, vinheta=None, balanco=False):
    """Devolve a string de filtros de vídeo para a grade pedida."""
    if preset not in PRESETS:
        erro(f"preset desconhecido: {preset}. Opções: {', '.join(PRESETS)}")
    p = PRESETS[preset]
    f = []
    if balanco:
        # gray world corrige dominante de câmera/celular, mas neutraliza cor intencional
        # (pôr do sol, parede verde, luz de neon). Só ligue quando houver dominante errada.
        f.append("format=gbrp,grayworld,format=yuv444p")
    if exposicao or contraste != 1.0:
        f.append(f"eq=brightness={exposicao * 0.1:.3f}:contrast={contraste:.3f}")
    if temperatura:
        t = max(-1, min(1, temperatura)) * 0.06
        f.append(f"colorbalance=rm={t:.3f}:bm={-t:.3f}:rh={t:.3f}:bh={-t:.3f}")
    f.append(p["filtros"])
    sat = p["sat"] * saturacao
    if abs(sat - 1) > 0.005:
        f.append(f"eq=saturation={sat:.3f}")
    cadeia_base = ",".join(f)
    if lut:
        if not os.path.exists(lut):
            erro(f"LUT não encontrada: {lut}")
        lut_esc = lut.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        if intensidade >= 0.999:
            cadeia_base += f",lut3d='{lut_esc}'"
        else:
            cadeia_base += (f",split[lA][lB];[lB]lut3d='{lut_esc}'[lC];"
                            f"[lA][lC]blend=all_mode=normal:all_opacity={intensidade:.3f}")
    g = p["grao"] if grao is None else grao
    v = p["vinheta"] if vinheta is None else vinheta
    if v > 0:
        cadeia_base += f",vignette=angle={0.35 + 0.45 * v:.3f}:mode=forward"
    if g > 0:
        cadeia_base += f",noise=c0s={g * 1.6:.1f}:c0f=t+u:c1s=0:c2s=0"
    return cadeia_base + ",format=yuv420p"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video", nargs="?")
    ap.add_argument("--listar", action="store_true")
    ap.add_argument("--preset", default="neutro")
    ap.add_argument("--lut")
    ap.add_argument("--intensidade", type=float, default=1.0)
    ap.add_argument("--exposicao", type=float, default=0.0)
    ap.add_argument("--contraste", type=float, default=1.0)
    ap.add_argument("--saturacao", type=float, default=1.0)
    ap.add_argument("--temperatura", type=float, default=0.0)
    ap.add_argument("--grao", type=float)
    ap.add_argument("--vinheta", type=float)
    ap.add_argument("--balanco", action="store_true", help="corrige dominante de cor (gray world)")
    ap.add_argument("--comparar", default="1", help="tempos (s) dos quadros de comparação")
    ap.add_argument("--todos", action="store_true", help="compara todos os presets lado a lado")
    ap.add_argument("--saida-dir", default="cor")
    a = ap.parse_args()

    if a.listar:
        for nome, p in PRESETS.items():
            print(f"{nome:15} {p['desc']}")
        return
    if not a.video:
        erro("informe o vídeo")
    os.makedirs(a.saida_dir, exist_ok=True)

    opcoes = dict(lut=a.lut, intensidade=a.intensidade, exposicao=a.exposicao,
                  contraste=a.contraste, saturacao=a.saturacao, temperatura=a.temperatura,
                  grao=a.grao, vinheta=a.vinheta, balanco=a.balanco)
    for t in [x for x in a.comparar.split(",") if x.strip()]:
        if a.todos:
            nomes = list(PRESETS)
            ramos = "".join(f"[o{k}]" for k in range(len(nomes) + 1))
            g = f"[0:v]scale=360:-2,split={len(nomes) + 1}{ramos};"
            g += "[o0]drawtext=text='original':x=10:y=10:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[r0];"
            for k, n in enumerate(nomes, 1):
                g += (f"[o{k}]{cadeia(n, **{**opcoes, 'lut': None})},drawtext=text='{n}':x=10:y=10:"
                      f"fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[r{k}];")
            g += "".join(f"[r{k}]" for k in range(len(nomes) + 1)) + f"hstack=inputs={len(nomes) + 1}"
            destino = os.path.join(a.saida_dir, f"presets_{float(t):.2f}.png")
        else:
            g = (f"[0:v]split[a][b];[b]{cadeia(a.preset, **opcoes)}[g];"
                 f"[a]drawtext=text='antes':x=14:y=14:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6[a2];"
                 f"[g]drawtext=text='{a.preset}':x=14:y=14:fontsize=36:fontcolor=white:box=1:boxcolor=black@0.6[g2];"
                 f"[a2][g2]hstack,scale='min(1600,iw)':-2")
            destino = os.path.join(a.saida_dir, f"comparar_{a.preset}_{float(t):.2f}.png")
        rodar(["ffmpeg", "-y", "-hide_banner", "-ss", t, "-i", a.video, "-frames:v", "1",
               "-filter_complex", g, destino])
        print(destino)


if __name__ == "__main__":
    main()
