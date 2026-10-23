import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { avatarFarbe, AVATAR_FARBEN } = await import('../shared/avatar.js');

test('avatarFarbe: stabil, 1 bis 8, Name geht vor E-Mail', () => {
  const u = { name: 'Anna Beispiel', email: 'a@b.de' };
  assert.equal(avatarFarbe(u), avatarFarbe({ ...u }));
  assert.equal(avatarFarbe(u), avatarFarbe({ name: ' anna beispiel ', email: 'ganz@anders.de' }));
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const c = avatarFarbe({ email: 'nutzer' + i + '@b.de' });
    assert.ok(Number.isInteger(c) && c >= 1 && c <= AVATAR_FARBEN);
    seen.add(c);
  }
  assert.equal(seen.size, AVATAR_FARBEN, 'alle acht Farben kommen vor');
  assert.equal(avatarFarbe(null), 1);
});
