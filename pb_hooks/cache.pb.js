/// <reference path="../pb_data/types.d.ts" />

// Dateien der App: Der Browser fragt jedes Mal nach, unveränderte Dateien kommen als 304 zurück.
// Neue Versionen erzwingen ohnehin die ?v=-Adressen aus npm run version:set; ohne das hier bliebe aber index.html hängen.
routerUse((e) => {
  const p = e.request.url.path;
  if (!p.startsWith('/api/') && !p.startsWith('/_/')) e.response.header().set('Cache-Control', 'no-cache');
  return e.next();
});
