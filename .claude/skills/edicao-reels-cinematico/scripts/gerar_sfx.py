#!/usr/bin/env python3
"""Sintetiza a biblioteca de efeitos sonoros da skill (sons originais, livres para uso).

Uso:
  python gerar_sfx.py [--saida assets/sfx]

Gera:
  brilho_entra.wav  - cintilar ascendente com sino suave: texto dourado/brilhante aparecendo
  brilho_sai.wav    - cintilar descendente e curto: brilho se apagando
  deslize.wav       - sopro de ar suave: texto deslizando para dentro
  whoosh.wav        - passagem rápida: transições e cortes com movimento
  impacto.wav       - grave com cauda: entrada de título/número
São discretos de propósito: ficam por baixo da voz e da trilha (use -14 a -22 dB).
"""
import argparse
import os
import subprocess
import sys
import wave

try:
    import numpy as np
    from scipy.signal import butter, sosfilt, fftconvolve
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "numpy", "scipy"], check=True)
    import numpy as np
    from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
rng = np.random.default_rng(11)


def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)


def reverb(x, d=1.6, mix=0.35):
    n = int(d * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 4.0)
    ir = hp(lp(ir, 9000), 300)
    ir /= np.sqrt((ir ** 2).sum())
    w = fftconvolve(x, ir)[:len(x) + n]
    out = np.zeros(len(w))
    out[:len(x)] += x * (1 - mix)
    return out + w * mix * 2.5


def estereo(x, larg=0.6):
    d = int(0.007 * SR)
    r = np.concatenate([np.zeros(d), x])[:len(x)]
    return np.stack([x, x * (1 - larg) + r * larg], 1)


def cintilar(d, subindo=True, densidade=70, f_min=2500, f_max=9000):
    n = int(d * SR)
    out = np.zeros(n)
    k = int(densidade * d)
    for i in range(k):
        pos = rng.random() ** (0.7 if subindo else 1.6)
        t0 = pos * d * 0.85
        prog = t0 / d
        f = f_min + (f_max - f_min) * (prog if subindo else 1 - prog) * 0.8 + rng.random() * 1200
        dur = 0.05 + rng.random() * 0.07
        tt = np.arange(int(dur * SR)) / SR
        ping = np.sin(2 * np.pi * f * tt) * np.exp(-tt * (55 + rng.random() * 40))
        g = 0.25 + 0.75 * (prog if subindo else 1 - prog)
        i0 = int(t0 * SR)
        j = min(n, i0 + len(ping))
        out[i0:j] += ping[:j - i0] * g * (0.5 + rng.random() * 0.5)
    return out


def ar(d, ataque, pico_f, subir=True):
    n = int(d * SR)
    tt = np.arange(n) / SR
    ruido = hp(rng.standard_normal(n), pico_f)
    env = np.where(tt < ataque, (tt / ataque) ** 2, np.exp(-(tt - ataque) * 7))
    return ruido * env


def sino(d, freqs=(1568.0, 2349.3, 3136.0), decai=4.5):
    tt = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * tt) * (0.6 ** k) for k, f in enumerate(freqs))
    return s * np.exp(-tt * decai) * (1 - np.exp(-tt * 400))


def normal(x, pico=0.89):
    return x / (np.abs(x).max() + 1e-9) * pico


def salvar(x, caminho):
    if x.ndim == 1:
        x = estereo(x)
    with wave.open(caminho, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default=os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), "assets", "sfx"))
    a = ap.parse_args()
    os.makedirs(a.saida, exist_ok=True)

    # brilho entrando: cintilar que sobe + sopro de ar + sino leve no ataque
    d = 0.9
    c = cintilar(d, True, 85)
    s = np.zeros(int(d * SR)); b = sino(0.8) * 0.22; s[int(0.06 * SR):int(0.06 * SR) + len(b)] += b[:len(s) - int(0.06 * SR)]
    x = c * 0.9 + ar(d, 0.22, 4000) * 0.12 + s
    salvar(normal(reverb(x, 1.4, 0.4)), os.path.join(a.saida, "brilho_entra.wav"))

    # brilho saindo: cintilar descendente, mais curto e mais suave
    d = 0.6
    x = cintilar(d, False, 55, 2000, 7000) * 0.8 + ar(d, 0.03, 5000) * 0.06
    salvar(normal(reverb(x, 1.1, 0.4), 0.75), os.path.join(a.saida, "brilho_sai.wav"))

    # deslize: sopro de ar filtrado com envelope em sino
    d = 0.45
    n = int(d * SR); tt = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 900, 6000) * np.sin(np.pi * tt / d) ** 2.2
    salvar(normal(reverb(x, 0.8, 0.25), 0.8), os.path.join(a.saida, "deslize.wav"))

    # whoosh: varredura de banda com ruído
    d = 0.7
    n = int(d * SR); tt = np.arange(n) / SR; x = np.zeros(n); r = rng.standard_normal(n)
    for k in range(16):
        i0, i1 = int(k * n / 16), int((k + 1) * n / 16)
        fc = 400 + 3500 * np.sin(np.pi * k / 15)
        x[i0:i1] = bp(r, fc * 0.6, fc * 1.5)[i0:i1]
    x *= np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2.5
    salvar(normal(x), os.path.join(a.saida, "whoosh.wav"))

    # impacto: boom grave com ruído e cauda
    d = 2.5
    tt = np.arange(int(d * SR)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(32 + 90 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 1.8)
    x = np.tanh(boom * 1.4 + lp(rng.standard_normal(len(tt)), 2500) * np.exp(-tt * 6) * 0.4)
    salvar(normal(reverb(x, 2.0, 0.35)), os.path.join(a.saida, "impacto.wav"))

    print("OK →", a.saida, sorted(os.listdir(a.saida)))


if __name__ == "__main__":
    main()
