// Texte für den Reiter Abo auf /account/ als reine Funktion (ohne DOM), damit sie in node testbar sind.
// me ist die Antwort von /api/me: { tier, features, limits, user: { pro_until }, beta_end }.
const UMFANG = { lied: 'Notenblatt', cloud: 'Lieder auf allen Geräten' };

// Zeitpunkt aus PocketBase ('2027-06-30 22:00:00.000Z') oder null
const zeit = (s) => { const d = s ? new Date(String(s).replace(' ', 'T')) : null; return d && !isNaN(d) ? d : null; };
// Letzter Tag in Ortszeit: pro_until ist der erste Moment ohne Pro, darum eine Millisekunde davor
const tag = (d) => new Date(d.getTime() - 1).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

// -> { stufe, umfang[], bis, beta, hinweis }; bis: Datum oder '', beta: Beta-Satz oder '', hinweis: Text bei Stufe Konto oder ''
export function aboText(me, now = new Date()) {
  const pro = me.tier === 'pro';
  const until = zeit(me.user && me.user.pro_until);
  const umfang = (me.features || []).filter((f) => UMFANG[f]).map((f) => UMFANG[f]);
  const songs = me.limits && me.limits.songs;
  if (songs) umfang.push('bis zu ' + songs + ' Lieder im Konto');
  const r = { stufe: pro ? 'Pro' : 'Konto', umfang, bis: '', beta: '', hinweis: '' };
  if (pro) {
    if (until) r.bis = tag(until);
    const end = zeit(me.beta_end);
    if (until && end && until.getTime() === end.getTime()) {
      r.bis += ' (Beta, kostenlos)';
      r.beta = 'Pro ist in der Beta kostenlos. Was danach gilt, sagen wir dir rechtzeitig vorher.';
    }
    return r;
  }
  const fehlt = 'Notenblatt und Lieder auf allen Geräten gehören zu Pro und sind mit dem Konto nicht dabei.';
  r.hinweis = until && until <= now ? 'Dein Pro ist am ' + tag(until) + ' abgelaufen. ' + fehlt : fehlt;
  return r;
}
