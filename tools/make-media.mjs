// Makes web-sized WebP copies of the supplied photographs, copies the video clips and takes a poster frame from each,
// using headless Chrome (no other tools needed). Writes static/img/*.webp, static/video/*.mp4 and content/media.json.
//   node tools/make-media.mjs "<folder with the supplied files>"
import { createServer } from "node:http";
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./cdp.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = process.argv[2];
if (!SRC || !existsSync(SRC)) throw new Error("Give the folder with the supplied photographs and videos.");
const IMG = join(ROOT, "static", "img"), VID = join(ROOT, "static", "video");
mkdirSync(IMG, { recursive: true }); mkdirSync(VID, { recursive: true });

// supplied file -> name on the site
const IMAGES = {
  "roopesh-960x960-crop.jpg": "portrait",
  "lawang.jpg": "lawangwangi-1",
  "lawang2.jpg": "lawangwangi-2",
  "APARN + ADPRex Conference.jpg": "who-speaks-1",
  "APARN + ADPRex Conference2.jpg": "who-speaks-2",
  "Co-LuminaX exhibition.jpg": "co-luminax-1",
  "Co-LuminaX exhibition2.jpg": "co-luminax-2",
  "PROSPEKTUS 1 Koleksi Seni dan Aset Ilmiah.jpg": "prospektus-cover",
  "PROSPEKTUS 1 Koleksi Seni dan Aset Ilmiah 2.jpg": "prospektus-spread",
  "peer-reviewed art exhibition at the Vietnam Festival of Creativity and Design.jpg": "vietnam-festival-1",
  "peer-reviewed art exhibition at the Vietnam Festival of Creativity and Design 2.jpg": "vietnam-festival-2",
};
const VIDEOS = {
  "Arts & Design Talks The Possibility of Culture in a Technological Future.mp4": "binus-talk-1",
  "Arts & Design Talks The Possibility of Culture in a Technological Future2.mp4": "binus-talk-2",
};
const STEPS = [480, 800, 1200, 1600];

const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".html": "text/html" };
const server = createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, "http://x").pathname.slice(1));
  if (!name) { res.writeHead(200, { "content-type": "text/html" }).end("<!doctype html><title>media</title>"); return; }
  const f = join(SRC, name);
  if (!(name in IMAGES || name in VIDEOS) || !existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(f).toLowerCase()] || "application/octet-stream" }).end(readFileSync(f));
});
await new Promise((r) => server.listen(8151, "127.0.0.1", r));
const browser = await launch(9351);
const media = { images: {}, videos: {} };
try {
  const p = await browser.page({ width: 800, height: 600 });
  await p.goto("http://127.0.0.1:8151/", 200);
  for (const [file, slug] of Object.entries(IMAGES)) {
    const r = await p.eval(`(async () => {
      const im = new Image(); im.src = ${JSON.stringify("/" + encodeURIComponent(file))};
      await im.decode();
      const W = im.naturalWidth, H = im.naturalHeight, out = [];
      const widths = ${JSON.stringify(STEPS)}.filter((w) => w < W);
      if (W <= 1600) widths.push(W); else widths.push(1600);
      for (const w of [...new Set(widths)]) {
        const h = Math.round(H * w / W), c = document.createElement("canvas");
        c.width = w; c.height = h;
        const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(im, 0, 0, w, h);
        out.push({ w, h, data: c.toDataURL("image/webp", 0.82).split(",")[1] });
      }
      return { W, H, out };
    })()`);
    for (const o of r.out) writeFileSync(join(IMG, `${slug}-${o.w}.webp`), Buffer.from(o.data, "base64"));
    media.images[slug] = { w: r.W, h: r.H, widths: r.out.map((o) => o.w) };
    console.log(`${slug}: ${r.W}x${r.H} -> ${r.out.map((o) => o.w).join(", ")}`);
  }
  for (const [file, slug] of Object.entries(VIDEOS)) {
    const r = await p.eval(`(async () => {
      const v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.src = ${JSON.stringify("/" + encodeURIComponent(file))};
      document.body.appendChild(v);
      await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(new Error("cannot play " + (v.error && v.error.code))); });
      const t = Math.min(1.2, v.duration / 3);
      await new Promise((ok) => { v.onseeked = ok; v.currentTime = t; });
      const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      let audio = null;
      try { audio = v.mozHasAudio ?? (typeof v.webkitAudioDecodedByteCount === "number" ? null : null); } catch (e) {}
      return { w: v.videoWidth, h: v.videoHeight, d: v.duration, poster: c.toDataURL("image/webp", 0.82).split(",")[1] };
    })()`);
    copyFileSync(join(SRC, file), join(VID, `${slug}.mp4`));
    writeFileSync(join(IMG, `${slug}-poster.webp`), Buffer.from(r.poster, "base64"));
    media.videos[slug] = { w: r.w, h: r.h, duration: Math.round(r.d * 10) / 10 };
    console.log(`${slug}: ${r.w}x${r.h}, ${r.d.toFixed(1)} s`);
  }
} finally {
  await browser.close();
  server.close();
}
writeFileSync(join(ROOT, "content", "media.json"), JSON.stringify(media, null, 1) + "\n");
console.log("wrote content/media.json");
