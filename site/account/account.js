// Seite /account/: Reiter Profil, Sicherheit und Daten, ansteuerbar per Hash (#profil, #sicherheit, #daten). Ohne Anmeldung
// geht es auf /login/?next=/account/. Breit stehen die Reiter links, schmal als Umschalter oben (account.css).
import { mountHeader } from '/shared/header.js';
import { node, button, anchor, note, field, form } from '/formular.js';
import { avatar } from '/shared/avatar.js';
import {
  hasBackend, currentUser, onAuthChange, updateProfile, changePassword, requestEmailChange, logoutAll, downloadExport, deleteAccount
} from '/shared/auth.js';

const root = document.getElementById('inhalt');
const LOGIN = '/login/?next=' + encodeURIComponent('/account/');
let leaving = LOGIN; // wohin es nach dem Abmelden geht
let gone = false; // Konto gerade gelöscht: statt der Anmeldung die Abschiedsseite zeigen

/* ---------- Reiter ---------- */
function tabProfil() {
  const user = currentUser();
  const bild = node('div');
  const name = field('Anzeigename', { autocomplete: 'name', name: 'name', required: false });
  name.input.maxLength = 60;
  name.input.value = user.name || '';
  const draw = () => bild.replaceChildren(avatar(currentUser(), 72));
  draw();
  const f = form([name], 'Speichern', async () => {
    const err = await updateProfile({ name: name.input.value });
    if (err) return err;
    draw();
    f.msg.replaceChildren(note('Gespeichert.', 'ok'));
    return '';
  });
  f.extra.append(node('p', 'klein zeile', 'Der Name steht oben rechts; ohne Namen zeigen wir den Anfang deiner E-Mail.'));
  const wer = node('div');
  wer.append(node('p', 'klein', 'E-Mail'), node('p', 'konto-mail', user.email));
  const kopf = node('div', 'konto-kopf');
  kopf.append(bild, wer);
  return [kopf, f];
}

function abschnittPasswort() {
  const alt = field('Altes Passwort', { type: 'password', autocomplete: 'current-password', name: 'old', show: true });
  const neu = field('Neues Passwort', { type: 'password', autocomplete: 'new-password', name: 'password', show: true });
  neu.input.minLength = 8;
  const f = form([alt, neu], 'Passwort ändern', async () => {
    const err = await changePassword(alt.input.value, neu.input.value);
    if (err) return err;
    alt.input.value = neu.input.value = '';
    f.msg.replaceChildren(note('Dein Passwort ist geändert. Auf allen anderen Geräten musst du dich neu anmelden.', 'ok'));
    return '';
  });
  f.extra.append(node('p', 'klein zeile', 'Mindestens 8 Zeichen.'));
  const s = node('section');
  s.append(node('h2', '', 'Passwort ändern'), f);
  return s;
}

function abschnittEmail() {
  const mail = field('Neue E-Mail-Adresse', { type: 'email', autocomplete: 'email', name: 'email' });
  const f = form([mail], 'Link schicken', async () => {
    const adresse = mail.input.value.trim();
    const err = await requestEmailChange(adresse);
    if (err) return err;
    mail.input.value = '';
    f.msg.replaceChildren(note('Wir haben einen Link an ' + adresse + ' geschickt. Die Adresse ändert sich erst, wenn du ihn öffnest und dein Passwort eingibst.', 'ok'));
    return '';
  });
  const s = node('section');
  s.append(node('h2', '', 'E-Mail-Adresse ändern'), node('p', 'klein', 'Jetzt: ' + currentUser().email), f);
  return s;
}

function abschnittAbmelden() {
  const s = node('section');
  const msg = node('div');
  const reihe = node('div', 'reihe');
  const erst = button('Von allen Geräten abmelden', 'knopf zweit', () => {
    // zweiter Tipp zur Bestätigung, damit es nicht aus Versehen passiert
    const ja = button('Ja, überall abmelden', 'knopf gefahr', async () => {
      ja.disabled = true;
      leaving = '/login/';
      const err = await logoutAll(); // bei Erfolg meldet auth.js ab und die Seite wechselt
      if (err) { leaving = LOGIN; ja.disabled = false; msg.replaceChildren(note(err, 'fehler')); }
    });
    reihe.replaceChildren(ja, button('Abbrechen', 'knopf zweit', () => reihe.replaceChildren(erst)));
  });
  reihe.append(erst);
  s.append(node('h2', '', 'Von allen Geräten abmelden'),
    node('p', 'klein', 'Meldet dich überall ab, auch hier, zum Beispiel wenn ein Gerät verloren ging. Danach meldest du dich neu an.'), msg, reihe);
  return s;
}
const tabSicherheit = () => [abschnittPasswort(), abschnittEmail(), abschnittAbmelden()];

/* ---------- Daten ---------- */
function abschnittHerunterladen() {
  const s = node('section');
  const msg = node('div');
  const los = button('Daten herunterladen', 'knopf', async () => {
    los.disabled = true;
    msg.replaceChildren();
    const err = await downloadExport();
    los.disabled = false;
    msg.replaceChildren(err ? note(err, 'fehler') : note('Die Datei wurde heruntergeladen.', 'ok'));
  });
  s.append(node('h2', '', 'Daten herunterladen'),
    node('p', 'klein', 'Eine Datei mit deinem Profil und allen Liedern in deinem Konto, auch denen im Papierkorb. ' +
      'Die Lieder lassen sich in der Musiktafel unter Lieder wieder importieren; was im Papierkorb lag, kommt dabei nicht zurück.'), msg, los);
  return s;
}

