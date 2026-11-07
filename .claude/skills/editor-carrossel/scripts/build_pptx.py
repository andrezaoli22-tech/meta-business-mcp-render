#!/usr/bin/env python3
"""Monta um .pptx editável a partir de export/layout.json (gerado por extract_layout.mjs).

Cada slide vira: fundo + blocos de cor + fotos (imagens soltas, trocáveis) + linhas + caixas de texto
editáveis. O PPTX abre no Canva (Importar arquivo), Google Slides, PowerPoint, Keynote e Figma.
Uso: python3 build_pptx.py caminho/export/layout.json saida.pptx
"""
import json, re, sys, os
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn

PX = 9525  # EMU por pixel (96 dpi)


def rgba(c):
    n = [float(x) for x in re.findall(r"[\d.]+", c)]
    return (int(n[0]), int(n[1]), int(n[2]), n[3] if len(n) > 3 else 1.0)


def set_alpha(fill_shape, alpha):
    if alpha >= 0.999:
        return
    srgb = fill_shape.fill._xPr.find(qn("a:solidFill")).find(qn("a:srgbClr"))
    a = srgb.makeelement(qn("a:alpha"), {"val": str(int(alpha * 100000))})
    srgb.append(a)


def rect(slide, x, y, w, h, color, radius=0, alpha=1.0):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(kind, Emu(int(x * PX)), Emu(int(y * PX)), Emu(int(w * PX)), Emu(int(h * PX)))
    r, g, b, a = rgba(color)
    s.fill.solid(); s.fill.fore_color.rgb = RGBColor(r, g, b)
    set_alpha(s, a * alpha)
    s.line.fill.background(); s.shadow.inherit = False
    if radius:
        s.adjustments[0] = min(0.5, radius / min(w, h))
    return s


def main(src, dst):
    data = json.load(open(src))
    base = os.path.dirname(src)
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(data["width"] * PX), Emu(data["height"] * PX)
    blank = prs.slide_layouts[6]
    for i, sd in enumerate(data["slides"], 1):
        slide = prs.slides.add_slide(blank)
        r, g, b, _ = rgba(sd["bg"])
        slide.background.fill.solid(); slide.background.fill.fore_color.rgb = RGBColor(r, g, b)
        # blocos grandes primeiro, fotos, depois chips/barras pequenas, linhas e textos
        big = [s for s in sd["shapes"] if not s["chip"]]
        small = [s for s in sd["shapes"] if s["chip"]]
        for s in big:
            rect(slide, s["x"], s["y"], s["w"], s["h"], s["color"], s["radius"]).name = "Bloco de cor"
        for m in sd["medias"]:
            pic = slide.shapes.add_picture(os.path.join(base, m["file"]), Emu(int(m["x"] * PX)), Emu(int(m["y"] * PX)), Emu(int(m["w"] * PX)), Emu(int(m["h"] * PX)))
            pic.name = "Foto (substituir)"
        for s in small:
            rect(slide, s["x"], s["y"], s["w"], s["h"], s["color"], s["radius"]).name = "Etiqueta"
        for l in sd["lines"]:
            rect(slide, l["x"], l["y"], l["w"], l["h"], l["color"], alpha=l.get("opacity", 1)).name = "Linha"
        for t in sd["texts"]:
            pad = 4  # folga para fontes que renderizam um pouco maiores em outros apps
            size0 = max(r.get("size", 0) for r in t["runs"])
            single = not any(r.get("br") for r in t["runs"]) and t["h"] - t.get("padTop", 0) * 2 < size0 * t["lineHeight"] * 1.6
            x, w = t["x"] - pad, t["w"] + pad * 2
            if single:  # uma linha: espaço extra do lado oposto ao alinhamento para não quebrar
                extra = max(40, w * 0.3)
                if t["align"] == "right":
                    x -= extra
                w += extra
            tb = slide.shapes.add_textbox(Emu(int(x * PX)), Emu(int(t["y"] * PX)), Emu(int(w * PX)), Emu(int(t["h"] * PX)))
            tb.name = "Texto " + t["name"][:30]
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = Emu(int((t.get("padLeft", 0) + pad) * PX)); tf.margin_right = Emu(int(pad * PX))
            tf.margin_top = Emu(int(t.get("padTop", 0) * PX)); tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.TOP
            p = tf.paragraphs[0]
            p.alignment = {"right": PP_ALIGN.RIGHT, "center": PP_ALIGN.CENTER}.get(t["align"], PP_ALIGN.LEFT)
            p.line_spacing = round(t["lineHeight"], 2)
            for run in t["runs"]:
                if run.get("br"):
                    p = tf.add_paragraph(); p.alignment = tf.paragraphs[0].alignment; p.line_spacing = round(t["lineHeight"], 2)
                    continue
                text = run["text"]
                if not p.runs:
                    text = text.lstrip()
                if run.get("upper"):
                    text = text.upper()
                rr = p.add_run(); rr.text = text
                f = rr.font
                f.name = run["font"]; f.size = Pt(run["size"] * 0.75); f.bold = run["weight"] >= 600
                cr, cg, cb, _ = rgba(run["color"]); f.color.rgb = RGBColor(cr, cg, cb)
                rPr = rr._r.get_or_add_rPr()
                if run.get("spacing"):
                    rPr.set("spc", str(int(run["spacing"] * 0.75 * 100)))
    prs.save(dst)
    print("PPTX salvo em", dst)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
