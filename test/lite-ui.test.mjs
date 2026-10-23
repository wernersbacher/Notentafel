import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { installDom, uninstallDom, song, n } from './helpers.mjs';

// Lite im Bedienen (Bead notentafel-8yi.7): Karte „Mit Pro“ in der Liedersammlung beider Bereiche, Liedgrenze beim
// Speichern und beim Import im Menü, Dev-Server je Modus. Die Module lesen ihre Elemente aus index.html, deshalb
// erst das DOM, dann import().
let storage, tier, KN, ST, L, UI, SH, SHS, MS, AREA, TM, el, tel, lel;
const as = (t) => tier.loadPlan({ env: { backend: null, tier: t }, search: '' });
const tick = () => new Promise((r) => setTimeout(r, 0));
const KNOWN = {
  mel: [{ name: 'Alle meine Entchen', group: 'Kinder', meter: '4/4', tempo: 100, notes: 'C D E F' }],
  lied: [{ name: 'Hänschen klein', group: 'Kinder', meter: '4/4', tempo: 100, notes: 'g1 e1' }]
};
const realFetch = globalThis.fetch;

before(async () => {
  ({ storage } = installDom());
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.fetch = async (url) => (String(url).endsWith('/api/known') && tier.plan.has('known')
    ? { ok: true, json: async () => KNOWN } : { ok: false, status: 403 });
  tier = await import('../app/js/core/tier.js');
  KN = await import('../app/js/core/known.js');
  ST = await import('../app/js/core/store.js');
  L = await import('../app/js/lied/storage.js');
  UI = await import('../app/js/core/ui.js');
  SH = await import('../app/js/core/shell.js');
  SHS = await import('../app/js/core/shell-state.js');
  MS = await import('../app/js/core/menu-songs.js');
  AREA = await import('../app/js/lied/area.js');
  TM = await import('../app/js/tafel/menu.js');
  ({ el } = await import('../app/js/core/dom.js'));
  ({ el: tel } = await import('../app/js/tafel/dom.js'));
  ({ el: lel } = await import('../app/js/lied/dom.js'));
  TM.initTafelMenu();
  AREA.registerLied();
  MS.initSongs(() => {});
});
after(() => { delete globalThis.ResizeObserver; globalThis.fetch = realFetch; uninstallDom(); });
beforeEach(async () => { storage.clear(); await as('guest'); await tick(); });

const sec = (ul) => ul.closest('section');

/* ---------- Karte „Mit Pro“ ---------- */
test('Liedersammlung: Gast sieht die Karte, keine Lieder; Pro die Lieder; Stufe zurück sperrt wieder', async () => {
  for (const ul of [tel.melodies, lel.liedSongs]) {
    assert.match(sec(ul).querySelector('.procard').textContent, /Mit Pro/);
  }
  TM.openTafelMenu();
  AREA.renderKnown();
  for (const ul of [tel.melodies, lel.liedSongs]) {
    assert.equal(sec(ul).classList.contains('locked'), true);
    assert.equal(ul.children.length, 0);
  }
  await as('pro'); // onTier -> loadKnown -> onKnown -> beide zeichnen neu
  await tick(); await tick();
  assert.deepEqual(KN.known().mel.map((m) => m.name), ['Alle meine Entchen']);
  for (const ul of [tel.melodies, lel.liedSongs]) assert.equal(sec(ul).classList.contains('locked'), false);
  assert.match(tel.melodies.textContent, /Alle meine Entchen/);
  assert.match(lel.liedSongs.textContent, /Hänschen klein/);
  assert.ok(tel.melodies.querySelector('[data-melody]'));
  assert.ok(lel.liedSongs.querySelector('[data-known]'));
  await as('account');
  await tick();
  for (const ul of [tel.melodies, lel.liedSongs]) {
    assert.equal(sec(ul).classList.contains('locked'), true);
    assert.equal(ul.children.length, 0);
  }
  assert.deepEqual(KN.known().mel, []);
});

test('lockLibrary: schaltet .locked am umgebenden Abschnitt, ohne Abschnitt geschieht nichts', () => {
  const ul = document.createElement('ul');
  UI.lockLibrary(ul, true); // kein section darum
  const s = document.createElement('section');
  s.append(ul);
  UI.lockLibrary(ul, true);
  assert.equal(s.classList.contains('locked'), true);
  UI.lockLibrary(ul, false);
  assert.equal(s.classList.contains('locked'), false);
});

/* ---------- Speichern: Liedgrenze ---------- */
// Ein Bereich mit Speichern, hier das Notenblatt über seinen echten Speicher
function fakeArea() {
  const saved = [];
  SHS.shellState.area = { id: 'lied', songs: { store: L.store, data: () => song([n('c1')]), name: () => '', saved: (x) => saved.push(x) } };
  return saved;
}
const input = (v) => { const i = document.createElement('input'); i.value = v; return i; };
const btn = () => document.createElement('button');
const reports = () => { const r = []; return Object.assign((t, w) => r.push([t, !!w]), { r }); };

