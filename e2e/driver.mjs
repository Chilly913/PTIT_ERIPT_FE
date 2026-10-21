// Tiny Chrome DevTools driver for the end-to-end scenario (no dependencies, Node >= 22: global fetch + WebSocket).
// Every actor gets its own Chrome *profile* (user-data-dir), so three people can be logged in at the same time.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const OUT = join(here, "out");
mkdirSync(OUT, { recursive: true });

export const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const WEB = process.env.WEB_URL ?? "http://localhost:3001";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NL = String.fromCharCode(10);
const js = JSON.stringify;

/** Opens a Chrome window with a fresh profile. headed=false runs it without a visible window. */
export async function openActor({ name, port, headed = true, width = 1360, height = 900, x = 0, y = 0 }) {
  const dir = join(OUT, "profile-" + name);
  mkdirSync(dir, { recursive: true });
  const args = [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", `--window-size=${width},${height}`, `--window-position=${x},${y}`, "--lang=vi",
    // three stacked windows: keep the hidden ones running at full speed
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling", "--disable-features=CalculateNativeWinOcclusion"];
  if (!headed) args.push("--headless=new");
  const proc = spawn(CHROME, [...args, "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (targets.some((t) => t.type === "page")) break;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  const page = targets?.find((t) => t.type === "page");
  if (!page) throw new Error("Chrome did not start for " + name);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const problems = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(js(m.error))) : res(m.result);
    } else if (m.method === "Runtime.exceptionThrown") problems.push("exception: " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 240));
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") problems.push("console.error: " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 240));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(js({ id: i, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Browser.getWindowForTarget").catch(() => {});

  const a = {
    name,
    problems,
    send,
    front: () => send("Page.bringToFront"),
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed: " + expr.slice(0, 120));
      return r.result.value;
    },
    async goto(path, settle = 1200) {
      await a.front();
      await send("Page.navigate", { url: path.startsWith("http") ? path : WEB + path });
      await sleep(settle);
      await a.waitFor("document.readyState === 'complete'", 20000).catch(() => {});
    },
    async text() { return a.eval("document.body.innerText"); },
    async path() { return a.eval("location.pathname + location.search"); },
    async shot(label) {
      const r = await send("Page.captureScreenshot", { format: "png" });
      const p = join(OUT, `${name}-${label}.png`);
      writeFileSync(p, Buffer.from(r.data, "base64"));
      return p;
    },
    /** Poll a JS expression until it is truthy. */
    async waitFor(expr, timeout = 15000, step = 250) {
      const t0 = Date.now();
      for (;;) {
        try { if (await a.eval(`!!(${expr})`)) return true; } catch { /* page navigating */ }
        if (Date.now() - t0 > timeout) throw new Error(`timeout waiting for: ${expr.slice(0, 140)}`);
        await sleep(step);
      }
    },
    async waitText(text, timeout = 15000) { return a.waitFor(`document.body.innerText.includes(${js(text)})`, timeout); },
    /** Click the first visible element matching `selector` whose text/aria-label contains `text`. */
    async click(text, selector = "button,a,[role=tab],[role=menuitem],[role=option],label,summary", scope = "document") {
      const ok = await a.eval(`(()=>{const root=${scope === "document" ? "document" : `document.querySelector(${js(scope)})`};if(!root)return false;const els=[...root.querySelectorAll(${js(selector)})].filter(e=>e.offsetParent!==null&&((e.innerText||'')+' '+(e.getAttribute('aria-label')||'')).includes(${js(text)}));const e=els[0];if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true})()`);
      if (!ok) throw new Error(`click: nothing visible containing "${text}" in ${selector} (${scope})`);
      await sleep(500);
    },
    /** Set an input/textarea/select value the way React notices. */
    async setValue(selector, value) {
      const ok = await a.eval(`(()=>{const e=document.querySelector(${js(selector)});if(!e)return false;const P=e.tagName==='TEXTAREA'?HTMLTextAreaElement:e.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement;Object.getOwnPropertyDescriptor(P.prototype,'value').set.call(e,${js(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
      if (!ok) throw new Error("setValue: no element " + selector);
      await sleep(250);
    },
    async setFiles(selector, files) {
      const doc = await send("DOM.getDocument", { depth: 0 });
      const { nodeId } = await send("DOM.querySelector", { nodeId: doc.root.nodeId, selector });
      if (!nodeId) throw new Error("setFiles: no element " + selector);
      await send("DOM.setFileInputFiles", { nodeId, files });
      await sleep(700);
    },
    /**
     * Fill a labelled form control inside `scope` (default: the open dialog, else the page).
     * Works for text inputs, textareas, native selects, the searchable Combobox and the date picker.
     * `value` for a Combobox/Select is a text fragment of the option to pick; for a date it is YYYY-MM-DD.
     */
    async field(label, value, scope = "dialog[open]") {
      // pages and dialogs render asynchronously (first compile of a Next page can take seconds): wait for the label
      await a.waitFor(`(()=>{const sc=document.querySelector(${js(scope)})||document;return [...sc.querySelectorAll('label')].some(l=>l.innerText.replace('*','').trim().startsWith(${js(label)})&&document.getElementById(l.htmlFor))})()`, 20000).catch(() => {});
      const info = await a.eval(`(()=>{const sc=document.querySelector(${js(scope)})||document;const lab=[...sc.querySelectorAll('label')].find(l=>l.innerText.replace('*','').trim().startsWith(${js(label)}));if(!lab)return null;const el=document.getElementById(lab.htmlFor);if(!el)return null;el.scrollIntoView({block:'center'});return {id:el.id,tag:el.tagName,type:el.type||'',pop:el.getAttribute('aria-haspopup')||''}})()`);
      if (!info) throw new Error(`field: no control labelled "${label}" in ${scope}`);
      const sel = `[id=${js(info.id)}]`.replace(/"/g, "'");
      if (info.pop === "listbox") {
        await a.eval(`document.getElementById(${js(info.id)}).click()`);
        await a.waitFor("document.querySelector('[role=listbox]')", 5000);
        const typed = await a.eval(`(()=>{const i=document.querySelector('[role=listbox]')?.parentElement?.querySelector('input');if(!i)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${js(value)});i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
        await sleep(typed ? 350 : 100);
        const picked = await a.eval(`(()=>{const o=[...document.querySelectorAll('[role=option]')].find(o=>o.innerText.includes(${js(value)}));if(!o)return false;o.click();return true})()`);
        if (!picked) throw new Error(`field "${label}": no option containing "${value}"`);
        await sleep(350);
      } else if (info.pop === "dialog") {
        await a.pickDate(info.id, value);
      } else if (info.tag === "SELECT") {
        await a.eval(`(()=>{const e=document.getElementById(${js(info.id)});const o=[...e.options].find(o=>o.text.includes(${js(value)})||o.value===${js(value)});if(!o)throw new Error('no option');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,o.value);e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
        await sleep(250);
      } else {
        await a.setValue(sel, value);
      }
    },
    /** Press a key such as Enter or Escape on the focused element. */
    async press(key) {
      const code = { Enter: 13, Escape: 27, Tab: 9 }[key];
      for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: code, text: key === "Enter" ? String.fromCharCode(13) : undefined });
      await sleep(400);
    },
    /** Focus an element (input, textarea or contenteditable) and type real text into it. */
    async typeInto(selector, text) {
      const ok = await a.eval(`(()=>{const e=document.querySelector(${js(selector)});if(!e)return false;e.scrollIntoView({block:'center'});e.focus();return true})()`);
      if (!ok) throw new Error("typeInto: no element " + selector);
      await send("Input.insertText", { text });
      await sleep(300);
    },
    /** Pick an option of a Combobox found by its aria-label (comboboxes without a visible <label>). */
    async pick(ariaLabel, optionText, search = optionText) {
      const opened = await a.eval(`(()=>{const b=[...document.querySelectorAll('button[aria-haspopup=listbox]')].find(x=>x.getAttribute('aria-label')===${js(ariaLabel)});if(!b)return false;b.scrollIntoView({block:'center'});b.click();return true})()`);
      if (!opened) throw new Error(`pick: no combobox with aria-label "${ariaLabel}"`);
      await a.waitFor("document.querySelector('[role=listbox]')", 5000);
      await a.eval(`(()=>{const i=document.querySelector('[role=listbox]')?.parentElement?.querySelector('input');if(!i)return;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${js(search)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await sleep(350);
      const picked = await a.eval(`(()=>{const o=[...document.querySelectorAll('[role=option]')].find(o=>o.innerText.includes(${js(optionText)}));if(!o)return false;o.click();return true})()`);
      if (!picked) throw new Error(`pick "${ariaLabel}": no option containing "${optionText}"`);
      await sleep(500);
    },
    /** Date picker (react-day-picker): open it, choose year and month in the caption dropdowns, click the day. */
    async pickDate(id, ymd, hh, mm) {
      const [y, m, d] = ymd.split("-").map(Number);
      await a.eval(`document.getElementById(${js(id)}).click()`);
      await a.waitFor("document.querySelector('.rdp-root')", 5000);
      const setSel = (cls, v) => a.eval(`(()=>{const s=document.querySelector('.rdp-root .${cls}');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${js(String(v))});s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await setSel("rdp-years_dropdown", y);
      await sleep(250);
      await setSel("rdp-months_dropdown", m - 1);
      await sleep(250);
      await a.eval(`document.querySelector('.rdp-root td[data-day="${ymd}"] button').click()`);
      await sleep(250);
      if (hh != null) {
        await a.eval(`(()=>{const s=document.querySelector('select[aria-label="Giờ"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${js(String(hh))});s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
        await a.eval(`(()=>{const s=document.querySelector('select[aria-label="Phút"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${js(String(mm ?? 0))});s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      }
      // date-only pickers close themselves after the day is chosen; date-time pickers need "Xong"
      if (await a.eval("!!document.querySelector(\"[role=dialog][aria-label='Chọn ngày giờ']\")")) await a.click("Xong", "button", "[role=dialog][aria-label='Chọn ngày giờ']");
    },
    /** Real UI login through the /login form. */
    async login(email, password = "Demo@1234") {
      await send("Network.clearBrowserCookies"); // a profile may still be signed in as someone else
      await a.goto("/login", 800);
      await a.waitFor("document.querySelector('input[type=email]')", 20000);
      await a.setValue("input[type=email]", email);
      await a.setValue("input[type=password]", password);
      await a.click("Đăng nhập", "button[type=submit]");
      await a.waitFor("!location.pathname.startsWith('/login')", 25000);
      await sleep(800);
    },
    async logout() {
      await send("Network.clearBrowserCookies");
      await a.goto("/login", 600);
    },
    lines: async () => (await a.text()).split(NL).map((s) => s.trim()).filter(Boolean),
    async close() { try { ws.close(); } catch { /* ignore */ } try { proc.kill(); } catch { /* ignore */ } },
  };
  return a;
}
