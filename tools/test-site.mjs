// Browser tests for Roopesh Sitharan's site in headless Chrome (DevTools protocol), plus screenshots.
//   node tools/test-site.mjs            test the local build in docs/ (starts tools/serve.mjs)
//   node tools/test-site.mjs --shots    also save screenshots to screenshots/
//   node tools/test-site.mjs --live     test the published GitHub Pages site instead
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./cdp.mjs";
import { serve } from "./serve.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const LIVE = process.argv.includes("--live"), SHOTS = process.argv.includes("--shots");
const PORT = 8161;
const SITE = LIVE ? "https://teohsingjian02.github.io/roopesh-prototype/" : `http://127.0.0.1:${PORT}/roopesh-prototype/`;
const OUT = join(ROOT, "screenshots");
const VIEWS = [{ name: "mobile", width: 360, height: 780, mobile: true }, { name: "tablet", width: 768, height: 1024, mobile: true }, { name: "desktop", width: 1440, height: 900, mobile: false }];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
let passed = 0;
function check(ok, what) { if (ok) passed++; else { failures.push(what); console.log(`  FAIL ${what}`); } }
function pages() {
  const dir = join(ROOT, "docs");
  const walk = (d) => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : [f]; });
  return walk(dir).filter((f) => f.endsWith(`${sep}index.html`)).map((f) => relative(dir, f).split(sep).slice(0, -1).join("/")).map((p) => (p ? `${p}/` : "")).sort();
}
async function open(browser, view, opts = {}) {
  const p = await browser.page({ width: view.width, height: view.height, mobile: view.mobile, dpr: opts.dpr || 1, reducedMotion: true });
  p.$ = (expr) => p.eval(expr);
  p.click = (sel) => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) throw new Error("missing " + ${JSON.stringify(sel)}); e.click(); return true; })()`);
  p.visible = (sel) => p.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const r = e.getBoundingClientRect(); return (!!e.offsetParent || getComputedStyle(e).position === "fixed") && r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; })()`);
  p.arrive = async (url, from = "about:blank") => { // arrive at a page as a visitor following a link from elsewhere would
    await p.goto(from, 50);
    await p.$(`location.href = ${JSON.stringify(url)}, true`);
    for (let i = 0; i < 80; i++) { await sleep(50); if (await p.$(`location.href === ${JSON.stringify(url)} && document.readyState !== "loading"`).catch(() => false)) return; }
  };
  return p;
}
const AUDIT = `(() => {
  const de = document.documentElement, over = de.scrollWidth - window.innerWidth, culprits = [];
  if (over > 1) for (const el of document.querySelectorAll("body *")) { const b = el.getBoundingClientRect(); if (b.right > window.innerWidth + 1 && b.width > 0 && getComputedStyle(el).position !== "fixed") { culprits.push(el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] + " right=" + Math.round(b.right)); if (culprits.length > 4) break; } }
  const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
  return { over, culprits, dup: ids.filter((x, i) => ids.indexOf(x) !== i), unnamed: [...document.querySelectorAll("a[href], button")].filter((e) => !(e.textContent.trim() || e.getAttribute("aria-label"))).map((e) => e.outerHTML.slice(0, 70)),
    noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length, broken: [...document.images].filter((i) => i.complete && i.currentSrc && i.naturalWidth === 0).map((i) => i.currentSrc),
    h1: document.querySelectorAll("h1").length, noindex: !!document.querySelector('meta[name=robots][content*=noindex]'), anim: de.classList.contains("anim") };
})()`;