function abschnittLoeschen() {
  const s = node('section');
  const msg = node('div');
  const pw = field('Passwort', { type: 'password', autocomplete: 'current-password', name: 'password', show: true });
  const reihe = node('div', 'reihe');
  const erst = button('Konto löschen', 'knopf gefahr', () => {
    msg.replaceChildren();
    if (!pw.input.value) { msg.replaceChildren(note('Bitte gib zur Sicherheit dein Passwort ein.', 'fehler')); pw.input.focus(); return; }
    // zweiter Tipp zur Bestätigung, damit es nicht aus Versehen passiert
    const ja = button('Ja, Konto endgültig löschen', 'knopf gefahr', async () => {
      ja.disabled = true;
      gone = true;
      const err = await deleteAccount(pw.input.value); // bei Erfolg meldet auth.js ab und die Seite zeigt die Abschiedsseite
      if (err) { gone = false; ja.disabled = false; reihe.replaceChildren(erst); msg.replaceChildren(note(err, 'fehler')); }
    });
    reihe.replaceChildren(ja, button('Abbrechen', 'knopf zweit', () => reihe.replaceChildren(erst)));
  });
  reihe.append(erst);
  const liste = node('ul', 'klein');
  liste.append(node('li', '', 'Dein Konto und deine E-Mail-Adresse.'),
    node('li', '', 'Alle Lieder in deinem Konto, auch die im Papierkorb.'),
    node('li', '', 'Das geschieht sofort und endgültig, wir können nichts wiederherstellen.'));
  const bleibt = node('p', 'klein', 'Was bleibt: die Lieder auf diesem Gerät, in der Musiktafel im Browser gespeichert.');
  const erstDaten = button('Erst Daten herunterladen', 'textknopf', async () => {
    erstDaten.disabled = true;
    const err = await downloadExport();
    erstDaten.disabled = false;
    msg.replaceChildren(err ? note(err, 'fehler') : note('Die Datei wurde heruntergeladen.', 'ok'));
  });
  const davor = node('p', 'zeile');
  davor.append(erstDaten);
  // Als Formular, damit der Passwort-Manager das Feld einordnet und Enter den ersten Tipp auslöst
  const f = node('form');
  f.addEventListener('submit', (e) => { e.preventDefault(); if (reihe.firstChild === erst) erst.click(); });
  f.append(msg, pw.wrap, reihe);
  s.append(node('h2', '', 'Konto löschen'), node('p', 'klein', 'Das verschwindet:'), liste, bleibt, davor, f);
  return s;
}
const tabDaten = () => [abschnittHerunterladen(), abschnittLoeschen()];

// Später kommt hier noch das Abo dazu (5z1.9): Eintrag mit id, Text und Aufbau genügt
const TABS = [
  { id: 'profil', text: 'Profil', build: tabProfil },
  { id: 'sicherheit', text: 'Sicherheit', build: tabSicherheit },
  { id: 'daten', text: 'Daten', build: tabDaten }
];

// Nach dem Löschen: das Konto ist weg und man ist abgemeldet
function abschied() {
  const reihe = node('div', 'reihe');
  reihe.append(anchor('/', 'Zur Startseite', 'knopf zweit'), anchor('/app/', 'Weiter zur Musiktafel', 'knopf'));
  const k = node('div', 'konto-blatt');
  k.append(node('h2', '', 'Dein Konto ist gelöscht'),
    node('p', '', 'Dein Konto und alle Lieder darin sind vom Server entfernt. Die Lieder auf diesem Gerät sind noch da.'), reihe);
  root.replaceChildren(node('h1', '', 'Mein Konto'), k);
}

/* ---------- Seite ---------- */
function render() {
  const aktiv = TABS.find((t) => '#' + t.id === location.hash) || TABS[0];
  const nav = node('div', 'konto-reiter');
  nav.setAttribute('role', 'tablist');
  const blatt = node('div', 'konto-blatt');
  blatt.setAttribute('role', 'tabpanel');
  for (const t of TABS) {
    const b = button(t.text, '', () => { location.hash = t.id; });
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(t === aktiv));
    nav.append(b);
  }
  blatt.append(...[].concat(aktiv.build()));
  const raster = node('div', 'konto-raster');
  raster.append(nav, blatt);
  root.replaceChildren(node('h1', '', 'Mein Konto'), raster);
}

await mountHeader(document.getElementById('kopf'));
if (!hasBackend()) {
  root.replaceChildren(node('h1', '', 'Mein Konto'), note('Konten gibt es nur in der online laufenden Musiktafel, nicht in dieser lokalen Ausgabe.'),
    anchor('/app/', 'Weiter zur Musiktafel', 'knopf'));
} else if (!currentUser()) {
  location.replace(LOGIN);
} else {
  render();
  window.addEventListener('hashchange', () => { if (!gone) render(); });
  // Abmelden (hier, in der Kopfleiste, in einem anderen Tab oder durch ein abgelaufenes Token) führt zur Anmeldung
  onAuthChange((user) => { if (!user) { if (gone) abschied(); else location.replace(leaving); } });
}
