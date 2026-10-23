// Seite /login/: Anmelden, Registrieren, Passwort vergessen, neues Passwort (?reset=), E-Mail bestätigen (?verify=)
// und neue E-Mail-Adresse bestätigen (?email=). Die Ansicht kommt aus der Adresse; ?next= sagt, wohin es nach dem
// Anmelden geht (nur Pfade auf dieser Seite, siehe safeNext). Gebaut wird mit DOM-Aufrufen (/formular.js), Stile
// stehen in /form.css.
import { mountHeader } from '/shared/header.js';
import { node, button, anchor, note, field, form } from '/formular.js';
import {
  hasBackend, currentUser, onAuthChange, login, register, logout, safeNext,
  requestPasswordReset, confirmPasswordReset, requestVerification, confirmVerification, confirmEmailChange
} from '/shared/auth.js';

const params = new URLSearchParams(location.search);
const next = safeNext(params.get('next'));
const root = document.getElementById('inhalt');

function show(...nodes) {
  root.replaceChildren(...nodes);
  const focus = root.querySelector('input');
  if (focus && !matchMedia('(pointer: coarse)').matches) focus.focus(); // am Tablet öffnet das nur die Tastatur
}
function dropParams() { history.replaceState(null, '', location.pathname + (params.get('next') ? '?next=' + encodeURIComponent(params.get('next')) : '')); }

/* ---------- Ansichten ---------- */
function viewAuth(mode, info) {
  const isRegister = mode === 'register';
  const tabs = node('div', 'reiter');
  tabs.setAttribute('role', 'tablist');
  for (const [m, text] of [['login', 'Anmelden'], ['register', 'Registrieren']]) {
    const t = button(text, '', () => viewAuth(m));
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-selected', String(m === mode));
    tabs.append(t);
  }
  const email = field('E-Mail', { type: 'email', autocomplete: 'email', name: 'email' });
  const pw = field('Passwort', {
    type: 'password', autocomplete: isRegister ? 'new-password' : 'current-password', name: 'password', show: true
  });
  if (isRegister) pw.input.minLength = 8;
  const f = form([email, pw], isRegister ? 'Konto anlegen' : 'Anmelden', async () => {
    const mail = email.input.value.trim(), pass = pw.input.value;
    const err = isRegister ? await register(mail, pass) : await login(mail, pass);
    if (err) return err;
    // Bestätigung ist ein Hinweis, die Anmeldung blockiert sie nicht; schlägt der Versand fehl, geht es trotzdem weiter
    if (isRegister) await requestVerification(mail);
    location.assign(next);
    return '';
  });
  if (isRegister) f.extra.append(node('p', 'klein zeile', 'Mindestens 8 Zeichen. Wir schicken dir eine E-Mail, um die Adresse zu bestätigen.'));
  else f.extra.append(button('Passwort vergessen?', 'textknopf', () => viewForgot(email.input.value)));
  show(node('h1', '', isRegister ? 'Konto anlegen' : 'Willkommen zurück'), ...(info ? [note(info, 'ok')] : []), tabs, f);
}

function viewForgot(prefill) {
  const email = field('E-Mail', { type: 'email', autocomplete: 'email', name: 'email' });
  email.input.value = prefill || '';
  const f = form([email], 'Link schicken', async () => {
    const err = await requestPasswordReset(email.input.value.trim());
    if (err) return err;
    // immer dieselbe Antwort, ob es das Konto gibt oder nicht
    show(node('h1', '', 'Mail unterwegs'),
      note('Wenn es zu dieser E-Mail ein Konto gibt, haben wir einen Link zum Zurücksetzen geschickt. Schau auch im Spam-Ordner nach.', 'ok'),
      button('Zurück zum Anmelden', 'knopf zweit', () => viewAuth('login')));
    return '';
  });
  f.extra.append(button('Zurück zum Anmelden', 'textknopf', () => viewAuth('login')));
  show(node('h1', '', 'Passwort vergessen'), node('p', '', 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.'), f);
}

function viewReset(token) {
  const pw = field('Neues Passwort', { type: 'password', autocomplete: 'new-password', name: 'password', show: true });
  pw.input.minLength = 8;
  const f = form([pw], 'Passwort speichern', async () => {
    const err = await confirmPasswordReset(token, pw.input.value);
    if (err) return err;
    dropParams();
    viewAuth('login', 'Dein Passwort ist geändert. Melde dich jetzt damit an.');
    return '';
  });
  f.extra.append(node('p', 'klein zeile', 'Mindestens 8 Zeichen.'));
  show(node('h1', '', 'Neues Passwort'), f);
}

async function viewVerify(token) {
  show(node('h1', '', 'E-Mail bestätigen'), node('p', 'klein', 'Einen Moment …'));
  const err = await confirmVerification(token);
  const user = currentUser();
  show(node('h1', '', 'E-Mail bestätigen'),
    err ? note(err, 'fehler') : note('Danke, deine E-Mail-Adresse ist bestätigt.', 'ok'),
    user ? anchor(next, 'Weiter', 'knopf') : button('Anmelden', 'knopf', () => { dropParams(); viewAuth('login'); }));
}

// Link aus der Mail zum Ändern der E-Mail-Adresse: zur Bestätigung gehört das Passwort. Danach sind alle Token
// ungültig, also geht es zurück zum Anmelden (confirmEmailChange meldet hier schon ab).
function viewEmailChange(tk) {
  const pw = field('Passwort', { type: 'password', autocomplete: 'current-password', name: 'password', show: true });
  const f = form([pw], 'E-Mail-Adresse ändern', async () => {
    const err = await confirmEmailChange(tk, pw.input.value);
    if (err) return err;
    token.email = null;
    dropParams();
    viewAuth('login', 'Deine E-Mail-Adresse ist geändert. Melde dich jetzt mit der neuen Adresse an.');
    return '';
  });
  show(node('h1', '', 'Neue E-Mail-Adresse'), node('p', '', 'Gib zur Bestätigung dein Passwort ein.'), f);
}

// Schon angemeldet: wer die Seite öffnet, kann weitergehen oder das Konto wechseln
function viewSignedIn() {
  const user = currentUser();
  show(node('h1', '', 'Angemeldet'), node('p', '', 'Angemeldet als ' + user.email + '.'),
    anchor(next, 'Weiter', 'knopf'), button('Abmelden', 'knopf zweit', logout));
}

function viewNoBackend() {
  show(node('h1', '', 'Anmelden'), note('Konten gibt es nur in der online laufenden Musiktafel, nicht in dieser lokalen Ausgabe.'),
    anchor('/app/', 'Weiter zur Musiktafel', 'knopf'));
}

/* ---------- Start ---------- */
await mountHeader(document.getElementById('kopf'));
const token = { reset: params.get('reset'), verify: params.get('verify'), email: params.get('email') };
function start() {
  if (!hasBackend()) return viewNoBackend();
  if (token.reset) return viewReset(token.reset);
  if (token.verify) return viewVerify(token.verify);
  if (token.email) return viewEmailChange(token.email);
  if (currentUser()) return viewSignedIn();
  viewAuth(params.get('mode') === 'register' ? 'register' : 'login');
}
start();
// Abmelden (hier oder in der Kopfleiste) zeigt wieder das Anmeldeformular; Anmelden im Formular geht über location.assign
onAuthChange((user) => {
  if (!hasBackend() || token.reset || token.verify || token.email) return;
  if (!user) viewAuth('login');
});
