import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songToMusicXML, fileNameOf } from '../js/lied/musicxml.js';
import { measureTicks } from '../js/lied/model.js';
import { SONGS, songOf } from '../js/lied/songs.js';
import { n, r, song } from './helpers.mjs';

// Prüft, ob jedes geöffnete Element wieder geschlossen wird (ein kleiner Ersatz für einen XML-Parser)
function wellFormed(xml) {
  const stack = [];
  for (const [, close, name, self] of xml.replace(/<\?[^>]*\?>|<!DOCTYPE[^>]*>/g, '').matchAll(/<(\/?)([\w-]+)[^>]*?(\/?)>/g)) {
    if (self) continue;
    if (!close) stack.push(name);
    else assert.equal(stack.pop(), name, '</' + name + '> schließt nicht das letzte offene Element');
  }
  assert.deepEqual(stack, [], 'offen geblieben: ' + stack.join(', '));
}
const measures = (xml) => [...xml.matchAll(/<measure ([^>]*)>(.*?)<\/measure>/g)].map((m) => ({ attrs: m[1], body: m[2] }));
const notes = (xml) => [...xml.matchAll(/<note>(.*?)<\/note>/g)].map((m) => m[1]);

test('Kopf: Titel, Taktart, Schlüssel, Teilung in Ticks pro Viertel', () => {
  const xml = songToMusicXML(song([n('c1')], '3/4'), { name: 'Tom & Jerry' });
  wellFormed(xml);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"/);
  assert.match(xml, /<work-title>Tom &amp; Jerry<\/work-title>/);
  assert.match(xml, /<divisions>8<\/divisions>/);
  assert.match(xml, /<time><beats>3<\/beats><beat-type>4<\/beat-type><\/time>/);
  assert.match(xml, /<clef><sign>G<\/sign><line>2<\/line><\/clef>/);
});

test('ohne Taktart: keine <time>, ohne Name kein Titel', () => {
  const xml = songToMusicXML(song([n('c1')], ''));
  assert.doesNotMatch(xml, /<time>/);
  assert.doesNotMatch(xml, /<work>/);
});

test('Tonhöhen: deutsche Namen und Oktaven, h wird B, c1 ist C4', () => {
  const xml = songToMusicXML(song([n('c1'), n('h0'), n('a1'), n('c3')]));
  const p = notes(xml).map((x) => /<step>(\w)<\/step>(?:<alter>[^<]*<\/alter>)?<octave>(\d)/.exec(x).slice(1).join(''));
  assert.deepEqual(p, ['C4', 'B3', 'A4', 'C6']);
});

test('Notenwerte, Punkte und Dauern', () => {
  const xml = songToMusicXML(song([n('c1', 1), n('c1', 2, { dot: 1 }), n('c1', 8), n('c1', 16), r(4)], ''));
  const ns = notes(xml);
  assert.deepEqual(ns.map((x) => /<type>([^<]+)/.exec(x)[1]), ['whole', 'half', 'eighth', '16th', 'quarter']);
  assert.deepEqual(ns.map((x) => +/<duration>(\d+)/.exec(x)[1]), [32, 24, 4, 2, 8]);
  assert.match(ns[1], /<dot\/>/);
  assert.match(ns[4], /<rest\/>/);
});

test('Vorzeichen: alter für den Klang, accidental nur, wo eins gezeichnet ist', () => {
  // fis, fis (gilt noch im Takt), f (bekommt ♮), c, Taktstrich, b
  const xml = songToMusicXML(song([n('f1', 4, { acc: 1 }), n('f1', 4, { acc: 1 }), n('f1'), n('c1'), n('h1', 4, { acc: -1 })]));
  const ns = notes(xml);
  assert.match(ns[0], /<alter>1<\/alter>.*<accidental>sharp<\/accidental>/);
  assert.match(ns[1], /<alter>1<\/alter>/);
  assert.doesNotMatch(ns[1], /<accidental>/);
  assert.doesNotMatch(ns[2], /<alter>/);
  assert.match(ns[2], /<accidental>natural<\/accidental>/);
  assert.match(ns[4], /<alter>-1<\/alter>.*<accidental>flat<\/accidental>/);
});

test('Takte nach der Taktart, Schlussstrich am Ende', () => {
  const xml = songToMusicXML(song([n('c1', 2), n('d1', 2), n('e1', 1, { bar: 2 })]));
  wellFormed(xml);
  const ms = measures(xml);
  assert.equal(ms.length, 2);
  assert.deepEqual(ms.map((m) => /number="([^"]+)"/.exec(m.attrs)[1]), ['1', '2']);
  assert.match(ms[1].body, /<bar-style>light-heavy<\/bar-style>/);
  assert.doesNotMatch(ms[0].body, /<barline/);
});

test('Auftakt: Takt 0, unvollständig', () => {
  const xml = songToMusicXML(song([n('g1'), n('c2', 2, { dot: 1 })], '3/4', 8));
  const ms = measures(xml);
  assert.equal(ms.length, 2);
  assert.match(ms[0].attrs, /number="0" implicit="yes"/);
  assert.match(ms[1].attrs, /number="1"/);
});

test('Umbruch: neues System; mitten im Takt mit unsichtbarem Strich', () => {
  const xml = songToMusicXML(song([n('c1', 1, { brk: 1 }), n('c1', 2, { brk: 1 }), n('c1', 2)]));
  wellFormed(xml);
  const ms = measures(xml);
  assert.equal(ms.length, 3);
  assert.match(ms[1].body, /^<print new-system="yes"\/>/);
  assert.match(ms[1].body, /<bar-style>none<\/bar-style>/);
  assert.match(ms[2].attrs, /implicit="yes"/);
  assert.match(ms[2].body, /^<print new-system="yes"\/>/);
});

