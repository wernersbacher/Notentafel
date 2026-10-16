(function () {
  'use strict';
  // Zeilen sind beliebig lang (bis MAX_LEN)
  var MAX_LEN = 32, MAX_ROWS = 8, START_ROWS = 3;
  var KEY = 'notentafel.v1', SONGS_KEY = 'notentafel.songs.v1', SETTINGS_KEY = 'notentafel.settings.v1',
      AUTO_KEY = 'notentafel.autosave.v1';

  // f = Frequenz in Hz (C = c', hohe Töne eine Oktave darüber).
  // Die Schrift ist auf allen Tönen schwarz; jede Farbe muss dafür hell genug sein (Kontrast ≥ 4,5).
  var NOTES = [
    { id: 'C',   l: 'C',   bg: '#e5383b', n: 'C',  f: 261.63 },
    { id: 'D',   l: 'D',   bg: '#f58a1f', n: 'D',  f: 293.66 },
    { id: 'E',   l: 'E',   bg: '#f7d11e', n: 'E',  f: 329.63 },
    { id: 'F',   l: 'F',   bg: '#9bd74a', n: 'F',  f: 349.23 },
    { id: 'G',   l: 'G',   bg: '#1e8449', n: 'G',  f: 392.00 },
    { id: 'A',   l: 'A',   bg: '#9b6fd1', n: 'A',  f: 440.00 },
    { id: 'H',   l: 'H',   bg: '#ec4899', n: 'H',  f: 493.88 },
    { id: 'C+',  l: 'C',   up: 1, bg: '#e5383b', n: 'hohes C', f: 523.25 },
    { id: 'D+',  l: 'D',   up: 1, bg: '#e5383b', n: 'hohes D', f: 587.33 },
    { id: 'E+',  l: 'E',   up: 1, bg: '#e5383b', n: 'hohes E', f: 659.25 },
    { id: 'F+',  l: 'F',   up: 1, bg: '#e5383b', n: 'hohes F', f: 698.46 },
    { id: 'Fis', l: 'F', sharp: 1, bg: '#9bd74a', n: 'Fis', f: 369.99 },
    { id: 'B',   l: 'B',   bg: '#ec4899', n: 'B',  f: 466.16 }
  ];
  var BY = {};
  NOTES.forEach(function (n) { BY[n.id] = n; });
  var GROUPS = [['C', 'D', 'E', 'F', 'G', 'A', 'H'], ['C+', 'D+', 'E+', 'F+'], ['Fis', 'B']];

  // Farbthemen überschreiben nur einzelne Töne; alles andere kommt aus NOTES
  var THEMES = [
    { id: 'original', name: 'Original', desc: 'Hohe Töne sind alle rot.', colors: {} },
    { id: 'oktave', name: 'Oktavfarben', desc: 'Hohe Töne in der Farbe ihres Grundtons.', colors: {
      'D+': '#f58a1f', 'E+': '#f7d11e', 'F+': '#9bd74a'
    } }
  ];
  // Tonlängen in Schlägen; Viertel (1) ist der Normalfall
  var DURS = [
    { d: 0.5, l: '½', n: 'Achtel', p: 'Achtelpause' },
    { d: 1,   l: '1', n: 'Viertel', p: 'Viertelpause' },
    { d: 2,   l: '2', n: 'Halbe', p: 'Halbe Pause' },
    { d: 3,   l: '3', n: 'Punktierte Halbe', p: 'Punktierte halbe Pause' },
    { d: 4,   l: '4', n: 'Ganze', p: 'Ganze Pause' }
  ];
  var DUR_BY = {};
  DURS.forEach(function (x) { DUR_BY[x.d] = x; });

  // Mitgelieferte Lieder, immer im Menü ladbar. „|“ trennt Zeilen, „-“ ist eine Pause,
  // „:2“ hängt die Länge in Schlägen an (ohne Angabe ein Schlag), z. B. „G:2“ oder „-:2“.
  // Bruder Jakob und Ode an die Freude stehen in F-Dur, weil der Tonvorrat unter dem C endet.
  // Die punktierte Viertel der Ode gibt es nicht, dort stehen zwei Viertel.
  var MELODIES = [
    { name: 'Alle meine Entchen', meter: '4/4', notes: 'C D E F G:2 G:2 | A A A A G:4 | A A A A G:4 | F F F F E:2 E:2 | D D D D C:4' },
    { name: 'Hänschen klein', meter: '4/4', notes: 'G E E:2 F D D:2 | C D E F G G G:2 | G E E:2 F D D:2 | C E G G C:4 | D D D D D E F:2 | E E E E E F G:2 | G E E:2 F D D:2 | C E G G C:4' },
    { name: 'Kuckuck, Kuckuck', meter: '3/4', notes: 'G:2 E G:2 E F E D C:3 | D D E F:2 D E E F G:2 E | G:2 E G:2 E F E D C:3' },
    { name: 'Bruder Jakob', meter: '4/4', notes: 'F G A F F G A F | A B C+:2 A B C+:2 | C+:.5 D+:.5 C+:.5 B:.5 A F C+:.5 D+:.5 C+:.5 B:.5 A F | F C F:2 F C F:2' },
    { name: 'Morgen kommt der Weihnachtsmann', meter: '4/4', notes: 'C C G G A A G:2 | F F E E D D C:2 | G G F F E E D:2 | G G F F E E D:2 | C C G G A A G:2 | F F E E D D C:2' },
    { name: 'Ode an die Freude', meter: '4/4', notes: 'A A B C+ C+ B A G | F F G A A G G:2 | A A B C+ C+ B A G | F F G A G F F:2 | G G A F G A:.5 B:.5 A F | G A:.5 B:.5 A G F G C:2 | A A B C+ C+ B A G | F F G A G F F:2' }
  ];
  function melodyRows(m) {
    var rs = m.notes.split('|').map(function (line) {
      return line.trim().split(/\s+/).map(function (tok) {
        var p = tok.split(':'), d = p[1] ? +p[1] : 1;
        if (p[0] === '-') return { k: 'r', d: d };
        return { n: p[0], h: '', d: d };
      });
    });
    while (rs.length < START_ROWS) rs.push([]);
    rs[0].meter = m.meter;
    return rs;
  }
  // Taktarten zur Auswahl; sie stehen vorn in der Zeile
  var METERS = ['2/2', '2/4', '3/4', '4/4', '6/8'];

  var THEME_BY = {};
  THEMES.forEach(function (t) { THEME_BY[t.id] = t; });

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid'), toastEl = $('toast'), palette = $('palette'), valuesEl = $('values'), restsEl = $('rests');
  var board = grid.parentNode;
  var btnR = $('btnR'), btnL = $('btnL'), btnIns = $('btnIns'), btnDel = $('btnDel'), delLabel = $('delLabel'),
      btnBreak = $('btnBreak'), btnDone = $('btnDone'), btnBar = $('btnBar'), btnEnd = $('btnEnd'), btnLine = $('btnLine'),
      btnMeter = $('btnMeter'), meterShow = $('meterShow'), meterPop = $('meterPop'),
      btnPlay = $('btnPlay'), btnUndo = $('btnUndo'), btnClear = $('btnClear'),
      btnAddRow = $('btnAddRow'), btnDelRow = $('btnDelRow'), btnMenu = $('btnMenu');
  var drawer = $('drawer'), backdrop = $('backdrop'), btnClose = $('btnClose'), songNameEl = $('songName'),
      btnSave = $('btnSave'), saveHint = $('saveHint'), songsEl = $('songs'), themesEl = $('themes'),
      autoSec = $('autoSec'), autoEl = $('autosave'), melodiesEl = $('melodies'),
      tempoEl = $('tempo'), tempoOut = $('tempoOut'),
      btnLensToggle = $('btnLensToggle'), lensToggleState = $('lensToggleState');

  /* ---------- Speicher ---------- */
  function emptyRows() { var rs = []; for (var i = 0; i < START_ROWS; i++) rs.push([]); return rs; }
  // Ein Platz ist
  //   null              leer (ein stiller Schlag innerhalb der Zeile)
  //   { n, h, d? }      bunter Punkt; d nur, wenn ein Notenwert darunter ergänzt wurde (sonst ein Schlag)
  //   { k: 'b', d }     eigenständiges Notenzeichen ohne Tonhöhe (klingt als Klopfen)
  //   { k: 'r', d }     Pause
  // Jeder Platz kann zusätzlich bar tragen: 1 = Taktstrich davor, 2 = Schlussstrich davor; ein leerer Platz damit ist z. B. { bar: 1 }.
  // Die Notenlinie einer Zeile steht als Eigenschaft line am Zeilen-Array und wird beim Speichern als lines mitgegeben.
  function cleanCell(c) {
    if (!c) return null;
    var o = null;
    if (c.n != null) {
      if (BY[c.n]) {
        o = { n: c.n, h: (c.h === 'r' || c.h === 'l') ? c.h : '' };
        if (DUR_BY[c.d]) o.d = c.d;
      }
    } else if (DUR_BY[c.d]) o = { k: c.k === 'b' ? 'b' : 'r', d: c.d };
    if (c.bar) { o = o || {}; o.bar = c.bar === 2 ? 2 : 1; }
    return o;
  }
  // Zeilen-Eigenschaften: line (Notenlinie) und meter (Taktart, z. B. '3/4').
  // Gespeichert als lines: pro Zeile 0, 1 (nur Linie, älteres Format) oder { l, m }.
  function attachLines(rs, lines) {
    rs.forEach(function (row, r) {
      var v = Array.isArray(lines) ? lines[r] : 0;
      row.line = v === 1 || !!(v && v.l);
      row.meter = v && METERS.indexOf(v.m) >= 0 ? v.m : '';
    });
    return rs;
  }
  // Prüft gespeicherte Zeilen und liefert eine saubere Kopie (oder null).
  // Ältere Stände hatten immer 8 Plätze pro Zeile; leere Plätze hinter dem letzten Ton fallen weg.
  function cleanRows(raw, lines) {
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ROWS) return null;
    for (var i = 0; i < raw.length; i++) if (!Array.isArray(raw[i]) || raw[i].length > MAX_LEN) return null;
    var rs = raw.map(function (row) { return row.map(cleanCell); });
    var lastRow = -1;
    rs.forEach(function (row, r) { if (row.some(Boolean)) lastRow = r; });
    rs.forEach(function (row, r) {
      if (r > lastRow) row.length = 0;
      else if (r === lastRow) while (!row[row.length - 1]) row.pop();
    });
    return attachLines(rs, lines);
  }
  function packLines(rs) {
    return rs.map(function (row) {
      if (!row.meter) return row.line ? 1 : 0;
      return { l: row.line ? 1 : 0, m: row.meter };
    });
  }
  function readJSON(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function load() {
    var d = readJSON(KEY);
    var r = d && cleanRows(d.rows, d.lines);
    return r ? { rows: r, name: typeof d.name === 'string' ? d.name : '' } : null;
  }
  function save() { writeJSON(KEY, { rows: rows, lines: packLines(rows), name: name }); }

  function loadSongs() {
    var list = readJSON(SONGS_KEY);
    if (!Array.isArray(list)) return [];
    return list.filter(function (s) { return s && typeof s.name === 'string' && cleanRows(s.rows); })
      .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
  }
  function loadSettings() {
    var s = readJSON(SETTINGS_KEY) || {};
    return {
      theme: THEME_BY[s.theme] ? s.theme : 'original',
      tempo: (s.tempo >= 50 && s.tempo <= 160) ? s.tempo : 90,
      lens: s.lens !== false // Notenzeichen unter den Tönen anzeigen
    };
  }
  function saveSettings() { writeJSON(SETTINGS_KEY, settings); }

  // Ein einziger Autosave-Platz: hält die Tafel, die zuletzt durch Laden oder „Alles löschen“ ersetzt wurde
  function loadAuto() {
    var a = readJSON(AUTO_KEY);
    var r = a && cleanRows(a.rows, a.lines);
    return r ? { rows: r, lines: packLines(r), name: typeof a.name === 'string' ? a.name : '', savedAt: a.savedAt || 0 } : null;
  }
  function stashCurrent() {
    if (!hasNotes()) return;
    writeJSON(AUTO_KEY, { rows: rows, lines: packLines(rows), name: name, savedAt: Date.now() });
  }

  var saved = load();
  // Ohne gespeicherten Stand startet die Tafel leer
  var rows = saved ? saved.rows : emptyRows();
  var name = saved ? saved.name : '';
  var settings = loadSettings();
  var sel = { r: 0, c: 0 };
  var hist = [];
  var insertMode = false;
  var clean = false; // „Fertig“: Markierung und leere Plätze ausgeblendet

  function isNote(c) { return !!(c && c.n); }
  function isBeat(c) { return !!(c && c.k === 'b'); }
  function isRest(c) { return !!(c && c.k === 'r'); }
  function filled(c) { return isNote(c) || !!(c && c.k); }
  function sounds(c) { return isNote(c) || isBeat(c); }
  function dur(c) { return (c && c.d) || 1; }
  function hasNotes() { return rows.some(function (row) { return row.some(filled); }); }
  // Platz hinter dem letzten Ton der letzten beschriebenen Zeile (Startposition)
  function appendPos() {
    for (var r = rows.length - 1; r >= 0; r--) if (rows[r].some(Boolean)) return { r: r, c: rows[r].length };
    return { r: 0, c: 0 };
  }
  // Setzt einen Platz; liegt er hinter dem Zeilenende, wird die Lücke mit Pausen aufgefüllt
  function put(r, c, v) {
    var row = rows[r];
    while (row.length < c) row.push(null);
    row[c] = v;
  }
  // Ersetzt den Inhalt eines Platzes; ein Taktstrich davor bleibt stehen
  function setCell(r, c, v) {
    var prev = rows[r][c];
    if (prev && prev.bar) { v = v || {}; v.bar = prev.bar; }
    put(r, c, v);
  }
  // Inhalt eines Platzes ohne Taktstrich (zum Verschieben)
  function content(c) {
    if (!filled(c)) return null;
    var o = {};
    for (var k in c) if (k !== 'bar') o[k] = c[k];
    return o;
  }
  // Leere Plätze am Zeilenende fallen weg (ein leerer Platz mit Taktstrich bleibt)
  function trimRow(r) { var row = rows[r]; while (row.length && !row[row.length - 1]) row.pop(); }
  // Ein Platz weiter in derselben Zeile – auch beim Austauschen, damit man mehrere Töne am Stück korrigieren kann.
  // Am Ende einer vollen Zeile bleibt die Markierung stehen.
  function advance() {
    if (sel.c + 1 < MAX_LEN) { sel = { r: sel.r, c: sel.c + 1 }; return true; }
    toast('Die Zeile ist voll (' + MAX_LEN + ' Plätze). Mit „Umbruch“ geht es in der nächsten Zeile weiter.', true);
    return false;
  }
  function snap() {
    hist.push(JSON.stringify({ rows: rows, lines: packLines(rows), sel: sel, name: name }));
    if (hist.length > 60) hist.shift();
  }

  /* ---------- Darstellung ---------- */
  function colorStyle(n) { return '--c:' + (THEME_BY[settings.theme].colors[n.id] || n.bg); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function inner(n) {
    var arrow = n.up
      ? '<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '';
    return arrow + '<span class="ltr">' + n.l + (n.sharp ? '<span class="sharp">♯</span>' : '') + '</span>';
  }
  // Noten- und Pausenzeichen, alle im selben Rahmen (22 × 30), damit Hals und Balken sauber anschließen.
  // beam: Achtel ohne Fähnchen, der Balken zur nächsten Achtel kommt aus dem CSS.
  var HEAD = 'cx="9.4" cy="24.6" transform="rotate(-22 9.4 24.6)"';
  function noteSym(d, beam) {
    var s;
    if (d === 4) s = '<ellipse cx="11" cy="24.6" rx="6.4" ry="4.3" fill="none" stroke-width="2.6"/>';
    else {
      s = '<path d="M14 24V2.5" stroke-width="2.4"/>' + (d >= 2
        ? '<ellipse ' + HEAD + ' rx="4.5" ry="3.1" fill="none" stroke-width="2.4"/>'
        : '<ellipse ' + HEAD + ' rx="5.3" ry="3.8" fill="currentColor" stroke="none"/>');
      if (d === 0.5 && !beam) s += '<path d="M14 2.5c.5 5 7 6.5 5.2 14" fill="none" stroke-width="2.2"/>';
      if (d === 3) s += '<circle cx="19.8" cy="25" r="1.9" fill="currentColor" stroke="none"/>';
    }
    return '<svg class="sym" viewBox="0 0 22 30" stroke="currentColor" stroke-linecap="round" aria-hidden="true">' + s + '</svg>';
  }
  function restSym(d) {
    var s = {
      0.5: '<circle cx="8.5" cy="11" r="2.6" fill="currentColor" stroke="none"/><path d="M8 13.2c3 .8 5.5-.3 7.5-3L10 25" fill="none" stroke-width="2"/>',
      1: '<path d="M8.5 3.5l5.5 6.5-4.5 5 5.5 6c-3.5-1.5-7-.3-4.5 4" fill="none" stroke-width="2.4" stroke-linejoin="round"/>',
      2: '<path d="M3 18.5h16" stroke-width="1.8"/><rect x="6" y="13" width="10" height="5.5" fill="currentColor" stroke="none"/>',
      3: '<path d="M2 18.5h14" stroke-width="1.8"/><rect x="4.5" y="13" width="9" height="5.5" fill="currentColor" stroke="none"/><circle cx="19" cy="15.5" r="1.9" fill="currentColor" stroke="none"/>',
      4: '<path d="M3 11.5h16" stroke-width="1.8"/><rect x="6" y="11.5" width="10" height="5.5" fill="currentColor" stroke="none"/>'
    }[d];
    return '<svg class="sym" viewBox="0 0 22 30" stroke="currentColor" stroke-linecap="round" aria-hidden="true">' + s + '</svg>';
  }

  // beam: 1 = Achtel mit Balken zur nächsten, 2 = Achtel am Ende eines Balkens.
  // line: Lage auf der Notenlinie der Zeile ('first', 'mid', 'last' oder leer)
  // Taktart als zwei Zahlen übereinander
  function meterHTML(m) {
    var p = m.split('/');
    return '<span class="mtr"><span>' + p[0] + '</span><span>' + p[1] + '</span></span>';
  }
  function cellHTML(cell, r, c, beyond, beam, line, meter) {
    var isSel = sel.r === r && sel.c === c;
    var where = 'Zeile ' + (r + 1) + ', Platz ' + (c + 1);
    var dot, label, len = '', stackCls = '';
    if (isNote(cell)) {
      var n = BY[cell.n];
      dot = '<div class="dot' + (n.up ? ' up' : '') + '" style="' + colorStyle(n) + '">' + inner(n) + '</div>';
      label = where + ': ' + n.n + (cell.d ? ', ' + DUR_BY[cell.d].n : '') + (cell.h === 'r' ? ', rechts' : cell.h === 'l' ? ', links' : '');
      if (cell.d) len = noteSym(cell.d, beam);
    } else if (isBeat(cell)) {
      dot = '<div class="dot beat">' + noteSym(cell.d, beam) + '</div>';
      label = where + ': ' + DUR_BY[cell.d].n;
      if (beam === 1) stackCls = ' bbeam';
    } else if (isRest(cell)) {
      dot = '<div class="dot rest">' + restSym(cell.d) + '</div>';
      label = where + ': ' + DUR_BY[cell.d].p;
    } else {
      dot = '<div class="dot ghost"></div>';
      label = where + ': leer';
    }
    if (cell && cell.bar) label += cell.bar === 2 ? ', Schlussstrich davor' : ', Taktstrich davor';
    var hand = (isNote(cell) && cell.h) ? '<span class="hand ' + cell.h + '">' + cell.h + '</span>' : '<span class="hand"></span>';
    return '<div class="cell' + (isSel ? ' sel' : '') + (beyond ? ' beyond' : '') +
      (line ? ' line-' + line : '') + (meter ? ' has-meter' : '') + '" data-r="' + r + '" data-c="' + c + '" role="button" tabindex="0" aria-label="' + label + '">' +
      '<div class="stack' + stackCls + '">' + (meter ? '<span class="meter" aria-label="Taktart ' + meter + '">' + meterHTML(meter) + '</span>' : '') +
      (cell && cell.bar ? '<span class="barline' + (cell.bar === 2 ? ' final' : '') + '"></span>' : '') + dot +
      '<span class="len' + (beam === 1 && isNote(cell) ? ' beam' : '') + '">' + len + '</span>' + hand + '</div></div>';
  }
  // Zwei Achtel hintereinander bekommen einen gemeinsamen Balken – bunte Punkte untereinander, eigenständige Notenzeichen untereinander
  function beams(row) {
    var b = [];
    function eighth(x) { return x && x.d === 0.5 && (isNote(x) || isBeat(x)); }
    for (var c = 0; c + 1 < row.length; c++) {
      var a = row[c], z = row[c + 1];
      if (eighth(a) && eighth(z) && isNote(a) === isNote(z)) { b[c] = 1; b[c + 1] = 2; c++; }
    }
    return b;
  }
  // Die Notenlinie läuft vom ersten bis zum letzten Zeichen der Zeile
  function lineSpan(row) {
    var last = -1;
    row.forEach(function (x, c) { if (filled(x)) last = c; });
    return last;
  }

  // Alle Zeilen haben so viele Plätze wie die längste Zeile plus einen freien Platz.
  // Kürzere Zeilen zeigen dahinter blasse Plätze, über die man auch Pausen setzen kann.
  function colCount() {
    var n = sel.c + 1;
    rows.forEach(function (row) { n = Math.max(n, row.length + 1); });
    return Math.min(n, MAX_LEN);
  }
  // Passt die Tafel nicht mehr in die Breite, darf man sie seitlich wischen
  function updateWide() { grid.classList.toggle('wide', board.scrollWidth > board.clientWidth + 1); }

  function render() {
    var cols = colCount();
    grid.style.setProperty('--rows', rows.length);
    grid.style.setProperty('--cols', cols);
    // Steht irgendwo eine Taktart, bekommt die Spalte vor den Plätzen in allen Zeilen Platz dafür
    grid.classList.toggle('meters', rows.some(function (row) { return row.meter; }));
    grid.classList.toggle('inserting', insertMode);
    grid.classList.toggle('clean', clean);
    grid.classList.toggle('nolen', !settings.lens);
    grid.innerHTML = rows.map(function (row, r) {
      var cells = '', b = beams(row), last = row.line ? lineSpan(row) : -1;
      for (var c = 0; c < cols; c++) {
        var line = c > last ? '' : last === 0 ? 'one' : c === 0 ? 'first' : c === last ? 'last' : 'mid';
        cells += cellHTML(row[c] || null, r, c, c >= row.length, b[c], line, c === 0 ? row.meter : '');
      }
      return '<div class="row"><span class="rownum">' + (r + 1) + '</span>' + cells + '</div>';
    }).join('');
    updateWide();
    if (play && play.cur) markPlaying(play.cur.r, play.cur.c);

    var cur = rows[sel.r] && rows[sel.r][sel.c];
    btnR.classList.toggle('on', isNote(cur) && cur.h === 'r');
    btnL.classList.toggle('on', isNote(cur) && cur.h === 'l');
    btnR.disabled = btnL.disabled = !isNote(cur);
    renderValues(cur);
    var hasBar = !!(cur && cur.bar === 1), hasEnd = !!(cur && cur.bar === 2), hasLine = !!rows[sel.r].line;
    btnBar.classList.toggle('on', hasBar);
    btnBar.setAttribute('aria-pressed', hasBar ? 'true' : 'false');
    btnEnd.classList.toggle('on', hasEnd);
    btnEnd.setAttribute('aria-pressed', hasEnd ? 'true' : 'false');
    btnLine.classList.toggle('on', hasLine);
    btnLine.setAttribute('aria-pressed', hasLine ? 'true' : 'false');
    var meter = rows[sel.r].meter;
    meterShow.innerHTML = meter ? meterHTML(meter) : '<span class="mtr off"><span>?</span><span>?</span></span>';
    btnMeter.classList.toggle('on', !!meter);
    btnIns.classList.toggle('on', insertMode);
    btnIns.setAttribute('aria-pressed', insertMode ? 'true' : 'false');
    delLabel.textContent = insertMode ? 'Lücke zu' : 'entfernen';
    btnDel.disabled = insertMode ? sel.c >= rows[sel.r].length : !filled(cur);
    btnBreak.disabled = rows.length >= MAX_ROWS && !canStepDown();
    btnDone.classList.toggle('on', clean);
    btnDone.setAttribute('aria-pressed', clean ? 'true' : 'false');
    btnUndo.disabled = hist.length === 0;
    btnAddRow.disabled = rows.length >= MAX_ROWS;
    btnDelRow.disabled = rows.length <= 1;
  }
  // Jede Änderung blendet die Markierung wieder ein
  function commit() { stopPlay(); clean = false; save(); render(); }

  // Kurze Einblendung unten auf der Tafel – verschiebt nichts im Layout
  var toastTimer = null;
  function toast(text, warn) {
    clearTimeout(toastTimer);
    toastEl.textContent = text;
    toastEl.classList.toggle('warn', !!warn);
    toastEl.hidden = false;
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }

  /* ---------- Aktionen ---------- */
  // Bunter Punkt. Beim Austauschen bleiben r/l und ein Notenwert erhalten, damit der Rhythmus stimmt
  // (auch wenn vorher ein eigenständiges Notenzeichen dort stand).
  function placeNote(id) {
    if (insertMode) { insertCell({ n: id, h: '' }); return; }
    snap();
    var prev = rows[sel.r][sel.c], v = { n: id, h: isNote(prev) ? prev.h : '' };
    if (isNote(prev) || isBeat(prev)) { if (prev.d) v.d = prev.d; }
    setCell(sel.r, sel.c, v);
    advance();
    commit();
  }
  // Notenwert: Auf einem bunten Punkt kommt er darunter, sonst wird das Notenzeichen eigenständig eingesetzt
  function placeValue(d) {
    var prev = rows[sel.r][sel.c];
    if (insertMode) { insertCell({ k: 'b', d: d }); return; }
    snap();
    if (isNote(prev)) prev.d = d;
    else setCell(sel.r, sel.c, { k: 'b', d: d });
    advance();
    commit();
  }
  function placeRest(d) {
    if (insertMode) { insertCell({ k: 'r', d: d }); return; }
    snap();
    setCell(sel.r, sel.c, { k: 'r', d: d });
    advance();
    commit();
  }
  // Fügt an der Markierung ein; der Rest der Zeile rückt einen Platz weiter
  function insertCell(v) {
    var row = rows[sel.r];
    if (row.length >= MAX_LEN) {
      toast('Die Zeile ist voll (' + MAX_LEN + ' Plätze). Entferne zuerst einen Ton oder mach einen Umbruch.', true);
      return;
    }
    snap();
    if (sel.c >= row.length) put(sel.r, sel.c, v);
    else row.splice(sel.c, 0, v);
    advance();
    commit();
  }
  // Taktstrich (kind 1) oder Schlussstrich (kind 2) vor dem markierten Platz setzen, umstellen oder entfernen
  function toggleBar(kind) {
    snap();
    var cell = rows[sel.r][sel.c];
    if (cell && cell.bar === kind) {
      delete cell.bar;
      if (!filled(cell)) rows[sel.r][sel.c] = null;
      trimRow(sel.r);
    } else if (cell) cell.bar = kind;
    else put(sel.r, sel.c, { bar: kind });
    commit();
  }
  function toggleLine() {
    snap();
    rows[sel.r].line = !rows[sel.r].line;
    commit();
  }
  // Taktart der markierten Zeile ('' = ohne)
  function setMeter(m) {
    closeMeterPop();
    if (rows[sel.r].meter === m) return;
    snap();
    rows[sel.r].meter = m;
    commit();
  }
  // Umbruch: Die Markierung und alles dahinter rutscht in eine neue Zeile darunter.
  // Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
  function canStepDown() {
    return sel.c >= rows[sel.r].length && sel.r + 1 < rows.length && rows[sel.r + 1].length === 0;
  }
  function lineBreak() {
    if (canStepDown()) { sel = { r: sel.r + 1, c: 0 }; clean = false; render(); return; }
    if (rows.length >= MAX_ROWS) return;
    snap();
    var rest = rows[sel.r].splice(sel.c);
    rest.line = rows[sel.r].line;
    rows.splice(sel.r + 1, 0, rest);
    sel = { r: sel.r + 1, c: 0 };
    commit();
  }
  function setHand(h) {
    var cell = rows[sel.r][sel.c];
    if (!isNote(cell)) return;
    snap();
    cell.h = cell.h === h ? '' : h;
    commit();
  }
  function deleteCell() {
    if (insertMode) { closeGap(); return; }
    var row = rows[sel.r];
    if (!filled(row[sel.c])) return;
    snap();
    setCell(sel.r, sel.c, null);
    // Ein entfernter Ton am Zeilenende hinterlässt keine Pause
    if (sel.c === row.length - 1) trimRow(sel.r);
    commit();
  }
  // Entfernt den Platz an der Markierung; der Rest der Zeile rückt nach vorne
  function closeGap() {
    var row = rows[sel.r];
    if (sel.c >= row.length) return;
    snap();
    row.splice(sel.c, 1);
    commit();
  }
  function undo() {
    var s = hist.pop();
    if (!s) return;
    var d = JSON.parse(s);
    rows = attachLines(d.rows, d.lines); sel = d.sel; name = d.name || '';
    commit();
  }
  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    snap(); rows.push([]); commit();
  }
  function delRow() {
    if (rows.length <= 1) return;
    snap(); rows.pop();
    if (sel.r >= rows.length) sel = appendPos();
    commit();
  }
  function clearAll() {
    snap();
    stashCurrent();
    rows = emptyRows();
    name = ''; sel = { r: 0, c: 0 };
    commit();
  }

  /* ---------- „Nochmal tippen“-Bestätigung ---------- */
  var armed = null;
  function disarm() {
    if (!armed) return;
    clearTimeout(armed.timer);
    armed.btn.classList.remove('confirm');
    armed.btn.innerHTML = armed.html;
    armed = null;
  }
  // Erster Tipp färbt den Knopf rot, ein zweiter innerhalb von 3,5 s führt run aus
  function confirmTap(btn, text, run) {
    if (armed && armed.btn === btn) { disarm(); run(); return; }
    disarm();
    armed = { btn: btn, html: btn.innerHTML, timer: setTimeout(disarm, 3500) };
    btn.classList.add('confirm');
    btn.textContent = text;
  }

  /* ---------- Abspielen ---------- */
  var audio = null, play = null;
  var PLAY_HTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>Abspielen';
  var STOP_HTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>Stopp';

  function audioCtx() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  // Kurzes Klopfen für eigenständige Notenzeichen (wie ein Holzblock)
  function knock(out, t0) {
    var o = audio.createOscillator(), g = audio.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(1100, t0);
    o.frequency.exponentialRampToValueAtTime(550, t0 + 0.06);
    g.gain.setValueAtTime(0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + 0.12);
  }
  function tone(out, freq, t0, dur) {
    var o = audio.createOscillator(), g = audio.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
    g.gain.setValueAtTime(0.5, t0 + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  function markPlaying(r, c) {
    var old = grid.querySelector('.cell.playing');
    if (old) old.classList.remove('playing');
    if (r < 0) return;
    var el = grid.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
    if (el) el.classList.add('playing');
  }
  // Spielt die Tafel Zeile für Zeile bis zur letzten Note; leere Plätze innerhalb einer Zeile sind Pausen
  function startPlay() {
    // t = Startzeit in Schlägen; leere Plätze zählen einen Schlag
    var seq = [], last = -1, t = 0, end = 0;
    rows.forEach(function (row, r) {
      row.forEach(function (cell, c) {
        seq.push({ cell: cell, r: r, c: c, t: t });
        t += dur(cell);
        if (sounds(cell)) { last = seq.length - 1; end = t; }
      });
    });
    if (last < 0) { toast('Noch keine Töne auf der Tafel.', true); return; }
    var ctx = audioCtx();
    if (!ctx) { toast('Abspielen wird von diesem Browser nicht unterstützt.', true); return; }
    var out = ctx.createGain();
    out.gain.value = 0.6;
    out.connect(ctx.destination);
    var step = 60 / settings.tempo, t0 = ctx.currentTime + 0.08;
    play = { out: out, timers: [], cur: null };
    seq.slice(0, last + 1).forEach(function (s) {
      if (isNote(s.cell)) tone(out, BY[s.cell.n].f, t0 + s.t * step, dur(s.cell) * step * 0.9);
      else if (isBeat(s.cell)) knock(out, t0 + s.t * step);
      var pos = { r: s.r, c: s.c };
      play.timers.push(setTimeout(function () {
        play.cur = pos;
        markPlaying(pos.r, pos.c);
      }, (t0 - ctx.currentTime + s.t * step) * 1000));
    });
    play.timers.push(setTimeout(stopPlay, (t0 - ctx.currentTime + end * step) * 1000));
    btnPlay.innerHTML = STOP_HTML;
    btnPlay.classList.add('on');
  }
  function stopPlay() {
    if (!play) return;
    play.timers.forEach(clearTimeout);
    try { play.out.disconnect(); } catch (e) {}
    play = null;
    markPlaying(-1);
    btnPlay.innerHTML = PLAY_HTML;
    btnPlay.classList.remove('on');
  }

  /* ---------- Leiste ---------- */
  function noteBtn(n) {
    return '<button type="button" class="note' + (n.up ? ' up' : '') + '" data-id="' + n.id +
      '" style="' + colorStyle(n) + '" aria-label="' + n.n + '">' + inner(n) + '</button>';
  }
  function renderPalette() {
    palette.innerHTML = GROUPS.map(function (g) {
      return '<div class="pal">' + g.map(function (id) { return noteBtn(BY[id]); }).join('') + '</div>';
    }).join('');
  }
  palette.addEventListener('click', function (e) {
    var b = e.target.closest('.note');
    if (b) placeNote(b.dataset.id);
  });
  // Notenwerte und Pausenwerte; hervorgehoben ist der Wert des markierten Platzes
  function valueBtns(on, sym, names) {
    return DURS.map(function (x) {
      return '<button type="button" class="btn' + (x.d === on ? ' on' : '') + '" data-d="' + x.d + '" title="' + x[names] +
        '" aria-label="' + x[names] + '">' + sym(x.d) + '<span class="small">' + x.l + '</span></button>';
    }).join('');
  }
  function renderValues(cur) {
    valuesEl.innerHTML = valueBtns((isNote(cur) || isBeat(cur)) && cur.d, noteSym, 'n');
    restsEl.innerHTML = valueBtns(isRest(cur) && cur.d, restSym, 'p');
  }
  valuesEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (b) placeValue(+b.dataset.d);
  });
  restsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-d]');
    if (b) placeRest(+b.dataset.d);
  });
  btnBar.addEventListener('click', function () { toggleBar(1); });
  btnEnd.addEventListener('click', function () { toggleBar(2); });
  btnLine.addEventListener('click', toggleLine);

  // Auswahl der Taktart: kleines Feld unter den Werkzeugen
  function openMeterPop() {
    var cur = rows[sel.r].meter;
    meterPop.innerHTML = [''].concat(METERS).map(function (m) {
      return '<button type="button" class="btn' + (m === cur ? ' on' : '') + '" data-m="' + m + '" aria-label="' + (m ? 'Taktart ' + m : 'ohne Taktart') + '">' +
        (m ? meterHTML(m) : '<span class="small">ohne</span>') + '</button>';
    }).join('');
    meterPop.hidden = false;
    btnMeter.setAttribute('aria-expanded', 'true');
  }
  function closeMeterPop() {
    meterPop.hidden = true;
    btnMeter.setAttribute('aria-expanded', 'false');
  }
  btnMeter.addEventListener('click', function () { if (meterPop.hidden) openMeterPop(); else closeMeterPop(); });
  meterPop.addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]');
    if (b) setMeter(b.dataset.m);
  });
  // Ein Tipp irgendwo anders schließt die Auswahl
  document.addEventListener('pointerdown', function (e) {
    if (!meterPop.hidden && !meterPop.contains(e.target) && !btnMeter.contains(e.target)) closeMeterPop();
  });

  btnR.addEventListener('click', function () { setHand('r'); });
  btnL.addEventListener('click', function () { setHand('l'); });
  btnIns.addEventListener('click', function () { insertMode = !insertMode; clean = false; render(); });
  btnDel.addEventListener('click', deleteCell);
  btnBreak.addEventListener('click', lineBreak);
  btnDone.addEventListener('click', function () { clean = !clean; render(); });
  btnPlay.addEventListener('click', function () { if (play) stopPlay(); else startPlay(); });
  btnUndo.addEventListener('click', undo);
  btnAddRow.addEventListener('click', addRow);
  btnDelRow.addEventListener('click', function () {
    var hasNotes = rows[rows.length - 1].some(Boolean);
    if (hasNotes) confirmTap(btnDelRow, 'Sicher? Nochmal', delRow);
    else delRow();
  });
  btnClear.addEventListener('click', function () { confirmTap(btnClear, 'Sicher? Nochmal tippen', clearAll); });

  /* ---------- Menü ---------- */
  function hint(text, warn) {
    saveHint.textContent = text;
    saveHint.classList.toggle('warn', !!warn);
  }
  function renderSongs() {
    disarm();
    var list = loadSongs();
    if (!list.length) {
      songsEl.innerHTML = '<li><p class="empty">Noch keine Lieder gespeichert.</p></li>';
      return;
    }
    songsEl.innerHTML = list.map(function (s, i) {
      var date = s.savedAt ? new Date(s.savedAt).toLocaleDateString('de-DE') : '';
      return '<li class="song' + (s.name === name ? ' current' : '') + '">' +
        '<span class="name">' + esc(s.name) + '<span class="date">' + date + '</span></span>' +
        '<button type="button" class="btn" data-load="' + i + '">Laden</button>' +
        '<button type="button" class="btn danger" data-del="' + i + '">Löschen</button></li>';
    }).join('');
  }
  function renderMelodies() {
    melodiesEl.innerHTML = MELODIES.map(function (m, i) {
      return '<li class="song one' + (m.name === name ? ' current' : '') + '"><span class="name">' + esc(m.name) + '</span>' +
        '<button type="button" class="btn" data-melody="' + i + '">Laden</button></li>';
    }).join('');
  }
  function renderAuto() {
    var a = loadAuto();
    autoSec.hidden = !a;
    if (!a) return;
    var when = a.savedAt ? new Date(a.savedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '';
    autoEl.innerHTML = '<span class="name">' + esc(a.name || 'Ohne Namen') + '<span class="date">' + when + '</span></span>' +
      '<button type="button" class="btn" data-auto>Laden</button>';
  }
  function renderThemes() {
    themesEl.innerHTML = THEMES.map(function (t) {
      var sw = ['C', 'D', 'E', 'F', 'C+', 'D+', 'E+', 'F+'].map(function (id) {
        return '<span style="--c:' + (t.colors[id] || BY[id].bg) + '"></span>';
      }).join('');
      return '<button type="button" class="btn theme' + (t.id === settings.theme ? ' on' : '') + '" data-theme="' + t.id +
        '" aria-pressed="' + (t.id === settings.theme) + '">' + t.name +
        '<span class="desc">' + t.desc + '</span><span class="swatches">' + sw + '</span></button>';
    }).join('');
  }
  function saveSong() {
    var n = songNameEl.value.trim();
    if (!n) { hint('Bitte zuerst einen Namen eingeben.', true); songNameEl.focus(); return; }
    var list = loadSongs();
    var rest = list.filter(function (s) { return s.name.toLowerCase() !== n.toLowerCase(); });
    var doSave = function () {
      rest.unshift({ name: n, rows: rows, lines: packLines(rows), savedAt: Date.now() });
      if (!writeJSON(SONGS_KEY, rest)) { hint('Speichern hat nicht geklappt (Speicher voll oder gesperrt).', true); return; }
      name = n;
      save();
      renderSongs();
      hint('Gespeichert: „' + n + '“');
    };
    if (rest.length < list.length) confirmTap(btnSave, 'Ersetzen?', doSave);
    else doSave();
  }
  // Die bisherige Tafel wandert in den Autosave-Platz; beim Laden des Autosaves tauschen beide also die Plätze
  function loadSong(s) {
    snap();
    stashCurrent();
    rows = cleanRows(s.rows, s.lines);
    name = s.name;
    sel = appendPos();
    closeMenu();
    commit();
    toast('„' + (s.name || 'Ohne Namen') + '“ geladen. Die vorherige Tafel liegt im Menü unter „Zuletzt ersetzt“.');
  }
  function openMenu() {
    stopPlay();
    songNameEl.value = name;
    hint('');
    renderSongs();
    renderAuto();
    renderMelodies();
    renderThemes();
    renderLensToggle();
    tempoEl.value = settings.tempo;
    tempoOut.textContent = settings.tempo + ' pro Minute';
    backdrop.hidden = false;
    drawer.inert = false;
    drawer.classList.add('open');
    btnClose.focus();
  }
  function closeMenu() {
    disarm();
    songNameEl.blur();
    drawer.classList.remove('open');
    drawer.inert = true;
    backdrop.hidden = true;
  }
  btnMenu.addEventListener('click', openMenu);
  btnClose.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
  btnSave.addEventListener('click', saveSong);
  songNameEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveSong(); } });
  songNameEl.addEventListener('input', function () { if (armed && armed.btn === btnSave) disarm(); });
  songsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var list = loadSongs();
    if (b.dataset.load != null) { var s = list[+b.dataset.load]; if (s) loadSong(s); }
    else if (b.dataset.del != null) {
      var victim = list[+b.dataset.del];
      if (!victim) return;
      confirmTap(b, 'Sicher?', function () {
        writeJSON(SONGS_KEY, list.filter(function (s) { return s !== victim; }));
        renderSongs();
        hint('„' + victim.name + '“ gelöscht.');
      });
    }
  });
  melodiesEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-melody]');
    var m = b && MELODIES[+b.dataset.melody];
    if (m) { var rs = melodyRows(m); loadSong({ name: m.name, rows: rs, lines: packLines(rs) }); }
  });
  autoEl.addEventListener('click', function (e) {
    if (!e.target.closest('[data-auto]')) return;
    var a = loadAuto();
    if (a) loadSong(a);
  });
  themesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.theme');
    if (!b) return;
    settings.theme = b.dataset.theme;
    saveSettings();
    renderThemes();
    renderPalette();
    render();
  });
  function renderLensToggle() {
    btnLensToggle.classList.toggle('on', settings.lens);
    btnLensToggle.setAttribute('aria-pressed', settings.lens ? 'true' : 'false');
    lensToggleState.textContent = settings.lens ? 'an' : 'aus';
  }
  btnLensToggle.addEventListener('click', function () {
    settings.lens = !settings.lens;
    saveSettings();
    renderLensToggle();
    render();
  });
  tempoEl.addEventListener('input', function () {
    settings.tempo = +tempoEl.value;
    tempoOut.textContent = settings.tempo + ' pro Minute';
    saveSettings();
  });

  /* ---------- Tafel: antippen, ziehen zum Tauschen ---------- */
  var drag = null;
  function cellAt(x, y) {
    var t = document.elementFromPoint(x, y);
    var el = t && t.closest ? t.closest('.cell') : null;
    if (!el || !grid.contains(el)) return null;
    return { r: +el.dataset.r, c: +el.dataset.c, el: el };
  }
  function beginDrag() {
    var src = grid.querySelector('.cell[data-r="' + drag.r + '"][data-c="' + drag.c + '"]');
    var dotEl = src.querySelector('.dot');
    var rect = dotEl.getBoundingClientRect();
    var g = dotEl.cloneNode(true);
    g.classList.add('dragging');
    g.style.setProperty('--d', rect.width + 'px');
    document.body.appendChild(g);
    src.classList.add('lifting');
    drag.src = src; drag.ghost = g; drag.w = rect.width; drag.active = true;
  }
  grid.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var el = e.target.closest('.cell');
    if (!el) return;
    drag = { r: +el.dataset.r, c: +el.dataset.c, id: e.pointerId, x: e.clientX, y: e.clientY, active: false, over: null };
    try { grid.setPointerCapture(e.pointerId); } catch (_) {}
  });
  grid.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active) {
      if (!filled(rows[drag.r][drag.c])) return;
      if (clean) { clean = false; render(); }
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 12) return;
      beginDrag();
    }
    drag.ghost.style.transform = 'translate(' + (e.clientX - drag.w / 2) + 'px,' + (e.clientY - drag.w / 2) + 'px) scale(1.1)';
    var t = cellAt(e.clientX, e.clientY);
    var el = t ? t.el : null;
    if (drag.over && drag.over !== el) drag.over.classList.remove('drop');
    if (el && el !== drag.src) { el.classList.add('drop'); drag.over = el; } else { drag.over = null; }
  });
  function endDrag(e, cancel) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    try { grid.releasePointerCapture(e.pointerId); } catch (_) {}
    if (d.active) {
      d.ghost.remove();
      var t = cancel ? null : cellAt(e.clientX, e.clientY);
      if (t && (t.r !== d.r || t.c !== d.c)) {
        snap();
        var a = content(rows[d.r][d.c]), b = content(rows[t.r][t.c]);
        setCell(d.r, d.c, b);
        setCell(t.r, t.c, a);
        // Wird der letzte Ton einer Zeile weggezogen, wird die Zeile kürzer statt eine Pause zu behalten
        if (!b && d.c === rows[d.r].length - 1) trimRow(d.r);
        sel = { r: t.r, c: t.c };
        commit();
      } else { render(); }
    } else if (!cancel) {
      sel = { r: d.r, c: d.c };
      clean = false;
      render();
    }
  }
  grid.addEventListener('pointerup', function (e) { endDrag(e, false); });
  grid.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  grid.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  grid.addEventListener('keydown', function (e) {
    var el = e.target.closest ? e.target.closest('.cell') : null;
    if (!el) return;
    var r = +el.dataset.r, c = +el.dataset.c;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = { r: r, c: c }; render(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); sel = { r: r, c: c }; deleteCell(); }
    else return;
    var again = grid.querySelector('.cell.sel');
    if (again) again.focus();
  });

  btnPlay.innerHTML = PLAY_HTML;
  renderPalette();
  sel = appendPos();
  render();
})();
