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
.media .ph{font-size:30px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.35);border:3px dashed rgba(255,255,255,.25);padding:28px 44px;border-radius:18px}
.scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(20,16,16,0) 35%,rgba(20,16,16,.55) 58%,rgba(20,16,16,.92) 82%)}
.conteudo{position:relative;z-index:2}
.capa{justify-content:flex-end}
.pre{font-size:54px;font-weight:500;letter-spacing:-.02em;line-height:1.05}
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

def capa(pre, linhas, sub=None, estrelas=((930, 470), (900, 1010))):
    hs = ''.join(f'<h1 class="{c}">{t}</h1>' for t, c in linhas)
    st = ''.join(f'<span class="badge" style="left:{x}px;top:{y}px">★</span>' for x, y in estrelas)
    s = f'<p class="pre">{pre}</p>' if pre else ''
    sb = f'<p class="sub">{sub}</p>' if sub else ''
    return ('capa', '', f'<div class="media"><span class="ph">SUA FOTO AQUI</span></div><div class="scrim"></div>{st}<div class="conteudo">{s}{hs}{sb}</div>')

def texto(k, titulo, corpo, tema=''):
    return ('texto', tema, f'<div class="conteudo"><p class="k">{k}</p><h2>{titulo}</h2><p>{corpo}</p></div>')

def lista(k, titulo, itens, tema=''):
    li = ''.join(f'<li><span class="n">{i+1:02d}</span>\u2003{t}</li>' for i, t in enumerate(itens))
    return ('texto lista', tema, f'<div class="conteudo"><p class="k">{k}</p><h2>{titulo}</h2><ul>{li}</ul></div>')

def frase(titulo, corpo=''):
    c = f'<p>{corpo}</p>' if corpo else ''
    return ('frase', 'creme', f'<span class="badge" style="left:820px;top:230px">★</span><div class="conteudo"><p class="k">OPINIÃO DA DEZA</p><h2>{titulo}</h2>{c}</div>')

def perfil(k, handle, corpo):
    return ('perfil', '', f'<div class="media print"><span class="ph">PRINT DO PERFIL</span></div><div class="conteudo"><p class="k">{k}</p><h2><span class="hl">{handle}</span></h2><p>{corpo}</p></div>')

def cta(titulo, corpo, botao):
    return ('cta', 'laranja', f'<span class="badge" style="left:860px;top:250px;color:#fff">★</span><div class="conteudo"><h2>{titulo}</h2><p>{corpo}</p><span class="btn">{botao}</span></div>')

