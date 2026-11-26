// Minimal Chrome DevTools Protocol helper (Node 22+ global WebSocket): launch headless Chrome, open pages at a given
// viewport, evaluate scripts, press keys and take viewport or full-page screenshots.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port = 9333) {
  const profile = mkdtempSync(join(tmpdir(), "cdp-profile-"));
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run",
    "--no-default-browser-check", "--hide-scrollbars", "--mute-audio", "--disable-extensions", "about:blank"], { stdio: "ignore" });
  let ver = null;
  for (let i = 0; i < 60 && !ver; i++) {
    await sleep(250);
    try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { }
  }
  if (!ver) throw new Error("Chrome did not start");
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
    else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const browser = {
    async page({ width = 1440, height = 900, mobile = false, dpr = 1, reducedMotion = false } = {}) {
      const { targetId } = await send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      const s = (m, p) => send(m, p, sessionId);
      await s("Page.enable"); await s("Runtime.enable");
      await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
      if (mobile) await s("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }] });
      const consoleErrors = [];
      listeners.push((m) => {
        if (m.sessionId !== sessionId) return;
        if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
        if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
      });
      const page = {
        consoleErrors,
        async goto(url, waitMs = 1200) {
          await s("Page.bringToFront");
          const loaded = new Promise((res) => { const l = (m) => { if (m.sessionId === sessionId && m.method === "Page.loadEventFired") { listeners.splice(listeners.indexOf(l), 1); res(); } }; listeners.push(l); });
          await s("Page.navigate", { url });
          await Promise.race([loaded, sleep(30000)]);
          await sleep(waitMs);
        },
        async eval(expr) {
          const r = await s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
          return r.result.value;
        },
        async key(key, code = key, keyCode = 0, modifiers = 0) {
          await s("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, modifiers });
          await s("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, modifiers });
        },
        async tap(x, y) {
          await s("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
          await s("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
        },
        async setFiles(selector, files) {
          const { root } = await s("DOM.getDocument", { depth: -1 });
          const { nodeId } = await s("DOM.querySelector", { nodeId: root.nodeId, selector });
          await s("DOM.setFileInputFiles", { nodeId, files });
        },
        async shot(path, { full = false, quality = 82 } = {}) {
          const format = /.jpe?g$/i.test(path) ? "jpeg" : "png";
          let params = { format, ...(format === "jpeg" ? { quality } : {}) };
          if (full) {
            const m = await s("Page.getLayoutMetrics");
            const h = Math.min(Math.ceil(m.cssContentSize.height), 16000);
            params = { ...params, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: h, scale: 1 } };
          }
          const { data } = await s("Page.captureScreenshot", params);
          writeFileSync(path, Buffer.from(data, "base64"));
        },
        async close() { await send("Target.closeTarget", { targetId }); },
      };
      return page;
    },
    async close() { try { await send("Browser.close"); } catch { } ws.close(); proc.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch { } },
  };
  return browser;
}
