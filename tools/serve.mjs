// A small static server for docs/ that behaves like GitHub Pages for this project site:
//   http://127.0.0.1:8161/roopesh-prototype/
// Folders serve index.html, folder URLs without a trailing slash redirect, and unknown paths get 404.html.
//   node tools/serve.mjs [port]
import { createServer } from "node:http";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DOCS = fileURLToPath(new URL("../docs/", import.meta.url));
const BASE = "/roopesh-prototype/";
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".json": "application/json",
};

export function serve(port = 8161) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }
    const send = (f, status = 200) => { res.writeHead(status, { "content-type": TYPES[extname(f)] || "application/octet-stream", "cache-control": "no-store" }); res.end(req.method === "HEAD" ? undefined : readFileSync(f)); };
    if (!path.startsWith(BASE)) { if (path === BASE.slice(0, -1)) { res.writeHead(301, { location: BASE }).end(); return; } res.writeHead(404).end("Not found"); return; }
    const file = normalize(join(DOCS, path.slice(BASE.length)));
    if (!file.startsWith(DOCS.replace(/[\\/]$/, ""))) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith("/")) { res.writeHead(301, { location: `${path}/${url.search}` }).end(); return; }
      if (existsSync(join(file, "index.html"))) return send(join(file, "index.html"));
    } else if (existsSync(file)) return send(file);
    return send(join(DOCS, "404.html"), 404);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]) || 8161;
  serve(port).then(() => console.log(`serving docs/ at http://127.0.0.1:${port}${BASE}`));
}
