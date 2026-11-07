#!/usr/bin/env python3
"""Monta a base de um vídeo curto (stories/reels) a partir de clipes, sem o som deles.

Uso:
  python montar_base.py plano.json --saida base.mov

plano.json:
{
  "largura": 2160, "altura": 3840, "fps": 24, "duracao": 14.5,
  "inicio": 1.94,          # antes disso: preto (abertura em motion cobre a tela)
  "clipes": [
    {"arquivo": "src/8379.mov", "de": 0.3, "dur": 2.42, "zoom": [1.0, 1.08], "foco": [0.5, 0.5]},
    ...
  ]
}
- "dur" é o tempo na linha do tempo; se o trecho do clipe for mais curto, ele é desacelerado.
- "zoom" [de, até] faz aproximação/afastamento suave ao longo do plano (movimento de câmera).
- O resto até "duracao" fica preto (cartela final em motion por cima).
Saída em H.264 com qualidade alta, sem áudio, já no tamanho final (4K de verdade a partir de fontes 4K).
"""
import argparse
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import info_video  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plano")
    ap.add_argument("--saida", default="base.mov")
    a = ap.parse_args()
    p = json.load(open(a.plano))
    W, H, fps = p["largura"], p["altura"], p["fps"]
    base_dir = os.path.dirname(os.path.abspath(a.plano))
    entradas, g, rot = [], [], []
    t = 0.0
    if p.get("inicio", 0) > 0:
        g.append(f"color=c=black:s={W}x{H}:r={fps}:d={p['inicio']:.4f},format=yuv420p[pre]")
        rot.append("[pre]")
        t = p["inicio"]
    for k, c in enumerate(p["clipes"]):
        arq = c["arquivo"] if os.path.isabs(c["arquivo"]) else os.path.join(base_dir, c["arquivo"])
        inf = info_video(arq)
        disp = inf["duracao"] - c.get("de", 0) - 0.05
        dur = c["dur"]
        vel = min(1.0, disp / dur)          # <1 = câmera lenta para preencher
        trecho = dur * vel
        entradas += ["-ss", f"{c.get('de', 0):.3f}", "-t", f"{trecho + 0.1:.3f}", "-i", arq]
        sw, sh = inf["largura"], inf["altura"]
        # cobre o quadro vertical
        if sw / sh > W / H:
            ch, cw = sh, sh * W / H
        else:
            cw, ch = sw, sw * H / W
        fx, fy = c.get("foco", [0.5, 0.5])
        x = int((sw - cw) * fx) // 2 * 2
        y = int((sh - ch) * fy) // 2 * 2
        z0, z1 = c.get("zoom", [1.0, 1.06])
        n = len(rot)
        zexpr = f"({z0}+({z1}-{z0})*(t/{dur:.4f}))"
        g.append(
            f"[{k}:v]crop={int(cw)//2*2}:{int(ch)//2*2}:{x}:{y},scale={W}:{H}:flags=lanczos,"
            f"setpts=(PTS-STARTPTS)/{vel:.5f},fps={fps},trim=duration={dur:.4f},setpts=PTS-STARTPTS,"
            f"scale=w='trunc({W}*{zexpr}/2)*2':h='trunc({H}*{zexpr}/2)*2':eval=frame:flags=bicubic,"
            f"crop={W}:{H}:'(iw-{W})/2':'(ih-{H})/2',setsar=1,format=yuv420p[c{n}]")
        rot.append(f"[c{n}]")
        t += dur
    resto = p["duracao"] - t
    if resto > 0.01:
        g.append(f"color=c=black:s={W}x{H}:r={fps}:d={resto:.4f},format=yuv420p[pos]")
        rot.append("[pos]")
    g.append("".join(rot) + f"concat=n={len(rot)}:v=1:a=0[v]")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *entradas, "-filter_complex", ";".join(g),
           "-map", "[v]", "-t", f"{p['duracao']:.4f}", "-r", str(fps), "-c:v", "libx264", "-preset", "medium",
           "-crf", "14", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-colorspace", "bt709", a.saida]
    subprocess.run(cmd, check=True)
    print("OK", a.saida, f"{t:.2f}s de clipes")


if __name__ == "__main__":
    main()
