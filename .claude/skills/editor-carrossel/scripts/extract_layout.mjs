#!/usr/bin/env node
// Lê um carrossel HTML e extrai, slide a slide, as camadas editáveis:
// fundo, blocos de cor, linhas, fotos (PNG recortado com overlay) e textos (com estilos por trecho).
// Saída: <pasta>/export/layout.json + <pasta>/export/media-SS-N.jpg
// Uso: node extract_layout.mjs caminho/carrossel.html
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = await import("playwright")); }

const abs = path.resolve(process.argv[2] || "");
if (!fs.existsSync(abs)) { console.error("Uso: node extract_layout.mjs <carrossel.html>"); process.exit(1); }
const out = path.join(path.dirname(abs), "export");
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
await page.goto(pathToFileURL(abs).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: ".slide{margin:0 0 40px 0!important}" });
const [W, H] = (await page.getAttribute("body", "data-size") || "1080x1350").split("x").map(Number);

const layout = await page.$$eval("section.slide", (slides) => {
  const TEXT_SEL = "h1,h2,h3,p,li,blockquote,.kicker,.brand,.tag,.chip,.big,.big10,.quote,.btn,.foot>span,.top>span,.head>span";
  const transparent = (c) => !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
  const isInMedia = (el) => !!el.closest(".media,.full");
  return slides.map((s) => {
    const R = s.getBoundingClientRect();
    const box = (r) => ({ x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height });
    const cs = getComputedStyle(s);
    const shapes = [], lines = [], texts = [];
    // blocos de cor (elementos com fundo próprio, fora das fotos)
    s.querySelectorAll("*").forEach((el) => {
      if (isInMedia(el) || el.matches(".media,.full")) return;
      const st = getComputedStyle(el);
      if (!transparent(st.backgroundColor) && st.display !== "none") {
        shapes.push({ ...box(el.getBoundingClientRect()), color: st.backgroundColor, radius: parseFloat(st.borderTopLeftRadius) || 0, chip: el.matches(TEXT_SEL) });
      }
      // linhas finas feitas com ::before/::after
      for (const pseudo of ["::before", "::after"]) {
        const p = getComputedStyle(el, pseudo);
        if (p.content && p.content !== "none" && p.position === "absolute" && parseFloat(p.height) <= 4 && !transparent(p.backgroundColor)) {
          const r = el.getBoundingClientRect();
          const y = p.top !== "auto" && pseudo === "::before" ? r.top - R.top + parseFloat(p.top) : r.bottom - R.top - parseFloat(p.height);
          lines.push({ x: r.left - R.left, y, w: r.width, h: parseFloat(p.height), color: p.backgroundColor, opacity: parseFloat(p.opacity) });
        }
      }
    });
    // textos com trechos (runs)
    s.querySelectorAll(TEXT_SEL).forEach((el) => {
      if (getComputedStyle(el).display === "none" || el.closest(TEXT_SEL) !== el && el.parentElement.closest(TEXT_SEL)) return;
      const runs = [];
      const walk = (node) => {
        if (node.nodeType === 3) {
          const t = node.textContent.replace(/\s+/g, " ");
          if (t.trim() || (t === " " && runs.length)) {
            const st = getComputedStyle(node.parentElement);
            runs.push({ text: t, color: st.color, weight: +st.fontWeight, size: parseFloat(st.fontSize), font: st.fontFamily.split(",")[0].replace(/["']/g, "").trim(), spacing: parseFloat(st.letterSpacing) || 0, upper: st.textTransform === "uppercase" });
          }
        } else if (node.nodeName === "BR") runs.push({ br: true });
        else if (node.nodeType === 1 && getComputedStyle(node).display !== "none") node.childNodes.forEach(walk);
      };
      el.childNodes.forEach(walk);
      if (!runs.length) return;
      // pseudo-conteúdo textual (ex.: "arrasta →")
      const st = getComputedStyle(el);
      const lh = st.lineHeight === "normal" ? 1.2 : parseFloat(st.lineHeight) / parseFloat(st.fontSize);
      texts.push({ ...box(el.getBoundingClientRect()), align: st.textAlign === "start" ? "left" : st.textAlign === "end" ? "right" : st.textAlign, lineHeight: lh, runs, padTop: parseFloat(st.paddingTop), padLeft: parseFloat(st.paddingLeft), name: (el.className || el.tagName).toString() });
    });
    s.querySelectorAll(".arrow").forEach((el) => {
      const a = getComputedStyle(el, "::after"); const st = getComputedStyle(el);
      if (getComputedStyle(el).display === "none") return;
      const txt = (a.content && a.content !== "none") ? a.content.replace(/^"|"$/g, "") : el.textContent;
      if (!txt.trim() || texts.some((t) => t.runs.some((r) => r.text === txt))) return;
      texts.push({ ...box(el.getBoundingClientRect()), align: "right", lineHeight: 1.2, runs: [{ text: txt, color: st.color, weight: +st.fontWeight, size: parseFloat(st.fontSize), font: st.fontFamily.split(",")[0].replace(/["']/g, ""), spacing: 0 }], padTop: 0, padLeft: 0, name: "arrow" });
    });
    const medias = [...s.querySelectorAll(".media,.full")].map((m) => ({ ...box(m.getBoundingClientRect()) }));
    return { bg: cs.backgroundColor, shapes, lines, texts, medias };
  });
});

// fotos: só a camada .media visível (com seus overlays), fundo transparente
await page.addStyleTag({ content: ".slide{background:transparent!important} .slide *{visibility:hidden!important} .media,.media *,.full,.full *{visibility:visible!important} body{background:transparent!important}" });
const els = await page.$$("section.slide");
for (let i = 0; i < els.length; i++) {
  const handles = await els[i].$$(".media,.full");
  for (let j = 0; j < handles.length; j++) {
    // cantos arredondados precisam de transparência (PNG); o resto vai em JPEG, mais leve
    const round = await handles[j].evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) > 0);
    const file = `media-${String(i + 1).padStart(2, "0")}-${j + 1}.${round ? "png" : "jpg"}`;
    await handles[j].screenshot(round ? { path: path.join(out, file), omitBackground: true } : { path: path.join(out, file), type: "jpeg", quality: 88 });
    layout[i].medias[j].file = file;
  }
}
fs.writeFileSync(path.join(out, "layout.json"), JSON.stringify({ width: W, height: H, slides: layout }, null, 1));
await browser.close();
console.log(`layout de ${layout.length} slides salvo em ${out}`);
