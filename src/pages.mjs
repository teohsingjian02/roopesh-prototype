// Page templates for Roopesh Sitharan's site. Words are the main material: a classical, black and white page in
// Bodoni Moda (display) and EB Garamond (reading), built around his own phrase "in-between language and art".
// Every page is static HTML, so it reads without JavaScript; site.js adds the motion and the small games.
import { readFileSync } from "node:fs";

const read = (n) => JSON.parse(readFileSync(new URL(`../content/${n}.json`, import.meta.url), "utf8"));
const P = read("profile"), N = read("notes"), W = read("writing"), M = read("media");

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function rel(page, target) { const depth = page.split("/").filter(Boolean).length; return "../".repeat(depth) + target || "./"; }
const ext = (url, html, cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="${esc(url)}" rel="noopener" target="_blank">${html}<span class="vh"> (opens in a new tab)</span></a>`;
const ARROW = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const NE = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const notes = [...N.notes].sort((a, b) => b.sort.localeCompare(a.sort));
const writing = [...W.items].sort((a, b) => b.year - a.year);

// a picture in black and white, with a srcset from the sizes made by tools/make-media.mjs
function img(page, slug, { alt, sizes = "100vw", cls = "", eager = false } = {}) {
  const m = M.images[slug];
  if (!m) throw new Error(`no image ${slug}`);
  const mid = m.widths.find((w) => w >= 800) || m.widths.at(-1);
  const srcset = m.widths.map((w) => `${rel(page, `assets/img/${slug}-${w}.webp`)} ${w}w`).join(", ");
  return `<img${cls ? ` class="${cls}"` : ""} src="${rel(page, `assets/img/${slug}-${mid}.webp`)}" srcset="${srcset}" sizes="${sizes}" width="${m.w}" height="${m.h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
// the portrait, serious and a little restless: a black and white rectangle cut into vertical strips that rise into
// place and part slightly on hover. Screen readers hear one image.
function portrait(page, { sizes, eager = false, cls = "" } = {}) {
  const m = M.images.portrait, n = 6;
  const src = rel(page, `assets/img/portrait-${m.widths.find((w) => w >= 800) || m.widths.at(-1)}.webp`);
  const srcset = m.widths.map((w) => `${rel(page, `assets/img/portrait-${w}.webp`)} ${w}w`).join(", ");
  const strip = (i) => `<span class="slice" style="--i:${i}"><img src="${src}" srcset="${srcset}" sizes="${sizes}" width="${m.w}" height="${m.h}" alt=""${eager ? "" : ' loading="lazy"'} decoding="async"></span>`;
  return `<figure class="portrait${cls ? ` ${cls}` : ""}" role="img" aria-label="Portrait of ${esc(P.name)}." style="--n:${n}"><span class="slices">${Array.from({ length: n }, (_, i) => strip(i)).join("")}</span></figure>`;
}
function poster(page, slug, alt) {
  const v = M.videos[slug];
  return `<img src="${rel(page, `assets/img/${slug}-poster.webp`)}" width="${v.w}" height="${v.h}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}
// big words set letter by letter; the plain text stays readable for screen readers and without JavaScript
function letters(text, cls = "letters") {
  let i = 0;
  const out = [...text].map((ch) => (ch === " " ? `<span class="sp"> </span>` : `<span class="l" style="--i:${i++}">${esc(ch)}</span>`)).join("");
  return `<span class="vh">${esc(text)}</span><span class="${cls}" aria-hidden="true">${out}</span>`;
}
const meta = (n) => [n.kind, n.date].filter(Boolean).map(esc).join(" · ");
const who = (authors) => authors.map((a) => (a === P.name ? `<span class="me">${esc(a)}</span>` : esc(a))).join(", ").replace(/, and others$/, " and others");

// ------------------------------------------------------------------ loading, then the opening (arriving from outside the site)
// The head script decides: a visitor who comes from anywhere but this site first sees the name typeset as the page
// loads, then "language" and "art" part like curtains. Moving between pages of the site skips both. A safety timer
// in the head clears it if the page script never runs.
const openingHead = (page) => `<script>try { var h = document.documentElement, r = document.referrer, b = new URL("${rel(page, "")}", location.href).href; if (!r || r.indexOf(b) !== 0) { h.classList.add("opening"); setTimeout(function () { if (!window.__opening) h.classList.remove("opening"); }, 15000); } } catch (e) {}</script>`;
function opening() {
  let i = 0;
  const name = [...P.name].map((ch) => (ch === " " ? `<span class="sp"> </span>` : `<span class="l" style="--i:${i++}">${esc(ch)}</span>`)).join("");
  return `<div class="op" data-opening aria-hidden="true">
  <div class="op-half op-half--l"><span class="op-word">language</span></div>
  <div class="op-half op-half--r"><span class="op-word">art</span></div>
  <span class="op-between">between</span><span class="op-seam"></span>
  <div class="op-load"><p class="op-name">${name}</p><span class="op-bar"><span></span></span><span class="op-count" data-op-count>0</span></div>
</div>`;
}

// ------------------------------------------------------------------ page shell
const NAV = [["notes/", "Notes"], ["writing/", "Writing"], ["about/", "About"]];
function shell(page, { title, description, head, body, active = "" }) {
  const home = page === "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#F5F3EE">
<link rel="icon" href="${rel(page, "assets/favicon.svg")}" type="image/svg+xml">
<link rel="preload" href="${rel(page, "assets/fonts/gyre-adventor-bold.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${rel(page, "assets/fonts/roboto-normal-latin-3.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${rel(page, "assets/site.css")}">
<script>document.documentElement.classList.add("js", "anim");</script>
${openingHead(page)}
<script defer src="${rel(page, "assets/site.js")}"></script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${opening()}
<header class="top" data-top>
  <div class="wrap top-in">
    <p class="mark"><a href="${rel(page, "")}">${esc(P.name)}</a><span class="runhead" data-runhead aria-hidden="true">${esc(head || "")}</span></p>
    <nav class="nav" aria-label="Main"><ul>${NAV.map(([href, label]) => `<li><a href="${rel(page, href)}"${active === href ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}<li><a href="#contact">Contact</a></li></ul></nav>
    <button class="menu-btn" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu">Menu</button>
  </div>
  <span class="progress" aria-hidden="true"><span data-progress></span></span>
</header>
<div class="menu" id="menu" data-menu>
  <div class="wrap menu-in">
    <ul class="menu-list">${[["", "Home"], ...NAV].map(([href, label], i) => `<li style="--i:${i}"><a href="${rel(page, href)}"${active === href && (href || home) ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}<li style="--i:4"><a href="#contact" data-menu-close>Contact</a></li></ul>
    <button class="pill pill--light menu-close" type="button" data-menu-close>Close</button>
  </div>
</div>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="foot" id="contact" data-head="Contact" aria-labelledby="h-contact">
  <div class="wrap">
    <h2 class="foot-h" id="h-contact">${letters("Correspondence")}</h2>
    <ul class="foot-links">${P.links.map((l, i) => `<li data-rise style="--i:${i}">${ext(l.url, `${esc(l.label)}${NE}`)}</li>`).join("")}</ul>
    <div class="foot-base">
      <p>${esc(P.honorific)} ${esc(P.name)}, ${esc(P.base.replace(/^Based/, "based"))}.</p>
      <p class="colophon">Set in Gyre Adventor and Roboto.</p>
      <a class="totop-link" href="#main" data-totop>Back to the top <span aria-hidden="true">↑</span></a>
    </div>
  </div>
</footer>
<span class="cursor" data-cursor aria-hidden="true"></span>
</body>
</html>`;
}

// ------------------------------------------------------------------ shared pieces
const phead = (title, lead) => `<header class="phead"><div class="wrap"><h1 class="ph">${letters(title)}</h1>${lead ? `<p class="lead" data-rise>${lead}</p>` : ""}</div></header>`;

// ------------------------------------------------------------------ home
function home() {
  const page = "";
  const [first, ...last] = P.name.split(" ");
  const roles = P.roles.map((r, i) => `<button type="button" class="role" data-role="${i}" aria-pressed="${i === 0}">${esc(i === 0 ? r.word[0].toUpperCase() + r.word.slice(1) : r.word)}</button>`);
  const sentence = `${roles[0]}, ${roles[1]}, ${roles[2]} and ${roles[3]}, ${esc(P.base.replace(/^Based/, "based"))}.`;
  const pairs = P.between.map((p) => ({ a: p.a, b: p.b, from: p.from, href: rel(page, p.href) }));
  const kw = (text) => P.statementKeywords.reduce((t, k) => t.split(k).join(`<em>${k}</em>`), esc(text));
  const latest = notes.slice(0, 4);
  const picture = (n) => n.images?.length ? img(page, n.images[0].slug, { alt: n.images[0].alt, sizes: "(min-width: 64em) 40vw, 100vw" }) : n.videos?.length ? poster(page, n.videos[0].slug, n.videos[0].alt) : "";
  const body = `
<section class="hero" id="top" data-head="" aria-labelledby="h-name">
  <div class="wrap hero-in">
    <h1 class="name" id="h-name" data-name><span class="vh">${esc(P.name)}</span><span class="name-line" aria-hidden="true">${letters(first, "nl").replace(/^<span class="vh">[^<]*<\/span>/, "")}</span><span class="name-line name-line--2" aria-hidden="true">${letters(last.join(" "), "nl").replace(/^<span class="vh">[^<]*<\/span>/, "")}</span></h1>
    ${portrait(page, { sizes: "(min-width: 48em) 26vw, 74vw", eager: true, cls: "portrait--hero" })}
    <div class="hero-foot">
      <p class="roles" data-roles>${sentence}</p>
      <div class="role-lines" data-role-lines aria-live="polite">${P.roles.map((r, i) => `<p class="role-line" data-role-line="${i}"${i ? " hidden" : ""}>${esc(r.line)} <a href="${rel(page, r.href)}" aria-label="More about Roopesh as ${esc(r.word)}">${ARROW}</a></p>`).join("")}</div>
    </div>
  </div>
  <span class="cue" aria-hidden="true"></span>
</section>

<section class="between" data-between data-head="Between" aria-labelledby="h-between">
  <div class="wrap between-in">
    <h2 class="vh" id="h-between">Between ${esc(pairs[0].a)} and ${esc(pairs[0].b)}</h2>
    <p class="between-k" aria-hidden="true">between</p>
    <p class="between-line" data-bw-line aria-hidden="true"><span class="bw" data-bw="a"><span class="bw-w">${esc(pairs[0].a)}</span></span><span class="amp">&amp;</span><span class="bw" data-bw="b"><span class="bw-w">${esc(pairs[0].b)}</span></span></p>
    <p class="between-from">from <a href="${pairs[0].href}" data-bw-from>${esc(pairs[0].from)}</a></p>
    <button type="button" class="pill pill--light" data-bw-turn>Turn the words <span class="turn-i" aria-hidden="true">↻</span></button>
    <p class="vh" data-bw-live aria-live="polite"></p>
    <script type="application/json" data-bw-pairs>${JSON.stringify(pairs).replace(/</g, "\\u003c")}</script>
  </div>
</section>

<section class="statement" data-head="In his words" aria-labelledby="h-statement">
  <div class="wrap statement-in">
    <h2 class="vh" id="h-statement">In his words</h2>
    <span class="quote" aria-hidden="true">“</span>
    <div class="statement-text" data-ink>${P.statement.map((s) => `<p>${kw(s)}</p>`).join("")}</div>
    <p class="sign" data-rise>${esc(P.name)}</p>
  </div>
</section>

<section class="sec" id="notes" data-head="Notes" aria-labelledby="h-notes">
  <div class="wrap">
    <h2 class="sh" id="h-notes"><a href="notes/">${letters("Notes")}</a></h2>
    <ol class="rows">${latest.map((n, i) => `<li class="row${i % 2 ? " row--flip" : ""}" data-rise>
      <a href="notes/#${n.id}">
        <span class="row-img" data-parallax>${picture(n)}</span>
        <span class="row-text"><span class="row-meta">${meta(n)}</span><span class="row-title">${esc(n.title)}</span><span class="row-place">${esc(n.place)}</span><span class="row-lede">${esc(n.lede)}</span><span class="row-go">Read the note ${ARROW}</span></span>
      </a></li>`).join("")}</ol>
    <p class="more" data-rise><a class="pill" href="notes/">All notes</a></p>
  </div>
</section>

<section class="sec sec--writing" id="writing" data-head="Writing" aria-labelledby="h-writing">
  <div class="wrap">
    <h2 class="sh" id="h-writing"><a href="writing/">${letters("Writing")}</a></h2>
    <ol class="lines">${writing.filter((w) => w.selected).map((w) => `<li data-rise>${ext(w.url, `<span class="ln-year">${w.year}</span><span class="ln-title">${esc(w.title)}</span><span class="ln-venue">${esc([w.venue, W.types[w.type]].filter(Boolean).join(" · "))}</span><span class="ln-go">${NE}</span>`)}</li>`).join("")}</ol>
    <p class="more" data-rise><a class="pill" href="writing/">All writing</a></p>
  </div>
</section>

<section class="now" id="now" data-head="Now" aria-labelledby="h-now">
  <div class="wrap">
    <h2 class="sh" id="h-now">${letters("Now")}</h2>
    <ul class="now-list">${P.positions.filter((p) => p.now).map((p) => `<li data-rise><span class="now-t">${esc(p.title)}</span><span class="now-w">${esc(p.where)}</span><span class="now-y">${esc(p.when)}</span></li>`).join("")}</ul>
    <p class="more" data-rise><a class="pill pill--light" href="about/">About Roopesh</a></p>
  </div>
</section>`;
  return { page, title: `${P.name}: artist, curator, researcher, educator`, description: `${P.name} is a multidisciplinary artist, curator, researcher and academic based in Malaysia.`, head: "", body };
}

// ------------------------------------------------------------------ notes
function notesPage() {
  const page = "notes/";
  const figureOf = (im) => `<figure class="fig" data-rise><span class="fig-img" data-parallax>${img(page, im.slug, { alt: im.alt, sizes: "(min-width: 64em) 46vw, 100vw" })}</span><figcaption>${esc(im.caption)}</figcaption></figure>`;
  const videoOf = (v) => `<figure class="fig fig--video" data-rise><span class="fig-img"><video data-loop muted loop playsinline preload="none" poster="${rel(page, `assets/img/${v.slug}-poster.webp`)}" width="${M.videos[v.slug].w}" height="${M.videos[v.slug].h}" aria-label="${esc(v.alt)}"><source src="${rel(page, `assets/video/${v.slug}.mp4`)}" type="video/mp4"></video><button type="button" class="vid-btn" data-vid-toggle>Pause</button></span><figcaption>${esc(v.alt)}</figcaption></figure>`;
  const body = `
${phead("Notes", "Talks, panels, exhibitions and publications, newest first, mostly in Roopesh’s own words.")}
<section class="sec sec--tight" aria-labelledby="h-contents" data-head="Contents">
  <div class="wrap">
    <h2 class="vh" id="h-contents">Contents</h2>
    <ol class="toc">${notes.map((n, i) => `<li data-rise style="--i:${i}"><a href="#${n.id}"><span class="toc-t">${esc(n.title)}</span><span class="toc-dots" aria-hidden="true"></span><span class="toc-d">${esc(n.date || n.kind)}</span></a></li>`).join("")}</ol>
  </div>
</section>
${notes.map((n) => `<article class="note" id="${n.id}" data-head="${esc(n.title)}" aria-labelledby="h-${n.id}">
  <div class="wrap note-in">
    <aside class="note-meta" data-rise><p class="note-kind">${esc(n.kind)}</p>${n.date ? `<p>${esc(n.date)}</p>` : ""}<p>${esc(n.place)}</p></aside>
    <div class="note-body">
      <h2 class="note-h" id="h-${n.id}" data-rise>${esc(n.title)}</h2>
      ${n.body.map((p, i) => `<p${i === 0 ? ' class="first"' : ""} data-rise>${esc(p)}</p>`).join("\n      ")}
      ${n.links?.length ? `<p class="note-links" data-rise>${n.links.map((l) => ext(l.url, `${esc(l.label)}${NE}`)).join(" ")}</p>` : ""}
      ${(n.images?.length || n.videos?.length) ? `<div class="figs${(n.images?.length || 0) + (n.videos?.length || 0) > 1 ? " figs--two" : ""}">${(n.videos || []).map(videoOf).join("")}${(n.images || []).map(figureOf).join("")}</div>` : ""}
    </div>
  </div>
</article>`).join("\n")}`;
  return { page, title: `Notes · ${P.name}`, description: "Recent talks, panels, exhibitions and publications by Roopesh Sitharan.", head: "Notes", body, active: "notes/" };
}

// ------------------------------------------------------------------ writing
function writingPage() {
  const page = "writing/";
  const years = [...new Set(writing.map((w) => w.year))];
  const filters = [["all", "All"], ["article", "Articles"], ["chapter", "Chapters"], ["conference", "Conference papers"], ["other", "Other"]];
  const group = (t) => (t === "preprint" || t === "data" ? "other" : t);
  const body = `
${phead("Writing", "Articles, chapters and papers, newest first. Each title opens on ResearchGate.")}
<section class="sec sec--tight" aria-label="All writing" data-head="Writing">
  <div class="wrap">
    <div class="filter" data-filter>
      <div class="filter-buttons" role="group" aria-label="Show">${filters.map(([v, l], i) => `<button type="button" class="pill pill--chip" data-filter-value="${v}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
      <p class="filter-count" data-filter-count aria-live="polite">${writing.length} pieces</p>
    </div>
    ${years.map((y) => `<section class="year" data-year aria-labelledby="y-${y}">
      <h2 class="year-n" id="y-${y}" data-rise>${y}</h2>
      <ol class="biblio">${writing.filter((w) => w.year === y).map((w) => `<li id="${w.id}" data-item data-type="${group(w.type)}" data-rise>
        <p class="b-who">${who(w.authors)}</p>
        <p class="b-title">${ext(w.url, `${esc(w.title)}${NE}`)}</p>
        <p class="b-where">${esc([w.venue, W.types[w.type], w.date].filter(Boolean).join(" · "))}</p></li>`).join("")}</ol>
    </section>`).join("")}
  </div>
</section>`;
  return { page, title: `Writing · ${P.name}`, description: "Articles, chapters and conference papers by Roopesh Sitharan.", head: "Writing", body, active: "writing/" };
}

// ------------------------------------------------------------------ about
function aboutPage() {
  const page = "about/";
  const body = `
${phead("About", "")}
<section class="sec sec--tight about" data-head="About" aria-label="Biography">
  <div class="wrap about-in">
    ${portrait(page, { sizes: "(min-width: 64em) 34vw, 86vw", eager: true, cls: "portrait--big" })}
    <div class="about-text">
      ${P.bio.map((p, i) => `<p${i === 0 ? ' class="big"' : ""} data-rise>${esc(p)}</p>`).join("\n      ")}
    </div>
  </div>
</section>
<section class="sec" data-head="Positions" aria-labelledby="h-positions">
  <div class="wrap">
    <h2 class="sh sh--s" id="h-positions">${letters("Positions")}</h2>
    <ol class="cv">${P.positions.map((p) => `<li data-rise><span class="cv-t">${esc(p.title)}</span><span class="cv-w">${p.href ? ext(p.href, esc(p.where)) : esc(p.where)}</span><span class="cv-y">${esc(p.when)}</span></li>`).join("")}</ol>
  </div>
</section>
<section class="sec" data-head="Education" aria-labelledby="h-education">
  <div class="wrap">
    <h2 class="sh sh--s" id="h-education">${letters("Education")}</h2>
    <ol class="cv">${P.education.map((e) => `<li data-rise><span class="cv-t">${esc(e.title)}</span><span class="cv-w">${esc(e.where)}</span></li>`).join("")}</ol>
  </div>
</section>`;
  return { page, title: `About · ${P.name}`, description: "Biography, positions and education of Roopesh Sitharan.", head: "About", body, active: "about/" };
}

export function buildPages() {
  return [home(), notesPage(), writingPage(), aboutPage()].map((p) => ({ path: p.page, html: shell(p.page, p) }));
}

export function notFound(base) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Somewhere in between · ${esc(P.name)}</title><link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${base}assets/site.css"></head>
<body class="lost"><main id="main" class="wrap lost-in"><p class="between-k">between</p><h1 class="lost-h">here <span class="amp">&amp;</span> there</h1>
<p class="lead">This page is not where it was, or it never was. </p><p><a class="pill" href="${base}">Go to the first page</a></p></main></body></html>`;
}
