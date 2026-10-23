import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fakeStorage } from './helpers.mjs';

// blocks.js liest beim Laden die Einstellungen (localStorage); ein Dokument braucht es erst beim Binden der Knöpfe.
globalThis.localStorage = fakeStorage();
const { blockKey } = await import('../app/js/core/blocks.js');
const { cleanCoreSettings, OPEN_START } = await import('../app/js/core/settings.js');

const src = fs.readFileSync(path.resolve(import.meta.dirname, '../app/index.html'), 'utf8');

// Der Verdecken-Block steht einmal als Vorlage da; parts.js setzt ihn in jeden .cover-slot eines Panels.
const tplTag = src.slice(src.indexOf('<template id="tplCover">'), src.indexOf('</template>'));
const tplBlock = tplTag.match(/<section class="group block"[^>]*>/)[0];
const tplName = tplBlock.match(/data-block="([^"]+)"/)?.[1];

// Die Panels der Leiste; in jedem die Blöcke in der Reihenfolge, in der sie im DOM stehen (inklusive Verdecken
// an der Stelle seines Slots), so wie blocks.js sie per :scope > .block nach dem Einsetzen der Vorlage sieht.
const panels = src.split(/(?=<div class="panel" id="panel)/).slice(1).map((chunk) => {
  const area = chunk.match(/<div class="panel" id="panel([A-Za-z]+)"/)[1].toLowerCase();
  const entries = [];
  for (const m of chunk.matchAll(/<section class="group block"([^>]*)>|<div class="cover-slot"([^>]*)>/g)) {
    const cover = m[1] === undefined;
    const name = cover ? tplName : m[1].match(/data-block="([^"]+)"/)?.[1];
    entries.push({ cover, name, key: blockKey({ dataset: { block: name } }, area, entries.length) });
  }
  return { area, entries };
});

test('Blöcke: jeder Block trägt einen stabilen data-block, alle Schlüssel sind eindeutig', () => {
  assert.deepEqual(panels.map((p) => p.area), ['mel', 'rhy', 'lied']);
  assert.ok(tplName, 'Die Vorlage tplCover braucht ein data-block');
  const all = [];
  for (const p of panels) {
    assert.ok(p.entries.length > 0, p.area + ': keine Blöcke gefunden');
    for (const e of p.entries) {
      assert.ok(e.name, p.area + ': Block ohne data-block');
      assert.match(e.key, new RegExp('^' + p.area + '-[a-z0-9]+(?:-[a-z0-9]+)*$'), e.key + ': kein sprechender Schlüssel für ' + p.area);
      all.push(e.key);
    }
  }
  assert.equal(new Set(all).size, all.length, 'doppelte Schlüssel: ' + all.join(', '));
  // Der Verdecken-Block der Vorlage bekommt den Bereich davor, nicht zwei gleiche Schlüssel
  assert.ok(all.includes('mel-cover') && all.includes('rhy-cover'), all.join(', '));
});

test('blockKey: data-block gilt statt der Position, ohne data-block bleibt es beim alten Schema', () => {
  assert.equal(blockKey({ dataset: { block: 'mel-notes' } }, 'mel', 9), 'mel-notes'); // Position egal
  assert.equal(blockKey({ dataset: { block: 'lied-cover' } }, 'lied', 0), 'lied-cover');
  assert.equal(blockKey({ dataset: { block: 'cover' } }, 'rhy', 4), 'rhy-cover');
  assert.equal(blockKey({ dataset: {} }, 'mel', 0), 'mel1');
  assert.equal(blockKey({}, 'rhy', 2), 'rhy3');
});

test('Voreinstellung: dieselben Blöcke wie bisher sind offen (je Bereich der zweite)', () => {
  assert.deepEqual(OPEN_START, ['mel-notes', 'rhy-notes', 'lied-notes']);
  assert.deepEqual(panels.map((p) => p.entries[1].key), OPEN_START);
});

test('Einstellungen: alte Schlüssel werden auf die neuen abgebildet und gehen nicht verloren', () => {
  const ALT = {
    mel1: 'mel-setup', mel2: 'mel-notes', mel3: 'mel-symbols', mel4: 'mel-cover',
    rhy1: 'rhy-setup', rhy2: 'rhy-notes', rhy3: 'rhy-symbols', rhy4: 'rhy-counts', rhy5: 'rhy-cover',
    lied1: 'lied-setup', lied2: 'lied-notes', lied3: 'lied-symbols', lied4: 'lied-lyrics', lied5: 'lied-cover'
  };
  const keys = new Set(panels.flatMap((p) => p.entries.map((e) => e.key)));
  for (const [alt, neu] of Object.entries(ALT)) {
    assert.ok(keys.has(neu), alt + ' zeigt auf ' + neu + ', den es im HTML nicht gibt');
    assert.deepEqual(cleanCoreSettings({ open: [alt] }).open, [neu], alt + ' → ' + neu);
  }
  assert.deepEqual(cleanCoreSettings({ open: ['mel2', 'rhy2', 'lied2'] }).open, OPEN_START);
});

test('Einstellungen: alte und neue Schlüssel werden angenommen, Unbrauchbares fällt weg', () => {
  assert.deepEqual(cleanCoreSettings({ open: ['mel-notes', 'rhy-cover'] }).open, ['mel-notes', 'rhy-cover']);
  assert.deepEqual(cleanCoreSettings({ open: ['mel-3'] }).open, ['mel-3']); // neue Form, auch Bereich + Nummer
  assert.deepEqual(cleanCoreSettings({ open: ['mel2', 'mel-notes'] }).open, ['mel-notes']); // einmal, nicht doppelt
  assert.deepEqual(cleanCoreSettings({ open: ['quatsch', 'Mel-notes', '', 7, null] }).open, []);
  assert.deepEqual(cleanCoreSettings({}).open, OPEN_START);
  assert.deepEqual(cleanCoreSettings({ open: [] }).open, []);
});
