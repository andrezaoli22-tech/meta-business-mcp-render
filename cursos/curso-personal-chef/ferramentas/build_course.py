"""Monta o curso completo (HTML navegável + Markdown único) a partir dos arquivos .md."""
import html, json, pathlib, re, sys
import markdown

ROOT = pathlib.Path(sys.argv[1])
OUT_HTML = ROOT / "curso-completo.html"
OUT_MD = ROOT / "curso-completo.md"

MODS = sorted((ROOT / "modulos").iterdir())
MOD_TITLES = {}

def rd(p): return (ROOT / p).read_text() if not isinstance(p, pathlib.Path) else p.read_text()

# ---------- lista de seções ----------
sections = []  # dict(id, nav, group, md | html, kind)
sections.append(dict(id="inicio", nav="Visão geral", group="Comece aqui", md=rd("00-visao-geral.md"), kind="doc"))
for i, m in enumerate(MODS, 1):
    intro = (m / "00-introducao.md").read_text()
    title = intro.splitlines()[0].lstrip("# ").strip()
    short = title.split("—", 1)[1].strip() if "—" in title else title
    MOD_TITLES[i] = short
    g = f"Módulo {i} · {short}"
    sections.append(dict(id=f"modulo-{i}", nav="Introdução e checklist", group=g, md=intro, kind="doc", mod=i))
    for a in sorted(m.glob("aula-*.md")):
        t = a.read_text()
        h = t.splitlines()[0].lstrip("# ").strip()
        num, name = h.replace("Aula ", "").split(" — ", 1)
        sections.append(dict(id="aula-" + num.replace(".", "-"), nav=f"{num} {name}", group=g, md=t, kind="lesson", mod=i))
    sections.append(dict(id=f"atividade-{i}", nav="Atividade avaliativa", group=g, md=(m / "atividade-avaliativa.md").read_text(), kind="doc", mod=i))
sections.append(dict(id="projeto-final", nav="Projeto final", group="Avaliação final", md=rd("projeto-final.md"), kind="doc"))
sections.append(dict(id="prova-final", nav="Prova final (30 questões)", group="Avaliação final", md=None, kind="exam"))
extras = [("modelo-entrevista", "Formulário de entrevista", "extras/modelo-entrevista-cliente.md"),
          ("modelo-ficha", "Ficha técnica", "extras/modelo-ficha-tecnica.md"),
          ("modelo-preco", "Planilha de precificação", "extras/modelo-planilha-precificacao.md"),
          ("modelo-contrato", "Contrato", "extras/modelo-contrato.md"),
          ("modelo-checklist", "Checklist do cook day", "extras/checklist-cook-day.md"),
          ("modelo-manual", "Manual de Boas Práticas", "extras/modelo-manual-boas-praticas.md"),
          ("modelo-certificado", "Certificado", "extras/certificado.md")]
for sid, nav, p in extras:
    sections.append(dict(id=sid, nav=nav, group="Modelos prontos", md=rd(p), kind="doc"))
sections.append(dict(id="glossario", nav="Glossário", group="Consulta", md=rd("glossario.md"), kind="doc"))
sections.append(dict(id="recursos", nav="Biblioteca de recursos", group="Consulta", md=rd("recursos.md"), kind="doc"))
sections.append(dict(id="benchmark", nav="Cursos analisados", group="Consulta", md=rd("pesquisa/benchmark.md"), kind="doc"))
sections.append(dict(id="fontes", nav="Fontes da pesquisa", group="Consulta", md=rd("pesquisa/fontes.md"), kind="doc"))

FILE_LINKS = {"extras/modelo-entrevista-cliente.md": "modelo-entrevista", "extras/modelo-ficha-tecnica.md": "modelo-ficha",
              "extras/modelo-planilha-precificacao.md": "modelo-preco", "extras/modelo-contrato.md": "modelo-contrato",
              "extras/checklist-cook-day.md": "modelo-checklist", "extras/modelo-manual-boas-praticas.md": "modelo-manual",
              "extras/certificado.md": "modelo-certificado", "projeto-final.md": "projeto-final",
              "avaliacao-final.md": "prova-final", "pesquisa/benchmark.md": "benchmark", "pesquisa/fontes.md": "fontes",
              "fontes.md": "fontes", "recursos.md": "recursos", "glossario.md": "glossario"}

SVGS = {p.name: re.sub(r"<\?xml[^>]*>", "", p.read_text()) for p in (ROOT / "imagens").glob("*.svg")}