CARROSSEIS = {
 "22-agencia-e-produtora": [
  capa("o que ninguém te conta sobre ter", [("uma", ""), ('<span class="hl">agência</span>', ""), ('<span class="hl">E</span> uma', ""), ("produtora", "")]),
  texto("01", 'Não são dois empregos. São dois <span class="hl">calendários.</span>', "De manhã eu penso estratégia. À tarde tem set de gravação. À noite, edição. <b>Trocar de chave várias vezes por dia</b> é o verdadeiro trabalho."),
  texto("02", 'Cada cliente fala uma <span class="hl">língua.</span>', 'Cliente de agência pergunta: <b>"qual é a estratégia?"</b> Cliente de produtora pergunta: <b>"quando fica pronto?"</b> Os dois estão certos.'),
  texto("03", 'A vantagem que quase <span class="hl">ninguém</span> tem', "Eu planejo o conteúdo <b>e</b> sei quanto custa produzir. Por isso não prometo o que não dá para entregar."),
  texto("04", 'O erro que eu já <span class="hl">cometi</span>', "Aceitar tudo. Todo projeto parecia oportunidade, até a agenda virar caos. <b>Dizer não também é estratégia.</b>"),
  texto("05", 'O que me <span class="hl">salva:</span> processo', "Briefing, calendário, aprovação, checklist. <b>Criatividade sem processo vira correria.</b> Com processo, vira entrega."),
  frase('Ter duas empresas não é sobre fazer <span class="hl">mais.</span>', "É sobre uma alimentar a outra."),
  cta("Quer ver os bastidores?", "Essa é a série <b>Bastidores de 2 empresas</b>. Salva e me segue para não perder os próximos episódios.", "Salvar e seguir"),
 ],
 "24-marca-explicada-stanley": [
  capa("marca explicada:", [("como um", ""), ('<span class="hl">copo</span>', ""), ("virou febre", "m")], sub="e o que a sua marca aprende com isso"),
  texto("O CONTEXTO", 'Um copo que vendia <span class="hl">pouco</span>', "O Stanley Quencher existia há anos, sem chamar atenção. <b>O produto era bom. O público é que ainda não tinha encontrado ele.</b>"),
  texto("A VIRADA", 'Quem <span class="hl">amava</span> o produto falou primeiro', "Um grupo de criadoras de conteúdo começou a indicar o copo por conta própria. <b>A comunidade fez o que nenhum anúncio fazia.</b>"),
  texto("A ESCUTA", 'A marca <span class="hl">ouviu</span> e mudou', "Mais cores, edições limitadas e comunicação pensada para quem já era fã. <b>Em vez de convencer gente nova, ela abraçou quem já estava ali.</b>"),
  texto("O EFEITO", 'Escassez + comunidade = <span class="hl">fila</span>', "Lançamento limitado virou evento. Gente esperando a loja abrir e trocando cor como figurinha."),
  texto("O MOMENTO VIRAL", 'Responder <span class="hl">rápido</span> vale ouro', "Quando um vídeo mostrou o copo intacto depois de um carro pegar fogo, a marca respondeu na hora. <b>Timing transformou um post em notícia.</b>"),
  lista("O QUE VOCÊ APRENDE", 'Para usar na sua <span class="hl">marca:</span>', ["Escute quem já ama o seu produto", "Comunidade vende mais que anúncio", "Quando o momento vier, responda rápido"]),
  cta("Qual marca eu explico agora?", "Comenta o nome da marca aqui. A mais pedida vira o próximo episódio de <b>Marca explicada.</b>", "Comenta a marca"),
 ],
 "26-erros-marca-amadora": [
  capa("5 erros que deixam sua marca com", [("cara de", "m"), ('<span class="hl">amadora</span>', "")]),
  texto("ERRO 01", 'Falar com <span class="hl">todo mundo</span>', "Quem fala com todo mundo não conversa com ninguém. <b>Escolha para quem você existe</b> e escreva para essa pessoa."),
  texto("ERRO 02", 'Cada post com uma <span class="hl">cara</span>', "Uma fonte por post, uma cor por semana. <b>Identidade visual é o que faz alguém reconhecer você antes de ler o @.</b>"),
  texto("ERRO 03", 'Postar só quando <span class="hl">lembra</span>', "O algoritmo e o seu público gostam de previsibilidade. <b>Constância vence perfeição</b>, sempre."),
  texto("ERRO 04", 'Legenda que não chama para <span class="hl">nada</span>', "Todo post precisa de um próximo passo: <b>salvar, comentar, enviar, chamar no direct.</b> Se não pede, ninguém faz."),
  texto("ERRO 05", 'Copiar a concorrente <span class="hl">igualzinho</span>', "Referência é ponto de partida, não de chegada. <b>Pegue a ideia, não a cara.</b>"),
  frase('Marca profissional não é a que tem mais dinheiro. É a que tem mais <span class="hl">clareza.</span>'),
  cta("Qual desses você comete?", "Seja sincera nos comentários, aqui ninguém julga. E <b>salva para revisar o seu perfil depois.</b>", "Comenta o número"),
 ],
 "28-perfis-referencia": [
  capa("os 5 perfis que eu abro quando a", [('<span class="hl">criatividade</span>', "m"), ("some", "")]),
  texto("ANTES DE TUDO", 'Repertório é <span class="hl">tudo</span>', "O que separa conteúdo genérico de conteúdo memorável é o que você consome. <b>Esses perfis me fazem pensar diferente.</b>"),
  perfil("01 · SÉRIES E HUMOR", "@byvickmachado", "Séries com nome próprio e humor com cultura pop. <b>Aprendo a criar formatos que viram marca.</b>"),
  perfil("02 · STORYTELLING", "@caroleafins", "Frases provocativas e a história de quem começou jovem. <b>Aprendo a contar a minha história sem medo.</b>"),
  perfil("03 · BASTIDORES", "@liviagarciasm", "Lifestyle e bastidor que vendem o trabalho sem parecer venda. <b>Aprendo a mostrar o processo.</b>"),
  perfil("04 · CONFIANÇA", "@aliciaalinhares", "Irreverência e segurança no texto. <b>Aprendo a me posicionar com personalidade.</b>"),
  perfil("05 · PRODUÇÃO", "@dudamareco", "Edição e produção explicadas de um jeito bonito. <b>Aprendo a deixar o técnico gostoso de ver.</b>"),
  frase('Referência é ponto de <span class="hl">partida</span>, não ponto de chegada.'),
  cta("Me indica um perfil", "Qual perfil te faz pensar fora da caixa? <b>Deixa nos comentários</b> que eu vou conhecer todos.", "Comenta o @"),
 ],
 "30-agencia-ou-produtora": [
  capa("", [("agência", ""), ('<span class="hl">ou</span>', ""), ("produtora?", "m")], sub="qual a diferença (e qual você precisa)"),
  texto("O PROBLEMA", 'Muita gente contrata a <span class="hl">errada</span>', "E depois acha que marketing não funciona. <b>Na maioria das vezes, o problema foi a escolha.</b>"),
  texto("AGÊNCIA", 'A agência <span class="hl">pensa</span>', "Estratégia, posicionamento, calendário, legenda, análise de números. <b>Ela decide o que dizer e por quê.</b>"),
  texto("PRODUTORA", 'A produtora <span class="hl">faz acontecer</span>', "Roteiro, gravação, edição, captação de imagens. <b>Ela transforma a ideia em conteúdo com qualidade.</b>"),
  lista("VOCÊ PRECISA DE AGÊNCIA QUANDO…", 'Falta <span class="hl">direção</span>', ["Não sabe o que postar", "Posta, mas não vê resultado", "Não tem tempo de planejar"]),
  lista("VOCÊ PRECISA DE PRODUTORA QUANDO…", 'Falta <span class="hl">execução</span>', ["Sabe o que dizer, mas o vídeo não fica bom", "Não tem tempo de gravar e editar", "Quer elevar a qualidade da marca"]),
  frase('Estratégia sem produção não sai do papel. Produção sem estratégia é só <span class="hl">vídeo bonito.</span>'),
  cta("Qual é o seu caso?", "Ficou na dúvida? <b>Me chama no direct com a palavra AJUDA</b> que eu te digo por onde começar.", "Direct: AJUDA"),
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
