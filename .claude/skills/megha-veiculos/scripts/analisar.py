#!/usr/bin/env python3
"""Analisa um vídeo: dados técnicos, loudness e uma folha de contato para inspeção visual.

Uso:
  python analisar.py VIDEO [--saida DIR] [--quadros 12] [--em 1.5,4.2]

Gera em DIR:
  info.json       - resolução, fps, duração, áudio, loudness integrada (LUFS)
  folha.png       - grade com N quadros espalhados pelo vídeo (abra com Read para ver)
  quadro_T.png    - quadros avulsos nos tempos pedidos em --em
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import info_video, rodar, salvar_json  # noqa: E402


def loudness(caminho):
    p = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", caminho, "-vn",
               "-af", "ebur128=peak=true", "-f", "null", "-"])
    txt = p.stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", txt)
    tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", txt)
    return {"lufs_integrado": float(i[-1]) if i else None,
            "true_peak_db": float(tp[-1]) if tp else None}


def folha(caminho, dur, n, destino):
    import tempfile
    cols = 4 if n > 6 else n
    linhas = -(-n // cols)
    passo = dur / (n + 1)
    tmp = tempfile.mkdtemp(prefix="folha_")
    for k in range(n):
        t = passo * (k + 1)
        rotulo = f"{int(t // 60):02d}\\:{t % 60:05.2f}"
        rodar(["ffmpeg", "-y", "-hide_banner", "-ss", f"{t:.3f}", "-i", caminho,
               "-frames:v", "1", "-vf",
               f"scale=360:-2,drawtext=text='{rotulo}':x=8:y=8:fontcolor=white:"
               f"fontsize=22:box=1:boxcolor=black@0.6:boxborderw=5",
               os.path.join(tmp, f"q{k:03d}.png")])
    rodar(["ffmpeg", "-y", "-hide_banner", "-i", os.path.join(tmp, "q%03d.png"),
           "-vf", f"tile={cols}x{linhas}:padding=6:margin=6:color=0x111111",
           "-frames:v", "1", destino])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--saida", default="analise")
    ap.add_argument("--quadros", type=int, default=12)
    ap.add_argument("--em", default="", help="tempos (s) separados por vírgula")
    a = ap.parse_args()

    os.makedirs(a.saida, exist_ok=True)
    info = info_video(a.video)
    if info.get("tem_audio"):
        info.update(loudness(a.video))
    salvar_json(info, os.path.join(a.saida, "info.json"))

    if "largura" in info:
        folha(a.video, info["duracao"], a.quadros, os.path.join(a.saida, "folha.png"))
        for t in [x for x in a.em.split(",") if x.strip()]:
            rodar(["ffmpeg", "-y", "-hide_banner", "-ss", t, "-i", a.video,
                   "-frames:v", "1", os.path.join(a.saida, f"quadro_{float(t):.2f}.png")])

    for k, v in info.items():
        print(f"{k}: {v}")
    print(f"\nFolha de contato: {os.path.join(a.saida, 'folha.png')}")


if __name__ == "__main__":
    main()
