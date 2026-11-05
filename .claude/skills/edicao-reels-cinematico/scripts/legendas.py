#!/usr/bin/env python3
"""Legendas cinéticas: 2–3 palavras por vez, com lockup tipográfico para palavras destacadas.

Etapa 1 — agrupar (gera um arquivo editável):
  python legendas.py agrupar trabalho/palavras_editado.json --saida legendas.json
         [--max-palavras 3] [--destaques "tudo,agora"] [--destaques-idx 12,40]

  Sem --destaques, nenhuma palavra é destacada (o padrão). Para destacar, marque
  "destaque": true na palavra dentro de legendas.json, ou passe as opções acima.
  Um grupo com destaque vira um lockup: a palavra grande no centro e as de apoio
  pequenas, encaixadas na largura dela (acima as anteriores, abaixo as seguintes).

Etapa 2 — renderizar (camada transparente para sobrepor):
  python legendas.py render legendas.json --saida trabalho/legendas.mov
         [--estilo editorial] [--cor-destaque "#F2C66D"] [--posicao-y 0.64]
         [--previa 3.2,8.0]   # gera só PNGs desses instantes, para conferir antes
         [--zona 6.8:8.8:0.38]  # nesse trecho a legenda sobe para 38% da altura (ou :ocultar)

  python legendas.py estilos   # lista os estilos

Fontes: as do Google Fonts citadas no estilo são baixadas e guardadas em cache.
Fontes próprias (.ttf/.otf/.woff2) colocadas em assets/fontes/ ficam disponíveis pelo
nome do arquivo (ex.: assets/fontes/Marca-Bold.otf → família "Marca-Bold").
"""
import argparse
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import ASSETS, erro, ler_json, salvar_json  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
CACHE_FONTES = os.path.expanduser("~/.cache/edicao-reels/fontes")

# Estilos. "google" lista famílias a baixar no formato da API css2 do Google Fonts.
ESTILOS = {
    "editorial": {
        "desc": "Sans limpa nas frases + serifada itálica no destaque. Sofisticado, de revista.",
        "google": ["Inter:wght@500;600;700", "Instrument Serif:ital@0;1"],
        "vars": {"--fonte-base": '"Inter", sans-serif', "--peso-base": "600",
                 "--fonte-destaque": '"Instrument Serif", serif', "--peso-destaque": "400",
                 "--estilo-destaque": "italic", "--tracking-destaque": "-0.02em",
                 "--caixa-apoio": "uppercase", "--tracking-apoio": "0.16em", "--peso-apoio": "600"},
        "config": {"tamanho_destaque_max": 0.24}},
    "impacto": {
        "desc": "Caixa-alta condensada e pesada. Energia de esporte/fitness/lançamento.",
        "google": ["Inter:wght@600;700;800", "Anton"],
        "vars": {"--fonte-base": '"Inter", sans-serif', "--peso-base": "800",
                 "--caixa-base": "uppercase", "--tracking-base": "0.0em",
                 "--fonte-destaque": '"Anton", sans-serif', "--peso-destaque": "400",
                 "--caixa-destaque": "uppercase", "--tracking-destaque": "0.0em",
                 "--caixa-apoio": "uppercase", "--tracking-apoio": "0.12em", "--peso-apoio": "700"},
        "config": {"tamanho_base": 0.058, "tamanho_destaque_max": 0.26}},
    "moderno": {
        "desc": "Grotesca display, tudo em caixa baixa/sentença, peso contrastado. Tech, criadores.",
        "google": ["Inter:wght@500;600;800;900"],
        "vars": {"--fonte-base": '"Inter", sans-serif', "--peso-base": "600",
                 "--fonte-destaque": '"Inter", sans-serif', "--peso-destaque": "900",
                 "--tracking-destaque": "-0.05em", "--caixa-apoio": "none",
                 "--tracking-apoio": "-0.01em", "--peso-apoio": "500"},
        "config": {}},
    "dourado": {
        "desc": "Open Sans negrito compacta + ênfase em CAIXA ALTA dourada com brilho passando. Lockup encaixado e animado.",
        "google": ["Open Sans:wght@600;700;800"],
        "vars": {"--fonte-base": '"Open Sans", sans-serif', "--peso-base": "700",
                 "--tracking-base": "-0.035em", "--caixa-base": "none",
                 "--fonte-destaque": '"Open Sans", sans-serif', "--peso-destaque": "800",
                 "--caixa-destaque": "uppercase", "--tracking-destaque": "-0.045em",
                 "--caixa-apoio": "none", "--tracking-apoio": "-0.03em", "--peso-apoio": "700",
                 "--grad-1": "#FFF4CF", "--grad-2": "#D49A1E",
                 "--cor-brilho": "rgba(255, 196, 70, 0.70)"},
        "config": {"tamanho_base": 0.056, "tamanho_destaque_max": 0.17, "lockup": "encaixe",
                   "animacao": "subir", "brilho": 20, "gradiente": "ouro", "proporcao_apoio": 0.34,
                   "desfoque": 6, "deriva": 0.04}},
    "luxo": {
        "desc": "Serifada clássica com tracking aberto. Moda, imobiliário, gastronomia premium.",
        "google": ["Cormorant Garamond:ital,wght@0,500;0,600;1,500", "Inter:wght@500"],
        "vars": {"--fonte-base": '"Cormorant Garamond", serif', "--peso-base": "600",
                 "--tracking-base": "0.01em",
                 "--fonte-destaque": '"Cormorant Garamond", serif', "--peso-destaque": "500",
                 "--estilo-destaque": "italic", "--tracking-destaque": "-0.01em",
                 "--caixa-apoio": "uppercase", "--tracking-apoio": "0.28em", "--peso-apoio": "500"},
        "config": {"tamanho_base": 0.068, "tamanho_destaque_max": 0.23, "desfoque": 5}},
}

