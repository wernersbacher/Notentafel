/// <reference path="../pb_data/types.d.ts" />

// GET /api/known: die Daten der bekannten Lieder ({ mel: Tafel, lied: Notenblatt }, siehe known.js). Nur mit der Funktion
// known (Pro); alle anderen, auch Gäste, bekommen 403. Die Lieder liegen nicht unter app/, damit sie nicht öffentlich
// ausgeliefert werden. Die App macht daraus Zeilen und Noten (melodyRows, songOf), sortiert nach Gruppen und merkt sich die
// Antwort, bis sich die Stufe ändert. Mit Cache-Control: private, no-store landet nichts in einem geteilten Cache.
routerAdd('GET', '/api/known', (e) => {
  const { TIERS, tierOf } = require(`${__hooks}/tiers.js`);
  if (!TIERS[tierOf(e.auth)].features.includes('known')) throw new ForbiddenError('Bekannte Lieder gibt es mit Pro.');
  const { MELODIES, SONGS } = require(`${__hooks}/known.js`);
  e.response.header().set('Cache-Control', 'private, no-store');
  return e.json(200, { mel: MELODIES, lied: SONGS });
});
