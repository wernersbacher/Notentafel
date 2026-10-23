// Bestandsnutzer erkennen: Wer die App schon benutzt hat, hat Daten unter „notentafel.…“ im Browser (Tafel, Lieder,
// Einstellungen). Anmelde-Daten (auth, konto) zählen nicht, die gibt es auch ohne Benutzung. Kein Auto-Redirect,
// nur der Text der Hero-Knöpfe wechselt.
(function () {
  var benutzt = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i) || '';
      if (k.indexOf('notentafel.') === 0 && !/^notentafel\.(auth|konto)\./.test(k)) { benutzt = true; break; }
    }
  } catch (e) { /* Speicher gesperrt: wie neu */ }
  if (!benutzt) return;
  document.querySelectorAll('[data-weiter]').forEach(function (a) { a.textContent = 'Weiter zur Musiktafel'; });
})();
