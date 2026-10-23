/// <reference path="../pb_data/types.d.ts" />

// Anmelden (Passwort und auth-refresh) nur noch für Konten mit bestätigter E-Mail-Adresse. Die Konten, die es
// bis jetzt gibt, gelten als bestätigt; neue Konten bleiben es nicht, bis sie den Link aus der Mail benutzen.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.authRule = 'verified = true';
  app.save(users);
  // ein UPDATE statt jedes Konto einzeln zu speichern
  app.db().newQuery('UPDATE users SET verified = 1 WHERE verified != 1').execute();
}, (app) => {
  // verified bleibt, wie es ist
  const users = app.findCollectionByNameOrId('users');
  users.authRule = '';
  app.save(users);
});