PONTUACAO_FINAL = re.compile(r"[.!?…:;]$")
VIRGULA = re.compile(r",$")


def normalizar(txt):
    return re.sub(r"[^\wÀ-ÿ]", "", txt.lower())


# ---------------------------------------------------------------- agrupar
def agrupar(a):
    dados = ler_json(a.palavras)
    palavras = [dict(p) for p in dados["palavras"]]
    alvo = {normalizar(x) for x in a.destaques.split(",") if x.strip()}
    idx = {int(x) for x in a.destaques_idx.split(",") if x.strip()}
    for p in palavras:
        p["destaque"] = bool((alvo and normalizar(p["texto"]) in alvo) or p.get("i") in idx)

    grupos, atual = [], []

    def fechar():
        if atual:
            grupos.append(list(atual))
            atual.clear()

    for k, p in enumerate(palavras):
        if atual:
            ant = atual[-1]
            chars = sum(len(x["texto"]) + 1 for x in atual) + len(p["texto"])
            pausa = p["inicio"] - ant["fim"]
            if (len(atual) >= a.max_palavras or chars > a.max_caracteres or pausa > a.pausa
                    or PONTUACAO_FINAL.search(ant["texto"])
                    or (VIRGULA.search(ant["texto"]) and len(atual) >= 2)
                    or (p["destaque"] and any(x["destaque"] for x in atual))):
                fechar()
        atual.append(p)
    fechar()

    # Lockups ficam melhores quando a palavra destacada tem apoio ANTES dela
    # ("muda / TUDO" em vez de "TUDO / no seu"): puxa a última palavra do grupo anterior
    # quando ele pertence à mesma frase, e solta o excesso do fim para um novo grupo.
    k = 1
    while k < len(grupos):
        g, ant = grupos[k], grupos[k - 1]
        if (g[0]["destaque"] and len(ant) >= 2 and not any(x["destaque"] for x in ant)
                and not PONTUACAO_FINAL.search(ant[-1]["texto"]) and not VIRGULA.search(ant[-1]["texto"])
                and g[0]["inicio"] - ant[-1]["fim"] <= a.pausa):
            g.insert(0, ant.pop())
            if len(g) > a.max_palavras:
                resto = g[a.max_palavras:]
                del g[a.max_palavras:]
                prox = grupos[k + 1] if k + 1 < len(grupos) else None
                if (prox and len(prox) + len(resto) <= a.max_palavras
                        and not any(x["destaque"] for x in prox)
                        and not PONTUACAO_FINAL.search(resto[-1]["texto"])):
                    prox[:0] = resto
                else:
                    grupos.insert(k + 1, resto)
        k += 1

    # tempos de exibição: segura o grupo até o próximo começar (sem piscar) quando o vão é curto
    saida = []
    for k, g in enumerate(grupos):
        ini, fim = g[0]["inicio"], g[-1]["fim"]
        prox = grupos[k + 1][0]["inicio"] if k + 1 < len(grupos) else dados["duracao"]
        fim = prox if prox - fim < a.segurar else fim + min(a.segurar, 0.15)
        fim = max(fim, ini + 0.35)
        saida.append({"inicio": round(ini, 3), "fim": round(min(fim, prox), 3),
                      "palavras": [{"texto": limpar_texto(p["texto"], a.manter_pontuacao),
                                    "inicio": p["inicio"], "fim": p["fim"],
                                    "destaque": p["destaque"], "i": p.get("i")} for p in g]})
    if a.matte:
        posicionar_por_matte(saida, ler_json(a.matte), a.profundidade)
    salvar_json({"duracao": dados["duracao"], "estilo": a.estilo, "config": {}, "grupos": saida},
                a.saida)
    n_dest = sum(1 for g in saida for p in g["palavras"] if p["destaque"])
    print(f"{len(saida)} grupos, {n_dest} destaques → {a.saida}")
    for g in saida[:400]:
        linha = " ".join(("**" + p["texto"].upper() + "**") if p["destaque"] else p["texto"]
                         for p in g["palavras"])
        extra = f"   [{g['profundidade']}, y={g['y']:.2f}]" if "profundidade" in g else ""
        print(f"  {g['inicio']:7.2f}  {linha}{extra}")


