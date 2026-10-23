import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Die Import Map in app/index.html muss zu den Modulen passen (sonst kommen Module nach einem Update veraltet aus dem
// Browser-Cache). Bei Abweichung: npm run version:set
const ROOT = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'app/index.html'), 'utf8');
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const HINT = ' (npm run version:set ausführen)';

const walk = (dir, pre = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name), pre + d.name + '/') : d.name.endsWith('.js') ? [pre + d.name] : []);

const raw = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
const imports = raw ? JSON.parse(raw[1]).imports : {};
const keys = Object.keys(imports);

test('jedes Modul unter app/js steht genau einmal in der Import Map', () => {
  assert.ok(raw, 'Import Map fehlt in app/index.html');
  const expected = [
    ...walk(path.join(ROOT, 'app/js')).map((f) => `./js/${f}`),
    ...walk(path.join(ROOT, 'shared')).filter((f) => !f.includes('/') && f !== 'env.js').map((f) => `../shared/${f}`)
  ];
  const missing = expected.filter((k) => !keys.includes(k));
  const stale = keys.filter((k) => !expected.includes(k));
  assert.deepEqual(missing, [], 'Module fehlen in der Import Map' + HINT);
  assert.deepEqual(stale, [], 'Import Map verweist auf nicht vorhandene Module' + HINT);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal((html.match(/<script type="importmap">/g) || []).length, 1);
});

test('die Import Map verweist auf dieselbe Datei mit ?v= aus package.json', () => {
  for (const [k, v] of Object.entries(imports)) assert.equal(v, `${k}?v=${version}`, k + ' hat die falsche Version' + HINT);
});

test('Stylesheets, Einstiegs-Script und Menütext tragen die Version aus package.json', () => {
  const refs = [...html.matchAll(/(?:href|src)="((?:css\/|\/shared\/|js\/)[\w/-]+\.(?:css|js))(\?v=[^"]*)?"/g)];
  assert.ok(refs.length > 0);
  for (const [, file, v] of refs) assert.equal(v, `?v=${version}`, file + ' hat die falsche Version' + HINT);
  assert.match(html, new RegExp(`<p class="version">Version ${version.replace(/\./g, '\.')}`));
});
