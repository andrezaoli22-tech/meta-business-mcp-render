#!/usr/bin/env python3
"""Exporta cada carrossel para PNG, PPTX editável (com camada de sombra separada na capa) e PDF."""
import json, os, subprocess, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.join(AQUI, '..', '..', '.claude', 'skills', 'editor-carrossel', 'scripts')

def sombra(caminho, w=1080, h=1350):
    # mesmo degradê do .scrim: transparente até 35%, 55% em 58%, 92% em 82%
    im = Image.new('RGBA', (w, h))
    px = im.load()
    pts = [(0, 0), (.35, 0), (.58, .55), (.82, .92), (1, .92)]
    for y in range(h):
        t = y / h
        for (t0, a0), (t1, a1) in zip(pts, pts[1:]):
            if t0 <= t <= t1:
                a = a0 + (a1 - a0) * ((t - t0) / (t1 - t0) if t1 > t0 else 0)
                break
        for x in range(w):
            px[x, y] = (20, 16, 16, int(a * 255))
    im.save(caminho)

for pasta in sorted(d for d in os.listdir(AQUI) if os.path.isdir(os.path.join(AQUI, d)) and d[:2].isdigit()):
    d = os.path.join(AQUI, pasta)
    html = os.path.join(d, 'carrossel.html')
    subprocess.run(['node', os.path.join(SKILL, 'render.mjs'), html], check=True, capture_output=True)
    subprocess.run(['node', os.path.join(SKILL, 'extract_layout.mjs'), html], check=True, capture_output=True)
    lay_path = os.path.join(d, 'export', 'layout.json')
    lay = json.load(open(lay_path))
    sombra(os.path.join(d, 'export', 'sombra.png'))
    # todo slide com foto de fundo (tela cheia) ganha a camada de sombra solta por cima
    for sl in lay['slides']:
        cheias = [m for m in sl['medias'] if m['w'] >= 1070 and m['h'] >= 1340]
        if cheias:
            sl['medias'] = sl['medias'] + [{'x': 0, 'y': 0, 'w': 1080, 'h': 1350, 'nested': False, 'file': 'sombra.png'}]
    json.dump(lay, open(lay_path, 'w'))
    nome = f'deza-{pasta}'
    pptx = os.path.join(d, nome + '.pptx')
    subprocess.run(['python3', os.path.join(SKILL, 'build_pptx.py'), lay_path, pptx], check=True, capture_output=True)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', d, pptx], check=True, capture_output=True)
    print(pasta, '->', os.path.basename(pptx), 'e PDF')
