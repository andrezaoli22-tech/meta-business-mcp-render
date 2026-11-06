#!/usr/bin/env python3
"""Gera versões SECAS (comerciais) dos efeitos: sem cauda de reverb, ataque firme, corte curto.

Uso:
  python secar_sfx.py            # cria assets/sfx/seco/*.wav a partir de assets/sfx/*.wav
  python legendas.py sfx legendas.json --seco ...   # usa a pasta seco/

O que faz em cada som: corta a cauda (duração máxima por tipo), fade-out curto (60–90 ms),
passa-alta em 90 Hz, leve compressão para ficar "na cara" e normaliza o pico.
"""
import glob
import os
import subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(os.path.dirname(AQUI), "assets", "sfx")
DEST = os.path.join(SFX, "seco")

# duração máxima (s) por som: o suficiente para o ataque e o corpo, sem a cauda
DURACAO = {"impacto": 0.42, "passagem": 0.42, "virada": 0.32, "lamina": 0.38, "cascata": 0.5,
           "subida_tonal": 0.95, "corte_metalico": 0.62, "inspiracao": 0.7, "duplo": 0.45,
           "tecla_1": 0.08, "tecla_2": 0.08, "tecla_3": 0.08}


def main():
    os.makedirs(DEST, exist_ok=True)
    for arq in sorted(glob.glob(os.path.join(SFX, "*.wav"))):
        nome = os.path.splitext(os.path.basename(arq))[0]
        if nome.startswith("bolha"):
            continue
        d = DURACAO.get(nome, 0.4)
        fade = min(0.09, d * 0.3)
        af = (f"atrim=0:{d},highpass=f=90,"
              f"acompressor=threshold=-16dB:ratio=4:attack=2:release=40:makeup=2,"
              f"afade=t=out:st={d - fade:.3f}:d={fade:.3f},alimiter=limit=0.89")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", arq, "-af", af,
                        os.path.join(DEST, nome + ".wav")], check=True)
    print("OK →", DEST, sorted(os.listdir(DEST)))


if __name__ == "__main__":
    main()
