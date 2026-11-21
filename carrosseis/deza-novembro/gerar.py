#!/usr/bin/env python3
"""Gera os carrosséis de novembro do @deza_os (HTML no padrão da skill editor-carrossel).
Uso: python3 gerar.py  -> cria uma pasta por carrossel com carrossel.html
"""
import html, os

AQUI = os.path.dirname(os.path.abspath(__file__))
E = html.escape

CSS = """
:root{--w:1080px;--h:1350px;--bg:#141010;--ink:#FFFFFF;--muted:rgba(255,255,255,.72);--acc:#E2541F;--creme:#F3ECE4;--escuro:#1E1310;--acc2:#C2451B;
--f:"Inter Tight",sans-serif;--px:80px}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#222;font-family:var(--f);color:var(--ink)}
.slide{width:var(--w);height:var(--h);position:relative;overflow:hidden;background:var(--bg);margin:0 auto 40px;display:flex;flex-direction:column;padding:180px var(--px) 170px}
.slide.creme{background:var(--creme);color:var(--escuro)}
.slide.laranja{background:var(--acc)}
.top{position:absolute;top:56px;left:var(--px);right:var(--px);display:flex;justify-content:space-between;z-index:3}
.top>span{font-size:24px;font-weight:600;letter-spacing:.08em;color:var(--muted)}
.rodape{position:absolute;bottom:54px;left:var(--px);right:var(--px);display:flex;justify-content:space-between;align-items:center;z-index:3}
.rodape>span{font-size:20px;font-weight:600;letter-spacing:.18em;color:var(--muted)}
.rodape>span.swipe{letter-spacing:.04em;font-size:26px;font-weight:800;color:var(--acc)}
.creme .top>span,.creme .rodape>span{color:rgba(30,19,16,.6)} .creme .rodape>span.swipe{color:var(--acc2)}
.laranja .top>span,.laranja .rodape>span{color:rgba(255,255,255,.85)}
.media{position:absolute;inset:0;z-index:0;display:flex;align-items:flex-start;justify-content:center;padding-top:300px;background:radial-gradient(circle at 50% 38%,#4a3a33 0,#2a201c 55%,#191312 100%)}
.media .ph{font-size:30px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.38);border:3px dashed rgba(255,255,255,.25);padding:28px 44px;border-radius:18px;text-align:center;max-width:760px}
.media .ph small{display:block;margin-top:12px;font-size:26px;font-weight:500;letter-spacing:0;text-transform:none}
.foto{justify-content:flex-end}
.foto h2{font-size:84px}
.foto p{color:rgba(255,255,255,.85)}
.scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(20,16,16,0) 35%,rgba(20,16,16,.55) 58%,rgba(20,16,16,.92) 82%)}
.conteudo{position:relative;z-index:2}
.capa{justify-content:flex-end}
.pre{font-size:54px;font-weight:500;letter-spacing:-.02em;line-height:1.05;margin-bottom:22px}
h1{font-size:168px;font-weight:900;letter-spacing:-.055em;line-height:.88}
h1.m{font-size:136px}
.hl{color:var(--acc)} .creme .hl{color:var(--acc2)}
.sub{font-size:46px;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:26px}
.badge{position:absolute;color:var(--acc);font-size:64px;line-height:1;z-index:3}
.creme .badge{color:var(--acc2)}
.k{font-size:30px;font-weight:800;letter-spacing:.16em;color:var(--acc);margin-bottom:28px}
.creme .k{color:var(--acc2)}
h2{font-size:92px;font-weight:900;letter-spacing:-.045em;line-height:.95;margin-bottom:40px}
p{font-size:40px;font-weight:500;line-height:1.32;letter-spacing:-.01em;color:var(--muted)}
.creme p{color:rgba(30,19,16,.78)}
p b{color:var(--ink);font-weight:800} .creme p b{color:var(--escuro)}
.texto{justify-content:center}
.lista li{list-style:none;font-size:40px;font-weight:600;line-height:1.25;padding:26px 0;position:relative}
.lista li::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.16)}
.lista li span.n{color:var(--acc);font-weight:900}
.frase{justify-content:center}
.frase h2{font-size:104px}
.cta{justify-content:center;align-items:flex-start}
.cta h2{font-size:112px}
.cta p{color:rgba(255,255,255,.92)}
.btn{display:inline-block;margin-top:56px;padding:30px 52px;border-radius:999px;background:var(--escuro);color:#fff;font-size:38px;font-weight:800;letter-spacing:-.01em}
.perfil{justify-content:flex-end}
.perfil .media.print{inset:170px 80px auto 80px;height:640px;border-radius:28px}
.perfil .media.print{align-items:center;padding-top:0}
.perfil h2{font-size:84px;margin-bottom:24px}
"""

def topo(i, n):
    return f'<div class="top"><span class="t">@DEZA_OS</span><span class="t">{i:02d}/{n:02d}</span></div>'

def rodape(ultimo):
    sw = '' if ultimo else '<span class="t swipe">arrasta →</span>'
    return f'<div class="rodape"><span class="t">ANDREZA OLIVEIRA | MARKETING</span>{sw}</div>'

