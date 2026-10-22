// Das Gerüst fürs Ziehen mit dem Finger, für Tafel und Notenblatt gleich: Aufnahme des Zeigers am Rahmen, eine
// Streckenschwelle, die aus dem Tipp ein Ziehen macht, und die Freigabe beim Loslassen oder Abbruch.
// start(e) liefert den Stand des Bereichs oder null, wenn hier kein Ziehen beginnt. move(e, d, dragging) wird ab dem
// ersten Bewegen gerufen; dragging sagt, ob die Schwelle schon überschritten ist. end(e, d, cancel) schließt ab
// (cancel: pointercancel). scroll(d) sagt, ob diese Geste das Scrollen sperren soll – das entscheidet der Bereich.
export function pointerDrag(root, { threshold, start, move, end, scroll }) {
  let drag = null;
  const onDown = (e) => {
    if (e.button > 0 || drag) return; // rechte Taste und ein zweiter Finger stören die laufende Geste nicht
    const d = start(e);
    if (!d) return;
    Object.assign(d, { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false });
    drag = d;
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* Zeiger schon weg */ }
  };
  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // Erst ab der Schwelle wird gezogen; darunter bleibt der Finger ein Tipp
    if (!drag.dragging && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) >= threshold) drag.dragging = true;
    move(e, drag, drag.dragging);
  };
  const finish = (e, cancel) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
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
