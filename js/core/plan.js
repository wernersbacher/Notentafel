// Hilfen für Ablaufpläne des Players (siehe player.js), ohne Klang und ohne DOM.

// Zählschlag einer Taktart für Einzähler und Metronom: Länge in Vierteln und Schläge pro Takt.
// 2/2 in Halben, 6/8 in Achteln (wie die Zählzeiten), sonst in Vierteln; ohne Taktart vier Viertel.
export function beatsOf(meter) {
  if (meter === '2/2') return { beat: 2, perBar: 2 };
  if (meter === '6/8') return { beat: 0.5, perBar: 6 };
  const n = parseInt(meter, 10);
  return { beat: 1, perBar: n > 0 ? n : 4 };
}

// Ablaufplan ab Eintrag k: alles davor fällt weg, die Zeiten beginnen bei 0 (der Takt läuft dabei richtig weiter).
// Ab der Markierung abspielen: Klingt ab k nichts mehr, bleibt der ganze Plan.
export function startAt(plan, k) {
  if (!plan || k <= 0 || !plan.items.slice(k).some((s) => s.sound)) return plan;
  const shift = plan.items[k].t;
  return {
    ...plan,
    items: plan.items.slice(k).map((s) => ({ ...s, t: s.t - shift })),
    end: plan.end - shift,
    barStart: (plan.barStart || 0) - shift
  };
}

// Ablaufplan bis vor den ersten Eintrag, für den hidden(s) gilt (z. B. was unter dem Tuch liegt). Stille Einträge am
// Ende fallen weg, end ist das Ende des letzten Tons davor. Ist nichts verdeckt, bleibt der Plan, wie er ist.
export function cutAt(plan, hidden) {
  const k = plan.items.findIndex(hidden);
  if (k < 0) return plan;
  const items = plan.items.slice(0, k);
  while (items.length && !items[items.length - 1].sound) items.pop();
  const last = items[items.length - 1];
  return { ...plan, items, end: last ? last.t + last.len : 0 };
}
