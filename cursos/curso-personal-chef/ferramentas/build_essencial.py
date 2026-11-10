"""Gera curso-essencial.html a partir de curso-essencial.md."""
import pathlib, re, sys, markdown
root = pathlib.Path(sys.argv[1])
md = (root / "curso-essencial.md").read_text()
md = re.sub(r"(?m)^([^|\s\d-].*)\n(\| |\d+\. |- )", r"\1\n\n\2", md)
h = markdown.markdown(md, extensions=["tables", "sane_lists"])
h = h.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
h = re.sub(r"<p><strong>Gabarito:</strong>(.*?)</p>", r'<details class="gab"><summary>Ver gabarito</summary><p>\1</p></details>', h, flags=re.S)
h = h.replace("<code>pesquisa/fontes.md</code>", "<code>pesquisa/fontes.md</code>")
h = re.sub(r"<h2>(Módulo \d+) — (.*?)</h2>", r'<h2><span class="mod">\1</span>\2</h2>', h)
tpl = (root / "ferramentas" / "template_essencial.html").read_text()
(root / "curso-essencial.html").write_text(tpl.replace("{{BODY}}", h))
