import { VALUES, canDot, isNote, tiedFrom, MAX_LY } from './model.js';
import { byGroup } from '../core/groups.js';

// Bekannte Lieder in einer kurzen Schreibweise zum Abtippen.
// Ein Ton ist deutscher Tonname + Oktave (0 kleine, 1 eingestrichene …), optional „:“ + Wert (1, 2, 4, 8, 16,
// mit „.“ punktiert). Der Wert gilt weiter bis zum nächsten, am Anfang Viertel. „r“ ist eine Pause, „~“ am Ton ein
// Haltebogen zur nächsten Note, „/“ ein Zeilenumbruch. „|“ dient nur dem Lesen, die Taktstriche kommen automatisch.
// Bruder Jakob und Ode an die Freude stehen in F-Dur wie in der Tafel.
// tempo: eigenes Tempo des Lieds in Vierteln pro Minute, wird beim Laden eingestellt.
// lyrics: erste Strophe, eine Silbe je Note (Pausen und übergebundene Noten zählen nicht), „-“ am Ende verbindet mit
// der nächsten Silbe, „_“ lässt eine Note ohne Silbe (die vorige klingt weiter). „/“ steht an denselben Stellen wie in notes.
export const SONGS = byGroup([
  {
    name: 'Alle meine Entchen', group: 'Kinderlieder', meter: '4/4', tempo: 110,
    notes: 'c1 d1 e1 f1 | g1:2 g1 | a1:4 a1 a1 a1 | g1:1 / a1:4 a1 a1 a1 | g1:1 / f1:4 f1 f1 f1 | e1:2 e1 | d1:4 d1 d1 d1 | c1:1',
    lyrics: 'Al- le mei- ne Ent- chen schwim- men auf dem See, / schwim- men auf dem See. / Köpf- chen in das Was- ser, Schwänz- chen in die Höh.'
  },
  {
    name: 'Hänschen klein', group: 'Kinderlieder', meter: '4/4', tempo: 110,
    notes: 'g1 e1 e1:2 | f1:4 d1 d1:2 | c1:4 d1 e1 f1 | g1 g1 g1:2 / g1:4 e1 e1:2 | f1:4 d1 d1:2 | c1:4 e1 g1 g1 | c1:1 / ' +
      'd1:4 d1 d1 d1 | d1 e1 f1:2 | e1:4 e1 e1 e1 | e1 f1 g1:2 / g1:4 e1 e1:2 | f1:4 d1 d1:2 | c1:4 e1 g1 g1 | c1:1',
    lyrics: 'Häns- chen klein ging al- lein in die wei- te Welt hin- ein. / Stock und Hut steht ihm gut, ist gar wohl- ge- mut. / A- ber Ma- ma wei- net sehr, hat ja nun kein Häns- chen mehr. / „Wünsch dir Glück“, sagt ihr Blick, „kehr nur bald zu- rück!“'
  },
  {
    name: 'Kuckuck, Kuckuck', group: 'Frühling', meter: '3/4', tempo: 120,
    notes: 'g1:2 e1:4 | g1:2 e1:4 | f1 e1 d1 | c1:2. / d1:4 d1 e1 | f1:2 d1:4 | e1 e1 f1 | g1:2 e1:4 / ' +
      'g1:2 e1:4 | g1:2 e1:4 | f1 e1 d1 | c1:2.',
    lyrics: 'Ku- ckuck, Ku- ckuck, ruft’s aus dem Wald. / Las- set uns sin- gen, tan- zen und sprin- gen! / Früh- ling, Früh- ling wird es nun bald.'
  },
  {
    name: 'Bruder Jakob', group: 'Kinderlieder', meter: '4/4', tempo: 100,
    notes: 'f1 g1 a1 f1 | f1 g1 a1 f1 / a1 b1 c2:2 | a1:4 b1 c2:2 / ' +
      'c2:8 d2 c2 b1 a1:4 f1 | c2:8 d2 c2 b1 a1:4 f1 / f1 c1 f1:2 | f1:4 c1 f1:2',
    lyrics: 'Bru- der Ja- kob, Bru- der Ja- kob, / schläfst du noch? Schläfst du noch? / Hörst du nicht die Glo- cken? Hörst du nicht die Glo- cken? / Ding, dang, dong! Ding, dang, dong!'
  },
  {
    name: 'Morgen kommt der Weihnachtsmann', group: 'Weihnachten', meter: '4/4', tempo: 110,
    notes: 'c1 c1 g1 g1 | a1 a1 g1:2 | f1:4 f1 e1 e1 | d1 d1 c1:2 / g1:4 g1 f1 f1 | e1 e1 d1:2 | ' +
      'g1:4 g1 f1 f1 | e1 e1 d1:2 / c1:4 c1 g1 g1 | a1 a1 g1:2 | f1:4 f1 e1 e1 | d1 d1 c1:2',
    lyrics: 'Mor- gen kommt der Weih- nachts- mann, kommt mit sei- nen Ga- _ ben. / Bun- te Lich- ter, Sil- ber- zier, Kind und Krip- pe, Schaf und Stier, / Zot- tel- bär und Pan- ter- tier möcht ich ger- ne ha- _ ben.'
  },
  {
    name: 'Ode an die Freude', group: 'Feste und mehr', meter: '4/4', tempo: 100,
    notes: 'a1 a1 b1 c2 | c2 b1 a1 g1 | f1 f1 g1 a1 | a1:4. g1:8 g1:2 / a1:4 a1 b1 c2 | c2 b1 a1 g1 | f1 f1 g1 a1 | g1:4. f1:8 f1:2 / ' +
      'g1:4 g1 a1 f1 | g1 a1:8 b1 a1:4 f1 | g1 a1:8 b1 a1:4 g1 | f1 g1 c1:2 / ' +
      'a1:4 a1 b1 c2 | c2 b1 a1 g1 | f1 f1 g1 a1 | g1:4. f1:8 f1:2',
    lyrics: 'Freu- de, schö- ner Göt- ter- fun- ken, Toch- ter aus E- ly- si- um, / wir be- tre- ten feu- er- trun- ken, Himm- li- sche, dein Hei- lig- tum! / Dei- ne Zau- ber bin- _ den wie- der, was _ die Mo- de streng ge- teilt; / al- le Men- schen wer- den Brü- der, wo dein sanf- ter Flü- gel weilt.'
  },
  {
    name: 'Zum Geburtstag viel Glück', group: 'Feste und mehr', meter: '3/4', tempo: 100, pickup: 8,
    notes: 'g1:8. g1:16 | a1:4 g1 c2 | h1:2 g1:8. g1:16 | a1:4 g1 d2 | c2:2 g1:8. g1:16 / ' +
      'g2:4 e2 c2 | h1 a1 f2:8. f2:16 | e2:4 c2 d2 | c2:2',
    lyrics: 'Zum Ge- burts- tag viel Glück, zum Ge- burts- tag viel Glück, zum Ge- / burts- tag, lie- bes Kind, zum Ge- burts- tag viel Glück!'
  },
  // Quellen: de.wikipedia.org (Noten im Artikel) und volksliederarchiv.de; Tonarten so, dass alles in c'–f'' liegt
  { name: 'Alle Vögel sind schon da', group: 'Frühling', meter: '4/4', tempo: 100, notes: 'c1:4. e1:8 g1:4 c2 | a1 c2:8 a1 g1:2 | f1:4. g1:8 e1:4 c1 | d1:2 c1:4 r / g1 g1 f1 f1 | e1 g1:8 e1 d1:2 | g1:4 g1 f1 f1 | e1 g1:8 e1 d1:2 / c1:4. e1:8 g1:4 c2 | a1 c2:8 a1 g1:2 | f1:4. g1:8 e1:4 c1 | d1:2 c1:4 r',
    lyrics: 'Al- le Vö- gel sind schon _ da, al- le Vö- gel, al- le! / Welch ein Sin- gen, Mu- si- _ ziern, Pfei- fen, Zwit- schern, Ti- re- _ liern! / Früh- ling will nun ein- mar- _ schiern, kommt mit Sang und Schal- le.' },
  { name: 'Summ, summ, summ', group: 'Kinderlieder', meter: '2/4', tempo: 110, key: 1, notes: 'd2:4 c2 | h1 r | a1:8 h1 c2 a1 | g1:4 r / h1:8 c2 d2 h1 | a1 h1 c2 a1 | h1 c2 d2 h1 | a1 h1 c2 a1 / d2:4 c2 | h1 r | a1:8 h1 c2 a1 | g1:4 r',
    lyrics: 'Summ, summ, summ, Bien- chen, summ her- um! / Ei, wir tun dir nichts zu- lei- de, flieg nur aus in Wald und Hei- de! / Summ, summ, summ, Bien- chen, summ her- um!' },
  { name: 'Fuchs, du hast die Gans gestohlen', group: 'Kinderlieder', meter: '4/4', tempo: 120, notes: 'c1 d1 e1 f1 | g1 g1 g1 g1 / a1 f1 c2 a1 | g1:1 | a1:4 f1 c2 a1 | g1:1 / g1:4 f1 f1 f1 | f1 e1 e1 e1 | e1 d1 e1 d1 | c1 e1 g1:2 / g1:4 f1 f1 f1 | f1 e1 e1 e1 | e1 d1 e1 d1 | c1:1',
    lyrics: 'Fuchs, du hast die Gans ge- stoh- len, / gib sie wie- der her, gib sie wie- der her! / Sonst wird dich der Jä- ger ho- len mit dem Schieß- ge- wehr, _ _ / sonst wird dich der Jä- ger ho- len mit dem Schieß- ge- wehr.' },
  { name: 'Ein Vogel wollte Hochzeit machen', group: 'Kinderlieder', meter: '2/4', tempo: 80, pickup: 4, key: 1, notes: 'h1:8 | d2 h1 d2 h1 | c2 a1 c2 a1 | h1 g1 d2 h1 | a1 d2 d2 d2:16 h1 / g1:8 g1 g1 d2:16 h1 | a1:8 a1 a1 d2:16 c2 | h1:8 g1 a1 fis1 | g1:4 r:8',
    lyrics: 'Ein Vo- gel woll- te Hoch- zeit ma- chen in dem grü- nen Wal- de. _ Fi- di- / ral- la- la, fi- di- ral- la- la, fi- di- ral- la- la- la- la.' },
  { name: 'Kommt ein Vogel geflogen', group: 'Kinderlieder', meter: '3/4', tempo: 100, pickup: 8, key: -1, notes: 'a1:8 b1 | c2:4 a1 a1 | a1 g1 g1:8 a1 | b1:4 g1 g1:8 d2 | c2:4 r a1:8 b1 / c2:4 a1 a1 | a1 g1 g1:8 a1 | b1:4 e1 e1 | f1 r',
    lyrics: 'Kommt ein Vo- gel ge- flo- gen, setzt sich nie- der auf mein’ Fuß, hat ein / Zet- tel im Schna- bel, von der Mut- ter ein’ Gruß.' },
  { name: 'Winter ade', group: 'Frühling', meter: '3/4', tempo: 110, key: 1, notes: 'h1:4 h1 a1 | g1:2. | h1:4 h1 a1 | g1:2. / h1:4 c2 d2 | d2 c2:8 h1 c2:4 | a1 h1 c2 | c2 h1:8 a1 h1:4 / h1 h1 c2 | d2:2. | h1:4 h1 a1 | g1:2.',
    lyrics: 'Win- ter, a- de! Schei- den tut weh. / A- ber dein Schei- _ den macht, dass mir das Her- _ ze lacht. / Win- ter, a- de! Schei- den tut weh.' },
  { name: 'Hejo, spann den Wagen an', group: 'Herbst und Sankt Martin', meter: '4/4', tempo: 120, notes: 'a1:2 g1 | a1:8 a1 a1 a1 e1:2 / a1:4 a1 h1 h1 | c2:8 c2 c2 c2 h1:2 / e2:8 e2 e2 e2 e2:4 e2 | e2:8 e2 e2 e2 e2 d2 c2 h1',
    lyrics: 'He- jo, spann den Wa- gen an, / sieh, der Wind treibt Re- gen ü- bers Land. / Hol die gold- nen Gar- ben, hol die gold- nen Gar- _ ben. _' },
  { name: 'Backe, backe Kuchen', group: 'Kinderlieder', meter: '2/2', tempo: 120, notes: 'g1 g1 a1 a1 | g1:2 e1:4 c1 | g1 g1 a1 a1 | g1:2 e1 / g1:4 g1 a1 a1 | g1 g1 e1 c1 | g1 g1 a1 a1 | g1 g1 e1 e1 / g1:8 g1 g1:4 e1:2 | g1:8 g1 g1:4 e1:2 | g1:4 g1 e1:2 / g1:4 g1 a1 a1 | g1 g1 e1:2 | c2 g1:4 f1 | e1 d1 c1:2',
    lyrics: 'Ba- cke, ba- cke Ku- chen, der Bä- cker hat ge- ru- fen. / Wer will gu- ten Ku- chen ba- cken, der muss ha- ben sie- ben Sa- chen: / Ei- er und Schmalz, But- ter und Salz, Milch und Mehl, / Saf- ran macht den Ku- chen gehl. Schieb, schieb in’n O- fen ’nein!' },
  // Quellen: ingeb.org (Melodie-MIDIs), de.wikipedia.org, abcnotation.com, flutetunes.com
  { name: 'O Tannenbaum', group: 'Weihnachten', meter: '3/4', tempo: 90, pickup: 4, key: 1, notes: 'd1:8 | g1:8. g1:16 g1:4 a1 | h1:8. h1:16 h1:4. h1:8 | a1:8 h1 c2:4 fis1 | a1:4 g1 r:8 d2:8 / d2:8 h1 e2:4. d2:8 | d2:8 c2 c2:4. c2:8 | c2:8 a1 d2:4. c2:8 | c2:8 h1 h1:4 r:8 d1:8 / g1:8. g1:16 g1:4 a1 | h1:8. h1:16 h1:4. h1:8 | a1:8 h1 c2:4 fis1 | a1:4 g1 r:8',
    lyrics: 'O Tan- nen- baum, o Tan- nen- baum, wie grün sind dei- ne Blät- ter! Du / grünst nicht nur zur Som- mers- zeit, nein, auch im Win- ter, wenn es schneit. O / Tan- nen- baum, o Tan- nen- baum, wie grün sind dei- ne Blät- ter!' },
  { name: 'Kling, Glöckchen', group: 'Weihnachten', meter: '2/4', tempo: 80, key: -1, notes: 'c2:4 a1:8 b1 | c2:16 d2 c2 d2 c2:4 | b1:4 g1:8 c2 | a1:2 / g1:8 g1 a1 f1 | a1:4 g1 | b1:8 b1 c2 g1 | b1:4 a1 / g1:8 g1 a1 h1 | c2:4 g1 | a1:8 d2 c2 h1 | d2:4 c2 / c2:4 a1:8 b1 | c2:16 d2 c2 d2 c2:4 | b1:4 g1:8 c2 | a1:2',
    lyrics: 'Kling, Glöck- chen, kling- e- ling- e- ling, kling, Glöck- chen, kling! / Lasst mich ein, ihr Kin- der, ist so kalt der Win- ter! / Öff- net mir die Tü- ren, lasst mich nicht er- frie- ren! / Kling, Glöck- chen, kling- e- ling- e- ling, kling, Glöck- chen, kling!' },
  { name: 'Leise rieselt der Schnee', group: 'Weihnachten', meter: '6/8', tempo: 70, key: 1, notes: 'h1:4 h1:8 a1 h1 a1 | g1:4.~ g1:4 r:8 | g1:4 e1:8 g1 fis1 e1 | d1:4.~ d1:4 r:8 / a1:8 gis1 a1 c2 h1 a1 | g1:4.~ g1:4 r:8 | a1:8. e1:16 e1:8 fis1 e1 fis1 | g1:4.~ g1:4 r:8',
    lyrics: 'Lei- se rie- selt der Schnee, still und starr ruht der See, / weih- nacht- lich glän- zet der Wald. Freu- e dich, Christ- kind kommt bald!' },
  { name: 'Stille Nacht', group: 'Weihnachten', meter: '6/8', tempo: 60, notes: 'g1:8. a1:16 g1:8 e1:4. | g1:8. a1:16 g1:8 e1:4. | d2:4 d2:8 h1:4. | c2:4 c2:8 g1:4. / a1:4 a1:8 c2:8. h1:16 a1:8 | g1:8. a1:16 g1:8 e1:4. | a1:4 a1:8 c2:8. h1:16 a1:8 | g1:8. a1:16 g1:8 e1:4. / d2:4 d2:8 f2:8. d2:16 h1:8 | c2:4. e2:4. | c2:8 g1 e1 g1:8. f1:16 d1:8 | c1:2.',
    lyrics: 'Stil- _ le Nacht, hei- li- ge Nacht! Al- les schläft, ein- sam wacht / nur das trau- te, hoch- hei- li- ge Paar. Hol- der Kna- be im lo- cki- gen Haar, / schlaf in himm- li- scher Ruh, _ schlaf _ in himm- li- scher Ruh.' },
  { name: 'Bunt sind schon die Wälder', group: 'Herbst und Sankt Martin', meter: '6/8', tempo: 90, key: 1, notes: 'g1:4 g1:8 g1 fis1 g1 | a1:4. g1 | h1:4 h1:8 h1 a1 h1 | c2:4. h1 / a1:4 a1:8 g1 h1 cis1 | d1:4. r / h1:4 a1:8 g1:4 fis1:8 | e1:4. e1 | c2:4 h1:8 a1 h1 g1 | fis1:4. fis1 / g1:8 h1 d2 d1 e1 fis1 | g1:4. r',
    lyrics: 'Bunt sind schon die _ Wäl- der, gelb die Stop- pel- _ fel- der, / und der Herbst be- _ ginnt. / Ro- te Blät- ter fal- len, grau- e Ne- bel _ wal- len, / küh- ler weht der _ _ Wind.' },
  { name: 'Ein Männlein steht im Walde', group: 'Herbst und Sankt Martin', meter: '4/4', tempo: 110, pickup: 8, key: 1, notes: 'd1 | g1 a1 h1 c2 | d2:2 e2:4 c2 | h1:2 a1 | g1:2. d1:4 / g1:4 a1 h1 c2 | d2:2 e2:4 c2 | h1:2 a1 | g1:1 / d2:4. c2:8 h1:4 d2 | c2 h1 a1:2 | d2:4. c2:8 h1:4 d2 | c2 h1 a1:2 / g1:4 a1 h1 c2 | d2:2 e2:4 c2 | h1:2 a1 | g1:2.',
    lyrics: 'Ein Männ- lein steht im Wal- de ganz still und stumm, es / hat von lau- ter Pur- pur ein Mänt- lein um. / Sagt, wer mag das Männ- lein sein, das da steht im Wald al- lein / mit dem pur- pur- ro- ten Män- te- _ lein?' },
  { name: 'Laterne, Laterne', group: 'Herbst und Sankt Martin', meter: '2/4', tempo: 80, pickup: 4, key: -1, notes: 'd2:8 | c2:4 a1:8 d2 | c2:4 a1 | c2:8 c2 d2 d2 | c2:4 a1:8 f1:16 a1 / c2:8 c2 a1 f1:16 a1 | c2:8 c2 a1 f1:16 a1 | c2:8 c2:16 c2 d2 d2 d2:8 | c2 c2 a1',
    lyrics: 'La- ter- ne, La- ter- ne, Son- ne, Mond und Ster- ne. Bren- ne / auf, mein Licht, bren- ne auf, mein Licht, a- ber nur mei- ne lie- be La- ter- ne nicht!' },
  { name: 'Ich geh mit meiner Laterne', group: 'Herbst und Sankt Martin', meter: '6/8', tempo: 90, pickup: 4, key: 1, notes: 'd1:8 | g1:4 g1:8 h1 g1 h1 | d2:4. h1:4 g1:8 | a1:8 a1 a1 a1 h1 a1 | g1:4. r:4 d1:8 / g1:4 g1:8 h1 g1 h1 | d2:4. h1:4 g1:8 | a1:4 a1:8 a1 h1 a1 | g1:4. r:4 h1:8 / d2:4 h1:8 g1:4 h1:8 | d2:4 h1:8 g1:4 g1:8 | a1:8 a1 a1 a1 h1 a1 | g1:4. r:4 h1:8 / d2:4 h1:8 g1:4 h1:8 | d2:4 h1:8 g1:4 g1:8 | a1:8 a1 a1 a1 h1 a1 | g1:4. r:4',
    lyrics: 'Ich geh mit mei- ner La- ter- ne und mei- ne La- ter- ne mit mir. Dort / o- ben leuch- ten die Ster- ne, hier un- ten, da leuch- ten wir. Mein / Licht ist aus, wir gehn nach Haus, ra- bim- mel, ra- bam- mel, ra- bumm. Mein / Licht ist aus, wir gehn nach Haus, ra- bim- mel, ra- bam- mel, ra- bumm.' },
  { name: 'Sankt Martin', group: 'Herbst und Sankt Martin', meter: '4/4', tempo: 100, pickup: 8, key: 1, notes: 'd1 | g1:2 d1:4 g1:8 a1 | h1:2 g1:4 h1:8 c2 / d2:4 h1 c2 e2 | d2 d2:8 c2 h1:4 d2 | c2 a1 a1 d2 | h1 h1:8 a1 g1:4 d1 / g1 h1 h1 a1:8 g1 | a1:4 c2 c2 h1:8 a1 | h1:4 d2 h1 g1 | h1:8 a1 a1 fis1 g1:2',
    lyrics: 'Sankt Mar- tin, Sankt _ Mar- tin, Sankt _ / Mar- tin ritt durch Schnee und _ Wind, sein Ross, das trug ihn fort ge- _ schwind. Sankt / Mar- tin ritt mit _ leich- tem Mut, sein _ Man- tel deckt ihn warm _ und _ gut.' }

])

