// Export als MusicXML 4.0 (partwise), dem Austauschformat der Notenprogramme (MuseScore, Sibelius, Dorico …).
// Alles hier ist rein: aus dem Lied wird ein XML-Text.
import { isNote, ticks, parsePitch, drawnBars, shownAccidentals, tiedFrom, accOf, QUARTER } from './model.js';
import { beamGroups } from './layout.js';

const STEP = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const TYPE = { 1: 'whole', 2: 'half', 4: 'quarter', 8: 'eighth', 16: '16th' };
const ACC = { 1: 'sharp', [-1]: 'flat', 0: 'natural' };

const xmlEsc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

// Balken pro Ereignis: { 1: 'begin' | 'continue' | 'end', 2: … } (2 = zweiter Balken der Sechzehntel)
function beamsOf(song, bars, brks) {
  const ev = song.ev, out = ev.map(() => null);
  beamGroups(song, bars, brks).forEach((g) => {
    g.forEach((i, k) => {
      const b = { 1: k === 0 ? 'begin' : k === g.length - 1 ? 'end' : 'continue' };
      if (ev[i].v === 16) {
        const prev = k > 0 && ev[g[k - 1]].v === 16, next = k < g.length - 1 && ev[g[k + 1]].v === 16;
        b[2] = prev && next ? 'continue' : next ? 'begin' : prev ? 'end' : k === 0 ? 'forward hook' : 'backward hook';
      }
      out[i] = b;
    });
  });
  return out;
}

// Silbe: „-“ am Ende verbindet mit der nächsten (begin/middle), sonst single/end
function lyricXML(e, prevLy) {
  if (!e.ly) return '';
  const joins = e.ly.endsWith('-') && e.ly.length > 1, joined = !!(prevLy && prevLy.endsWith('-'));
  const syl = joins ? (joined ? 'middle' : 'begin') : joined ? 'end' : 'single';
  return '<lyric number="1"><syllabic>' + syl + '</syllabic><text>' + xmlEsc(joins ? e.ly.slice(0, -1) : e.ly) + '</text></lyric>';
}
function noteXML(e, key, shown, tieStart, tieStop, beam, prevLy) {
  let s = '<note>';
  if (isNote(e)) {
    const { step, oct } = parsePitch(e.p), alter = accOf(e, key);
    s += '<pitch><step>' + STEP[step] + '</step>' + (alter ? '<alter>' + alter + '</alter>' : '') + '<octave>' + (oct + 3) + '</octave></pitch>';
  } else s += '<rest/>';
  s += '<duration>' + ticks(e) + '</duration>';
  if (tieStop) s += '<tie type="stop"/>';
  if (tieStart) s += '<tie type="start"/>';
  s += '<type>' + TYPE[e.v] + '</type>' + (e.dot ? '<dot/>' : '');
  if (shown != null) s += '<accidental>' + ACC[shown] + '</accidental>';
  if (beam) Object.keys(beam).forEach((n) => { s += '<beam number="' + n + '">' + beam[n] + '</beam>'; });
  if (tieStart || tieStop) s += '<notations>' + (tieStop ? '<tied type="stop"/>' : '') + (tieStart ? '<tied type="start"/>' : '') + '</notations>';
  return s + lyricXML(e, prevLy) + '</note>';
}

// Teilt das Lied in Takte: Ein Takt endet an jedem gezeichneten Strich und an jedem Umbruch (ohne Strich mit
// unsichtbarem Taktstrich, weil MusicXML nur zwischen Takten umbrechen kann). Liefert [{ first, end, bar, brk }].
function measuresOf(song, bars) {
  const ev = song.ev, out = [];
  let first = 0;
  ev.forEach((e, i) => {
    if (!bars[i] && !e.brk && i < ev.length - 1) return;
    out.push({ first, end: i + 1, bar: bars[i], brk: !!e.brk });
    first = i + 1;
  });
  return out;
}

