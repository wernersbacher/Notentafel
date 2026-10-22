/// <reference path="../pb_data/types.d.ts" />

// Anmeldung bleibt 30 Tage gültig (Standard waren 5). Die App erneuert das Token bei jedem Start, wer sie
// regelmäßig öffnet, bleibt also angemeldet; ein Tablet über die Ferien liegen lassen geht auch.
// Schon ausgestellte Tokens behalten ihre alte Laufzeit.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.authToken.duration = 30 * 24 * 3600;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.authToken.duration = 5 * 24 * 3600;
  app.save(users);
});