// Tonname → [Stammton, Vorzeichen]
const NAMES = {
  c: ['c'], cis: ['c', 1], ces: ['c', -1], d: ['d'], dis: ['d', 1], des: ['d', -1], e: ['e'], eis: ['e', 1], es: ['e', -1],
  f: ['f'], fis: ['f', 1], g: ['g'], gis: ['g', 1], ges: ['g', -1], a: ['a'], ais: ['a', 1], as: ['a', -1],
  h: ['h'], his: ['h', 1], b: ['h', -1]
};

// Macht aus einem Lied der Liste oben ein Lied im Format von model.js
export function songOf(def) {
  const ev = [];
  let v = 4, dot = false;
  for (const tok of def.notes.trim().split(/\s+/)) {
    if (tok === '|') continue;
    if (tok === '/') {
      if (!ev.length) throw new Error(`Zeilenumbruch am Anfang: ${tok}`);
      ev[ev.length - 1].brk = 1;
      continue;
    }
    const m = /^(?:r|([a-h][a-z]*)([0-3]))(?::(\d+)(\.)?)?(~)?$/.exec(tok);
    const name = m && m[1] && NAMES[m[1]];
    if (!m || (m[1] && !name) || (!m[1] && m[5])) throw new Error(`Unbekanntes Token: ${tok}`);
    if (m[3]) {
      v = +m[3];
      dot = !!m[4];
      if (!VALUES.includes(v) || (dot && !canDot(v))) throw new Error(`Unbekanntes Token: ${tok}`);
    }
    const e = name ? { p: name[0] + m[2], v } : { v };
    if (dot) e.dot = 1;
    if (name && name[1]) e.acc = name[1];
    if (m[5]) e.tie = 1;
    ev.push(e);
  }
  if (def.lyrics) setLyrics(ev, def.lyrics);
  return { name: def.name, song: { meter: def.meter, pickup: def.pickup || 0, key: def.key || 0, ev } };
}

// Verteilt den Liedtext Zeile für Zeile auf die Noten, die eine Silbe bekommen können
function setLyrics(ev, lyrics) {
  const lines = [[]];
  ev.forEach((e, i) => {
    if (isNote(e) && !tiedFrom(ev[i - 1], e)) lines[lines.length - 1].push(e);
    if (e.brk) lines.push([]);
  });
  const text = lyrics.split('/').map((l) => l.trim().split(/\s+/).filter(Boolean));
  if (text.length !== lines.length) throw new Error(`Liedtext hat ${text.length} Zeilen, die Noten ${lines.length}`);
  text.forEach((syl, k) => {
    if (syl.length !== lines[k].length) throw new Error(`Liedtext Zeile ${k + 1}: ${syl.length} Silben für ${lines[k].length} Noten`);
    syl.forEach((t, j) => {
      if (t.length > MAX_LY) throw new Error(`Silbe zu lang: ${t}`);
      if (t !== '_') lines[k][j].ly = t;
    });
  });
}