# ---------- markdown -> html ----------
LIST_RE = re.compile(r"^(\d+\.|[-*]) ")
def fix_blocks(md):
    out, prev = [], ""
    for line in md.splitlines():
        s = line
        if prev.strip() and not prev.startswith((" ", "\t")):
            if LIST_RE.match(s) and not LIST_RE.match(prev):
                out.append("")
            elif s.startswith("|") and not prev.startswith("|"):
                out.append("")
            elif s.startswith(">") and not prev.startswith(">"):
                out.append("")
            elif s.startswith("**Gabarito") is False and s.startswith("## ") and prev.strip():
                out.append("")
        out.append(s); prev = s
    return "\n".join(out)

def md2html(md, sec):
    md = re.sub(r"^---\s*$", "", md, flags=re.M) if sec.get("id") == "modelo-certificado" else md
    h = markdown.markdown(fix_blocks(md), extensions=["tables", "fenced_code", "sane_lists"])
    # imagens SVG inline
    def img(m):
        alt, src = m.group(1), m.group(2)
        svg = SVGS.get(pathlib.Path(src).name)
        if not svg: return m.group(0)
        svg = svg.replace("<svg ", f'<svg role="img" aria-label="{html.escape(alt)}" ', 1)
        return f'<figure class="fig">{svg}<figcaption>{html.escape(alt)}</figcaption></figure>'
    h = re.sub(r'<p><img alt="([^"]*)" src="([^"]+)" ?/?></p>', img, h)
    # tabelas roláveis
    h = h.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    # ficha da aula
    h = h.replace("<p><strong>Tempo de leitura:</strong>", '<p class="ticket"><strong>Tempo de leitura:</strong>')
    # checklists
    h = re.sub(r"<li>\[ \] ", lambda m: '<li class="check"><input type="checkbox" class="chk"> ', h)
    # links para arquivos do curso
    def code_link(m):
        f = m.group(1)
        if f == "atividade-avaliativa.md" and sec.get("mod"):
            return f'<a href="#atividade-{sec["mod"]}">Atividade avaliativa do módulo</a>'
        if f in FILE_LINKS:
            target = next(s for s in sections if s["id"] == FILE_LINKS[f])
            return f'<a href="#{target["id"]}">{html.escape(target["nav"])}</a>'
        if f.startswith("pesquisa/") or f.startswith("modulos/") or f.startswith("imagens/"):
            return m.group(0)
        return m.group(0)
    h = re.sub(r"<code>([\w\-/]+\.md)</code>", code_link, h)
    # links externos em nova aba
    h = re.sub(r'<a href="(https?://[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', h)
    h = re.sub(r'(?<!href=")(?<!">)(https?://[^\s<)"]*[^\s<)".,;])', lambda m: f'<a href="{m.group(1)}" target="_blank" rel="noopener">{m.group(1)}</a>', h)
    return h

# ---------- prova interativa ----------
def build_exam():
    t = rd("avaliacao-final.md")
    partA = t.split("## Parte A")[1].split("## Parte B")[0]
    partB = t.split("## Parte B")[1].split("## Gabarito comentado")[0]
    gab = {}
    for row in re.findall(r"^\| (\d+) \| ([a-d]) \| (.*?) \| ([\d.]+) \|$", t, re.M):
        gab[int(row[0])] = dict(ans=row[1], com=row[2], aula=row[3])
    crit = {int(n): c.strip().replace("\n", " ") for n, c in re.findall(r"- \*\*Q(\d+) \([^)]*\):\*\* (.*?)(?=\n- \*\*Q|\n\n)", t, re.S)}
    blocks = re.findall(r"\*\*Q(\d+)\.\*\* (.*?)(?=\n\*\*Q\d+\.|\Z)", partA.strip(), re.S)
    out = ['<h1>Prova final</h1>',
           '<p class="ticket"><strong>Duração:</strong> 60 min · <strong>30 questões</strong> (25 objetivas + 5 situacionais) · <strong>Aprovação:</strong> 70% (21 pontos)</p>',
           '<p>Responda às 25 questões objetivas e clique em <strong>Corrigir prova</strong>. A nota e o gabarito comentado aparecem logo abaixo de cada questão. As 5 questões situacionais são corrigidas por você mesmo, com os critérios que aparecem depois da correção.</p>',
           '<form id="exam" novalidate><h2>Parte A — Questões objetivas</h2>']
    for n, body in blocks:
        n = int(n)
        body = body.strip()
        first, rest = (body.split("\n", 1) + [""])[:2]
        stem = first.strip()
        opts_txt = " " + rest.replace("\n", " ")
        if not re.search(r"(?:^|\s)a\) ", opts_txt):  # enunciado em várias linhas
            lines = body.split("\n")
            stem_lines = [l for l in lines if not re.match(r"^[a-d]\) ", l)]
            stem = " ".join(stem_lines)
            opts_txt = " " + " ".join(l for l in lines if re.match(r"^[a-d]\) ", l))
        else:
            # pode haver continuação do enunciado antes de "a)"
            pre = opts_txt.split(" a) ", 1)[0].strip()
            if pre: stem += " " + pre
        opts = re.findall(r"(?:^|\s)([a-d])\) (.*?)(?=\s[a-d]\) |$)", opts_txt.strip())
        g = gab[n]
        out.append(f'<fieldset class="q" data-q="{n}" data-ans="{g["ans"]}"><legend><span class="qn">Q{n}</span> {html.escape(stem)}</legend>')
        for k, v in opts:
            out.append(f'<label class="opt"><input type="radio" name="q{n}" value="{k}"> <span><b>{k})</b> {html.escape(v.strip())}</span></label>')
        out.append(f'<p class="fb" hidden>Resposta correta: <b>{g["ans"]}</b>. {html.escape(g["com"])} <a href="#aula-{g["aula"].replace(".", "-")}">Revisar aula {g["aula"]}</a></p></fieldset>')
    out.append('<h2>Parte B — Questões situacionais</h2>')
    for n, body in re.findall(r"\*\*Q(\d+)\.\*\* (.*?)(?=\n\n|\Z)", partB.strip(), re.S):
        n = int(n)
        out.append(f'<div class="q open" data-open="{n}"><label for="q{n}t"><span class="qn">Q{n}</span> {html.escape(body.replace(chr(10), " "))}</label>'
                   f'<textarea id="q{n}t" rows="4" placeholder="Escreva sua resposta"></textarea>'
                   f'<p class="fb" hidden><b>Critério de correção:</b> {html.escape(re.sub(r"[*]", "", crit.get(n, "")))}</p></div>')
    out.append('<div class="exam-actions"><button type="submit" class="btn primary">Corrigir prova</button><button type="button" class="btn" id="exam-reset">Limpar respostas</button></div>'
               '<div id="score" class="score" hidden aria-live="polite"></div></form>')
    return "\n".join(out)