// o: { name, autoBar, tempo (Viertel pro Minute) }
export function songToMusicXML(song, { name = '', autoBar = true, tempo = 0 } = {}) {
  const ev = song.ev, bars = drawnBars(song, autoBar);
  const shown = shownAccidentals(song, autoBar), beams = beamsOf(song, bars);
  const measures = measuresOf(song, bars);
  let body = '', num = song.pickup ? 0 : 1, lastLy = '';

  // Wiederholungen: ‖: steht links im Takt nach dem Strich, :‖ rechts; die 1. Klammer über dem Takt vor einem :‖ mit
  // volta, die 2. über dem Takt danach
  const startsRep = (k) => k > 0 && (measures[k - 1].bar === 4 || measures[k - 1].bar === 5);
  const endsRep = (m) => m.bar === 3 || m.bar === 5;
  const volta1 = (m) => endsRep(m) && ev[m.end - 1].volta;
  measures.forEach((m, k) => {
    // Der Auftakt ist ein unvollständiger Takt mit der Nummer 0; ebenso ein Stück, das ein Umbruch ohne Strich abtrennt
    const implicit = (k === 0 && song.pickup > 0) || (k > 0 && !measures[k - 1].bar);
    const n = implicit && k > 0 ? (num - 1) + 'a' : String(num++);
    body += '<measure number="' + n + '"' + (implicit ? ' implicit="yes"' : '') + '>';
    if (k > 0 && measures[k - 1].brk) body += '<print new-system="yes"/>';
    const v1 = volta1(m), v2 = k > 0 && volta1(measures[k - 1]);
    if (startsRep(k) || v1 || v2) {
      body += '<barline location="left">' + (startsRep(k) ? '<bar-style>heavy-light</bar-style>' : '') +
        (v1 ? '<ending number="1" type="start"/>' : v2 ? '<ending number="2" type="start"/>' : '') +
        (startsRep(k) ? '<repeat direction="forward"/>' : '') + '</barline>';
    }
    if (k === 0) {
      body += '<attributes><divisions>' + QUARTER + '</divisions><key><fifths>' + (song.key || 0) + '</fifths></key>';
      if (song.meter) {
        const [beats, type] = song.meter.split('/');
        body += '<time><beats>' + beats + '</beats><beat-type>' + type + '</beat-type></time>';
      }
      body += '<clef><sign>G</sign><line>2</line></clef></attributes>';
      if (tempo) body += '<sound tempo="' + tempo + '"/>';
    }
    for (let i = m.first; i < m.end; i++) {
      const e = ev[i];
      body += noteXML(e, song.key || 0, shown[i], isNote(e) && tiedFrom(e, ev[i + 1]), tiedFrom(ev[i - 1], e), beams[i], lastLy);
      if (e.ly) lastLy = e.ly;
    }
    if (endsRep(m)) body += '<barline location="right"><bar-style>light-heavy</bar-style>' + (v1 ? '<ending number="1" type="stop"/>' : '') + '<repeat direction="backward"/></barline>';
    else if (v2) body += '<barline location="right"><ending number="2" type="discontinue"/></barline>';
    else if (m.bar === 2) body += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
    else if (!m.bar && m.end < ev.length) body += '<barline location="right"><bar-style>none</bar-style></barline>';
    body += '</measure>';
  });
  // Ein leeres Lied ist ein leerer Takt
  if (!measures.length) {
    body = '<measure number="1"><attributes><divisions>' + QUARTER + '</divisions><key><fifths>0</fifths></key>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes></measure>';
  }

  const title = name ? '<work><work-title>' + xmlEsc(name) + '</work-title></work>' : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
    '<score-partwise version="4.0">' + title +
    '<identification><encoding><software>Musiktafel</software></encoding></identification>' +
    '<part-list><score-part id="P1"><part-name print-object="no">Lied</part-name></score-part></part-list>' +
    '<part id="P1">' + body + '</part></score-partwise>\n';
}

// Dateiname aus dem Liednamen (ohne Zeichen, die Dateisysteme nicht mögen)
export function fileNameOf(name) {
  const base = String(name || '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (base || 'Lied') + '.musicxml';
}
