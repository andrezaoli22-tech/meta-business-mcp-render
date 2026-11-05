#!/usr/bin/env python3
"""Montagem final: vídeo cortado + B-roll + cor + motion + legendas + áudio mixado → MP4.

Uso:
  python montar.py --video trabalho/corte.mkv --audio trabalho/mix.wav \
                   --cor cinema-quente [--lut x.cube --intensidade 0.6] \
                   --camadas camadas.json --legendas trabalho/legendas.mov \
                   --saida final.mp4 [--qualidade alta|rascunho] [--trecho 0:8]

camadas.json — tudo que entra por cima da base, em ordem (tempos na linha do tempo editada):
[
  {"tipo": "broll",  "arquivo": "broll/mao_teclado.mp4", "em": 4.2, "dur": 2.1,
   "inicio_fonte": 1.0, "zoom": 1.0, "foco_x": 0.5, "foco_y": 0.5, "rampa": 1.06},
  {"tipo": "motion", "arquivo": "trabalho/titulo.mov",    "em": 0.0},
  {"tipo": "flash",  "em": 9.95, "dur": 0.12},           # flash branco curto de transição
  {"tipo": "zoom",   "em": 14.0, "dur": 1.2, "de": 1.0, "ate": 1.08}   # push-in suave na base
]
- broll: cobre a imagem mantendo a voz por baixo (L-cut natural). "rampa" = zoom lento ao longo do plano.
- motion: camada transparente do motion.py. Legendas entram por último (sempre por cima).
- A cor é aplicada à base + B-roll juntos, antes dos grafismos, para tudo casar.
- --trecho renderiza só um pedaço (ex.: 0:8) para revisar rápido.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import erro, info_video, ler_json, rodar  # noqa: E402
from cor import cadeia as cadeia_cor  # noqa: E402
from cortar import filtro_enquadramento  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--audio")
    ap.add_argument("--cor", default="neutro")
    ap.add_argument("--lut")
    ap.add_argument("--intensidade", type=float, default=1.0)
    ap.add_argument("--grao", type=float)
    ap.add_argument("--vinheta", type=float)
    ap.add_argument("--saturacao", type=float, default=1.0)
    ap.add_argument("--temperatura", type=float, default=0.0)
    ap.add_argument("--sem-cor", action="store_true")
    ap.add_argument("--balanco", action="store_true")
    ap.add_argument("--camadas")
    ap.add_argument("--legendas")
    ap.add_argument("--saida", default="final.mp4")
    ap.add_argument("--qualidade", choices=["alta", "rascunho"], default="alta")
    ap.add_argument("--trecho", default="", help="ini:fim em segundos, para prévia")
    a = ap.parse_args()

    base = info_video(a.video)
    W, H, fps, dur = base["largura"], base["altura"], base["fps"], base["duracao"]
    # a duração do container .mkv concatenado pode passar alguns quadros do conteúdo real;
    # cortes.json (ao lado do corte) e o áudio mixado têm a duração exata
    cortes = os.path.join(os.path.dirname(os.path.abspath(a.video)), "cortes.json")
    if os.path.exists(cortes):
        dur = min(dur, ler_json(cortes)["duracao"])
    if a.audio:
        dur = min(dur, info_video(a.audio)["duracao"])
    entradas = ["-i", a.video]
    n = 1
    g = []
    camadas = ler_json(a.camadas) if a.camadas else []
    base_dir = os.path.dirname(os.path.abspath(a.camadas)) if a.camadas else os.getcwd()

    def caminho(p):
        return p if os.path.isabs(p) else os.path.join(base_dir, p)

    # ---- base com zooms (push-in) aplicados por expressão
    zooms = [c for c in camadas if c["tipo"] == "zoom"]
    atual = "[0:v]setpts=PTS-STARTPTS"
    if zooms:
        expr = "1"
        for z in zooms:
            t0, t1 = z["em"], z["em"] + z["dur"]
            de, ate = z.get("de", 1.0), z.get("ate", 1.08)
            # rampa suave (smoothstep) dentro do intervalo; mantém o valor final até o próximo corte se "segura"
            prog = f"(clip((t-{t0})/{z['dur']},0,1))"
            suave = f"({prog}*{prog}*(3-2*{prog}))"
            fim = t1 if not z.get("segura") else z["segura"]
            expr = f"if(between(t,{t0},{fim}),{de}+({ate}-{de})*{suave},{expr})"
        atual += (f",scale=w='trunc({W}*({expr})/2)*2':h='trunc({H}*({expr})/2)*2':eval=frame:flags=bicubic,"
                  f"crop={W}:{H}:'(iw-{W})/2':'(ih-{H})/2'")
    g.append(atual + "[b0]")
    rotulo = "[b0]"

    # ---- B-roll
    k = 0
    for c in camadas:
        if c["tipo"] != "broll":
            continue
        arq = caminho(c["arquivo"])
        if not os.path.exists(arq):
            erro(f"B-roll não encontrado: {arq}")
        inf = info_video(arq)
        entradas += ["-ss", f"{c.get('inicio_fonte', 0):.3f}", "-t", f"{c['dur'] + 0.1:.3f}", "-i", arq]
        enq = filtro_enquadramento(inf["largura"], inf["altura"], W, H, c.get("zoom", 1.0),
                                   c.get("foco_x", 0.5), c.get("foco_y", 0.5))
        rampa = c.get("rampa", 1.0)
        extra = ""
        if rampa != 1.0:
            extra = (f",scale=w='trunc({W}*(1+({rampa}-1)*t/{c['dur']})/2)*2':"
                     f"h='trunc({H}*(1+({rampa}-1)*t/{c['dur']})/2)*2':eval=frame,"
                     f"crop={W}:{H}:'(iw-{W})/2':'(ih-{H})/2'")
        g.append(f"[{n}:v]{enq},fps={fps}{extra},setpts=PTS-STARTPTS+{c['em']}/TB[br{k}]")
        g.append(f"{rotulo}[br{k}]overlay=eof_action=pass:enable='between(t,{c['em']},"
                 f"{c['em'] + c['dur']})'[bb{k}]")
        rotulo = f"[bb{k}]"
        n += 1
        k += 1

    # ---- cor (base + B-roll juntos)
    if not a.sem_cor:
        cc = cadeia_cor(a.cor, lut=a.lut, intensidade=a.intensidade, grao=a.grao, vinheta=a.vinheta,
                        saturacao=a.saturacao, temperatura=a.temperatura, balanco=a.balanco)
        g.append(f"{rotulo}{cc}[cor]")
        rotulo = "[cor]"

    # ---- flashes
    for k, c in enumerate([c for c in camadas if c["tipo"] == "flash"]):
        t0, d = c["em"], c.get("dur", 0.12)
        cor = c.get("cor", "white")
        g.append(f"color=c={cor}:s={W}x{H}:r={fps}:d={dur:.3f},format=rgba,"
                 f"fade=t=in:st={t0 - d / 2:.3f}:d={d / 2:.3f}:alpha=1,"
                 f"fade=t=out:st={t0:.3f}:d={d / 2:.3f}:alpha=1[fl{k}]")
        g.append(f"{rotulo}[fl{k}]overlay=enable='between(t,{t0 - d / 2},{t0 + d / 2})'[fo{k}]")
        rotulo = f"[fo{k}]"

    # ---- motion + legendas (camadas com alfa)
    graficos = [c for c in camadas if c["tipo"] == "motion"]
    if a.legendas:
        graficos.append({"tipo": "motion", "arquivo": a.legendas, "em": 0.0})
    for k, c in enumerate(graficos):
        arq = caminho(c["arquivo"]) if c["arquivo"] != a.legendas else a.legendas
        if not os.path.exists(arq):
            erro(f"camada não encontrada: {arq}")
        entradas += ["-i", arq]
        g.append(f"[{n}:v]format=rgba,setpts=PTS-STARTPTS+{c['em']}/TB[gr{k}]")
        g.append(f"{rotulo}[gr{k}]overlay=eof_action=pass:format=auto[go{k}]")
        rotulo = f"[go{k}]"
        n += 1

    g.append(f"{rotulo}format=yuv420p[vout]")

    cmd = ["ffmpeg", "-y", "-hide_banner", *entradas]
    if a.audio:
        cmd += ["-i", a.audio]
    cmd += ["-filter_complex", ";".join(g), "-map", "[vout]"]
    cmd += ["-map", f"{n}:a"] if a.audio else ["-map", "0:a?"]
    if a.trecho:
        ini, fim = (float(x) for x in a.trecho.split(":"))
        cmd += ["-ss", str(ini), "-t", str(fim - ini)]
    else:
        cmd += ["-t", f"{dur:.3f}"]
    if a.qualidade == "alta":
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-profile:v", "high",
                "-tune", "film"]
    else:
        cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "24"]
    cmd += ["-pix_fmt", "yuv420p", "-r", str(fps), "-color_primaries", "bt709", "-color_trc", "bt709",
            "-colorspace", "bt709", "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
            "-movflags", "+faststart", a.saida]
    print("Montando...", file=sys.stderr)
    rodar(cmd)
    print(f"OK → {a.saida}")


if __name__ == "__main__":
    main()
