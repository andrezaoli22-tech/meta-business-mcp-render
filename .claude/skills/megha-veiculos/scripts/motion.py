#!/usr/bin/env python3
"""Renderiza um elemento de motion (HTML/CSS) como camada transparente.

Uso:
  python motion.py listar
  python motion.py titulo --params '{"titulo":"Método 3D","subtitulo":"aula 01"}' \
                   --saida trabalho/titulo.mov [--duracao 3.2] [--previa 0.4,1.5]
  python motion.py /caminho/meu_template.html --params '{...}' --saida x.mov

Templates em assets/motion/ da skill megha-veiculos: tela-azul, quadrado-azul, bolhas.
Um template próprio só precisa seguir o contrato descrito em references/motion.md
(window.PARAMS, window.renderFrame(t), window.PRONTO opcional).
A camada gerada entra no montar.py pela lista de overlays, com o instante de entrada.
"""
import argparse
import glob
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _comum import ASSETS, erro  # noqa: E402
from legendas import baixar_google, fontes_locais  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES_PADRAO = ["Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400",
                 "Montserrat Alternates:wght@300;400;500;600"]


def descricao(arq):
    txt = open(arq, encoding="utf-8").read()
    ini = txt.find("<!--")
    return " ".join(txt[ini + 4:txt.find("-->", ini)].split()) if ini >= 0 else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("template")
    ap.add_argument("--params", default="{}", help="JSON com os parâmetros, ou @arquivo.json")
    ap.add_argument("--saida", default="motion.mov")
    ap.add_argument("--duracao", type=float)
    ap.add_argument("--largura", type=int, default=1080)
    ap.add_argument("--altura", type=int, default=1920)
    ap.add_argument("--fps", type=float, default=30)
    ap.add_argument("--fontes", default="", help="famílias extras do Google Fonts, separadas por |")
    ap.add_argument("--previa", default="", help="só gera PNGs nesses instantes")
    ap.add_argument("--escala", type=float, default=1.0, help="2 = 4K nativo a partir de 1080x1920")
    a = ap.parse_args()

    if a.template == "listar":
        for arq in sorted(glob.glob(os.path.join(ASSETS, "motion", "*.html"))):
            print(f"{os.path.basename(arq)[:-5]:12} {descricao(arq)}\n")
        return

    arq = a.template if a.template.endswith(".html") else os.path.join(ASSETS, "motion", a.template + ".html")
    if not os.path.exists(arq):
        erro(f"template não encontrado: {arq}")
    params = json.loads(open(a.params[1:]).read() if a.params.startswith("@") else a.params)
    if a.duracao:
        params["duracao"] = a.duracao

    familias = FONTES_PADRAO + [f for f in a.fontes.split("|") if f.strip()]
    css = baixar_google(familias) + "\n" + fontes_locais()
    html = open(arq, encoding="utf-8").read()
    html = html.replace("/*__FONTES__*/", css)
    html = html.replace("/*__PARAMS__*/{}", json.dumps(params, ensure_ascii=False))
    html = html.replace("/*__BASE__*/", open(os.path.join(ASSETS, "motion", "_base.js")).read())
    # bibliotecas locais (three.js etc.) referenciadas como __LIB__/arquivo
    html = html.replace("__LIB__", "file://" + os.path.join(ASSETS, "motion", "lib"))
    html = html.replace("__MARCA__", "file://" + os.path.join(ASSETS, "marca"))
    if "/*__FONTE3D__*/null" in html:   # fonte 3D embutida (evita fetch de arquivo local)
        html = html.replace("/*__FONTE3D__*/null",
                            open(os.path.join(ASSETS, "motion", "lib", "helvetiker_bold.typeface.json")).read())

    pasta = tempfile.mkdtemp(prefix="motion_")
    pagina = os.path.join(pasta, "pagina.html")
    with open(pagina, "w", encoding="utf-8") as f:
        f.write(html)

    if a.previa:
        tempos = [float(x) for x in a.previa.split(",") if x.strip()]
        base = os.path.splitext(a.saida)[0]
        js = os.path.join(pasta, "previa.js")
        with open(js, "w") as f:
            f.write(f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch({{ args: ['--allow-file-access-from-files'] }});
  const p = await b.newPage({{ viewport: {{ width: {a.largura}, height: {a.altura} }} }});
  await p.goto('file://{pagina}'); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => window.PRONTO);
  for (const t of {json.dumps(tempos)}) {{
    await p.evaluate(t => window.renderFrame(t), t);
    await p.screenshot({{ path: '{base}_previa_' + t.toFixed(2) + '.png', omitBackground: true }});
    console.log('{base}_previa_' + t.toFixed(2) + '.png');
  }}
  await b.close();
}})();""")
        subprocess.run(["node", js], check=True)
        return

    cmd = ["node", os.path.join(AQUI, "render_html.cjs"), "--html", pagina, "--saida", a.saida,
           "--largura", str(a.largura), "--altura", str(a.altura), "--fps", str(a.fps),
           "--escala", str(a.escala)]
    if a.duracao:
        cmd += ["--duracao", str(a.duracao)]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main()
