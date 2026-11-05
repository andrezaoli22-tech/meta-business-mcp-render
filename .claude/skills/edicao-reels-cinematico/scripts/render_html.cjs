#!/usr/bin/env node
/*
 * Renderiza uma página HTML animada como vídeo com transparência (canal alfa).
 *
 * Uso:
 *   node render_html.cjs --html pagina.html --saida camada.mov \
 *        --largura 1080 --altura 1920 --fps 30 [--duracao 4] [--fundo transparente|#000]
 *
 * Contrato da página (todos os templates da skill seguem):
 *   window.DURACAO            duração em segundos (se --duracao não for passado)
 *   window.renderFrame(t)     desenha o estado exato do tempo t (segundos). Pode ser async.
 * Sem renderFrame, as animações CSS/Web Animations são congeladas e posicionadas em t
 * (document.getAnimations()), então CSS @keyframes comum também funciona.
 *
 * Saída: .mov com codec PNG (RGBA, sem perdas) ou .webm VP9 com alfa.
 * A renderização é determinística: quadro a quadro, nunca em tempo real.
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

function args() {
  const a = {}; const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) if (v[i].startsWith('--')) a[v[i].slice(2)] = v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true;
  return a;
}

(async () => {
  const a = args();
  if (!a.html || !a.saida) { console.error('uso: --html arquivo.html --saida saida.mov'); process.exit(1); }
  const W = +(a.largura || 1080), H = +(a.altura || 1920), FPS = +(a.fps || 30);
  const transparente = !a.fundo || a.fundo === 'transparente';

  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('erro na página:', e.message));
  await page.goto('file://' + path.resolve(a.html), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => window.PRONTO);
  if (!transparente) await page.evaluate(c => { document.documentElement.style.background = c; }, a.fundo);

  const dur = +(a.duracao || await page.evaluate(() => window.DURACAO || 0));
  if (!dur) { console.error('duração desconhecida: passe --duracao ou defina window.DURACAO'); process.exit(1); }
  const total = Math.round(dur * FPS);

  const webm = a.saida.endsWith('.webm');
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...(webm ? ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-row-mt', '1']
             : ['-c:v', 'png', '-pix_fmt', 'rgba']),
    a.saida], { stdio: ['pipe', 'inherit', 'inherit'] });

  const temRender = await page.evaluate(() => typeof window.renderFrame === 'function');
  const inicio = Date.now();
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    if (temRender) {
      await page.evaluate(t => window.renderFrame(t), t);
    } else {
      await page.evaluate(t => document.getAnimations().forEach(an => { an.pause(); an.currentTime = t * 1000; }), t);
    }
    const buf = await page.screenshot({ type: 'png', omitBackground: transparente });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % (FPS * 5) === 0) process.stderr.write(`\r  quadro ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((ok, falha) => ff.on('close', c => c === 0 ? ok() : falha(new Error('ffmpeg ' + c))));
  await browser.close();
  process.stderr.write(`\r  ${total} quadros em ${((Date.now() - inicio) / 1000).toFixed(1)}s → ${a.saida}\n`);
})().catch(e => { console.error(e); process.exit(1); });
