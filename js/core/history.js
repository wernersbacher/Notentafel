// Rückgängig-Verlauf: ein Stapel von Ständen als JSON. Was ein Stand enthält, bestimmt der Bereich.

// So viele Schritte nimmt „Rückgängig“ zurück
export const HISTORY = 60;

export function pushState(stack, state) {
  stack.push(JSON.stringify(state));
  if (stack.length > HISTORY) stack.shift();
}
// Der letzte gemerkte Stand oder null
export function popState(stack) {
  const s = stack.pop();
  return s ? JSON.parse(s) : null;
}
