// Screenshots der echten App für die Landing Page. Ohne Abhängigkeiten.
// Aufruf: npm run screens  (Chrome-Pfad bei Bedarf mit CHROME=... angeben)
// Startet tools/serve.js auf einem freien Port (ohne shared/env.js, also ohne Backend: kein Konto-Knopf) und ein
// lokales Chrome headless mit frischem Profil, steuert es über das DevTools-Protokoll (eingebautes WebSocket und
// fetch von Node 22) und schreibt je Bereich ein Tablet-Bild nach site/assets/screens/: melodie.webp, rhythmus.webp, lied.webp.
// Danach folgen aus den Vorlagen tools/og.html und tools/icon.html das Vorschaubild für Links (site/assets/og.png, 1200x630)
// und das Symbol für den Home-Bildschirm (site/assets/apple-touch-icon.png, 180x180); beide nutzen das Bild melodie.webp.
// Die Bilder sind quer 1180x820 CSS-Pixel bei doppelter Dichte (2360x1640); Dateinamen und Maße bleiben stabil,
// die Seite bindet sie mit festen width und height ein. Die Daten kommen aus der App selbst: bekannte Lieder werden
// wie von Nutzern über die Liedersammlung geladen, der Rhythmus über den gespeicherten Stand der Tafel.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'site', 'assets', 'screens');
const assetsDir = path.join(root, 'site', 'assets');
const W = 1180, H = 820, SCALE = 2, QUALITY = 80;

// Was auf dem Bild zu sehen ist: Bereich (Reiter), Lied aus der Liedersammlung oder gespeicherte Tafel,
// danach Knöpfe der Seitenleiste, die die Bedienung zeigen
const SHOTS = [
  { file: 'melodie', tab: 'Farbnoten', song: 'Kuckuck, Kuckuck' },
  {
    file: 'rhythmus', tab: 'Rhythmus', after: ['#btnSyl'],
    board: { key: 'notentafel.rhy.v1', name: 'Rhythmus', meter: '4/4', rows: [
      [1, 1, 0.5, 0.5, 1, 2, -1, 1],
      [0.5, 0.5, 0.5, 0.5, 1, 1, 2, 2],
      [1, -1, 0.5, 0.5, 0.5, 0.5, 4]
    ] }
  },
  { file: 'lied', tab: 'Notenblatt', song: 'Kuckuck, Kuckuck' }
];

// Bilder aus Vorlagen: Datei in tools/, Größe in CSS-Pixeln (Dichte 1), Ziel in site/assets/
const TEMPLATES = [
  { template: 'og.html', file: 'og.png', w: 1200, h: 630 },
  { template: 'icon.html', file: 'apple-touch-icon.png', w: 180, h: 180 }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, what, ms = 15000) => {
  for (const t = Date.now(); Date.now() - t < ms; await sleep(100)) { const v = await f().catch(() => null); if (v) return v; }
  throw new Error('Zeitüberschreitung: ' + what);
};

// Chrome suchen: CHROME, sonst übliche Orte je System
function findChrome() {
  const e = process.env;
  const list = [e.CHROME,
    e.PROGRAMFILES && path.join(e.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
    e['PROGRAMFILES(X86)'] && path.join(e['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe'),
    e.LOCALAPPDATA && path.join(e.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const found = list.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error('Kein Chrome gefunden. Pfad mit CHROME=... angeben.');
  return found;
}

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  s.on('error', rej);
});

// Eine Verbindung zum DevTools-Protokoll einer Seite
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('DevTools-Verbindung fehlgeschlagen')); });
  let id = 0;
  const wait = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data), p = wait.get(d.id);
    if (!p) return;
    wait.delete(d.id);
    d.error ? p.rej(new Error(d.error.message)) : p.res(d.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { wait.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  // Ausdruck in der Seite auswerten (auch async); Fehler in der Seite werden zu Fehlern hier
  const run = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, run, close: () => ws.close() };
}

// Gespeicherte Tafel im Format der App: Noten haben d als Länge, negative Längen sind Pausen
function boardJSON(b) {
  const rows = b.rows.map((r) => r.map((d) => d < 0 ? { k: 'r', d: -d } : { k: 'b', d }));
  return { rows, lines: rows.map((r, i) => i === 0 ? { l: 1, m: b.meter } : 1), name: b.name };
}