const server = LIVE ? null : await serve(PORT);
const browser = await launch(9371);
try {
  // ---------------------------------------------------------------- every page at three widths
  const list = pages();
  console.log(`${list.length} pages x ${VIEWS.length} widths`);
  for (const view of VIEWS) {
    const p = await open(browser, view);
    for (const path of list) {
      await p.goto(SITE + path, 250);
      await p.eval(`document.fonts.ready.then(() => true)`);
      await p.$(`Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }); })).then(() => true)`);
      const r = await p.$(AUDIT);
      const where = `${view.width}px /${path}`;
      check(r.over <= 1, `${where}: no sideways scroll (${r.over}px ${r.culprits.join(", ")})`);
      check(!r.dup.length, `${where}: duplicate ids ${r.dup.join(", ")}`);
      check(!r.unnamed.length, `${where}: links or buttons without a name ${r.unnamed.join(" ")}`);
      check(r.noAlt === 0 && !r.broken.length, `${where}: images have alt text and load (${r.broken.join(", ")})`);
      check(r.h1 === 1, `${where}: one h1 (${r.h1})`);
      check(r.noindex, `${where}: noindex`);
      check(r.anim, `${where}: animations on`);
    }
    check(p.consoleErrors.length === 0, `${view.width}px: no console errors (${p.consoleErrors.slice(0, 2).join(" | ")})`);
    await p.close();
  }

  // ---------------------------------------------------------------- behaviour
  const desk = await open(browser, VIEWS[2]), phone = await open(browser, VIEWS[0]);
  const settled = `!/opening/.test(document.documentElement.className) && document.querySelector("[data-opening]").hidden`;
  // loading, then the opening
  await desk.arrive(SITE);
  check(await desk.$(`document.documentElement.classList.contains("opening") && getComputedStyle(document.querySelector("[data-opening]")).display === "block" && getComputedStyle(document.body).display !== "none"`), "the loading screen shows when a visitor arrives, and the page itself is not hidden");
  await sleep(700);
  check(await desk.$(`Number(document.querySelector("[data-op-count]").textContent) > 0 && document.querySelectorAll(".op-name .l.on").length > 0`), "the loading count rises and the name is set letter by letter");
  await desk.key("Escape", "Escape", 27);
  await sleep(2000);
  check(await desk.$(settled), "any key ends the opening");
  await desk.arrive(SITE);
  await sleep(8200);
  check(await desk.$(settled), "the loading and the opening end by themselves");
  await desk.arrive(SITE + "about/", SITE);
  check(await desk.$(`!document.documentElement.classList.contains("opening")`), "moving within the site skips the opening");
  // home: roles, between, ink, glide to #contact
  await desk.goto(SITE, 300);
  await desk.click('[data-role="1"]');
  await sleep(300);
  check(await desk.$(`!document.querySelector('[data-role-line="1"]').hidden && document.querySelector('[data-role-line="0"]').hidden && document.querySelector('[data-role="1"]').getAttribute("aria-pressed") === "true"`), "choosing a role shows its line");
  const before = await desk.$(`document.querySelector('[data-bw="a"]').textContent`);
  await desk.click("[data-bw-turn]");
  await sleep(2300);
  const after = await desk.$(`({ a: document.querySelector('[data-bw="a"]').textContent, from: document.querySelector("[data-bw-from]").textContent, live: document.querySelector("[data-bw-live]").textContent })`);
  check(after.a !== before && after.from && after.live.startsWith("Between"), `the words turn (${before} -> ${after.a})`);
  await desk.$(`window.scrollTo(0, document.querySelector("[data-ink]").getBoundingClientRect().top + scrollY - 120), true`);
  await sleep(2400);
  check(await desk.$(`document.querySelectorAll("[data-ink] .w.on").length > 10`), "ink spreads through the statement as it is read");
  await desk.$(`window.scrollTo(0, 0), true`);
  await sleep(800);
  await desk.click('.nav a[href="#contact"]');
  await sleep(2600);
  const glide = await desk.$(`(() => { const t = document.getElementById("contact").getBoundingClientRect().top, h = document.querySelector("[data-top]").offsetHeight, end = document.documentElement.scrollHeight - innerHeight; return { atTarget: Math.abs(t - h - 24) < 40, atEnd: Math.abs(scrollY - end) < 3, focused: document.activeElement === document.getElementById("contact"), y: Math.round(scrollY), end: Math.round(end) }; })()`);
  check((glide.atTarget || glide.atEnd) && glide.focused, `Contact glides down to the correspondence and focuses it (${JSON.stringify(glide)})`);
  // writing filters
  await desk.goto(SITE + "writing/", 300);
  const count = async (v) => { await desk.click(`[data-filter-value="${v}"]`); await sleep(100); return desk.$(`document.querySelector("[data-filter-count]").textContent.trim()`); };
  check((await count("article")) === "10 pieces", "Articles shows 10");
  check((await count("chapter")) === "5 pieces", "Chapters shows 5");
  check((await count("conference")) === "6 pieces", "Conference papers shows 6");
  check((await count("other")) === "3 pieces", "Other shows 3");
  check((await count("all")) === "24 pieces", "All shows 24");
  // notes: the moving posters have a pause button
  await desk.goto(SITE + "notes/", 300);
  await desk.$(`document.querySelector("video[data-loop]").scrollIntoView(), true`);
  await sleep(1200);
  await desk.click("[data-vid-toggle]");
  check(await desk.$(`document.querySelector("[data-vid-toggle]").textContent === "Play" && document.querySelector("video[data-loop]").paused`), "a moving poster can be paused");
  // phone menu
  await phone.goto(SITE, 300);
  check(await phone.visible(".menu-btn") && !(await phone.visible("#menu")), "360px: menu button shown, menu closed");
  await phone.click(".menu-btn");
  await sleep(300);
  check(await phone.visible("#menu"), "360px: the menu opens");
  for (let i = 0; i < 10; i++) await phone.key("Tab", "Tab", 9);
  check(await phone.$(`document.getElementById("menu").contains(document.activeElement)`), "360px: focus stays inside the open menu");
  await phone.key("Escape", "Escape", 27);
  await sleep(1100);
  check(!(await phone.visible("#menu")) && await phone.$(`document.activeElement.classList.contains("menu-btn")`), "360px: Esc closes the menu and returns focus");
  // keyboard: skip link first
  await desk.goto(SITE, 300);
  await desk.key("Tab", "Tab", 9);
  check(await desk.$(`document.activeElement.classList.contains("skip")`), "the skip link is the first tab stop");
  // 404 and storage
  const nf = await fetch(SITE + "no-such-page/");
  check(nf.status === 404 && (await nf.text()).includes("here"), `unknown pages get the 404 page (${nf.status})`);
  check(await desk.$(`localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ""`), "nothing is stored in the browser");
  check(desk.consoleErrors.length === 0 && phone.consoleErrors.length === 0, `no console errors during interaction (${[...desk.consoleErrors, ...phone.consoleErrors].slice(0, 2).join(" | ")})`);
  await desk.close(); await phone.close();

  // ---------------------------------------------------------------- screenshots (motion stopped for still pictures)
  if (SHOTS) {
    mkdirSync(OUT, { recursive: true });
    const shots = [["home-desktop.jpg", "", VIEWS[2]], ["home-mobile.jpg", "", VIEWS[0], 2], ["notes-desktop.jpg", "notes/", VIEWS[2]], ["writing-desktop.jpg", "writing/", VIEWS[2]], ["about-desktop.jpg", "about/", VIEWS[2]], ["about-mobile.jpg", "about/", VIEWS[0], 2]];
    for (const [name, path, view, dpr] of shots) {
      const p = await open(browser, view, { dpr });
      await p.goto(SITE + path, 300);
      await p.$(`document.documentElement.classList.remove("anim", "motion", "opening"), true`);
      await p.$(`Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }); })).then(() => document.fonts.ready).then(() => true)`);
      await sleep(300);
      await p.shot(join(OUT, name));
      await p.close();
    }
    console.log(`saved ${shots.length} screenshots to screenshots/`);
  }
} finally {
  await browser.close();
  server?.close();
}
console.log(`\n${passed} checks passed, ${failures.length} failed${LIVE ? " (live site)" : ""}`);
if (failures.length) { console.log(failures.map((f) => `- ${f}`).join("\n")); process.exit(1); }
