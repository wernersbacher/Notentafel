// Farben der Stammtöne, gemeinsam für Melodie (bunte Punkte) und Lied (farbige Notenköpfe).
// Die Schrift ist auf allen Tönen schwarz; jede Farbe muss dafür hell genug sein (Kontrast ≥ 4,5).
export const TONE_COLORS = {
  C: '#e5383b', D: '#f58a1f', E: '#f7d11e', F: '#9bd74a', G: '#1e8449', A: '#9b6fd1', H: '#ec4899'
};
// Halbtöne wie bei den Boomwhackers: jeweils zwischen den Farben der Nachbartöne
// (Cis rotorange, Dis gelborange, Fis mittelgrün, Gis blau, B/Ais violett)
export const SEMI_COLORS = { Cis: '#f4622a', Dis: '#f9ae1f', Fis: '#4caf50', Gis: '#3b82f6', B: '#b65fcf' };
// Farbe nach Stufe (0 = c … 6 = h) und Vorzeichen (1 ♯, −1 ♭, sonst keins), nach dem klingenden Ton: Des wie Cis, Ces wie H
const BY_SEMITONE = [TONE_COLORS.C, SEMI_COLORS.Cis, TONE_COLORS.D, SEMI_COLORS.Dis, TONE_COLORS.E, TONE_COLORS.F,
  SEMI_COLORS.Fis, TONE_COLORS.G, SEMI_COLORS.Gis, TONE_COLORS.A, SEMI_COLORS.B, TONE_COLORS.H];
export const toneColor = (step, acc) => BY_SEMITONE[(([0, 2, 4, 5, 7, 9, 11][step] + (acc || 0)) % 12 + 12) % 12];