def capa(pre, linhas, sub=None, foto='você olhando para a câmera', estrelas=((930, 470),)):
    hs = ''.join(f'<h1 class="{c}">{t}</h1>' for t, c in linhas)
    st = ''.join(f'<span class="badge" style="left:{x}px;top:{y}px">★</span>' for x, y in estrelas)
    s = f'<p class="pre">{pre}</p>' if pre else ''
    sb = f'<p class="sub">{sub}</p>' if sub else ''
    return ('capa', '', f'<div class="media"><span class="ph">SUA FOTO AQUI<small>{foto}</small></span></div><div class="scrim"></div>{st}<div class="conteudo">{s}{hs}{sb}</div>')

def foto(k, titulo, corpo, sugestao):
    """Slide com a sua foto de fundo e o texto embaixo, como diário."""
    return ('foto', '', f'<div class="media"><span class="ph">SUA FOTO AQUI<small>{sugestao}</small></span></div><div class="scrim"></div><div class="conteudo"><p class="k">{k}</p><h2>{titulo}</h2><p>{corpo}</p></div>')

def nota(k, titulo, corpo=''):
    """Slide de bilhete/desabafo em fundo creme."""
    c = f'<p>{corpo}</p>' if corpo else ''
    return ('frase', 'creme', f'<span class="badge" style="left:860px;top:230px">★</span><div class="conteudo"><p class="k">{k}</p><h2>{titulo}</h2>{c}</div>')

def cta(titulo, corpo, botao):
    return ('cta', 'laranja', f'<span class="badge" style="left:860px;top:250px;color:#fff">★</span><div class="conteudo"><h2>{titulo}</h2><p>{corpo}</p><span class="btn">{botao}</span></div>')

