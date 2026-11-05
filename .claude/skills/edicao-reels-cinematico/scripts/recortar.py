#!/usr/bin/env python3
"""Recorta a pessoa do vídeo (matte) para o texto poder passar ATRÁS dela.

Uso:
  python recortar.py trabalho/corte.mkv --saida trabalho/matte.mkv [--escala 0.25]

Gera:
  matte.mkv     - vídeo em tons de cinza: branco = pessoa, preto = fundo (mesmo tamanho/fps)
  matte.json    - por quadro: presença da pessoa, topo da cabeça e centro (frações do quadro).
                  O legendas.py usa isso para posicionar os lockups na altura da cabeça.

Modelo: Robust Video Matting (MobileNetV3, ONNX), feito para vídeo: usa memória entre
quadros, então o recorte não "treme". Baixado uma vez para ~/.cache/edicao-reels/modelos.
--escala controla a resolução interna (0.25 é bom para 1080x1920; suba para 0.4 se o
cabelo ficar recortado demais; desça para 0.2 para ganhar velocidade).
Rode no corte já reenquadrado (corte.mkv), não no bruto.
"""
import argparse
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import info_video  # noqa: E402

MODELO_URL = ("https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/"
              "rvm_mobilenetv3_fp32.onnx")
MODELO = os.path.expanduser("~/.cache/edicao-reels/modelos/rvm_mobilenetv3_fp32.onnx")


def garantir():
    try:
        import onnxruntime  # noqa: F401
        import numpy  # noqa: F401
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "onnxruntime", "numpy"], check=True)
    if not os.path.exists(MODELO):
        os.makedirs(os.path.dirname(MODELO), exist_ok=True)
        print("Baixando modelo de recorte...", file=sys.stderr)
        subprocess.run(["curl", "-sSfL", "-o", MODELO, MODELO_URL], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--saida", default="matte.mkv")
    ap.add_argument("--escala", type=float, default=0.25)
    a = ap.parse_args()

    garantir()
    import numpy as np
    import onnxruntime as ort

    inf = info_video(a.video)
    W, H, fps = inf["largura"], inf["altura"], inf["fps"]
    so = ort.SessionOptions()
    so.intra_op_num_threads = os.cpu_count() or 4
    sess = ort.InferenceSession(MODELO, so, providers=["CPUExecutionProvider"])

    leitor = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", a.video, "-f", "rawvideo",
                               "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    escritor = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo",
                                 "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                                 "-c:v", "libx264", "-crf", "8", "-preset", "veryfast",
                                 "-pix_fmt", "gray", a.saida], stdin=subprocess.PIPE)
    rec = [np.zeros((1, 1, 1, 1), np.float32)] * 4
    dr = np.array([a.escala], np.float32)
    tam = W * H * 3
    quadros, n, t0 = [], 0, time.time()
    while True:
        buf = leitor.stdout.read(tam)
        if len(buf) < tam:
            break
        img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        src = (img.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
        _, pha, *rec = sess.run(None, {"src": src, "r1i": rec[0], "r2i": rec[1],
                                       "r3i": rec[2], "r4i": rec[3], "downsample_ratio": dr})
        m = pha[0, 0]
        escritor.stdin.write((np.clip(m, 0, 1) * 255).astype(np.uint8).tobytes())
        # geometria da pessoa: linhas/colunas com bastante máscara
        linhas = np.where((m > 0.5).mean(1) > 0.01)[0]
        if len(linhas) and (m > 0.5).mean() > 0.01:
            topo = linhas[0] / H
            faixa = m[linhas[0]:min(H, linhas[0] + int(0.08 * H))] > 0.5
            cols = np.where(faixa.any(0))[0]
            cx = float(cols.mean() / W) if len(cols) else 0.5
            quadros.append({"t": round(n / fps, 3), "pessoa": True, "topo": round(float(topo), 4),
                            "cx": round(cx, 4), "area": round(float((m > 0.5).mean()), 4)})
        else:
            quadros.append({"t": round(n / fps, 3), "pessoa": False})
        n += 1
        if n % int(fps * 2) == 0:
            print(f"\r  {n} quadros ({n / (time.time() - t0):.1f} q/s)", end="", file=sys.stderr)
    escritor.stdin.close()
    escritor.wait()
    leitor.wait()
    with open(os.path.splitext(a.saida)[0] + ".json", "w") as f:
        json.dump({"fps": fps, "largura": W, "altura": H, "quadros": quadros}, f)
    print(f"\nOK → {a.saida}  ({n} quadros em {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
