/// <reference path="../pb_data/types.d.ts" />

// Feld pro_until an den Nutzern. Nur der Server (Webhook, Admin) darf es setzen:
// Anlegen und Ändern über die API sind gesperrt, sobald pro_until im Request steht.
const guard = '@request.body.pro_until:isset = false';

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.add(new DateField({ name: 'pro_until' }));
  users.createRule = guard;
  users.updateRule = `id = @request.auth.id && ${guard}`;
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId('users');
  users.fields.removeByName('pro_until');
  users.createRule = '';
  users.updateRule = 'id = @request.auth.id';
  app.save(users);
});
