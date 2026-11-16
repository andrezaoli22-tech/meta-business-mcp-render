#!/usr/bin/env node
// Renderiza cada <section class="slide"> de um HTML em PNG e gera um preview.png.
// Uso: node render.mjs caminho/carrossel.html [--scale 1]
// Requer Playwright (npm i -D playwright && npx playwright install chromium, se não houver).
import { createRequire } from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = await import("playwright")); }

const file = process.argv[2];
if (!file) { console.error("Uso: node render.mjs <carrossel.html> [--scale 1]"); process.exit(1); }
const scaleArg = process.argv.indexOf("--scale");
const scale = scaleArg > -1 ? Number(process.argv[scaleArg + 1]) : 1;

const abs = path.resolve(file);
const outDir = path.dirname(abs);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: scale });
await page.goto(pathToFileURL(abs).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const [w, h] = (await page.getAttribute("body", "data-size") || "1080x1350").split("x").map(Number);
await page.addStyleTag({ content: `:root{--w:${w}px;--h:${h}px} .slide{margin:0!important}` });

const slides = await page.$$("section.slide");
if (slides.length < 2 || slides.length > 10) console.warn(`Aviso: ${slides.length} slides (Instagram aceita 2 a 10).`);

// checagem simples de texto vazando do slide
const overflow = await page.$$eval("section.slide", (els) => els.map((s, i) => {
  const r = s.getBoundingClientRect();
  const bad = [...s.querySelectorAll("h1,h2,h3,p,li,blockquote,.btn")].filter((e) => {
    const b = e.getBoundingClientRect();
    return b.right > r.right - 40 || b.bottom > r.bottom - 40 || b.left < r.left + 40;
  }).length;
  return bad ? `slide ${i + 1}: ${bad} elemento(s) perto/fora da borda` : null;
}).filter(Boolean));
overflow.forEach((m) => console.warn("Aviso:", m));

const files = [];
for (let i = 0; i < slides.length; i++) {
  const name = path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
  await slides[i].screenshot({ path: name });
  files.push(name);
}

// preview com todos os slides lado a lado (miniaturas)
const thumbW = 360, thumbH = Math.round(thumbW * h / w), gap = 16;
const html = `<body style="margin:0;background:#111;display:flex;gap:${gap}px;padding:${gap}px">${
  files.map((f) => `<img src="data:image/png;base64,${readFileSync(f).toString("base64")}" style="width:${thumbW}px;height:${thumbH}px;border-radius:8px">`).join("")}</body>`;
const prev = await browser.newPage({ viewport: { width: files.length * (thumbW + gap) + gap, height: thumbH + gap * 2 } });
await prev.setContent(html, { waitUntil: "load" });
await prev.screenshot({ path: path.join(outDir, "preview.png") });

await browser.close();
console.log(`${files.length} slides (${w}x${h}) salvos em ${outDir}`);
files.forEach((f) => console.log(" -", path.basename(f)));
console.log(" - preview.png");
