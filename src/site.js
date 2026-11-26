/* Roopesh Sitharan: motion and small games. Everything enhances pages that already read without JavaScript.
   Loading, then an opening; a page that glides when scrolled, up and down; letters that settle into place; a name
   whose weight follows the pointer; words that turn; ink that spreads through the statement as it is read; pictures
   that drift; a trailing ink-dot cursor. Animations are always on (the owner's choice). Nothing is stored or sent. */
(function () {
  "use strict";
  var d = document, root = d.documentElement, W = window;
  function still() { return !root.classList.contains("anim"); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  var fine = W.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var closeMenu = function () {};

  /* ------------------------------------------------------------ smooth scrolling, up and down
     The wheel glides (fine pointers only; touch scrolling stays native), and every jump within a page travels with a
     slow, classical ease. Keyboard and scrollbar scrolling keep working as usual. */
  var Glide = (function () {
    var target = W.scrollY, current = target, raf = 0, last = 0, tween = null;
    function max() { return Math.max(0, root.scrollHeight - W.innerHeight); }
    function ease(k) { return k < .5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2; }
    function write(y) { W.scrollTo(0, y); }
    function frame(t) {
      raf = 0;
      if (tween) {
        var k = Math.min(1, (t - tween.t0) / tween.d);
        current = tween.from + (tween.to - tween.from) * ease(k);
        write(current);
        if (k >= 1) { var done = tween.done; tween = null; target = current; last = 0; if (done) done(); return; }
        raf = W.requestAnimationFrame(frame);
        return;
      }
      var dt = last ? Math.min(64, t - last) : 16.7; last = t;
      current += (target - current) * (1 - Math.pow(1 - .085, dt / 16.7));
      if (Math.abs(target - current) < .5) current = target;
      write(current);
      if (current !== target) raf = W.requestAnimationFrame(frame); else last = 0;
    }
    function stop() { if (raf) W.cancelAnimationFrame(raf); raf = 0; tween = null; last = 0; target = current = W.scrollY; }
    if (fine && !still()) {
      W.addEventListener("wheel", function (e) {
        if (e.ctrlKey || e.defaultPrevented || root.classList.contains("menu-open") || root.classList.contains("opening")) return;
        var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? W.innerHeight : 1);
        if (!dy || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        if (!raf || tween) { tween = null; target = current = W.scrollY; }
        target = Math.max(0, Math.min(max(), target + dy));
        if (!raf) raf = W.requestAnimationFrame(frame);
      }, { passive: false });
      W.addEventListener("scroll", function () { if (!raf) target = current = W.scrollY; }, { passive: true }); // keys, scrollbar, find
      ["mousedown", "keydown", "touchstart"].forEach(function (ev) { W.addEventListener(ev, function (e) { if (raf && !(ev === "keydown" && e.key === "Tab")) stop(); }, { passive: true }); });
    }
    function to(y, done) {
      y = Math.max(0, Math.min(max(), y));
      if (still()) { W.scrollTo(0, y); if (done) done(); return; }
      if (raf) W.cancelAnimationFrame(raf);
      current = W.scrollY;
      var dist = Math.abs(y - current);
      tween = { from: current, to: y, t0: performance.now(), d: Math.min(2000, Math.max(900, 500 + dist * .45)), done: done };
      raf = W.requestAnimationFrame(frame);
    }
    return { to: to };
  })();

  function headerH() { var h = d.querySelector("[data-top]"); return h ? h.offsetHeight : 0; }
  function focusQuietly(t) {
    if (!t.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(t.tagName)) t.setAttribute("tabindex", "-1");
    t.focus({ preventScroll: true });
  }
  d.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    var id = decodeURIComponent(url.hash.slice(1)), t = d.getElementById(id);
    if (!t) return;
    e.preventDefault();
    closeMenu(false);
    var y = id === "main" ? 0 : t.getBoundingClientRect().top + W.scrollY - headerH() - 24;
    Glide.to(y, function () { focusQuietly(t); if (history.replaceState) history.replaceState(null, "", id === "main" ? location.pathname : "#" + id); });
  });

  /* ------------------------------------------------------------ loading, then the opening */
  function initOpening() {
    var el = d.querySelector("[data-opening]");
    if (!el) return;
    if (!root.classList.contains("opening") || still()) { root.classList.remove("opening"); el.hidden = true; return; }
    W.__opening = true;
    var letters = el.querySelectorAll(".op-name .l"), count = el.querySelector("[data-op-count]");
    var shown = 0, goal = .12, t0 = performance.now(), raf = 0, done = false, timers = [], EVENTS = ["keydown", "pointerdown", "wheel", "touchstart"];
    function aim(v) { goal = Math.max(goal, v); }
    aim(.4);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { aim(.8); });
    if (d.readyState === "complete") aim(1); else W.addEventListener("load", function () { aim(1); });
    timers.push(W.setTimeout(function () { aim(1); }, 6500));
    function frame(t) {
      raf = 0;
      var cap = Math.min(1, (t - t0) / 1600); // the loading reads as a moment, never a flash
      var want = Math.min(goal, cap);
      shown += (want - shown) * .09;
      if (want - shown < .004) shown = want;
      el.style.setProperty("--p", shown.toFixed(4));
      var n = Math.round(shown * letters.length);
      each(letters, function (l, i) { l.classList.toggle("on", i < n); });
      if (count) count.textContent = String(Math.round(shown * 100));
      if (shown >= 1) { root.classList.add("op-loaded"); timers.push(W.setTimeout(open, 2700)); return; }
      raf = W.requestAnimationFrame(frame);
    }
    function open() {
      if (done) return;
      done = true;
      if (raf) W.cancelAnimationFrame(raf);
      timers.forEach(W.clearTimeout);
      EVENTS.forEach(function (ev) { W.removeEventListener(ev, open, true); });
      root.classList.add("opening-out");
      root.classList.remove("opening");
      W.setTimeout(function () { root.classList.remove("opening-out", "op-loaded"); el.hidden = true; }, 1800);
    }
    EVENTS.forEach(function (ev) { W.addEventListener(ev, open, { capture: true, passive: true }); });
    raf = W.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ content rises in from the side you scroll from */
  function initReveal() {
    var els = d.querySelectorAll("[data-rise], .sh, .ph, .foot-h");
    if (!els.length || still() || !("IntersectionObserver" in W)) return;
    root.classList.add("motion");
    var out = [];
    function side(el) { var from = el.getBoundingClientRect().top < 0 ? "top" : "bottom"; if (el.getAttribute("data-from") !== from) el.setAttribute("data-from", from); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target, i = out.indexOf(el);
        if (en.isIntersecting) { el.classList.add("is-in"); if (i > -1) out.splice(i, 1); return; }
        side(el); el.classList.remove("is-in"); if (i < 0) out.push(el);
      });
    }, { rootMargin: "0px 0px -7% 0px" });
    each(els, function (el) { var r = el.getBoundingClientRect(); if (r.top < W.innerHeight && r.bottom > 0) el.classList.add("is-in"); io.observe(el); });
    onScroll.push(function () { out.forEach(side); });
  }

  /* ------------------------------------------------------------ scroll-linked: header, progress, drifting pictures, ink */
  var onScroll = [];
  function initScroll() {
    var top = d.querySelector("[data-top]"), bar = d.querySelector("[data-progress]"), par = d.querySelectorAll("[data-parallax]");
    onScroll.push(function () {
      var y = W.scrollY, m = root.scrollHeight - W.innerHeight;
      if (top) top.classList.toggle("is-scrolled", y > 8);
      if (bar) bar.style.transform = "scaleX(" + (m > 0 ? Math.min(1, y / m).toFixed(4) : 0) + ")";
      if (still()) return;
      var vh = W.innerHeight;
      each(par, function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        el.style.setProperty("--py", (((r.top + r.height / 2) - vh / 2) / vh * -42).toFixed(1) + "px");
      });
    });
    var queued = false;
    function run() { queued = false; onScroll.forEach(function (f) { f(); }); }
    W.addEventListener("scroll", function () { if (!queued) { queued = true; W.requestAnimationFrame(run); } }, { passive: true });
    W.addEventListener("resize", run);
    run();
  }

  /* the statement: words wait in grey and take the ink as you read down to them */
  function initInk() {
    var box = d.querySelector("[data-ink]");
    if (!box || still()) return;
    var nodes = [], walker = d.createTreeWalker(box, NodeFilter.SHOW_TEXT), n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var frag = d.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(part)); return; }
        var s = d.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s);
      });
      t.parentNode.replaceChild(frag, t);
    });
    var words = box.querySelectorAll(".w"), total = words.length;
    onScroll.push(function () {
      var r = box.getBoundingClientRect(), vh = W.innerHeight;
      var p = (vh * .86 - r.top) / (vh * .26 + r.height);
      var on = Math.round(Math.max(0, Math.min(1, p)) * total);
      each(words, function (w, i) { w.classList.toggle("on", i < on); });
    });
  }

  /* ------------------------------------------------------------ the running head, as in a book */
  function initRunhead() {
    var rh = d.querySelector("[data-runhead]");
    if (!rh || !("IntersectionObserver" in W)) return;
    var cur = rh.textContent, page = cur, timer = 0;
    function show(t) {
      if (t === cur) return;
      cur = t;
      W.clearTimeout(timer);
      rh.classList.add("is-swap");
      timer = W.setTimeout(function () { rh.textContent = t; rh.classList.remove("is-swap"); }, 320);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) show(en.target.getAttribute("data-head") || page); });
    }, { rootMargin: "-42% 0px -52% 0px" });
    each(d.querySelectorAll("[data-head]"), function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------ the phone menu */
  function initMenu() {
    var btn = d.querySelector("[data-menu-toggle]"), menu = d.getElementById("menu");
    if (!btn || !menu) return;
    function open() {
      btn.setAttribute("aria-expanded", "true"); menu.classList.add("is-open"); root.classList.add("menu-open");
      var first = menu.querySelector("a, button"); W.setTimeout(function () { if (first) first.focus(); }, 60);
    }
    closeMenu = function (focus) {
      if (!menu.classList.contains("is-open")) return;
      btn.setAttribute("aria-expanded", "false"); menu.classList.remove("is-open"); root.classList.remove("menu-open");
      if (focus !== false) btn.focus();
    };
    btn.addEventListener("click", function () { if (menu.classList.contains("is-open")) closeMenu(); else open(); });
    each(menu.querySelectorAll("button[data-menu-close]"), function (b) { b.addEventListener("click", function () { closeMenu(); }); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = Array.prototype.filter.call(menu.querySelectorAll("a, button"), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }

  /* ------------------------------------------------------------ the name: letters near the pointer lift and lean, slowly */
  function initName() {
    var name = d.querySelector("[data-name]");
    if (!name || !fine || still()) return;
    var ls = Array.prototype.slice.call(name.querySelectorAll(".l")), lift = ls.map(function () { return 0; }), tilt = ls.map(function () { return 0; });
    var px = 0, py = 0, near = false, raf = 0;
    function frame() {
      raf = 0;
      var centres = ls.map(function (l) { var r = l.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.height]; });
      var moving = false;
      ls.forEach(function (l, i) {
        var wl = 0, wt = 0;
        if (near) {
          var dx = px - centres[i][0], dist = Math.hypot(dx, (py - centres[i][1]) * 1.2), k = Math.max(0, 1 - dist / 300);
          wl = k * centres[i][2] * .14; wt = k * (dx > 0 ? -5 : 5) * Math.min(1, Math.abs(dx) / 120);
        }
        lift[i] += (wl - lift[i]) * .07; tilt[i] += (wt - tilt[i]) * .07;
        if (Math.abs(wl - lift[i]) > .05 || Math.abs(wt - tilt[i]) > .02) moving = true; else { lift[i] = wl; tilt[i] = wt; }
        l.style.setProperty("--lift", lift[i].toFixed(2));
        l.style.setProperty("--tilt", tilt[i].toFixed(2));
      });
      if (moving) raf = W.requestAnimationFrame(frame);
    }
    var hero = name.closest(".hero") || name;
    hero.addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; near = true; if (!raf) raf = W.requestAnimationFrame(frame); });
    hero.addEventListener("pointerleave", function () { near = false; if (!raf) raf = W.requestAnimationFrame(frame); });
  }

  /* ------------------------------------------------------------ artist, curator, researcher, educator */
  function initRoles() {
    var box = d.querySelector("[data-roles]");
    if (!box) return;
    var btns = box.querySelectorAll("[data-role]"), lines = d.querySelectorAll("[data-role-line]");
    each(btns, function (b) {
      b.addEventListener("click", function () {
        var i = b.getAttribute("data-role");
        each(btns, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        each(lines, function (l) {
          var on = l.getAttribute("data-role-line") === i;
          if (on && l.hidden) { l.hidden = false; l.classList.remove("is-new"); void l.offsetWidth; l.classList.add("is-new"); }
          else if (!on) l.hidden = true;
        });
      });
    });
  }

  /* ------------------------------------------------------------ between ... and ...: the words turn */
  function initBetween() {
    var box = d.querySelector("[data-between]");
    if (!box) return;
    var pairs = JSON.parse(box.querySelector("[data-bw-pairs]").textContent);
    var A = box.querySelector('[data-bw="a"]'), B = box.querySelector('[data-bw="b"]'), from = box.querySelector("[data-bw-from]");
    var live = box.querySelector("[data-bw-live]"), btn = box.querySelector("[data-bw-turn]"), line = box.querySelector("[data-bw-line]"), heading = box.querySelector("h2");
    var i = 0, busy = false, timer = 0, held = false, seen = false;
    function swap(slot, text) {
      var old = slot.querySelector(".bw-w"), nw = d.createElement("span");
      nw.className = "bw-w"; nw.textContent = text;
      if (still()) { slot.replaceChild(nw, old); return; }
      var w0 = slot.getBoundingClientRect().width;
      nw.style.position = "absolute"; nw.style.visibility = "hidden";
      slot.appendChild(nw);
      var w1 = nw.getBoundingClientRect().width;
      slot.removeChild(nw); nw.style.position = ""; nw.style.visibility = "";
      slot.style.width = w0 + "px"; void slot.offsetWidth; slot.style.width = w1 + "px";
      old.classList.add("is-out");
      W.setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); slot.appendChild(nw); nw.classList.add("is-in"); }, 560);
      W.setTimeout(function () { slot.style.width = ""; nw.classList.remove("is-in"); }, 1900);
    }
    function turn(manual) {
      if (busy) return;
      busy = true;
      i = (i + 1) % pairs.length;
      var p = pairs[i];
      swap(A, p.a);
      W.setTimeout(function () { swap(B, p.b); }, still() ? 0 : 180);
      from.parentNode.classList.add("is-out");
      W.setTimeout(function () { from.textContent = p.from; from.setAttribute("href", p.href); from.parentNode.classList.remove("is-out"); }, still() ? 0 : 650);
      if (heading) heading.textContent = "Between " + p.a + " and " + p.b;
      if (manual && live) live.textContent = "Between " + p.a + " and " + p.b + ", from " + p.from + ".";
      W.setTimeout(function () { busy = false; }, still() ? 0 : 2000);
    }
    function schedule() { W.clearTimeout(timer); if (!still() && seen && !held) timer = W.setTimeout(function () { turn(false); schedule(); }, 5200); }
    btn.addEventListener("click", function () { turn(true); schedule(); });
    line.addEventListener("click", function () { turn(true); schedule(); });
    box.addEventListener("pointerenter", function () { held = true; W.clearTimeout(timer); });
    box.addEventListener("pointerleave", function () { held = false; schedule(); });
    box.addEventListener("focusin", function () { held = true; W.clearTimeout(timer); });
    box.addEventListener("focusout", function () { held = false; schedule(); });
    if ("IntersectionObserver" in W) new IntersectionObserver(function (es) { es.forEach(function (e) { seen = e.isIntersecting; if (seen) schedule(); else W.clearTimeout(timer); }); }, { threshold: .4 }).observe(box);
  }

  /* ------------------------------------------------------------ writing: filter by kind */
  function initFilter() {
    var f = d.querySelector("[data-filter]");
    if (!f) return;
    var btns = f.querySelectorAll("[data-filter-value]"), items = d.querySelectorAll("[data-item]"), years = d.querySelectorAll("[data-year]"), count = f.querySelector("[data-filter-count]");
    each(btns, function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-filter-value"), n = 0;
        each(btns, function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        each(items, function (it) { var on = v === "all" || it.getAttribute("data-type") === v; it.hidden = !on; if (on) n++; });
        each(years, function (y) { y.hidden = !y.querySelector("[data-item]:not([hidden])"); });
        count.textContent = n + (n === 1 ? " piece" : " pieces");
      });
    });
  }

  /* ------------------------------------------------------------ moving posters: play while seen, with a pause button */
  function initVideos() {
    each(d.querySelectorAll("video[data-loop]"), function (v) {
      var btn = v.parentNode.querySelector("[data-vid-toggle]"), paused = false;
      function label() { if (btn) btn.textContent = paused ? "Play" : "Pause"; }
      if (btn) btn.addEventListener("click", function () { paused = !paused; if (paused) v.pause(); else { var p = v.play(); if (p && p.catch) p.catch(function () {}); } label(); });
      if ("IntersectionObserver" in W) new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && !paused) { v.preload = "auto"; var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
      }, { threshold: .3 }).observe(v);
      label();
    });
  }

  /* ------------------------------------------------------------ a small ink dot trails the pointer and swells over what you can press */
  function initCursor() {
    var c = d.querySelector("[data-cursor]");
    if (!c || !fine || still()) return;
    var x = -100, y = -100, cx = -100, cy = -100, raf = 0;
    function frame() {
      raf = 0;
      cx += (x - cx) * .16; cy += (y - cy) * .16;
      c.style.setProperty("--cx", cx.toFixed(1) + "px"); c.style.setProperty("--cy", cy.toFixed(1) + "px");
      if (Math.abs(x - cx) > .3 || Math.abs(y - cy) > .3) raf = W.requestAnimationFrame(frame);
    }
    d.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      c.classList.add("is-on");
      c.classList.toggle("is-link", !!(e.target.closest && e.target.closest("a, button, [data-bw-line], .oval")));
      if (!raf) raf = W.requestAnimationFrame(frame);
    });
    root.addEventListener("mouseleave", function () { c.classList.remove("is-on"); });
  }

  function init() {
    initOpening(); initMenu(); initReveal(); initInk(); initScroll(); initRunhead();
    initName(); initRoles(); initBetween(); initFilter(); initVideos(); initCursor();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
})();