def posicionar_por_matte(grupos, matte, modo, comecar="atras"):
    """Coloca cada lockup na altura da cabeça e alterna atrás/na frente da pessoa.

    atrás:   a palavra grande cruza o topo da cabeça (a pessoa cobre parte das letras)
    frente:  o lockup fica na altura do peito, por cima da pessoa
    Sem pessoa no quadro (B-roll), o lockup fica na frente, um pouco acima do centro.
    """
    qs = matte["quadros"]
    fps = matte["fps"]

    def quadro(t):
        k = min(len(qs) - 1, max(0, int(round(t * fps))))
        return qs[k]

    alterna = 0 if comecar == "atras" else 1
    for g in grupos:
        if not any(p["destaque"] for p in g["palavras"]):
            continue
        # amostra alguns instantes do grupo: a pessoa precisa estar lá o tempo todo
        ts = [g["inicio"] + (g["fim"] - g["inicio"]) * f for f in (0.1, 0.5, 0.9)]
        amostras = [quadro(t) for t in ts]
        validas = [q for q in amostras if q.get("pessoa") and q.get("area", 0) > 0.05]
        presente = len(validas) >= 2       # tolera um corte no meio do grupo
        if presente:
            topo = sum(q["topo"] for q in validas) / len(validas)
            cx = sum(q["cx"] for q in validas) / len(validas)
            grande = next(p["texto"] for p in g["palavras"] if p["destaque"])
            # atrás só com palavra longa (curta sumiria atrás da cabeça); a palavra fica no topo
            # da cabeça, com a parte de baixo encostando no cabelo, nunca cruzando o rosto
            vez_atras = modo == "atras" or (modo == "alternar" and alterna % 2 == 0 and topo > 0.10)
            if vez_atras and len(grande) >= 6:
                g["profundidade"], g["y"], g["x"] = "atras", max(0.15, topo + 0.012), cx
            elif vez_atras:
                # palavra curta: vai para a frente e guarda a vez de "atrás" para a próxima ênfase
                g["profundidade"], g["y"], g["x"] = "frente", min(0.72, max(0.50, topo + 0.32)), 0.5
                continue
            else:
                # na frente: sempre abaixo do rosto (peito), nunca sobre ele
                g["profundidade"], g["y"], g["x"] = "frente", min(0.72, max(0.50, topo + 0.32)), 0.5
            alterna += 1
        else:
            g["profundidade"], g["y"], g["x"] = "frente", 0.42, 0.5


def limpar_texto(t, manter):
    if manter:
        return t
    # legenda fica mais limpa sem vírgulas/pontos finais; mantém ? e ! que mudam o sentido
    return re.sub(r"[.,;:…]+$", "", t)


# ---------------------------------------------------------------- fontes
def baixar_google(familias):
    """Baixa famílias do Google Fonts para o cache e devolve CSS @font-face local."""
    os.makedirs(CACHE_FONTES, exist_ok=True)
    css_total = []
    for fam in familias:
        chave = hashlib.md5(fam.encode()).hexdigest()[:10]
        css_cache = os.path.join(CACHE_FONTES, f"{chave}.css")
        if not os.path.exists(css_cache):
            url = "https://fonts.googleapis.com/css2?family=" + fam.replace(" ", "+") + "&display=block"
            ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
            p = subprocess.run(["curl", "-sSfL", "-A", ua, url], capture_output=True, text=True)
            if p.returncode != 0:
                print(f"aviso: não consegui baixar a fonte '{fam}' ({p.stderr.strip()[:120]})."
                      " Usando fallback local.", file=sys.stderr)
                continue
            css = p.stdout
            for u in set(re.findall(r"url\((https://[^)]+)\)", css)):
                nome = hashlib.md5(u.encode()).hexdigest()[:16] + os.path.splitext(u)[1]
                destino = os.path.join(CACHE_FONTES, nome)
                if not os.path.exists(destino):
                    subprocess.run(["curl", "-sSfL", "-o", destino, u], check=False)
                css = css.replace(u, "file://" + destino)
            with open(css_cache, "w") as f:
                f.write(css)
        css_total.append(open(css_cache).read())
    return "\n".join(css_total)


