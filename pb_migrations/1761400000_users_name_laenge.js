/// <reference path="../pb_data/types.d.ts" />

// Das Feld name gibt es an den Nutzern von PocketBase schon (Text, bis 255 Zeichen). Der Anzeigename steht im
// Kopf und auf der Kontoseite und bleibt kurz: höchstens 60 Zeichen. Wer ihn ändern darf, regelt updateRule
// (nur der Nutzer selbst, pro_until bleibt gesperrt, siehe 1761000000_users_pro_until.js).
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.getByName('name').max = 60;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.getByName('name').max = 255;
  app.save(users);
});
