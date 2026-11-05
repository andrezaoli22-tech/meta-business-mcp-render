#!/usr/bin/env python3
"""Sintetiza a biblioteca de efeitos sonoros da skill (sons originais, livres para uso).

Uso:
  python gerar_sfx.py [--saida assets/sfx]

Gera (um som por tipo de animação de ênfase, para não repetir efeito no mesmo vídeo):
  impacto.wav        - transiente + grave: ênfase "impacto"
  tecla_1..3.wav     - teclas mecânicas: ênfase "digitar" (uma por letra, variando)
  passagem.wav       - whoosh estéreo com doppler: ênfase "deslize"
  virada.wav         - ar + placa assentando: ênfase "flip"
  lamina.wav         - varredura metálica com anel: ênfase "mascara"
  cascata.wav        - dedilhado ascendente: ênfase "letras"
  subida_tonal.wav   - tensão que resolve em acorde: ênfase "abrir"
  corte_metalico.wav - raspadas que se encontram num golpe: ênfase "partir"
  inspiracao.wav     - sopro reverso: ênfase "subir"
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

    # ---- efeitos de ênfase: um por tipo de animação, para nunca repetir no mesmo vídeo
    def env(n, a, d):
        tt = np.arange(n) / SR
        return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-np.maximum(0, tt - a) * d)

    def pan(x, de, ate):
        p_ = np.linspace(de, ate, len(x))
        return np.stack([x * np.cos((p_ + 1) * np.pi / 4), x * np.sin((p_ + 1) * np.pi / 4)], 1)

    # impacto: transiente seco + corpo grave com queda de afinação + cauda sub + ar curto
    d = 1.6; n = int(d * SR); tt = np.arange(n) / SR
    clique = bp(rng.standard_normal(n), 2500, 9000) * np.exp(-tt * 380)
    corpo = np.sin(2 * np.pi * np.cumsum(46 + 110 * np.exp(-tt * 22)) / SR) * np.exp(-tt * 5.5)
    sub = np.sin(2 * np.pi * 38 * tt) * np.exp(-tt * 2.2) * 0.35 * (1 - np.exp(-tt * 60))
    ar_ = lp(rng.standard_normal(n), 1800) * np.exp(-tt * 18) * 0.35
    x = np.tanh((clique * 0.9 + corpo * 1.2 + sub + ar_) * 1.3)
    salvar(normal(reverb(x, 1.2, 0.18)), os.path.join(a.saida, "impacto.wav"))

    # teclas: três variações de tecla mecânica (clique agudo + "toc" de corpo)
    for k, (f, g) in enumerate([(820, 1.0), (700, 0.9), (930, 0.95)], 1):
        d = 0.12; n = int(d * SR); tt = np.arange(n) / SR
        clq = bp(rng.standard_normal(n), 3000, 9000) * np.exp(-tt * 900)
        toc = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.3 * tt)) * np.exp(-tt * 140)
        ruido = bp(rng.standard_normal(n), 400, 2500) * np.exp(-tt * 90) * 0.5
        x = (clq * 0.8 + toc * 0.5 + ruido) * g
        salvar(normal(reverb(x, 0.25, 0.12), 0.8), os.path.join(a.saida, f"tecla_{k}.wav"))

    # passagem: whoosh que cruza da esquerda para a direita com efeito doppler
    d = 0.8; n = int(d * SR); tt = np.arange(n) / SR; r = rng.standard_normal(n); x = np.zeros(n)
    for k in range(24):
        i0, i1 = int(k * n / 24), int((k + 1) * n / 24)
        fc = 500 + 3800 * np.exp(-((k / 23 - 0.5) ** 2) / 0.05)
        x[i0:i1] = bp(r, fc * 0.55, min(fc * 1.7, 20000))[i0:i1]
    tom = np.sin(2 * np.pi * np.cumsum(180 + 120 * np.tanh((0.5 - tt / d) * 6)) / SR) * 0.15
    x = (x + tom) * np.exp(-((tt / d - 0.5) ** 2) / 0.03)
    st = pan(x, -0.9, 0.9)
    salvar(st / np.abs(st).max() * 0.89, os.path.join(a.saida, "passagem.wav"))

    # virada: abano de ar curto + batida macia de placa assentando
    d = 0.6; n = int(d * SR); tt = np.arange(n) / SR
    abano = bp(rng.standard_normal(n), 900, 4000) * np.exp(-((tt - 0.10) ** 2) / 0.0015) * 0.6
    i = int(0.20 * SR); tb = tt[:n - i]
    batida = np.zeros(n)
    batida[i:] = (np.sin(2 * np.pi * np.cumsum(140 + 120 * np.exp(-tb * 40)) / SR) * np.exp(-tb * 28)
                  + lp(rng.standard_normal(n - i), 3000) * np.exp(-tb * 60) * 0.3)
    salvar(normal(reverb(abano + batida, 0.6, 0.2), 0.85), os.path.join(a.saida, "virada.wav"))

    # lâmina: varredura metálica rápida que termina num anel brilhante
    d = 1.3; n = int(d * SR); tt = np.arange(n) / SR; r = rng.standard_normal(n); sw = np.zeros(n)
    for k in range(16):
        i0, i1 = int(k * 0.30 * SR / 16), int((k + 1) * 0.30 * SR / 16)
        fc = 1200 * (6 ** (k / 15))
        sw[i0:i1] = bp(r, fc * 0.7, min(fc * 1.5, 20000))[i0:i1] * (k / 15) ** 1.5
    i = int(0.28 * SR); tb = tt[:n - i]
    anel = np.zeros(n)
    anel[i:] = sum(np.sin(2 * np.pi * f * tb) * a_ * np.exp(-tb * dcy)
                   for f, a_, dcy in [(2093, 1, 5), (3322, .6, 6.5), (5274, .4, 8), (7459, .25, 11)])
    salvar(normal(reverb(sw * 0.5 + anel * 0.35, 1.0, 0.3)), os.path.join(a.saida, "lamina.wav"))

    # cascata: dedilhado rápido ascendente (cordas sintetizadas por Karplus-Strong)
    def corda(f, d=0.9):
        n = int(d * SR); per = int(SR / f)
        buf = rng.uniform(-1, 1, per); out = np.zeros(n)
        for k in range(n):
            out[k] = buf[k % per]
            buf[k % per] = 0.5 * (buf[k % per] + buf[(k + 1) % per]) * 0.996
        return out
    notas = [293.7, 349.2, 392.0, 440.0, 523.3, 587.3, 698.5]
    x = np.zeros(int(1.4 * SR))
    for k, f in enumerate(notas):
        c = corda(f) * (0.6 + 0.4 * k / 6)
        i = int(k * 0.055 * SR); x[i:i + len(c)] += c[:len(x) - i]
    salvar(normal(reverb(hp(x, 150), 1.2, 0.3)), os.path.join(a.saida, "cascata.wav"))

    # subida tonal: tensão que sobe e resolve num acorde limpo
    d = 1.8; n = int(d * SR); tt = np.arange(n) / SR
    sobe = np.where(tt < 0.7, 1, 0) * (tt / 0.7) ** 2.5
    f = 220 * 2 ** (np.minimum(tt, 0.7) / 0.7)
    tom = np.sin(2 * np.pi * np.cumsum(f) / SR) * sobe * 0.5 + hp(rng.standard_normal(n), 3000) * sobe * 0.15
    tr = np.maximum(0, tt - 0.7)
    acorde = sum(np.sin(2 * np.pi * fr * tr) * (0.6 ** k) for k, fr in enumerate([440, 554.4, 659.3, 880])) \
        * np.where(tt >= 0.7, 1, 0) * np.exp(-tr * 3) * (1 - np.exp(-tr * 200))
    salvar(normal(reverb(tom + acorde * 0.5, 1.4, 0.35)), os.path.join(a.saida, "subida_tonal.wav"))

    # corte metálico: duas raspadas de lados opostos que se encontram num golpe
    d = 1.4; n = int(d * SR); tt = np.arange(n) / SR
    rasp = lambda: bp(rng.standard_normal(n), 2500, 8000) * np.clip(tt / 0.42, 0, 1) ** 2 * (tt < 0.45)
    esq, dir_ = pan(rasp(), -0.9, -0.2), pan(rasp(), 0.9, 0.2)
    i = int(0.45 * SR); tb = tt[:n - i]; golpe = np.zeros(n)
    golpe[i:] = (sum(np.sin(2 * np.pi * f * tb) * a_ * np.exp(-tb * dc)
                     for f, a_, dc in [(1480, 1, 9), (2340, .7, 11), (3960, .5, 14)])
                 + bp(rng.standard_normal(n - i), 1500, 9000) * np.exp(-tb * 70) * 1.2)
    st = esq * 0.4 + dir_ * 0.4 + np.stack([golpe, golpe], 1) * 0.5
    st = np.stack([reverb(st[:, 0], 0.9, 0.25)[:n], reverb(st[:, 1], 0.9, 0.25)[:n]], 1)
    salvar(st / np.abs(st).max() * 0.89, os.path.join(a.saida, "corte_metalico.wav"))

    # inspiração: sopro reverso que cresce e para seco (texto subindo)
    d = 0.7; n = int(d * SR); tt = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 2500) * (tt / d) ** 3 * (tt < d * 0.95)
    x = reverb(x, 0.5, 0.3)[:n]
    salvar(normal(x, 0.8), os.path.join(a.saida, "inspiracao.wav"))

    print("OK →", a.saida, sorted(os.listdir(a.saida)))


if __name__ == "__main__":
    main()