async function shoot(page, shot, base) {
  const { send, run } = page;
  await send('Page.navigate', { url: base + '/app/' });
  await until(() => run('!!document.querySelector("#tabs .tab")'), 'App geladen');
  // Frischer Stand: nur der Rhythmus bekommt seine Tafel, dann neu laden, damit die App sie liest
  await run('localStorage.clear()');
  if (shot.board) await run('localStorage.setItem(' + JSON.stringify(shot.board.key) + ',' + JSON.stringify(JSON.stringify(boardJSON(shot.board))) + ')');
  await send('Page.reload');
  await until(() => run('!!document.querySelector("#tabs .tab")'), 'App neu geladen');
  await run(`[...document.querySelectorAll('#tabs .tab')].find(t => t.textContent.trim() === ${JSON.stringify(shot.tab)}).click()`);
  if (shot.song) {
    // Wie ein Nutzer: Liedersammlung öffnen und beim bekannten Lied „Laden“ tippen
    await run('document.getElementById("btnSongs").click()');
    await until(() => run(`!![...document.querySelectorAll('#drawer .song.one')].find(li => li.offsetParent && li.querySelector('.name').textContent === ${JSON.stringify(shot.song)})`), 'Lied in der Liste');
    await run(`[...document.querySelectorAll('#drawer .song.one')].find(li => li.offsetParent && li.querySelector('.name').textContent === ${JSON.stringify(shot.song)}).querySelector('button').click()`);
  }
  for (const sel of shot.after || []) await run(`document.querySelector(${JSON.stringify(sel)}).click()`);
  // Nichts Offenes, kein Fokus, kein Hinweis; kurz warten, bis Menü und Übergänge zur Ruhe kommen
  await until(() => run('!document.getElementById("drawer").classList.contains("open")'), 'Menü geschlossen');
  await until(() => run('document.getElementById("toast").hidden'), 'Hinweis weg');
  await run('document.activeElement && document.activeElement.blur()');
  await run('document.fonts.ready.then(() => true)');
  await sleep(800);
  const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: QUALITY });
  const file = path.join(outDir, shot.file + '.webp');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(path.relative(root, file) + '  ' + (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
}

// Vorlage in eine Seite des Servers schreiben (damit /shared/ und /assets/ laden) und als PNG aufnehmen
async function render(page, tpl, base) {
  const { send, run } = page;
  await send('Page.navigate', { url: base + '/imprint/' });
  await until(() => run('document.readyState === "complete"'), 'Seite geladen');
  await send('Emulation.setDeviceMetricsOverride', { width: tpl.w, height: tpl.h, deviceScaleFactor: 1, mobile: false });
  const html = fs.readFileSync(path.join(__dirname, tpl.template), 'utf8');
  await run('document.open(); document.write(' + JSON.stringify(html) + '); document.close(); true');
  await until(() => run('document.readyState === "complete" && [...document.images].every((i) => i.complete && i.naturalWidth > 0)'), 'Bilder der Vorlage');
  await run('document.fonts.ready.then(() => true)');
  await sleep(300);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(assetsDir, tpl.file);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(path.relative(root, file) + '  ' + (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
}

async function main() {
  const chrome = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nt-screens-'));
  const port = await freePort();
  const procs = [];
  try {
    const env = { ...process.env, PORT: String(port) };
    procs.push(spawn(process.execPath, [path.join(__dirname, 'serve.js')], { env, stdio: 'ignore' }));
    const base = 'http://127.0.0.1:' + port;
    await until(() => fetch(base + '/app/').then((r) => r.ok), 'Server');

    procs.push(spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--no-first-run',
      '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=' + SCALE, 'about:blank'], { stdio: 'ignore' }));
    // Chrome schreibt den gewählten Port in das Profil
    const dt = await until(async () => fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0], 'Chrome gestartet');
    const target = await until(async () => (await (await fetch('http://127.0.0.1:' + dt + '/json/list')).json()).find((t) => t.type === 'page'), 'Chrome-Seite');
    const page = await connect(target.webSocketDebuggerUrl);
    await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
    // Ohne Bewegung: keine Übergänge, die ein Bild je nach Zeitpunkt verschieden machen
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    fs.mkdirSync(outDir, { recursive: true });
    for (const shot of SHOTS) await shoot(page, shot, base);
    for (const tpl of TEMPLATES) await render(page, tpl, base);
    page.close();
  } finally {
    // Unter Windows startet Chrome Kindprozesse, die nur taskkill /T mitnimmt
    procs.forEach((p) => process.platform === 'win32' ? spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' }) : p.kill());
    // Chrome gibt das Profil kurz nach dem Beenden frei (unter Windows)
    await sleep(500);
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
