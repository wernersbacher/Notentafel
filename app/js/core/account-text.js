// Texte zum Konto als reine Funktionen (ohne DOM), damit sie sich testen lassen: Status im Avatar-Menü und Hinweis
// unter den gespeicherten Liedern. c ist das Ergebnis von cloudInfo() in cloud.js.

// Hinweis, wenn Lieder nur auf diesem Gerät liegen: rejected = über dem Limit (rücken beim Löschen nach),
// invalid = nimmt der Server nicht an (Name zu lang oder Inhalt zu groß, das bleibt so)
export function fullNote(c) {
  const n = c.rejected + c.invalid;
  if (!n) return '';
  const advice = c.rejected ? ' Lösche Lieder, die du nicht mehr brauchst, dann rücken sie nach.' : '';
  if (!c.rejected) {
    return ' ' + (n === 1 ? 'Ein Lied nimmt' : n + ' Lieder nimmt') + ' der Server nicht an (Name zu lang oder ' +
      'Inhalt zu groß) und ' + (n === 1 ? 'es liegt' : 'sie liegen') + ' nur auf diesem Gerät.';
  }
  const over = (c.rejected === 1 ? 'Ein Lied passt' : c.rejected + ' Lieder passen') +
    ' nicht mehr ins Konto (höchstens ' + c.limit + ')';
  if (!c.invalid) {
    return ' ' + over + ' und ' + (n === 1 ? 'es liegt' : 'sie liegen') + ' nur auf diesem Gerät.' + advice;
  }
  // beides zusammen: erst wie viele, dann die beiden Gründe
  return ' ' + n + ' Lieder liegen nur auf diesem Gerät: ' +
    (c.rejected === 1 ? '1 passt' : c.rejected + ' passen') + ' nicht mehr ins Konto (höchstens ' + c.limit + '), ' +
    (c.invalid === 1 ? '1 nimmt' : c.invalid + ' nehmen') + ' der Server nicht an (Name zu lang oder Inhalt zu groß).' + advice;
}

// Status für das Avatar-Menü: { text, warn } oder null (nicht angemeldet oder nichts zu sagen).
// timeOf formatiert den Zeitpunkt des letzten Abgleichs.
export function accountStatus(c, timeOf) {
  if (!c.user) return null;
  const warn = !!c.error || !!c.rejected || !!c.invalid;
  const text = c.error ? c.error + ' Die Lieder bleiben vorgemerkt und gehen beim nächsten Mal mit.'
    : !c.sync ? (c.tier ? 'Mit diesem Konto werden die Lieder nicht abgeglichen.' : '')
    : (c.lastSync ? 'Lieder abgeglichen um ' + timeOf(c.lastSync) + ' Uhr.' : 'Lieder werden abgeglichen …') + fullNote(c);
  return text ? { text: text.trim(), warn } : null;
}

// Hinweis unter den gespeicherten Liedern
export function songsHint(c) {
  return c.user && c.sync ? 'Liegen auch in deinem Konto (' + c.user.email + ') und sind auf allen deinen Geräten da.' + fullNote(c)
    : 'Liegen nur auf diesem Gerät. Mit einem Konto (oben rechts) sind sie auf allen deinen Geräten da.';
}
