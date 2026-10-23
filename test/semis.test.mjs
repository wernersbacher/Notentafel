import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toneColor, TONE_COLORS, SEMI_COLORS } from '../app/js/core/colors.js';
import { songToMelody } from '../app/js/lied/model.js';
import { rowsToSong } from '../app/js/tafel/model.js';

test('toneColor: Stammtöne und Halbtöne nach dem klingenden Ton', () => {
  assert.equal(toneColor(0), TONE_COLORS.C);
  assert.equal(toneColor(3, 1), SEMI_COLORS.Fis);
  assert.equal(toneColor(6, -1), SEMI_COLORS.B);
  assert.equal(toneColor(1, -1), SEMI_COLORS.Cis); // Des wie Cis
  assert.equal(toneColor(5, -1), SEMI_COLORS.Gis); // As wie Gis
  assert.equal(toneColor(0, -1), TONE_COLORS.H); // Ces klingt wie H
  assert.equal(toneColor(6, 1), TONE_COLORS.C); // His klingt wie C
});

test('songToMelody: alle Halbtöne werden Farbnoten (auch mit ♭ geschrieben)', () => {
  const n = (p, acc) => ({ p, v: 4, acc });
  const s = { meter: '', pickup: 0, key: 0, ev: [n('c1', 1), n('e1', -1), n('a1', -1), n('a1', 1), n('d2', -1), n('d2', 1), n('f2', 1)] };
  const m = songToMelody(s, true);
  assert.deepEqual(m.rows.flat().map((c) => c.n || c.k), ['Cis', 'Dis', 'Gis', 'B', 'Cis+', 'Dis+', 'r']);
  assert.equal(m.skipped, 1); // fis'' gibt es bei den Farbnoten nicht
});

test('rowsToSong: neue Halbtöne werden Noten mit Kreuz', () => {
  const song = rowsToSong([[{ n: 'Cis', h: '', d: 1 }, { n: 'Gis', h: '', d: 1 }, { n: 'Dis+', h: '', d: 1 }]]);
  assert.deepEqual(song.ev.map((e) => [e.p, e.acc]), [['c1', 1], ['g1', 1], ['d2', 1]]);
});
