// Das Gerüst fürs Ziehen mit dem Finger, für Tafel und Notenblatt gleich: Aufnahme des Zeigers am Rahmen, eine
// Streckenschwelle, die aus dem Tipp ein Ziehen macht, und die Freigabe beim Loslassen oder Abbruch.
// start(e) liefert den Stand des Bereichs oder null, wenn hier kein Ziehen beginnt. move(e, d, dragging) wird ab dem
// ersten Bewegen gerufen; dragging sagt, ob die Schwelle schon überschritten ist. end(e, d, cancel) schließt ab
// (cancel: pointercancel). scroll(d) sagt, ob diese Geste das Scrollen sperren soll – das entscheidet der Bereich.
// Gedrückt halten: Trägt der Stand von start() hold: true und bleibt der Finger holdMs lang unter der Schwelle, ruft
// hold(d) auf. Liefert es true, ist die Geste „gehalten“ (d.held): der Zeiger gehört nun dem Bereich (aufgenommen, das
// Scrollen gesperrt), jede weitere Bewegung geht mit dragging = true an move(), und end() schließt wie sonst ab.
// nocapture: true im Stand lässt den Zeiger zunächst los – so bleibt ein normaler Tipp ein Tipp (Klick auf dem Ziel, das
// Wischen scrollt weiter); aufgenommen wird er erst beim Halten.
export function pointerDrag(root, { threshold, start, move, end, scroll, hold, holdMs = 450 }) {
  let drag = null;
  const capture = (id) => { try { root.setPointerCapture(id); } catch (_) { /* Zeiger schon weg */ } };
  const onDown = (e) => {
    if (e.button > 0 || drag) return; // rechte Taste und ein zweiter Finger stören die laufende Geste nicht
    const d = start(e);
    if (!d) return;
    Object.assign(d, { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false, held: false });
    drag = d;
    if (!d.nocapture) capture(e.pointerId);
    if (hold && d.hold) {
      d.timer = setTimeout(() => {
        d.timer = null;
        if (drag !== d || d.dragging || !hold(d)) return;
        d.held = true;
        if (d.nocapture) capture(d.id);
      }, holdMs);
    }
  };
  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // Erst ab der Schwelle wird gezogen; darunter bleibt der Finger ein Tipp
    if (!drag.dragging && !drag.held && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) >= threshold) {
      drag.dragging = true;
      if (drag.timer) { clearTimeout(drag.timer); drag.timer = null; } // bewegt: kein Halten mehr
    }
    move(e, drag, drag.dragging || drag.held);
  };
  const finish = (e, cancel) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.timer) clearTimeout(d.timer);
    try { root.releasePointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
    end(e, d, cancel);
  };
  // Für Browser, die touch-action nicht beachten: Scrollen nur sperren, wenn der Bereich die Geste beansprucht
  root.addEventListener('touchmove', (e) => { if (drag && scroll(drag)) e.preventDefault(); }, { passive: false });
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', (e) => finish(e, false));
  root.addEventListener('pointercancel', (e) => finish(e, true));
  root.addEventListener('contextmenu', (e) => e.preventDefault());
}