test('saveAs: bei erreichter Grenze wird ein neues Lied abgelehnt, mit Hinweis', () => {
  const saved = fakeArea();
  for (const nm of ['A', 'B', 'C']) { const rep = reports(); SH.saveAs(input(nm), btn(), rep); assert.equal(rep.r[0][1], false, nm); }
  assert.equal(ST.songTotal(), 3);
  const rep = reports();
  SH.saveAs(input('D'), btn(), rep);
  assert.deepEqual(rep.r, [[tier.limitText('songs'), true]]);
  assert.match(rep.r[0][0], /höchstens 3 Lieder/);
  assert.equal(ST.songTotal(), 3);
  assert.equal(L.store.songExists('D'), false);
  assert.deepEqual(saved, ['A', 'B', 'C']);
});

test('saveAs: gleicher Name ersetzt auch bei erreichter Grenze (nach Bestätigung)', () => {
  fakeArea();
  for (const nm of ['A', 'B', 'C']) SH.saveAs(input(nm), btn(), reports());
  const b = btn(), rep = reports();
  SH.saveAs(input('a'), b, rep); // erster Tipp: „Ersetzen?“, noch nichts gemeldet
  assert.equal(rep.r.length, 0);
  assert.equal(b.textContent, 'Ersetzen?');
  SH.saveAs(input('a'), b, rep);
  assert.equal(rep.r.length, 1);
  assert.equal(rep.r[0][1], false);
  assert.equal(ST.songTotal(), 3);
});

test('saveAs: Pro darf bis 50, danach ist Schluss', async () => {
  await as('pro');
  fakeArea();
  for (let i = 0; i < 50; i++) {
    const rep = reports();
    SH.saveAs(input('Lied ' + i), btn(), rep);
    assert.equal(rep.r[0][1], false, 'Lied ' + i);
  }
  assert.equal(ST.songTotal(), 50);
  const rep = reports();
  SH.saveAs(input('Zu viel'), btn(), rep);
  assert.equal(rep.r[0][1], true);
  assert.match(rep.r[0][0], /höchstens 50 Lieder/);
  assert.doesNotMatch(rep.r[0][0], /Lite/);
  assert.equal(ST.songTotal(), 50);
});

/* ---------- Import im Menü ---------- */
async function importFile(file) {
  const text = JSON.stringify(file);
  Object.defineProperty(el.importFile, 'files', { value: [{ text: async () => text }], configurable: true });
  el.importFile.dispatchEvent(new window.Event('change'));
  await tick(); await tick();
}

test('Menü-Import: Lite nimmt nur so viele neue Lieder, wie hineinpassen, und sagt es', async () => {
  fakeArea();
  for (const nm of ['A', 'B', 'C', 'D', 'E']) L.store.saveSong(song([n('c1')]), nm);
  const file = JSON.parse(JSON.stringify(ST.exportAll()));
  storage.clear();
  L.store.saveSong(song([n('c1')]), 'Eins');
  await importFile(file);
  assert.equal(ST.songTotal(), 3, 'Eins plus zwei von fünf');
  assert.match(el.backupHint.textContent, /2 Lieder importiert/);
  assert.match(el.backupHint.textContent, /3 Lieder nicht übernommen/);
  assert.match(el.backupHint.textContent, /höchstens 3 Lieder/);
});

test('Menü-Import: Pro nimmt alles bis zur Grenze von 50', async () => {
  await as('pro');
  fakeArea();
  for (const nm of ['A', 'B', 'C', 'D', 'E']) L.store.saveSong(song([n('c1')]), nm);
  const file = JSON.parse(JSON.stringify(ST.exportAll()));
  storage.clear();
  await importFile(file);
  assert.equal(ST.songTotal(), 5);
  assert.match(el.backupHint.textContent, /5 Lieder importiert/);
  assert.doesNotMatch(el.backupHint.textContent, /nicht übernommen/);
});

/* ---------- tools/serve.js ---------- */
const startServer = (args) => new Promise((resolve, reject) => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, ['tools/serve.js', ...args], { cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port), MODE: '' } });
  p.once('error', reject);
  p.stdout.once('data', () => resolve({ p, port }));
  p.stderr.once('data', (d) => reject(new Error(String(d))));
});
const get = (port, path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  }).on('error', reject);
});

test('tools/serve.js: Pro-Modus liefert /api/known (200) und env.js mit tier pro', async () => {
  const { p, port } = await startServer([]);
  try {
    const k = await get(port, '/api/known');
    assert.equal(k.status, 200);
    assert.equal(k.headers['cache-control'], 'no-store');
    const j = JSON.parse(k.body);
    assert.ok(j.mel.length > 0 && j.lied.length > 0);
    assert.match((await get(port, '/shared/env.js')).body, /tier: 'pro'/);
  } finally { p.kill(); }
});

test('tools/serve.js: --lite sperrt /api/known (403, keine Lieder) und env.js sagt guest', async () => {
  const { p, port } = await startServer(['--lite']);
  try {
    const k = await get(port, '/api/known');
    assert.equal(k.status, 403);
    assert.equal(JSON.parse(k.body).mel, undefined);
    assert.match((await get(port, '/shared/env.js')).body, /tier: 'guest'/);
  } finally { p.kill(); }
});
