/// <reference path="../pb_data/types.d.ts" />

// Mail zum Ändern der E-Mail-Adresse auf Deutsch. Sie geht an die neue Adresse; der Link führt auf die
// Anmeldeseite ({APP_URL}/login/?email=…), dort gibt man das Passwort ein und bestätigt die Änderung.
const button = (href, text) =>
  '<p><a class="btn" href="' + href + '" target="_blank" rel="noopener">' + text + '</a></p>';

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.confirmEmailChangeTemplate.subject = 'Neue E-Mail-Adresse für {APP_NAME} bestätigen';
  users.confirmEmailChangeTemplate.body =
    '<p>Hallo,</p>' +
    '<p>für dein Konto bei {APP_NAME} wurde diese Adresse als neue E-Mail-Adresse angegeben. Bestätige die Änderung mit einem Klick auf diesen Knopf und gib dort dein Passwort ein:</p>' +
    button('{APP_URL}/login/?email={TOKEN}', 'E-Mail-Adresse ändern') +
    '<p>Falls du das nicht warst, kannst du diese Mail einfach löschen, deine Adresse bleibt dann, wie sie ist.</p>' +
    '<p>Viele Grüße<br>{APP_NAME}</p>';
  app.save(users);
}, (app) => {
  // zurück auf die Standardvorlage von PocketBase
  const users = app.findCollectionByNameOrId('users');
  users.confirmEmailChangeTemplate.subject = 'Confirm your {APP_NAME} new email address';
  users.confirmEmailChangeTemplate.body =
    '<p>Hello,</p>' +
    '<p>Click on the button below to confirm your new email address.</p>' +
    '<p><a class="btn" href="{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}" target="_blank" rel="noopener">Confirm new email</a></p>' +
    '<p><i>If you didn\'t ask to change your email address, you can ignore this email.</i></p>' +
    '<p>Thanks,<br/>{APP_NAME} team</p>';
  app.save(users);
});
