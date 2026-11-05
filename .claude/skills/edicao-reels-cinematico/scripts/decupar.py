#!/usr/bin/env python3
"""Sugere a decupagem a partir da transcrição: corta silêncios e vícios de fala.

Uso:
  python decupar.py palavras.json --saida edl.json [--pausa 0.30] [--respiro 0.06]
                    [--formato 9:16] [--punch-in 1.10] [--remover-indices 12-18,40]

O resultado é um PONTO DE PARTIDA. Depois de gerar, leia edl.txt e edite edl.json à mão:
  - apague segmentos com takes repetidos/errados (fique com o melhor take, geralmente o último);
  - reordene segmentos se o gancho estiver no meio do vídeo;
  - ajuste "zoom", "foco_x", "foco_y" por segmento para reenquadrar ou dar punch-in.

Formato do edl.json:
{
  "fonte": "/caminho/bruto.mp4",
  "formato": "9:16",
  "segmentos": [
    {"id": 1, "inicio": 0.52, "fim": 4.10, "texto": "...", "palavras": [0, 9],
     "zoom": 1.0, "foco_x": 0.5, "foco_y": 0.45}
  ]
}
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import info_video, ler_json, salvar_json  # noqa: E402

# Vícios de fala. "é" e "tipo" NÃO entram: em português são palavras reais na maioria das vezes.
VICIOS = re.compile(r"^(é{2,}|e{2,}h*|eh+|ah+n*|ã+h*n*|hum+|hm+|uh+m*|ér+|aham)[.,!?…]*$", re.I)


def faixa_indices(spec):
    out = set()
    for parte in [p for p in spec.split(",") if p.strip()]:
        if "-" in parte:
            a, b = parte.split("-")
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(parte))
    return out


def fmt(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("palavras")
    ap.add_argument("--saida", default="edl.json")
    ap.add_argument("--pausa", type=float, default=0.30,
                    help="pausa (s) a partir da qual o silêncio é cortado")
    ap.add_argument("--respiro", type=float, default=0.06,
                    help="folga (s) mantida antes/depois da fala em cada corte")
    ap.add_argument("--formato", default="9:16")
    ap.add_argument("--punch-in", type=float, default=0.0,
                    help="zoom alternado nos jump cuts (ex.: 1.10). 0 = desligado")
    ap.add_argument("--remover-indices", default="",
                    help="índices de palavras a descartar (ex.: '12-18,40')")
    ap.add_argument("--min-seg", type=float, default=0.35,
                    help="segmentos mais curtos que isso são fundidos ao vizinho")
    a = ap.parse_args()

    dados = ler_json(a.palavras)
    fonte = dados.get("fonte")
    dur_total = info_video(fonte)["duracao"] if fonte and os.path.exists(fonte) else dados["duracao"]
    remover = faixa_indices(a.remover_indices)

    uteis = [p for p in dados["palavras"]
             if p["i"] not in remover and not VICIOS.match(p["texto"])]
    if not uteis:
        print("Nenhuma palavra útil encontrada.", file=sys.stderr)
        sys.exit(1)

    # agrupa palavras consecutivas (no tempo e no índice) em blocos contínuos
    blocos, atual = [], [uteis[0]]
    for ant, p in zip(uteis, uteis[1:]):
        salto_indice = p["i"] != ant["i"] + 1
        if p["inicio"] - ant["fim"] > a.pausa or salto_indice:
            blocos.append(atual)
            atual = [p]
        else:
            atual.append(p)
    blocos.append(atual)

    segs = []
    for b in blocos:
        ini = max(0.0, b[0]["inicio"] - a.respiro)
        fim = min(dur_total, b[-1]["fim"] + a.respiro * 1.5)
        segs.append({"inicio": ini, "fim": fim, "palavras": [b[0]["i"], b[-1]["i"]],
                     "texto": " ".join(p["texto"] for p in b)})

    # evita sobreposição criada pelo respiro e funde fragmentos curtos demais
    limpos = []
    for s in segs:
        if limpos and s["inicio"] < limpos[-1]["fim"]:
            meio = (limpos[-1]["fim"] + s["inicio"]) / 2
            limpos[-1]["fim"], s["inicio"] = meio, meio
        if limpos and (s["fim"] - s["inicio"]) < a.min_seg and \
                s["inicio"] - limpos[-1]["fim"] < 0.6:
            limpos[-1]["fim"] = s["fim"]
            limpos[-1]["palavras"][1] = s["palavras"][1]
            limpos[-1]["texto"] += " " + s["texto"]
            continue
        limpos.append(s)

    for k, s in enumerate(limpos):
        s["id"] = k + 1
        s["inicio"], s["fim"] = round(s["inicio"], 3), round(s["fim"], 3)
        s["zoom"] = round(a.punch_in, 3) if (a.punch_in and k % 2 == 1) else 1.0
        s["foco_x"], s["foco_y"] = 0.5, 0.42

    edl = {"fonte": fonte, "formato": a.formato,
           "segmentos": [{k: s[k] for k in ("id", "inicio", "fim", "texto", "palavras",
                                            "zoom", "foco_x", "foco_y")} for s in limpos]}
    salvar_json(edl, a.saida)

    total = sum(s["fim"] - s["inicio"] for s in limpos)
    txt = os.path.splitext(a.saida)[0] + ".txt"
    with open(txt, "w", encoding="utf-8") as f:
        f.write(f"Bruto: {dur_total:.1f}s  →  editado: {total:.1f}s  ({len(limpos)} segmentos)\n\n")
        for s in limpos:
            f.write(f"#{s['id']:>3} [{fmt(s['inicio'])} → {fmt(s['fim'])}] "
                    f"{s['fim'] - s['inicio']:4.1f}s  zoom {s['zoom']}  | {s['texto']}\n")
    print(open(txt, encoding="utf-8").read())


if __name__ == "__main__":
    main()
