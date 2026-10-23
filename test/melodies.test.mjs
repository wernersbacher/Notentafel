import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MELODIES, melodyRows } from '../app/js/tafel/melodies.js';
import { cleanRows, packLines, dur } from '../app/js/tafel/model.js';
import { meterInfo } from '../app/js/tafel/theory.js';

for (const m of MELODIES) {
  test(`${m.name}: übersteht cleanRows unverändert`, () => {
    const rs = melodyRows(m);
    const clean = cleanRows(JSON.parse(JSON.stringify(rs)), packLines(rs));
    assert.ok(clean, 'cleanRows lehnt die Zeilen ab');
    assert.deepEqual(clean.map((row) => [...row]), rs.map((row) => [...row]));
    assert.equal(clean[0].meter, m.meter);
    assert.ok(clean.slice(1).every((row) => row.meter === ''));
  });

  test(`${m.name}: jede Zeile füllt ganze Takte`, () => {
    const { len } = meterInfo(m.meter);
    melodyRows(m).forEach((row, r) => {
      const sum = row.reduce((s, c) => s + dur(c), 0);
      assert.equal(sum % len, 0, `Zeile ${r + 1}: ${sum} Schläge`);
    });
  });
}

test('Farbnoten und Notenblatt bieten dieselben Lieder in derselben Reihenfolge', async () => {
  const { SONGS } = await import('../app/js/lied/songs.js');
  assert.deepEqual(MELODIES.map((m) => [m.name, m.group]), SONGS.map((s) => [s.name, s.group]));
});

test('Jedes bekannte Lied bringt ein Tempo mit, das der Regler einstellen kann', async () => {
  const { SONGS } = await import('../app/js/lied/songs.js');
  const { TEMPO } = await import('../app/js/core/settings.js');
  for (const s of [...MELODIES, ...SONGS]) {
    assert.ok(s.tempo >= TEMPO.min && s.tempo <= TEMPO.max && s.tempo % 5 === 0, `${s.name}: ${s.tempo}`);
  }
  const t = (name) => SONGS.find((s) => s.name === name).tempo;
  assert.ok(t('Stille Nacht') < t('Summ, summ, summ'));
});
