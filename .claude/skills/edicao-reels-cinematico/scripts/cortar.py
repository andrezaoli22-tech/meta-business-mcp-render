#!/usr/bin/env python3
"""Aplica a decupagem (edl.json): corta, reenquadra para o formato final e junta.

Uso:
  python cortar.py edl.json --palavras palavras.json --saida-dir trabalho/ [--fps 30]

Gera em --saida-dir:
  corte.mkv               - vídeo cortado e reenquadrado (h264 alta qualidade + áudio PCM)
  voz.wav                 - áudio da fala já cortado (entra no mixar.py)
  palavras_editado.json   - palavras com tempos remapeados para a nova linha do tempo
                            (entra no legendas.py)
  cortes.json             - instantes de cada corte na nova linha do tempo
                            (úteis para posicionar SFX e motion)

Cada segmento pode ter "fonte" própria (outro arquivo) além da "fonte" global, e ainda:
  "transcricao": "t_clipe2.json"  palavras desse segmento vêm dessa transcrição
  "mudo": true                    descarta o áudio do clipe (montagens só com trilha)
Durações são arredondadas para quadros inteiros para manter áudio e vídeo em sincronia.
Cada corte recebe micro-fades de áudio (10 ms) para não estalar.
"""
import argparse
import os
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import erro, info_video, ler_json, par, parse_formato, rodar, salvar_json  # noqa: E402


def filtro_enquadramento(w, h, tw, th, zoom, fx, fy):
    """crop que cobre o quadro de destino (cover) com zoom e ponto de foco."""
    if w / h > tw / th:
        ch, cw = h, h * tw / th
    else:
        cw, ch = w, w * th / tw
    zoom = max(1.0, zoom)
    cw, ch = cw / zoom, ch / zoom
    x = (w - cw) * min(max(fx, 0), 1)
    y = (h - ch) * min(max(fy, 0), 1)
    return (f"crop={par(cw)}:{par(ch)}:{int(x)}:{int(y)},"
            f"scale={tw}:{th}:flags=lanczos,setsar=1")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl")
    ap.add_argument("--palavras", default="")
    ap.add_argument("--saida-dir", default="trabalho")
    ap.add_argument("--fps", type=float, default=30.0)
    ap.add_argument("--threads", type=int, default=3)
    a = ap.parse_args()

    edl = ler_json(a.edl)
    tw, th = parse_formato(edl.get("formato", "9:16"))
    os.makedirs(a.saida_dir, exist_ok=True)
    tmp = os.path.join(a.saida_dir, "_segmentos")
    os.makedirs(tmp, exist_ok=True)

    infos = {}
    jobs, linha, t = [], [], 0.0
    for k, s in enumerate(edl["segmentos"]):
        fonte = s.get("fonte") or edl.get("fonte")
        if not fonte or not os.path.exists(fonte):
            erro(f"fonte não encontrada no segmento {s.get('id', k)}: {fonte}")
        if fonte not in infos:
            infos[fonte] = info_video(fonte)
        inf = infos[fonte]
        n_quadros = max(1, round((s["fim"] - s["inicio"]) * a.fps))
        dur = n_quadros / a.fps
        vf = filtro_enquadramento(inf["largura"], inf["altura"], tw, th,
                                  s.get("zoom", 1.0), s.get("foco_x", 0.5), s.get("foco_y", 0.45))
        vf += f",fps={a.fps}"
        destino = os.path.join(tmp, f"s{k:04d}.mkv")
        com_audio = inf.get("tem_audio") and not s.get("mudo")
        cmd = ["ffmpeg", "-y", "-hide_banner", "-ss", f"{s['inicio']:.3f}", "-t", f"{dur + 0.5:.3f}",
               "-i", fonte]
        if not com_audio:
            cmd += ["-f", "lavfi", "-t", f"{dur:.6f}", "-i", "anullsrc=r=48000:cl=stereo"]
        cmd += ["-map", "0:v:0", "-map", "0:a:0" if com_audio else "1:a:0",
                "-vf", vf, "-frames:v", str(n_quadros),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p"]
        if com_audio:
            cmd += ["-af", f"aresample=48000,apad,atrim=0:{dur:.6f},"
                           f"afade=t=in:d=0.01,afade=t=out:st={max(0, dur - 0.01):.6f}:d=0.01"]
        cmd += ["-c:a", "pcm_s16le", "-ac", "2", "-ar", "48000"]
        cmd.append(destino)
        jobs.append(cmd)
        linha.append({"id": s.get("id", k + 1), "origem_inicio": s["inicio"], "dur": dur,
                      "novo_inicio": t, "palavras": s.get("palavras"), "fonte": fonte,
                      "mudo": bool(s.get("mudo")), "transcricao": s.get("transcricao")})
        t += dur

    print(f"Renderizando {len(jobs)} segmentos ({t:.1f}s)...", file=sys.stderr)
    with ThreadPoolExecutor(a.threads) as ex:
        list(ex.map(rodar, jobs))

    lista = os.path.join(tmp, "lista.txt")
    with open(lista, "w") as f:
        for k in range(len(jobs)):
            f.write(f"file 's{k:04d}.mkv'\n")
    corte = os.path.join(a.saida_dir, "corte.mkv")
    rodar(["ffmpeg", "-y", "-hide_banner", "-f", "concat", "-safe", "0", "-i", lista,
           "-c", "copy", corte])
    rodar(["ffmpeg", "-y", "-hide_banner", "-i", corte, "-vn", "-c:a", "pcm_s24le",
           os.path.join(a.saida_dir, "voz.wav")])

    salvar_json({"duracao": round(t, 3), "largura": tw, "altura": th, "fps": a.fps,
                 "cortes": [round(x["novo_inicio"], 3) for x in linha[1:]],
                 "segmentos": linha}, os.path.join(a.saida_dir, "cortes.json"))

    # palavras: --palavras vale para a "fonte" global; um segmento pode apontar a própria
    # transcrição com "transcricao" (vídeo montado a partir de vários clipes com fala).
    if a.palavras or any(x["transcricao"] for x in linha):
        cache = {}
        fonte_principal = os.path.abspath(edl.get("fonte") or "")
        novas = []
        for seg in linha:
            if seg["mudo"]:
                continue
            arq = seg["transcricao"]
            if not arq:
                if not a.palavras or os.path.abspath(seg["fonte"]) != fonte_principal:
                    continue
                arq = a.palavras
            if arq not in cache:
                cache[arq] = ler_json(arq)
            ini, fim = seg["origem_inicio"], seg["origem_inicio"] + seg["dur"]
            for p in cache[arq]["palavras"]:
                meio = (p["inicio"] + p["fim"]) / 2
                if ini <= meio < fim:
                    q = dict(p)
                    q["inicio"] = round(max(0, p["inicio"] - ini) + seg["novo_inicio"], 3)
                    q["fim"] = round(min(seg["dur"], p["fim"] - ini) + seg["novo_inicio"], 3)
                    q["segmento"] = seg["id"]
                    novas.append(q)
        for k, q in enumerate(novas):
            q["i"] = k
        salvar_json({"duracao": round(t, 3), "palavras": novas},
                    os.path.join(a.saida_dir, "palavras_editado.json"))

    print(f"OK → {corte}  ({t:.2f}s, {tw}x{th} @ {a.fps}fps)")


if __name__ == "__main__":
    main()