def fontes_locais():
    css = []
    for arq in sorted(glob.glob(os.path.join(ASSETS, "fontes", "*"))):
        ext = os.path.splitext(arq)[1].lower()
        fmt = {".ttf": "truetype", ".otf": "opentype", ".woff2": "woff2", ".woff": "woff"}.get(ext)
        if fmt:
            fam = os.path.splitext(os.path.basename(arq))[0]
            css.append(f'@font-face{{font-family:"{fam}";src:url("file://{arq}") format("{fmt}");'
                       f'font-display:block;}}')
    return "\n".join(css)


def montar_html(dados, estilo, extra_vars, extra_config):
    e = ESTILOS[estilo]
    vars_css = {**e["vars"], **extra_vars}
    config = {**e["config"], **dados.get("config", {}), **extra_config}
    fontes = baixar_google(e["google"]) + "\n" + fontes_locais()
    fontes += "\nhtml:root{" + ";".join(f"{k}:{v}" for k, v in vars_css.items()) + "}"
    tpl = open(os.path.join(ASSETS, "legendas", "legendas.html"), encoding="utf-8").read()
    payload = json.dumps({"duracao": dados["duracao"], "grupos": dados["grupos"], "config": config},
                         ensure_ascii=False)
    return tpl.replace("/*__FONTES__*/", fontes).replace("/*__DADOS__*/null", payload)


