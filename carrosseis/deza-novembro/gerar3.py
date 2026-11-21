#!/usr/bin/env python3
"""Carrosséis @deza_os · v3 (foto protagonista, faixas de texto e cantos editoriais)."""
import os
AQUI = os.path.dirname(os.path.abspath(__file__))

CSS = """
:root{--w:1080px;--h:1350px;--creme:#FBF5EE;--escuro:#1E1310;--terra:#922F11;--pessego:#F4CDB8;--laranja:#E2541F;--f:"Inter Tight",sans-serif;--px:72px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#222;font-family:var(--f)}
.slide{width:var(--w);height:var(--h);position:relative;overflow:hidden;background:#d9d2ca;margin:0 auto 40px}
.media{position:absolute;inset:0;z-index:0}
.media img{width:100%;height:100%;object-fit:cover;display:block}
.vinheta{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.38) 0,rgba(0,0,0,0) 15%,rgba(0,0,0,0) 82%,rgba(0,0,0,.38) 100%)}
/* cantos */
.top{position:absolute;top:58px;left:var(--px);right:var(--px);display:flex;align-items:center;gap:24px;z-index:3}
.top>span{font-size:22px;font-weight:600;letter-spacing:.06em;color:#fff;white-space:nowrap}
.top .linha{flex:1;height:2px;background:rgba(255,255,255,.75)}
.base{position:absolute;bottom:52px;left:var(--px);right:var(--px);display:flex;justify-content:space-between;align-items:flex-end;z-index:3}
.base>span{font-size:20px;line-height:1.15;letter-spacing:.05em;color:#fff;font-weight:500}
.base>span b{font-weight:800}
.base>span.c{text-align:right}
.claro .top>span,.claro .base>span{color:var(--escuro)} .claro .top .linha{background:rgba(30,19,16,.5)}
/* faixas (texto com fundo, linha a linha) */
.faixas{position:absolute;z-index:2;display:flex;flex-direction:column;gap:10px}
.faixas.centro{align-items:center;left:0;right:0}
.faixas p{display:block;width:fit-content;font-size:66px;line-height:1.08;letter-spacing:-.025em;font-weight:400;padding:4px 20px 10px;color:var(--creme);background:var(--terra)}
.faixas p b{font-weight:800}
.faixas p.claro{background:var(--pessego);color:var(--escuro)}
/* cartão de texto (slides internos) */
.cartao{position:absolute;left:var(--px);right:var(--px);bottom:132px;z-index:2;background:var(--creme);padding:44px 48px 48px}
.cartao .k{font-size:24px;font-weight:800;letter-spacing:.14em;color:var(--terra);margin-bottom:18px}
.cartao h2{font-size:60px;line-height:1.04;letter-spacing:-.03em;font-weight:400;color:var(--escuro);margin-bottom:18px}
.cartao h2 b{font-weight:800}
.cartao p{font-size:34px;line-height:1.32;color:rgba(30,19,16,.78);font-weight:500}
.cartao p b{color:var(--escuro);font-weight:800}
/* nota (texto puro) */
.nota{background:var(--creme)}
.nota .miolo{position:absolute;left:var(--px);right:var(--px);top:300px;z-index:2}
.nota .k{font-size:24px;font-weight:800;letter-spacing:.14em;color:var(--terra);margin-bottom:34px}
.nota h2{font-size:104px;line-height:.98;letter-spacing:-.045em;font-weight:400;color:var(--escuro)}
.nota h2 b{font-weight:800;color:var(--terra)}
.nota p{font-size:38px;line-height:1.3;color:rgba(30,19,16,.75);margin-top:36px;font-weight:500}
"""

def cantos(i, n, claro=False):
    ult = i == n
    return (f'<div class="top"><span>@DEZA_OS</span><span class="linha"></span><span>{i:02d}/{n:02d}</span></div>'
            f'<div class="base"><span class="t">ANDREZA<br><b>OLIVEIRA</b></span><span class="t">2026</span><span class="t c">{"MARKETING<br><b>&amp; PRODUÇÃO</b>" if ult else "ARRASTA<br><b>PRO LADO →</b>"}</span></div>')

def foto(img, pos='center'):
    return f'<div class="media"><img src="img/{img}" style="object-position:{pos}"></div><div class="vinheta"></div>'

def capa(img, linhas, top=360, pos='center'):
    ps = ''.join(f'<p class="{c}">{t}</p>' for t, c in linhas)
    return ('', foto(img, pos) + f'<div class="faixas centro" style="top:{top}px">{ps}</div>')

def dia(img, k, titulo, corpo, pos='center'):
    return ('', foto(img, pos) + f'<div class="cartao"><p class="k">{k}</p><h2>{titulo}</h2><p>{corpo}</p></div>')

def nota(k, titulo, corpo=''):
    c = f'<p>{corpo}</p>' if corpo else ''
    return ('nota claro', f'<div class="miolo"><p class="k">{k}</p><h2>{titulo}</h2>{c}</div>')

def cta(img, linhas, top=330, pos='center'):
    ps = ''.join(f'<p class="{c}">{t}</p>' for t, c in linhas)
    return ('', foto(img, pos) + f'<div class="faixas centro" style="top:{top}px">{ps}</div>')

CARROSSEIS = {
 "v3-22-ninguem-sabe-o-que-eu-faco": [
  capa("p30698469.jpg", [("trabalho com <b>marketing</b>", ""), ("e até hoje <b>ninguém sabe</b>", ""), ("<b>o que eu faço</b>", "claro")], top=250),
  dia("p5029146.jpg", "07H30", "cara, deixa eu te contar como é <b>um dia meu</b>", "Não é só postar foto bonita. Tem planilha, reunião e cliente mandando áudio de 4 minutos. <b>E eu amo.</b>", "center top"),
  dia("p4442107.jpg", "09H00", "primeiro eu <b>penso</b>", "Pra quem é, por que alguém pararia pra ver e o que a pessoa faz depois. <b>Isso é a agência.</b>", "center top"),
  dia("p7514831.jpg", "14H00", "aí eu viro <b>produtora</b>", "Uma segunda empresa só pra fazer o conteúdo acontecer: gravar, editar, deixar bonito. <b>Sim, são duas.</b>", "center top"),
  dia("p7625338.jpg", "19H00", "esse é o meu <b>combustível</b>", "Entre uma empresa e outra: energético, playlist e muita oração. <b>Quem empreende sabe.</b>", "center 20%"),
  nota("O QUE EU QUERIA QUE TODO MUNDO SOUBESSE", "marketing não é mágica. é entender <b>gente.</b>", "Eu só faço isso todo dia, pra muitas marcas ao mesmo tempo."),
  cta("p33568641.jpg", [("agora você <b>sabe</b>", ""), ("manda pra alguém da família", "claro"), ("que também <b>não entende</b>", "claro"), ("o que você faz", "claro")], top=880, pos="center 30%"),
 ],
}

for pasta, slides in CARROSSEIS.items():
    d = os.path.join(AQUI, pasta); os.makedirs(d, exist_ok=True)
    n = len(slides)
    secs = [f'<section class="slide {cls}{" last" if i == n else ""}">{corpo}{cantos(i, n)}</section>' for i, (cls, corpo) in enumerate(slides, 1)]
    open(os.path.join(d, 'carrossel.html'), 'w').write(f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;800&display=swap" rel="stylesheet">
<title>@deza_os · {pasta}</title><style>{CSS}</style></head>
<body data-size="1080x1350">
{chr(10).join(secs)}
</body></html>''')
    print(pasta, n)