CARROSSEIS = {
 "22-ninguem-sabe-o-que-eu-faco": [
  capa("trabalho com marketing e até hoje", [("ninguém", ""), ("sabe o que", "m"), ('eu <span class="hl">faço</span>', "")], foto="você no computador, rindo ou com cara de 'oi?'"),
  foto("07H30", 'cara, deixa eu te contar como é um dia <span class="hl">meu</span>', "Não é só postar foto bonita. Tem planilha, reunião e cliente mandando áudio de 4 minutos. <b>E eu amo.</b>", "café da manhã / planner aberto"),
  foto("09H00", 'primeiro eu <span class="hl">penso</span>', "Antes de qualquer post: pra quem é, por que alguém pararia pra ver e o que a pessoa faz depois. <b>Isso é a agência.</b>", "você em reunião ou no notebook"),
  foto("14H00", 'aí eu viro <span class="hl">produtora</span>', "Tenho uma segunda empresa só pra fazer o conteúdo acontecer: gravar, editar, deixar bonito. <b>Sim, são duas.</b>", "set de gravação, câmera, fone"),
  foto("19H00", 'esse é o meu <span class="hl">combustível</span>', "Entre uma empresa e outra: energético, playlist e muita oração. <b>Quem empreende sabe.</b>", "você no carro ou com o seu energético"),
  nota("O QUE EU QUERIA QUE TODO MUNDO SOUBESSE", 'marketing não é mágica. é entender <span class="hl">gente.</span>', "Eu só faço isso todo dia, pra muitas marcas ao mesmo tempo."),
  cta("agora você sabe.", "Manda pra alguém da sua família que também não entende o que você faz.", "Enviar pra alguém"),
 ],
 "24-eu-descobri": [
  capa("cara, deixa eu te contar o que eu", [('<span class="hl">descobri</span>', "m"), ("esse mês", "m")], foto="você com cara de quem vai contar um segredo"),
  foto("A HISTÓRIA", 'tava olhando os números de um <span class="hl">cliente</span>…', "E percebi que os posts que mais deram resultado não eram os mais bonitos. <b>Eram os que tinham a cara dele.</b>", "você analisando a tela do computador"),
  nota("O QUE EU DESCOBRI", 'as pessoas não seguem marcas. seguem <span class="hl">pessoas.</span>', "Bastidor, opinião, erro, rotina. É isso que faz alguém confiar em você."),
  foto("AÍ CAIU A FICHA", 'olhei pro meu próprio <span class="hl">perfil</span>', "E vi que eu fazia o contrário: só conteúdo certinho. <b>Ensinava pros clientes e não fazia pra mim.</b>", "você olhando o celular, pensativa"),
  foto("A MUDANÇA", 'por isso eu comecei a <span class="hl">aparecer</span>', "Mostrar meu dia, minhas opiniões, minha fé, meu jeito. <b>Sem pose.</b>", "uma foto bem espontânea sua"),
  nota("SE VOCÊ TRABALHA COM ALGO E NINGUÉM TE CONHECE…", 'talvez você só ainda não <span class="hl">apareceu</span> no seu conteúdo.'),
  cta("e você, aparece?", "Me conta nos comentários se você mostra a sua cara no seu perfil. <b>Quero ler todos.</b>", "Comenta aqui"),
 ],
 "26-foi-mal-eu-menti": [
  capa("foi mal,", [("eu", ""), ('<span class="hl">menti</span>', "")], sub="coisas que eu falava quando comecei no marketing", foto="você com cara de culpada / ombro encolhido"),
  foto("EU FALAVA", '"aceito qualquer <span class="hl">cliente</span>"', "Hoje eu sei: <b>cliente errado custa mais caro que mês sem cliente.</b>", "você no notebook, séria"),
  foto("EU FALAVA", '"faço por qualquer <span class="hl">valor</span>"', "Cobrar pouco me fez trabalhar o dobro e entregar menos. <b>Preço também posiciona.</b>", "você com café, cansada (pode ser engraçada)"),
  foto("EU FALAVA", '"não preciso <span class="hl">aparecer</span>"', "Precisava. <b>As pessoas compram de quem elas conhecem.</b>", "você gravando um vídeo"),
  foto("EU FALAVA", '"depois eu <span class="hl">organizo</span>"', "Depois nunca chega. <b>Processo é o que me deixa respirar com duas empresas.</b>", "sua mesa de trabalho / agenda"),
  nota("E PRA DEIXAR CLARO", 'eu não mudo de opinião pra agradar <span class="hl">ninguém.</span>', "Mudei porque aprendi na prática. Errar faz parte. Ficar no erro é escolha."),
  cta("qual dessas você ainda fala?", "Pode confessar, eu já falei todas. <b>Comenta o número aqui embaixo.</b>", "Comenta o número"),
 ],
 "28-parece-outra-vida": [
  capa("parece outra vida,", [("mas", ""), ('eu <span class="hl">já…</span>', "")], sub="fui a menina que não sabia por onde começar", foto="você no carro, olhando pela janela"),
  foto("EU JÁ", 'trabalhei sem saber <span class="hl">cobrar</span>', "Achava que todo trabalho era oportunidade. <b>Nem todo é.</b>", "foto antiga sua, do começo"),
  foto("EU JÁ", 'gravei com o que eu <span class="hl">tinha</span>', "Celular, luz da janela e coragem. <b>O equipamento veio depois. A vontade veio antes.</b>", "bastidor simples de gravação"),
  foto("EU JÁ", 'achei que não era boa o <span class="hl">suficiente</span>', "Pra abrir uma empresa, pra cobrar mais, pra aparecer. <b>Esse pensamento quase me parou.</b>", "você pensativa, luz suave"),
  foto("HOJE", 'eu tenho <span class="hl">duas</span>', "Uma agência e uma produtora. Ainda aprendendo todo dia, <b>mas com a certeza de que tô no lugar certo.</b>", "você hoje, confiante (pode ser no set ou no escritório)"),
  nota("SE VOCÊ TÁ NO COMEÇO, OUVE ISSO", 'ninguém começa <span class="hl">pronta.</span>', "Você vai ficando pronta no caminho. Honra o seu processo. E Deus no centro, sempre."),
  cta("salva pra lembrar disso", "Nos dias difíceis, volta aqui. <b>E manda pra uma amiga que tá começando.</b>", "Salvar"),
 ],
 "30-agencia-e-produtora-pra-minha-mae": [
  capa("deixa eu te explicar a diferença entre", [("agência", "m"), ('<span class="hl">e produtora</span>', "m")], sub="do jeito que eu explico pra minha mãe", foto="você explicando algo, mãos em movimento"),
  foto("EU: \"MÃE, OLHA SÓ…\"", 'a agência é o <span class="hl">cérebro</span>', "A gente pensa: o que postar, pra quem, quando e por quê.", "você no notebook / quadro de planejamento"),
  foto("EU, CONTINUANDO", 'e a produtora é a <span class="hl">mão</span>', "A gente faz: grava, edita, deixa bonito e pronto pra postar.", "você com a câmera ou no set"),
  nota("AÍ ELA PERGUNTOU: \"E PRECISA DAS DUAS?\"", 'cérebro sem mão não faz nada. mão sem cérebro faz <span class="hl">qualquer coisa.</span>'),
  foto("POR ISSO", 'eu tenho as <span class="hl">duas</span>', "Cansei de ver estratégia boa morrer no papel <b>e vídeo lindo que não vende nada.</b>", "você sorrindo, no seu ambiente de trabalho"),
  cta("ficou mais fácil?", "Se ainda tá na dúvida de qual você precisa, <b>me chama no direct com a palavra AJUDA.</b>", "Direct: AJUDA"),
 ],
}

for pasta, slides in CARROSSEIS.items():
    d = os.path.join(AQUI, pasta)
    os.makedirs(d, exist_ok=True)
    n = len(slides)
    secs = []
    for i, (tipo, tema, corpo) in enumerate(slides, 1):
        ult = i == n
        secs.append(f'<section class="slide {tipo} {tema}{" last" if ult else ""}">{topo(i, n)}{corpo}{rodape(ult)}</section>')
    doc = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600;800;900&display=swap" rel="stylesheet">
<title>@deza_os · {pasta}</title><style>{CSS}</style></head>
<body data-size="1080x1350">
{chr(10).join(secs)}
</body></html>'''
    open(os.path.join(d, 'carrossel.html'), 'w').write(doc)
    print(pasta, n, 'slides')
