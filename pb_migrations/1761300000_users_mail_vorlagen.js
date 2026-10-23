/// <reference path="../pb_data/types.d.ts" />

// Mails an Nutzer (E-Mail bestätigen, Passwort zurücksetzen) auf Deutsch, mit Links auf die Anmeldeseite der
// Musiktafel: {APP_URL}/login/?verify=… und ?reset=…. APP_URL und der Absendername kommen aus den Einstellungen
// des Servers (Application URL, Sender name), hier steht beides nicht fest.
const button = (href, text) =>
  '<p><a class="btn" href="' + href + '" target="_blank" rel="noopener">' + text + '</a></p>';

migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  users.verificationTemplate.subject = 'Bitte bestätige deine E-Mail-Adresse für {APP_NAME}';
  users.verificationTemplate.body =
    '<p>Hallo,</p>' +
    '<p>schön, dass du {APP_NAME} nutzt. Bitte bestätige deine E-Mail-Adresse mit einem Klick auf diesen Knopf:</p>' +
    button('{APP_URL}/login/?verify={TOKEN}', 'E-Mail bestätigen') +
    '<p>Falls du dich nicht angemeldet hast, kannst du diese Mail einfach löschen.</p>' +
    '<p>Viele Grüße<br>{APP_NAME}</p>';
  users.resetPasswordTemplate.subject = 'Neues Passwort für {APP_NAME}';
  users.resetPasswordTemplate.body =
    '<p>Hallo,</p>' +
    '<p>du hast ein neues Passwort für {APP_NAME} angefordert. Du kannst es über diesen Knopf festlegen:</p>' +
    button('{APP_URL}/login/?reset={TOKEN}', 'Passwort zurücksetzen') +
    '<p>Falls du nichts angefordert hast, kannst du diese Mail einfach löschen, dein Passwort bleibt dann, wie es ist.</p>' +
    '<p>Viele Grüße<br>{APP_NAME}</p>';
  app.save(users);
}, (app) => {
  // zurück auf die Standardvorlagen von PocketBase
  const users = app.findCollectionByNameOrId('users');
  users.verificationTemplate.subject = 'Verify your {APP_NAME} email';
  users.verificationTemplate.body =
    '<p>Hello,</p>' +
    '<p>Thank you for joining us at {APP_NAME}.</p>' +
    '<p>Click on the button below to verify your email address.</p>' +
    '<p><a class="btn" href="{APP_URL}/_/#/auth/confirm-verification/{TOKEN}" target="_blank" rel="noopener">Verify</a></p>' +
    '<p>Thanks,<br/>{APP_NAME} team</p>';
  users.resetPasswordTemplate.subject = 'Reset your {APP_NAME} password';
  users.resetPasswordTemplate.body =
    '<p>Hello,</p>' +
    '<p>Click on the button below to reset your password.</p>' +
    '<p><a class="btn" href="{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}" target="_blank" rel="noopener">Reset password</a></p>' +
    '<p><i>If you didn\'t ask to reset your password, you can ignore this email.</i></p>' +
    '<p>Thanks,<br/>{APP_NAME} team</p>';
  app.save(users);
});