test('Mehrere Umbrüche ohne Taktstrich: fortlaufende Buchstaben statt doppelter Taktnummern', () => {
  // Ohne Taktart und Strich trennen nur die Umbrüche; die Stücke gehören alle zu Takt 1
  const xml = songToMusicXML(song([n('c1', 2, { brk: 1 }), n('d1', 2, { brk: 1 }), n('e1', 2)], ''));
  wellFormed(xml);
  const ms = measures(xml);
  assert.deepEqual(ms.map((m) => /number="([^"]+)"/.exec(m.attrs)[1]), ['1', '1a', '1b']);
  assert.match(ms[1].attrs, /implicit="yes"/);
  assert.match(ms[2].attrs, /implicit="yes"/);
  // Ein richtiger Taktstrich fängt wieder mit der nächsten Zahl an
  const more = songToMusicXML(song([n('c1', 2, { brk: 1 }), n('d1', 2, { brk: 1 }), n('e1', 2, { bar: 1 }), n('f1', 2)], ''), { autoBar: false });
  assert.deepEqual(measures(more).map((m) => /number="([^"]+)"/.exec(m.attrs)[1]), ['1', '1a', '1b', '2']);
});

test('Haltebogen nur zwischen gleichen Tönen', () => {
  const xml = songToMusicXML(song([n('g1', 2, { tie: 1 }), n('g1', 2), n('a1', 2, { tie: 1 }), n('h1', 2)]));
  const ns = notes(xml);
  assert.match(ns[0], /<tie type="start"\/>.*<tied type="start"\/>/);
  assert.match(ns[1], /<tie type="stop"\/>.*<tied type="stop"\/>/);
  assert.doesNotMatch(ns[2], /<tie/);
  assert.doesNotMatch(ns[3], /<tie/);
});

test('Balken: Achtel im Schlag, Sechzehntel mit zweitem Balken', () => {
  const xml = songToMusicXML(song([n('c1', 8), n('d1', 8), n('e1', 8, { dot: 1 }), n('f1', 16), n('g1', 2)]));
  const b = notes(xml).map((x) => [...x.matchAll(/<beam number="(\d)">([^<]+)/g)].map((m) => m[1] + ':' + m[2]).join(' '));
  assert.deepEqual(b, ['1:begin', '1:end', '1:begin', '1:end 2:backward hook', '']);
});

test('Tempo als <sound>', () => {
  assert.match(songToMusicXML(song([n('c1')]), { tempo: 96 }), /<sound tempo="96"\/>/);
});

test('alle bekannten Lieder ergeben gültiges XML mit vollständigen Takten', () => {
  for (const s of SONGS) {
    const { song: sg } = songOf(s), xml = songToMusicXML(sg, { name: s.name });
    wellFormed(xml);
    const len = measureTicks(sg.meter);
    measures(xml).forEach((m, k, all) => {
      const sum = [...m.body.matchAll(/<duration>(\d+)/g)].reduce((a, x) => a + +x[1], 0);
      if (k === 0 && sg.pickup) assert.equal(sum, sg.pickup, s.name + ': Auftakt');
      else if (k < all.length - 1) assert.equal(sum, len, s.name + ': Takt ' + k);
    });
  }
});

test('Dateiname aus dem Liednamen', () => {
  assert.equal(fileNameOf('Hänschen klein'), 'Hänschen klein.musicxml');
  assert.equal(fileNameOf('a/b: c?'), 'a b c.musicxml');
  assert.equal(fileNameOf(''), 'Lied.musicxml');
});

test('Tonart und Wiederholungen mit 1./2. Klammer', () => {
  const q = (p, x = {}) => n(p, 4, x);
  const s = { meter: '2/4', pickup: 0, key: 1, ev: [q('f1'), q('g1', { bar: 4 }), q('a1'), q('h1', { bar: 3, volta: 1 }), q('c2'), q('d2')] };
  const xml = songToMusicXML(s, { autoBar: true });
  wellFormed(xml);
  assert.match(xml, /<key><fifths>1<\/fifths><\/key>/);
  // f' in G-Dur klingt als fis', ohne gezeichnetes Vorzeichen
  assert.match(notes(xml)[0], /<step>F<\/step><alter>1<\/alter>/);
  assert.doesNotMatch(notes(xml)[0], /<accidental>/);
  const ms = measures(xml);
  assert.match(ms[1].body, /<barline location="left"><bar-style>heavy-light<\/bar-style><ending number="1" type="start"\/><repeat direction="forward"\/><\/barline>/);
  assert.match(ms[1].body, /<ending number="1" type="stop"\/><repeat direction="backward"\/>/);
  assert.match(ms[2].body, /<ending number="2" type="start"\/>/);
  assert.match(ms[2].body, /<ending number="2" type="discontinue"\/>/);
});

test('Liedtext: Silben mit Bindestrich werden verbunden', () => {
  const xml = songToMusicXML(song([n('c1', 4, { ly: 'Al-' }), n('d1', 4, { ly: 'le' }), n('e1', 4, { ly: 'mei-' }), n('f1', 4, { ly: 'ne' }), n('g1', 4, { ly: 'Ent-' }), n('g1', 4, { ly: 'chen' })]));
  wellFormed(xml);
  const ly = notes(xml).map((x) => /<syllabic>(\w+)<\/syllabic><text>([^<]*)<\/text>/.exec(x).slice(1).join(':'));
  assert.deepEqual(ly, ['begin:Al', 'end:le', 'begin:mei', 'end:ne', 'begin:Ent', 'end:chen']);
});
