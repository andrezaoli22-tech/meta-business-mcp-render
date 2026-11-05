#!/usr/bin/env python3
"""Estima a caixa do rosto (cabeça) quadro a quadro a partir do matte do recortar.py.

Uso:
  python rostos.py trabalho/matte.mkv --saida trabalho/rostos.json

Para cada quadro: {"t", "x0", "x1", "y0", "y1"} em frações do quadro, ou null sem pessoa.
A cabeça é o topo da silhueta: a largura média das primeiras linhas dá a largura da cabeça,
e a altura do rosto é ~1,4x essa largura. O legendas.py usa isso para garantir que nenhuma
palavra fique sobre o rosto: legenda pequena desce para baixo dele; palavra de lockup que
cruzaria o rosto vai para trás da pessoa.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import info_video  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("matte")
    ap.add_argument("--saida", default="rostos.json")
    a = ap.parse_args()
    inf = info_video(a.matte)
    W, H, fps = 270, 480, inf["fps"]
    proporcao = (inf["largura"] / inf["altura"]) / (W / H)  # corrige se o matte não for 9:16
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", a.matte, "-vf", f"scale={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
    quadros, n = [], 0
    while True:
        buf = p.stdout.read(W * H)
        if len(buf) < W * H:
            break
        m = np.frombuffer(buf, np.uint8).reshape(H, W) > 128
        linhas = np.where(m.sum(1) > 2)[0]
        caixa = None
        if len(linhas) and m.mean() > 0.01:
            topo = linhas[0]
            larguras, centros = [], []
            for y in range(topo + int(0.012 * H), min(H, topo + int(0.05 * H))):
                cols = np.where(m[y])[0]
                if len(cols):
                    # segmento contínuo mais largo da linha (ignora braços/objetos soltos)
                    quebras = np.where(np.diff(cols) > 2)[0]
                    segs = np.split(cols, quebras + 1)
                    s = max(segs, key=len)
                    larguras.append(s[-1] - s[0] + 1)
                    centros.append((s[0] + s[-1]) / 2)
            if larguras:
                hw = float(np.median(larguras)) * 1.08
                cx = float(np.median(centros))
                altura = hw * 1.45 / H * proporcao  # em fração da altura (pixels quadrados)
                caixa = {"t": round(n / fps, 3),
                         "x0": round(max(0, (cx - hw * 0.62) / W), 4),
                         "x1": round(min(1, (cx + hw * 0.62) / W), 4),
                         "y0": round(max(0, topo / H - 0.01), 4),
                         "y1": round(min(1, topo / H + altura * 1.0 + 0.01), 4)}
        quadros.append(caixa or {"t": round(n / fps, 3)})
        n += 1
    p.wait()
    with open(a.saida, "w") as f:
        json.dump({"fps": fps, "quadros": quadros}, f)
    print(f"OK → {a.saida} ({n} quadros)")


if __name__ == "__main__":
    main()
