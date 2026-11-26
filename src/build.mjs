// Builds Roopesh Sitharan's site into docs/ (GitHub Pages serves the main branch, folder /docs) and checks it:
// every link and anchor resolves, every page has one h1, noindex and alt text, and there are no em dashes.
//   node src/build.mjs
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPages, notFound } from "./pages.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUT = join(ROOT, "docs");
const STATIC = join(ROOT, "static");
const EM = String.fromCharCode(8212); // the em dash, which no page may contain
const BASE = "/roopesh-prototype/"; // where GitHub Pages serves the site
const files = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => { const f = join(dir, n); return statSync(f).isDirectory() ? files(f) : [f]; }) : []);
const posix = (p) => p.split(sep).join("/");
function write(path, text) { const f = join(OUT, path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); }
function copy(path, from) { const f = join(OUT, path); mkdirSync(dirname(f), { recursive: true }); copyFileSync(from, f); }

rmSync(OUT, { recursive: true, force: true });
const pages = buildPages();
for (const p of pages) write(`${p.path}index.html`, p.html);
write("404.html", notFound(BASE));
const faces = ["gyre-adventor", "roboto"].map((f) => readFileSync(join(STATIC, "fonts", `${f}.css`), "utf8").replace(/url\(([^)]+)\)/g, (m, u) => `url(fonts/${u.replace(/['"]/g, "")})`)).join("\n");
write("assets/site.css", `${faces}\n${readFileSync(join(ROOT, "src", "site.css"), "utf8")}`);
write("assets/site.js", readFileSync(join(ROOT, "src", "site.js"), "utf8"));
write("assets/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#101010"/><text x="32" y="44" text-anchor="middle" font-family="Didot, 'Bodoni 72', 'Bodoni MT', Georgia, serif" font-style="italic" font-size="36" fill="#F5F3EE">R</text></svg>`);
for (const f of readdirSync(join(STATIC, "fonts")).filter((n) => n.endsWith(".woff2") || n.endsWith(".txt"))) copy(`assets/fonts/${f}`, join(STATIC, "fonts", f));
for (const f of readdirSync(join(STATIC, "img"))) copy(`assets/img/${f}`, join(STATIC, "img", f));
for (const f of readdirSync(join(STATIC, "video"))) copy(`assets/video/${f}`, join(STATIC, "video", f));
write(".nojekyll", "");

// ------------------------------------------------------------------ checks
const problems = [];
const ids = new Map();
const idsOf = (file) => { if (!ids.has(file)) ids.set(file, new Set([...readFileSync(file, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); return ids.get(file); };
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
let count = 0;
for (const f of files(OUT)) {
  const rp = posix(relative(OUT, f));
  if (/\.(css|js|svg)$/.test(rp) && readFileSync(f, "utf8").includes(EM)) problems.push(`${rp}: em dash`);
  if (!rp.endsWith(".html")) continue;
  count++;
  const html = readFileSync(f, "utf8");
  if (!html.includes('<meta name="robots" content="noindex, nofollow">')) problems.push(`${rp}: missing noindex`);
  if (!/<html lang="en"/.test(html)) problems.push(`${rp}: missing lang`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) problems.push(`${rp}: should have exactly one h1`);
  if (text(html).includes(EM)) problems.push(`${rp}: em dash in the text`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) problems.push(`${rp}: image without alt: ${m[0].slice(0, 80)}`);
  const urls = [...html.matchAll(/\s(?:href|src|poster)="([^"]*)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) m[1].split(",").forEach((part) => urls.push(part.trim().split(/\s+/)[0]));
  for (const raw of urls) {
    const u = raw.replace(/&amp;/g, "&");
    if (!u) { problems.push(`${rp}: empty link`); continue; }
    if (/^(https?:|mailto:|data:)/.test(u)) continue;
    const resolved = u.startsWith("/") ? (u.startsWith(BASE) ? new URL(u.slice(BASE.length), "http://site/") : null) : new URL(u, `http://site/${rp}`);
    if (!resolved) { problems.push(`${rp}: link outside the site: ${u}`); continue; }
    let target = decodeURIComponent(resolved.pathname).slice(1);
    if (target === "" || target.endsWith("/")) target += "index.html";
    const file = join(OUT, target);
    if (!existsSync(file)) { problems.push(`${rp}: broken link ${u}`); continue; }
    if (resolved.hash && target.endsWith(".html") && !idsOf(file).has(decodeURIComponent(resolved.hash.slice(1)))) problems.push(`${rp}: missing anchor ${u}`);
  }
  // links written into the turning words (JSON inside the page) must resolve too
  for (const m of html.matchAll(/"href":"([^"]+)"/g)) {
    const resolved = new URL(m[1], `http://site/${rp}`);
    let target = decodeURIComponent(resolved.pathname).slice(1); if (target === "" || target.endsWith("/")) target += "index.html";
    if (!existsSync(join(OUT, target)) || (resolved.hash && !idsOf(join(OUT, target)).has(resolved.hash.slice(1)))) problems.push(`${rp}: broken link in the turning words: ${m[1]}`);
  }
}
for (const f of [...files(join(ROOT, "content")), ...files(join(ROOT, "src")), join(ROOT, "README.md")]) {
  if (existsSync(f) && readFileSync(f, "utf8").includes(EM)) problems.push(`${posix(relative(ROOT, f))}: em dash in source`);
}
console.log(`built docs/ (${pages.length} pages and a 404); checked ${count} HTML files`);
if (problems.length) { console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`); process.exit(1); }
console.log("all checks passed");
