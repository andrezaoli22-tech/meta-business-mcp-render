#!/usr/bin/env python3
"""Exporta os carrosséis v3: PNG, PPTX editável (foto trocável + vinheta solta) e PDF. Uso: python3 exportar3.py [pasta ...]"""
import json, os, subprocess, sys
from PIL import Image
AQUI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.join(AQUI, '..', '..', '.claude', 'skills', 'editor-carrossel', 'scripts')

def vinheta(caminho, w=1080, h=1350):
    im = Image.new('RGBA', (w, h)); px = im.load()
    for y in range(h):
        t = y / h
        a = .38 * (1 - t / .15) if t < .15 else (.38 * (t - .82) / .18 if t > .82 else 0)
        for x in range(w):
            px[x, y] = (0, 0, 0, int(max(0, a) * 255))
    im.save(caminho)

pastas = sys.argv[1:] or sorted(d for d in os.listdir(AQUI) if d.startswith('v3-'))
for pasta in pastas:
    d = os.path.join(AQUI, pasta); html = os.path.join(d, 'carrossel.html')
    subprocess.run(['node', os.path.join(SKILL, 'render.mjs'), html], check=True, capture_output=True)
    subprocess.run(['node', os.path.join(SKILL, 'extract_layout.mjs'), html], check=True, capture_output=True)
    lp = os.path.join(d, 'export', 'layout.json'); lay = json.load(open(lp))
    vinheta(os.path.join(d, 'export', 'vinheta.png'))
    for sl in lay['slides']:
        if any(m['w'] >= 1070 and m['h'] >= 1340 for m in sl['medias']):
            sl['medias'].append({'x': 0, 'y': 0, 'w': 1080, 'h': 1350, 'nested': False, 'file': 'vinheta.png'})
    json.dump(lay, open(lp, 'w'))
    nome = 'deza-' + pasta.replace('v3-', '')
    pptx = os.path.join(d, nome + '.pptx')
    subprocess.run(['python3', os.path.join(SKILL, 'build_pptx.py'), lp, pptx], check=True, capture_output=True)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', d, pptx], check=True, capture_output=True)
    print(pasta, '->', nome + '.pptx')