# ---------- montar HTML ----------
groups = []
for s in sections:
    if not groups or groups[-1][0] != s["group"]: groups.append((s["group"], []))
    groups[-1][1].append(s)

nav = []
for g, items in groups:
    nav.append(f'<div class="nav-group"><p class="nav-title">{html.escape(g)}</p><ul>')
    for s in items:
        cls = ' class="lesson-link"' if s["kind"] == "lesson" else ""
        nav.append(f'<li><a href="#{s["id"]}" data-id="{s["id"]}"{cls}>{html.escape(s["nav"])}</a></li>')
    nav.append("</ul></div>")

body = []
for idx, s in enumerate(sections):
    content = build_exam() if s["kind"] == "exam" else md2html(s["md"], s)
    prev_s = sections[idx - 1] if idx else None
    next_s = sections[idx + 1] if idx + 1 < len(sections) else None
    pager = '<nav class="pager">'
    pager += f'<a class="btn" href="#{prev_s["id"]}">← {html.escape(prev_s["nav"])}</a>' if prev_s else "<span></span>"
    pager += f'<a class="btn primary" href="#{next_s["id"]}">{html.escape(next_s["nav"])} →</a>' if next_s else "<span></span>"
    pager += "</nav>"
    done = ""
    if s["kind"] == "lesson":
        done = f'<label class="done"><input type="checkbox" class="done-chk" data-id="{s["id"]}"> Concluí esta aula</label>'
    eyebrow = html.escape(s["group"])
    body.append(f'<section id="{s["id"]}" data-sec data-kind="{s["kind"]}"><p class="eyebrow">{eyebrow}</p>{content}{done}{pager}</section>')

LESSONS = [s["id"] for s in sections if s["kind"] == "lesson"]
tpl = (pathlib.Path(sys.argv[2])).read_text()
page = (tpl.replace("{{NAV}}", "\n".join(nav))
           .replace("{{BODY}}", "\n".join(body))
           .replace("{{LESSONS}}", json.dumps(LESSONS))
           .replace("{{NLESSONS}}", str(len(LESSONS))))
OUT_HTML.write_text(page)

# ---------- markdown único ----------
parts = ["# Personal Chef Pro — Curso completo\n\n> Arquivo único gerado a partir das pastas do curso. Ordem: visão geral, módulos e aulas, avaliação, modelos, consulta.\n"]
for s in sections:
    md = rd("avaliacao-final.md") if s["kind"] == "exam" else s["md"]
    md = md.replace("](../../imagens/", "](imagens/")
    md = re.sub(r"^(#+) ", lambda m: "#" + m.group(1) + " ", md, flags=re.M)  # rebaixa títulos
    parts.append(f"\n---\n\n<a id=\"{s['id']}\"></a>\n\n{md.strip()}\n")
OUT_MD.write_text("\n".join(parts))
print("secoes", len(sections), "aulas", len(LESSONS), "html KB", OUT_HTML.stat().st_size // 1024, "md KB", OUT_MD.stat().st_size // 1024)
