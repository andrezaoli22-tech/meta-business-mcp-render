#!/usr/bin/env python3
"""Mixagem: trata a voz, encaixa a trilha com ducking, posiciona efeitos sonoros e normaliza.

Uso:
  python mixar.py --voz trabalho/voz.wav --saida trabalho/mix.wav \
                  [--musica trilha.mp3 --musica-db -20 --musica-inicio 12.0 --musica-entrada 0] \
                  [--sfx sfx.json] [--duracao 34.2] [--lufs -14] [--tratar-voz padrao|leve|nenhum]

sfx.json — lista de efeitos (tempos na linha do tempo EDITADA):
[
  {"arquivo": "sfx/whoosh_suave.wav", "em": 2.95, "db": -16},
  {"arquivo": "sfx/hit_grave.wav",    "em": 8.40, "db": -12, "fade_out": 0.4},
  {"arquivo": "sfx/riser.wav",        "termina_em": 12.0, "db": -18}   # alinha o FIM do som
]
"termina_em" é o jeito certo de usar risers/reverse: o pico cai exatamente no corte.

Ducking: a trilha abaixa automaticamente sob a voz (sidechain), volta nos respiros.
--musica-inicio pula para um trecho da trilha (ex.: começar no refrão/drop).
--marcar-drop T alinha o instante --musica-inicio da trilha com o instante T do vídeo.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import erro, info_video, ler_json, rodar  # noqa: E402

VOZ = {
    # passa-alta tira ronco; afftdn tira chiado leve; EQ dá presença sem estridência;
    # compressor segura a dinâmica; deesser suaviza "s" depois da compressão.
    "padrao": ("highpass=f=85,afftdn=nr=10:nf=-40:tn=1,"
               "equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,"
               "equalizer=f=11000:t=h:w=0.7:g=1.5,"
               "acompressor=threshold=-20dB:ratio=3:attack=6:release=90:makeup=3,deesser=i=0.35"),
    "leve": "highpass=f=75,acompressor=threshold=-18dB:ratio=2:attack=10:release=120:makeup=2",
    "nenhum": "anull",
}


def medir_loudnorm(arquivo, alvo, tp):
    p = rodar(["ffmpeg", "-hide_banner", "-nostats", "-i", arquivo, "-af",
               f"loudnorm=I={alvo}:TP={tp}:LRA=9:print_format=json", "-f", "null", "-"])
    js = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not js:
        erro("não consegui medir loudness")
    import json
    return json.loads(js.group(0))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voz", required=True)
    ap.add_argument("--saida", default="mix.wav")
    ap.add_argument("--musica")
    ap.add_argument("--musica-db", type=float, default=-20.0,
                    help="ganho da trilha (dB). -18 a -24 sob fala; ~-10 em trechos sem voz")
    ap.add_argument("--musica-inicio", type=float, default=0.0, help="offset dentro da trilha (s)")
    ap.add_argument("--musica-entrada", type=float, default=0.0, help="quando a trilha entra no vídeo (s)")
    ap.add_argument("--marcar-drop", type=float, help="instante do vídeo onde cai --musica-inicio")
    ap.add_argument("--ducking", choices=["leve", "medio", "forte", "nenhum"], default="medio")
    ap.add_argument("--fade-musica", type=float, default=1.2, help="fade out final da trilha (s)")
    ap.add_argument("--sfx")
    ap.add_argument("--duracao", type=float)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--true-peak", type=float, default=-1.0)
    ap.add_argument("--tratar-voz", choices=list(VOZ), default="padrao")
    ap.add_argument("--manter-nivel", action="store_true",
                    help="não normaliza nem limita: só soma os SFX ao áudio original (vídeo já finalizado)")
    a = ap.parse_args()

    dur = a.duracao or info_video(a.voz)["duracao"]
    entradas = ["-i", a.voz]
    g = [f"[0:a]aresample=48000,aformat=channel_layouts=stereo,{VOZ[a.tratar_voz]},"
         f"apad,atrim=0:{dur:.3f}[voz]"]
    mix = ["[vozmix]"]
    n = 1

    if a.musica:
        if a.marcar_drop is not None:
            a.musica_entrada = max(0.0, a.marcar_drop - 0.0)
        entradas += ["-stream_loop", "-1", "-ss", f"{a.musica_inicio:.3f}", "-i", a.musica]
        dm = max(0.1, dur - a.musica_entrada)
        fade_in = 0.03 if a.musica_inicio > 0 else 0.6
        g.append(f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{dm:.3f},"
                 f"volume={a.musica_db}dB,afade=t=in:d={fade_in},"
                 f"afade=t=out:st={max(0, dm - a.fade_musica):.3f}:d={a.fade_musica},"
                 f"adelay={int(a.musica_entrada * 1000)}|{int(a.musica_entrada * 1000)},"
                 f"apad,atrim=0:{dur:.3f}[mus]")
        n += 1
        if a.ducking != "nenhum":
            th, ratio, rel = {"leve": (0.06, 3, 500), "medio": (0.035, 6, 450),
                              "forte": (0.02, 10, 380)}[a.ducking]
            g.append("[voz]asplit=2[vozmix][vozkey]")
            g.append(f"[mus][vozkey]sidechaincompress=threshold={th}:ratio={ratio}:"
                     f"attack=25:release={rel}:makeup=1[musd]")
            mix.append("[musd]")
        else:
            g.append("[voz]anull[vozmix]")
            mix.append("[mus]")
    else:
        g.append("[voz]anull[vozmix]")

    if a.sfx:
        base_sfx = os.path.dirname(os.path.abspath(a.sfx))
        for k, s in enumerate(ler_json(a.sfx)):
            arq = s["arquivo"] if os.path.isabs(s["arquivo"]) else os.path.join(base_sfx, s["arquivo"])
            if not os.path.exists(arq):
                erro(f"SFX não encontrado: {arq}")
            if "termina_em" in s:
                d_sfx = info_video(arq)["duracao"]
                em = s["termina_em"] - d_sfx
            else:
                em = s["em"]
            corte_ini = max(0.0, -em)          # se começaria antes de 0, corta o começo
            em = max(0.0, em)
            entradas += ["-i", arq]
            cadeia = (f"[{n}:a]aresample=48000,aformat=channel_layouts=stereo,"
                      f"atrim=start={corte_ini:.3f},asetpts=PTS-STARTPTS,volume={s.get('db', -14)}dB")
            if s.get("fade_out"):
                d_sfx = info_video(arq)["duracao"] - corte_ini
                cadeia += f",afade=t=out:st={max(0, d_sfx - s['fade_out']):.3f}:d={s['fade_out']}"
            cadeia += f",adelay={int(em * 1000)}|{int(em * 1000)},apad,atrim=0:{dur:.3f}[sfx{k}]"
            g.append(cadeia)
            mix.append(f"[sfx{k}]")
            n += 1

    g.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0:dropout_transition=0,"
             "alimiter=limit=0.95:attack=3:release=60[pre]")
    if a.manter_nivel:
        g[-1] = "".join(mix) + f"amix=inputs={len(mix)}:normalize=0:dropout_transition=0[pre]"
        # 24 bits: testado contra ponto flutuante, é o que chega mais perto do nível original
        # depois da codificação AAC final (o AAC lida pior com amostras acima de 0 dBFS)
        rodar(["ffmpeg", "-y", "-hide_banner", *entradas, "-filter_complex", ";".join(g),
               "-map", "[pre]", "-t", f"{dur:.3f}", "-c:a", "pcm_s24le", a.saida])
        print(f"OK → {a.saida}  ({dur:.2f}s, nível original mantido)")
        return
    pre = os.path.splitext(a.saida)[0] + "_pre.wav"
    rodar(["ffmpeg", "-y", "-hide_banner", *entradas, "-filter_complex", ";".join(g),
           "-map", "[pre]", "-t", f"{dur:.3f}", "-c:a", "pcm_s24le", pre])

    # loudnorm em duas passagens (linear): atinge o alvo sem "bombear"
    m = medir_loudnorm(pre, a.lufs, a.true_peak)
    rodar(["ffmpeg", "-y", "-hide_banner", "-i", pre, "-af",
           f"loudnorm=I={a.lufs}:TP={a.true_peak}:LRA=9:measured_I={m['input_i']}:"
           f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
           f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
           f"aresample=48000", "-c:a", "pcm_s24le", a.saida])
    os.remove(pre)
    f = medir_loudnorm(a.saida, a.lufs, a.true_peak)
    print(f"OK → {a.saida}  ({dur:.2f}s, {f['input_i']} LUFS, pico {f['input_tp']} dBTP)")


if __name__ == "__main__":
    main()
