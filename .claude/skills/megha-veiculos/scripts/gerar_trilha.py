#!/usr/bin/env python3
"""Trilha original curta para stories/reels (sintetizada, livre de direitos).

Uso:
  python gerar_trilha.py --saida trilha.wav --duracao 14.5 --bpm 124 --tom 0 --estilo house \
         [--drop 1.8] [--final 12.4] [--semente 3]

Estilos:
  house  - bumbo a cada tempo, clap no 2 e 4, chimbal aberto no contratempo, baixo pulsante
  trap   - meio-tempo, 808 com glide, chimbal em rolos, clap no 3
  pulse  - eletrônico minimalista, synth em colcheias com filtro abrindo, bumbo no 1 e 3
--drop: onde a batida entra (antes disso só pad + riser, para a abertura)
--final: impacto + cauda (cartela final)
--tom: semitons em relação a Lá menor (0 = Am, 3 = Cm, -2 = Gm ...)
"""
import argparse
import wave

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000


def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], 'band', fs=SR, output='sos'), x)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", required=True)
    ap.add_argument("--duracao", type=float, default=14.5)
    ap.add_argument("--bpm", type=float, default=124)
    ap.add_argument("--tom", type=int, default=0)
    ap.add_argument("--estilo", choices=["house", "trap", "pulse", "funk", "electro", "pop"], default="house")
    ap.add_argument("--drop", type=float, default=1.8)
    ap.add_argument("--final", type=float, default=12.4)
    ap.add_argument("--semente", type=int, default=3)
    a = ap.parse_args()
    rng = np.random.default_rng(a.semente)
    D = a.duracao + 0.6
    N = int(D * SR)
    t = np.arange(N) / SR
    B = 60 / a.bpm
    T = 2 ** (a.tom / 12)

    def place(buf, s, t0, g=1.0):
        i = int(t0 * SR)
        if i >= len(buf) or i < 0: return
        j = min(len(buf), i + len(s)); buf[i:j] += s[:j - i] * g

    def reverb(x, d=1.6, mix=.25):
        n = int(d * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.5)
        ir = lp(ir, 7000); ir /= np.sqrt((ir ** 2).sum())
        return x * (1 - mix) + fftconvolve(x, ir)[:len(x)] * mix * 3

    def saw(f, tt): ph = f * tt; return 2 * (ph - np.floor(ph + .5))

    def kick(d=.42, f0=160, f1=45):
        tt = np.arange(int(d * SR)) / SR; f = f1 + (f0 - f1) * np.exp(-tt * 30)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)
        return np.tanh((s + hp(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 300) * .3) * 1.7)

    def clap():
        d = .3; tt = np.arange(int(d * SR)) / SR; n = bp(rng.standard_normal(len(tt)), 900, 5000)
        e = sum(np.exp(-np.maximum(0, tt - o) * 70) * (tt >= o) for o in (0, .011, .022))
        return n * (e * .5 + np.exp(-tt * 16) * .5)

    def hat(aberto=False):
        d = .2 if aberto else .045; tt = np.arange(int(d * SR)) / SR
        return hp(rng.standard_normal(len(tt)), 8000, 4) * np.exp(-tt * (16 if aberto else 95))

    def sub(d, f, glide=None):
        tt = np.arange(int(d * SR)) / SR; fr = np.full_like(tt, f)
        if glide: fr = f + (glide - f) * np.exp(-tt * 12)
        return np.tanh(np.sin(2 * np.pi * np.cumsum(fr) / SR) * 2) * np.minimum(1, tt / .005) * np.exp(-tt * 1.4)

    def riser(d):
        tt = np.arange(int(d * SR)) / SR; n = rng.standard_normal(len(tt)); out = np.zeros_like(tt)
        for k in range(20):
            i0, i1 = int(k * len(tt) / 20), int((k + 1) * len(tt) / 20); fc = 300 * 40 ** (k / 20)
            out[i0:i1] = bp(n, fc * .7, min(fc * 1.6, 20000))[i0:i1]
        return out * (tt / d) ** 2.2

    def impacto(d=2.2):
        tt = np.arange(int(d * SR)) / SR
        b = np.sin(2 * np.pi * np.cumsum(32 + 95 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 1.8)
        return reverb(np.tanh(b * 1.4 + lp(rng.standard_normal(len(tt)), 2500) * np.exp(-tt * 6) * .4), 2, .3)

    L = np.zeros(N); R = np.zeros(N)
    raiz = 55 * T  # Lá
    acordes = [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]]  # i - VI - VII - v (menor)
    barra = 4 * B
    # pad
    pad = np.zeros(N)
    for k in range(int(D / barra) + 1):
        ac = acordes[k % 4]; t0 = k * barra
        seg = np.arange(int(barra * SR)) / SR
        s = sum(saw(raiz * 4 * 2 ** (n / 12), seg) + saw(raiz * 4 * 2 ** (n / 12) * 1.004, seg) for n in ac) / 6
        place(pad, s * np.minimum(1, seg / .05), t0)
    abre = np.clip((t - a.drop + .3) / .6, 0, 1)
    pad = lp(pad, 900) * (1 - abre) + lp(pad, 2600) * abre
    pad = reverb(pad, 1.8, .3) * .22 * np.clip(t / .8, 0, 1)
    L += pad; R += np.roll(pad, int(.012 * SR))
    # riser e impactos
    r = riser(min(1.6, a.drop)); place(L, r, a.drop - len(r) / SR, .25); place(R, r, a.drop - len(r) / SR, .25)
    for tk, g in ((a.drop, .5), (a.final, .55)):
        im = impacto(); place(L, im, tk, g); place(R, im, tk, g)
    fim_batida = a.final - .02
    nb = int((fim_batida - a.drop) / B)
    for k in range(nb):
        tk = a.drop + k * B
        ac = acordes[int((tk - a.drop) / barra) % 4]; f_baixo = raiz * 2 ** (ac[0] / 12)
        if a.estilo == "house":
            for s, g in ((kick(), .8),): place(L, s, tk, g); place(R, s, tk, g)
            if k % 2 == 1: c = clap(); place(L, c, tk, .35); place(R, c, tk + .003, .35)
            h = hat(True); place(L, h, tk + B / 2, .12); place(R, h, tk + B / 2 + .004, .14)
            for q in (0, .25, .75): hh = hat(); place(L, hh, tk + q * B, .05); place(R, hh, tk + q * B, .06)
            sb = sub(B * .45, f_baixo); place(L, sb, tk + B / 2, .32); place(R, sb, tk + B / 2, .32)
        elif a.estilo == "trap":
            pos = k % 8
            if pos in (0, 5): s = kick(.5, 140, 42); place(L, s, tk, .8); place(R, s, tk, .8)
            if pos in (0, 5): sb = sub(min(1.2, B * 2.5), f_baixo, f_baixo * 1.5 if pos == 5 else None); place(L, sb, tk, .42); place(R, sb, tk, .42)
            if pos in (2, 6): c = clap(); place(L, c, tk, .4); place(R, c, tk + .003, .4)
            rolo = 6 if pos == 7 else 2
            for q in range(rolo): hh = hat(); place(L, hh, tk + q * B / rolo, .07); place(R, hh, tk + q * B / rolo + .003, .08)
        elif a.estilo == "funk":
            # funk brasileiro (tamborzão): bumbo na 1, no "e" do 2 e no 4; caixa no 2 e 4; agogô/cuíca leve
            pos = k % 4
            for q, g in {0: [(0, .85), (.75, .55)], 1: [(.5, .7)], 2: [(0, .8), (.5, .45)], 3: [(.25, .6), (.75, .5)]}[pos]:
                s = kick(.35, 150, 50); place(L, s, tk + q * B, g); place(R, s, tk + q * B, g)
            if pos in (1, 3): c = clap(); place(L, c, tk, .5); place(R, c, tk + .003, .5)
            for q in (0, .5): hh = hat(); place(L, hh, tk + q * B, .09); place(R, hh, tk + q * B + .003, .1)
            sb = sub(B * .4, f_baixo * 2); place(L, sb, tk, .3); place(R, sb, tk, .3)
            seg = np.arange(int(.12 * SR)) / SR
            ag = (np.sin(2 * np.pi * 1760 * seg) + .5 * np.sin(2 * np.pi * 2640 * seg)) * np.exp(-seg * 40)
            if pos in (0, 2): place(L, ag, tk + .75 * B, .06); place(R, ag, tk + .75 * B, .08)
            seg = np.arange(int(B * .45 * SR)) / SR
            stab = lp(sum(saw(raiz * 8 * 2 ** (n / 12), seg) for n in ac) / 3, 3200) * np.exp(-seg * 7)
            if pos == 3: place(L, stab, tk + .5 * B, .22); place(R, stab, tk + .5 * B + .005, .22)
        elif a.estilo in ("electro", "pop"):
            # four-on-the-floor energético: bumbo em todos os tempos, clap 2 e 4, chimbal 16 avos,
            # baixo no contratempo, stabs (electro) ou arpejo (pop), sobe o filtro até o final
            s = kick(.38, 170, 48); place(L, s, tk, .85); place(R, s, tk, .85)
            if k % 2 == 1: c = clap(); place(L, c, tk, .45); place(R, c, tk + .003, .45)
            for q in (0, .25, .5, .75):
                hh = hat(q == .5); place(L, hh, tk + q * B, .1 if q == .5 else .05); place(R, hh, tk + q * B + .003, .11 if q == .5 else .06)
            sb = sub(B * .42, f_baixo); place(L, sb, tk + B / 2, .38); place(R, sb, tk + B / 2, .38)
            prog = (tk - a.drop) / max(.1, fim_batida - a.drop)
            if a.estilo == "electro":
                seg = np.arange(int(B * .3 * SR)) / SR
                stab = lp(sum(saw(raiz * 8 * 2 ** (n / 12), seg) + saw(raiz * 8 * 2 ** (n / 12) * 1.006, seg) for n in ac) / 6, 1800 + 4000 * prog) * np.exp(-seg * 9)
                for q in ((.5,) if k % 2 == 0 else (.25, .75)): place(L, stab, tk + q * B, .26); place(R, stab, tk + q * B + .006, .26)
            else:
                seg = np.arange(int(B / 4 * SR)) / SR
                for q in range(4):
                    nota = raiz * 8 * 2 ** ((ac + [ac[0] + 12])[q % 4] / 12)
                    pl = lp(saw(nota, seg), 1500 + 4000 * prog) * np.exp(-seg * 18)
                    place(L, pl, tk + q * B / 4, .16); place(R, pl, tk + q * B / 4 + .008, .16)
        else:
            if k % 2 == 0: s = kick(); place(L, s, tk, .75); place(R, s, tk, .75)
            if k % 4 == 2: c = clap(); place(L, c, tk, .3); place(R, c, tk, .3)
            for q in (0, .5):
                seg = np.arange(int(B / 2 * SR)) / SR
                nota = raiz * 4 * 2 ** (ac[(k * 2 + int(q * 2)) % 3] / 12)
                prog = (tk - a.drop) / max(.1, fim_batida - a.drop)
                sy = lp(saw(nota, seg), 600 + 3500 * prog) * np.exp(-seg * 9)
                place(L, sy, tk + q * B, .18); place(R, sy, tk + q * B + .006, .18)
            hh = hat(); place(L, hh, tk + B / 2, .06); place(R, hh, tk + B / 2, .07)
    # cauda final: acorde longo
    seg = np.arange(int(2.2 * SR)) / SR
    cauda = sum(saw(raiz * 4 * 2 ** (n / 12), seg) for n in acordes[0]) / 3
    cauda = reverb(lp(cauda, 1800) * np.exp(-seg * 1.3), 2, .4) * .2
    place(L, cauda, a.final, 1); place(R, cauda, a.final, 1)
    mix = np.stack([L, R], 1)[:int(a.duracao * SR)]
    mix = hp(mix.T, 30).T
    fade = int(.35 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix = np.tanh(mix * 1.15) / np.tanh(1.15); mix /= np.abs(mix).max() / .89
    with wave.open(a.saida, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print("OK", a.saida, a.estilo, a.bpm)


if __name__ == "__main__":
    main()
