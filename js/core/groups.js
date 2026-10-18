// Gruppen der mitgelieferten Lieder (ohne DOM, damit auch die Tests es laden können).
export const SONG_GROUPS = ['Kinderlieder', 'Frühling', 'Herbst und Sankt Martin', 'Weihnachten', 'Feste und mehr'];
export const byGroup = (list) => list.map((x, i) => [x, i])
  .sort((a, b) => (SONG_GROUPS.indexOf(a[0].group) - SONG_GROUPS.indexOf(b[0].group)) || a[1] - b[1]).map(([x]) => x);
