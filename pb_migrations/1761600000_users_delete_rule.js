/// <reference path="../pb_data/types.d.ts" />

// Ein Konto löscht nur noch POST /api/me/delete (pb_hooks/main.pb.js), und das fragt das Passwort noch einmal ab.
// Ohne Regel (null) kann ein Token allein das Konto nicht mehr über DELETE /api/collections/users/records/:id
// löschen; die Admin-Oberfläche darf es weiterhin.
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.deleteRule = null;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.deleteRule = 'id = @request.auth.id';
  app.save(users);
});