# ---------------------------------------------------------------- render
def render(a):
    dados = ler_json(a.legendas)
    estilo = a.estilo or dados.get("estilo") or "editorial"
    if estilo not in ESTILOS:
        erro(f"estilo desconhecido: {estilo}. Opções: {', '.join(ESTILOS)}")
    extra_vars, extra_cfg = {}, {}
    if a.cor_destaque:
        extra_vars["--cor-destaque"] = a.cor_destaque
    if a.cor_base:
        extra_vars["--cor-base"] = a.cor_base
    if a.fonte_base:
        extra_vars["--fonte-base"] = f'"{a.fonte_base}", sans-serif'
    if a.fonte_destaque:
        extra_vars["--fonte-destaque"] = f'"{a.fonte_destaque}", sans-serif'
    if a.posicao_y is not None:
        extra_cfg["posicao_y"] = a.posicao_y
    if a.modo:
        extra_cfg["modo"] = a.modo
    if a.zona:
        zonas = []
        for z in a.zona:
            partes = z.split(":")
            item = {"de": float(partes[0]), "ate": float(partes[1])}
            if len(partes) < 3 or partes[2] == "ocultar":
                item["ocultar"] = True
            else:
                item["posicao_y"] = float(partes[2])
            zonas.append(item)
        extra_cfg["zonas"] = zonas

    html = montar_html(dados, estilo, extra_vars, extra_cfg)
    pasta = tempfile.mkdtemp(prefix="legendas_")
    arq_html = os.path.join(pasta, "legendas.html")
    with open(arq_html, "w", encoding="utf-8") as f:
        f.write(html)

    if a.previa:
        # PNGs de conferência sobre fundo cinza-escuro (ou sobre um quadro do vídeo com --fundo-video)
        js = os.path.join(pasta, "previa.js")
        tempos = [float(x) for x in a.previa.split(",") if x.strip()]
        base = os.path.splitext(a.saida)[0]
        with open(js, "w") as f:
            f.write(f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch({{ args: ['--allow-file-access-from-files'] }});
  const p = await b.newPage({{ viewport: {{ width: {a.largura}, height: {a.altura} }} }});
  await p.goto('file://{arq_html}'); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.PRONTO);
  for (const t of {json.dumps(tempos)}) {{
    await p.evaluate(t => window.renderFrame(t), t);
    await p.screenshot({{ path: '{base}_previa_' + t.toFixed(2) + '.png', omitBackground: true }});
  }}
  await b.close();
}})();""")
        subprocess.run(["node", js], check=True)
        for t in tempos:
            png = f"{base}_previa_{t:.2f}.png"
            if a.fundo_video:
                comp = f"{base}_previa_{t:.2f}_comp.png"
                subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(t),
                                "-i", a.fundo_video, "-i", png, "-frames:v", "1", "-filter_complex",
                                f"[0:v]scale={a.largura}:{a.altura}[b];[b][1:v]overlay,scale=540:-2",
                                comp], check=True)
                print(comp)
            else:
                print(png)
        return

    tem_atras = any(g.get("profundidade") == "atras" for g in dados["grupos"])
    camadas = [("frente", a.saida)]
    if tem_atras:
        camadas.append(("atras", os.path.splitext(a.saida)[0] + "_atras" + os.path.splitext(a.saida)[1]))
    for camada, destino in camadas:
        html_c = montar_html(dados, estilo, extra_vars, {**extra_cfg, "camada": camada if tem_atras else "todas"})
        arq_c = os.path.join(pasta, f"legendas_{camada}.html")
        with open(arq_c, "w", encoding="utf-8") as f:
            f.write(html_c)
        subprocess.run(["node", os.path.join(AQUI, "render_html.cjs"), "--html", arq_c,
                        "--saida", destino, "--largura", str(a.largura), "--altura", str(a.altura),
                        "--fps", str(a.fps), "--duracao", str(dados["duracao"]),
                        "--escala", str(a.escala)], check=True)
    if tem_atras:
        print(f"Camada atrás da pessoa: {camadas[1][1]} (use com montar.py --legendas-atras e --matte)")


def sfx(a):
    """Gera sfx.json com efeitos só nas ênfases: brilho ao entrar e, nos lockups longos, ao sair."""
    dados = ler_json(a.legendas)
    pasta_sfx = os.path.join(ASSETS, "sfx")
    lista = []
    antecip = 0.04
    for g in dados["grupos"]:
        dest = [p for p in g["palavras"] if p["destaque"]]
        if not dest:
            continue
        t_ent = dest[0]["inicio"] - antecip
        lista.append({"arquivo": os.path.join(pasta_sfx, a.entrada), "em": round(max(0, t_ent - 0.03), 3),
                      "db": a.db})
        if a.saida_sfx and g["fim"] - t_ent > 1.2:
            lista.append({"arquivo": os.path.join(pasta_sfx, a.saida_sfx),
                          "em": round(g["fim"] - 0.28, 3), "db": a.db - 5})
    salvar_json(lista, a.saida)
    print(f"{len(lista)} efeitos → {a.saida}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("agrupar")
    g.add_argument("palavras")
    g.add_argument("--saida", default="legendas.json")
    g.add_argument("--max-palavras", type=int, default=3)
    g.add_argument("--max-caracteres", type=int, default=18)
    g.add_argument("--pausa", type=float, default=0.45)
    g.add_argument("--segurar", type=float, default=0.30)
    g.add_argument("--destaques", default="")
    g.add_argument("--destaques-idx", default="")
    g.add_argument("--estilo", default="editorial")
    g.add_argument("--manter-pontuacao", action="store_true")
    g.add_argument("--matte", default="", help="matte.json do recortar.py: posiciona lockups pela cabeça")
    g.add_argument("--profundidade", choices=["alternar", "atras", "frente"], default="alternar")
    r = sub.add_parser("render")
    r.add_argument("legendas")
    r.add_argument("--saida", default="legendas.mov")
    r.add_argument("--estilo")
    r.add_argument("--cor-destaque")
    r.add_argument("--cor-base")
    r.add_argument("--fonte-base")
    r.add_argument("--fonte-destaque")
    r.add_argument("--posicao-y", type=float)
    r.add_argument("--modo", choices=["revelar", "grupo"])
    r.add_argument("--zona", action="append", default=[],
                   help="de:ate:posicao_y ou de:ate:ocultar — ex.: 6.8:8.8:0.38 (repetível)")
    r.add_argument("--largura", type=int, default=1080)
    r.add_argument("--altura", type=int, default=1920)
    r.add_argument("--fps", type=float, default=30)
    r.add_argument("--previa", default="")
    r.add_argument("--fundo-video", default="")
    r.add_argument("--escala", type=float, default=1.0,
                   help="multiplica a resolução da saída (2 = 4K a partir do layout 1080x1920)")
    x = sub.add_parser("sfx")
    x.add_argument("legendas")
    x.add_argument("--saida", default="sfx_legendas.json")
    x.add_argument("--entrada", default="brilho_entra.wav")
    x.add_argument("--saida-sfx", default="brilho_sai.wav")
    x.add_argument("--db", type=float, default=-16)
    sub.add_parser("estilos")
    a = ap.parse_args()
    if a.cmd == "agrupar":
        agrupar(a)
    elif a.cmd == "render":
        render(a)
    elif a.cmd == "sfx":
        sfx(a)
    else:
        for n, e in ESTILOS.items():
            print(f"{n:10} {e['desc']}")


if __name__ == "__main__":
    main()
