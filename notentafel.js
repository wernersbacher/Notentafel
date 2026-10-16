(function () {
  'use strict';
  var COLS = 8, MAX_ROWS = 8, START_ROWS = 3;
  var KEY = 'notentafel.v1', SONGS_KEY = 'notentafel.songs.v1', SETTINGS_KEY = 'notentafel.settings.v1',
      AUTO_KEY = 'notentafel.autosave.v1';

  // f = Frequenz in Hz (C = c', hohe Töne eine Oktave darüber)
  var NOTES = [
    { id: 'C',   l: 'C',   bg: '#e5383b', ink: '#ffffff', n: 'C',  f: 261.63 },
    { id: 'D',   l: 'D',   bg: '#f58a1f', ink: '#2a1600', n: 'D',  f: 293.66 },
    { id: 'E',   l: 'E',   bg: '#f7d11e', ink: '#2a2300', n: 'E',  f: 329.63 },
    { id: 'F',   l: 'F',   bg: '#9bd74a', ink: '#16280a', n: 'F',  f: 349.23 },
    { id: 'G',   l: 'G',   bg: '#1e8449', ink: '#ffffff', n: 'G',  f: 392.00 },
    { id: 'A',   l: 'A',   bg: '#5a2d8c', ink: '#ffffff', n: 'A',  f: 440.00 },
    { id: 'H',   l: 'H',   bg: '#ec4899', ink: '#ffffff', n: 'H',  f: 493.88 },
    { id: 'C+',  l: 'C',   up: 1, bg: '#e5383b', ink: '#ffffff', n: 'hohes C', f: 523.25 },
    { id: 'D+',  l: 'D',   up: 1, bg: '#e5383b', ink: '#ffffff', n: 'hohes D', f: 587.33 },
    { id: 'E+',  l: 'E',   up: 1, bg: '#e5383b', ink: '#ffffff', n: 'hohes E', f: 659.25 },
    { id: 'F+',  l: 'F',   up: 1, bg: '#e5383b', ink: '#ffffff', n: 'hohes F', f: 698.46 },
    { id: 'Fis', l: 'Fis', long: 1, bg: '#9bd74a', ink: '#16280a', n: 'Fis', f: 369.99 },
    { id: 'B',   l: 'B',   bg: '#ec4899', ink: '#ffffff', n: 'B',  f: 466.16 }
  ];
  var BY = {};
  NOTES.forEach(function (n) { BY[n.id] = n; });
  var GROUPS = [['C', 'D', 'E', 'F', 'G', 'A', 'H'], ['C+', 'D+', 'E+', 'F+'], ['Fis', 'B']];

  // Farbthemen überschreiben nur einzelne Töne; alles andere kommt aus NOTES
  var THEMES = [
    { id: 'original', name: 'Original', desc: 'Hohe Töne sind alle rot.', colors: {} },
    { id: 'oktave', name: 'Oktavfarben', desc: 'Hohe Töne in der Farbe ihres Grundtons.', colors: {
      'D+': ['#f58a1f', '#2a1600'], 'E+': ['#f7d11e', '#2a2300'], 'F+': ['#9bd74a', '#16280a']
    } }
  ];
  // Mitgelieferte Lieder, immer im Menü ladbar. „-“ ist ein leerer Platz (Pause).
  // Bruder Jakob und Ode an die Freude stehen in F-Dur, weil der Tonvorrat unter dem C endet.
  var MELODIES = [
    { name: 'Alle meine Entchen', notes: 'C D E F G G A A A A G A A A A G F F F F E E D D D D C' },
    { name: 'Hänschen klein', notes: 'G E E F D D C D E F G G G G E E F D D C E G G C D D D D D E F E E E E E F G G E E F D D C E G G C' },
    { name: 'Kuckuck, Kuckuck', notes: 'G E G E F E D D D E F D E E F G E G E G E F E D C' },
    { name: 'Bruder Jakob', notes: 'F G A F F G A F A B C+ - A B C+ - C+ D+ C+ B A F C+ D+ C+ B A F F C F - F C F -' },
    { name: 'Morgen kommt der Weihnachtsmann', notes: 'C C G G A A G - F F E E D D C - G G F F E E D - G G F F E E D - C C G G A A G - F F E E D D C -' },
    { name: 'Ode an die Freude', notes: 'A A B C+ C+ B A G F F G A A G G - A A B C+ C+ B A G F F G A G F F - G G A F G A B A F G A B A G F G C A A B C+ C+ B A G F F G A G F F' }
  ];
  function melodyRows(m) {
    var f = m.notes.split(' ').map(function (id) { return id === '-' ? null : { n: id, h: '' }; });
    var rs = [];
    for (var i = 0; i < Math.max(START_ROWS * COLS, f.length); i += COLS) {
      var row = f.slice(i, i + COLS);
      while (row.length < COLS) row.push(null);
      rs.push(row);
    }
    return rs;
  }

  var THEME_BY = {};
  THEMES.forEach(function (t) { THEME_BY[t.id] = t; });

  var $ = function (id) { return document.getElementById(id); };
  var grid = $('grid'), toastEl = $('toast'), exampleEl = $('example'), palette = $('palette');
  var btnR = $('btnR'), btnL = $('btnL'), btnIns = $('btnIns'), btnDel = $('btnDel'), delLabel = $('delLabel'),
      btnPlay = $('btnPlay'), btnUndo = $('btnUndo'), btnClear = $('btnClear'),
      btnAddRow = $('btnAddRow'), btnDelRow = $('btnDelRow'), btnMenu = $('btnMenu');
  var drawer = $('drawer'), backdrop = $('backdrop'), btnClose = $('btnClose'), songNameEl = $('songName'),
      btnSave = $('btnSave'), saveHint = $('saveHint'), songsEl = $('songs'), themesEl = $('themes'),
      autoSec = $('autoSec'), autoEl = $('autosave'), melodiesEl = $('melodies'),
      tempoEl = $('tempo'), tempoOut = $('tempoOut');

  /* ---------- Speicher ---------- */
  function emptyRow() { var r = []; for (var i = 0; i < COLS; i++) r.push(null); return r; }
  function exampleRows() {
    var rows = []; for (var i = 0; i < START_ROWS; i++) rows.push(emptyRow());
    ['G', 'E', 'E', 'F', 'D', 'D', 'C', 'D', 'E', 'F', 'G', 'G', 'G'].forEach(function (id, i) {
      rows[Math.floor(i / COLS)][i % COLS] = { n: id, h: '' };
    });
    return rows;
  }
  // Prüft gespeicherte Zeilen und liefert eine saubere Kopie (oder null)
  function cleanRows(raw) {
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_ROWS) return null;
    for (var i = 0; i < raw.length; i++) if (!Array.isArray(raw[i]) || raw[i].length !== COLS) return null;
    return raw.map(function (row) {
      return row.map(function (c) {
        if (!c || !BY[c.n]) return null;
        return { n: c.n, h: (c.h === 'r' || c.h === 'l') ? c.h : '' };
      });
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
    var r = d && cleanRows(d.rows);
    return r ? { rows: r, example: !!d.example, name: typeof d.name === 'string' ? d.name : '' } : null;
  }
  function save() { writeJSON(KEY, { rows: rows, example: example, name: name }); }

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
      tempo: (s.tempo >= 50 && s.tempo <= 160) ? s.tempo : 90
    };
  }
  function saveSettings() { writeJSON(SETTINGS_KEY, settings); }

  // Ein einziger Autosave-Platz: hält die Tafel, die zuletzt durch Laden oder „Alles löschen“ ersetzt wurde
  function loadAuto() {
    var a = readJSON(AUTO_KEY);
    var r = a && cleanRows(a.rows);
    return r ? { rows: r, name: typeof a.name === 'string' ? a.name : '', savedAt: a.savedAt || 0 } : null;
  }
  function stashCurrent() {
    if (example || flatLast() < 0) return;
    writeJSON(AUTO_KEY, { rows: rows, name: name, savedAt: Date.now() });
  }

  var saved = load();
  var rows = saved ? saved.rows : exampleRows();
  var example = saved ? saved.example : true;
  var name = saved ? saved.name : '';
  var settings = loadSettings();
  var sel = { r: 0, c: 0 };
  var hist = [];
  var insertMode = false;

  function flatLast() {
    var last = -1;
    rows.forEach(function (row, r) { row.forEach(function (c, i) { if (c) last = r * COLS + i; }); });
    return last;
  }
  function flatten() { return [].concat.apply([], rows); }
  function unflatten(f) { rows = []; for (var i = 0; i < f.length; i += COLS) rows.push(f.slice(i, i + COLS)); }
  function selIndex() { return sel.r * COLS + sel.c; }
  // Platz hinter der letzten Note (Startposition)
  function appendPos() { return posAt(flatLast() + 1); }
  // Ein Platz hinter der Markierung – auch beim Austauschen, damit man mehrere Töne am Stück korrigieren kann
  function nextPos() { return posAt(selIndex() + 1); }
  // Am Ende der Tafel kommt (wenn erlaubt) eine Zeile dazu, sonst bleibt die Markierung auf dem letzten Platz.
  function posAt(pos) {
    if (pos >= rows.length * COLS) {
      if (rows.length < MAX_ROWS) rows.push(emptyRow());
      else pos = rows.length * COLS - 1;
    }
    return { r: Math.floor(pos / COLS), c: pos % COLS };
  }
  function snap() {
    hist.push(JSON.stringify({ rows: rows, example: example, sel: sel, name: name }));
    if (hist.length > 60) hist.shift();
  }

  /* ---------- Darstellung ---------- */
  function colorOf(n) {
    var o = THEME_BY[settings.theme].colors[n.id];
    return o ? { bg: o[0], ink: o[1] } : { bg: n.bg, ink: n.ink };
  }
  function colorStyle(n) { var c = colorOf(n); return '--c:' + c.bg + ';--ink:' + c.ink; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function inner(n) {
    var arrow = n.up
      ? '<svg class="arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '';
    return arrow + '<span class="ltr' + (n.long ? ' long' : '') + '">' + n.l + '</span>';
  }
  function cellHTML(cell, r, c) {
    var isSel = sel.r === r && sel.c === c;
    var where = 'Zeile ' + (r + 1) + ', Platz ' + (c + 1);
    var dot, label;
    if (cell) {
      var n = BY[cell.n];
      dot = '<div class="dot' + (n.up ? ' up' : '') + '" style="' + colorStyle(n) + '">' + inner(n) + '</div>';
      label = where + ': ' + n.n + (cell.h === 'r' ? ', rechts' : cell.h === 'l' ? ', links' : '');
    } else {
      dot = '<div class="dot ghost"></div>';
      label = where + ': leer';
    }
    var hand = (cell && cell.h) ? '<span class="hand ' + cell.h + '">' + cell.h + '</span>' : '<span class="hand"></span>';
    return '<div class="cell' + (isSel ? ' sel' : '') + '" data-r="' + r + '" data-c="' + c + '" role="button" tabindex="0" aria-label="' + label + '"><div class="stack">' + dot + hand + '</div></div>';
  }

  function render() {
    grid.style.setProperty('--rows', rows.length);
    grid.classList.toggle('inserting', insertMode);
    grid.innerHTML = rows.map(function (row, r) {
      return '<div class="row"><span class="rownum">' + (r + 1) + '</span>' +
        row.map(function (cell, c) { return cellHTML(cell, r, c); }).join('') + '</div>';
    }).join('');
    if (play && play.cur) markPlaying(play.cur.r, play.cur.c);

    var cur = rows[sel.r] && rows[sel.r][sel.c];
    exampleEl.hidden = !example;
    btnR.classList.toggle('on', !!cur && cur.h === 'r');
    btnL.classList.toggle('on', !!cur && cur.h === 'l');
    btnR.disabled = btnL.disabled = !cur;
    btnIns.classList.toggle('on', insertMode);
    btnIns.setAttribute('aria-pressed', insertMode ? 'true' : 'false');
    delLabel.textContent = insertMode ? 'Lücke zu' : 'entfernen';
    btnDel.disabled = insertMode ? selIndex() > flatLast() : !cur;
    btnUndo.disabled = hist.length === 0;
    btnAddRow.disabled = rows.length >= MAX_ROWS;
    btnDelRow.disabled = rows.length <= 1;
  }
  function commit() { stopPlay(); save(); render(); }

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
  var FULL_MSG = 'Ende der Tafel erreicht (' + MAX_ROWS + ' Zeilen). Ein weiterer Ton ersetzt den letzten.';

  function placeNote(id) {
    if (insertMode) { insertNote(id); return; }
    snap();
    var at = selIndex();
    var prev = rows[sel.r][sel.c];
    rows[sel.r][sel.c] = { n: id, h: prev ? prev.h : '' };
    example = false;
    sel = nextPos();
    commit();
    if (selIndex() === at) toast(FULL_MSG, true);
  }
  // Fügt den Ton an der Markierung ein und schiebt alle folgenden Töne einen Platz weiter
  function insertNote(id) {
    var f = flatten();
    var lastTaken = !!f[f.length - 1];
    if (lastTaken && rows.length >= MAX_ROWS) {
      toast('Kein Platz zum Einfügen – die Tafel ist voll. Entferne zuerst einen Ton.', true);
      return;
    }
    snap();
    if (lastTaken) f = f.concat(emptyRow());
    var at = selIndex();
    f.splice(at, 0, { n: id, h: '' });
    f.pop();
    unflatten(f);
    example = false;
    sel = nextPos();
    commit();
    if (selIndex() === at) toast(FULL_MSG, true);
  }
  function setHand(h) {
    var cell = rows[sel.r][sel.c];
    if (!cell) return;
    snap();
    cell.h = cell.h === h ? '' : h;
    example = false;
    commit();
  }
  function deleteCell() {
    if (insertMode) { closeGap(); return; }
    if (!rows[sel.r][sel.c]) return;
    snap();
    rows[sel.r][sel.c] = null;
    example = false;
    commit();
  }
  // Entfernt den Platz an der Markierung; alle folgenden Töne rücken nach vorne
  function closeGap() {
    var at = selIndex();
    if (at > flatLast()) return;
    snap();
    var f = flatten();
    f.splice(at, 1);
    f.push(null);
    unflatten(f);
    example = false;
    commit();
  }
  function undo() {
    var s = hist.pop();
    if (!s) return;
    var d = JSON.parse(s);
    rows = d.rows; example = d.example; sel = d.sel; name = d.name || '';
    commit();
  }
  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    snap(); rows.push(emptyRow()); commit();
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
    rows = []; for (var i = 0; i < START_ROWS; i++) rows.push(emptyRow());
    example = false; name = ''; sel = { r: 0, c: 0 };
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
  // Spielt die Tafel von vorne bis zur letzten Note; leere Plätze dazwischen sind Pausen
  function startPlay() {
    var last = flatLast();
    if (last < 0) { toast('Noch keine Töne auf der Tafel.', true); return; }
    var ctx = audioCtx();
    if (!ctx) { toast('Abspielen wird von diesem Browser nicht unterstützt.', true); return; }
    var out = ctx.createGain();
    out.gain.value = 0.6;
    out.connect(ctx.destination);
    var step = 60 / settings.tempo, t0 = ctx.currentTime + 0.08, f = flatten();
    play = { out: out, timers: [], cur: null };
    f.slice(0, last + 1).forEach(function (cell, i) {
      if (cell) tone(out, BY[cell.n].f, t0 + i * step, step * 0.9);
      var pos = { r: Math.floor(i / COLS), c: i % COLS };
      play.timers.push(setTimeout(function () {
        play.cur = pos;
        markPlaying(pos.r, pos.c);
      }, (t0 - ctx.currentTime + i * step) * 1000));
    });
    play.timers.push(setTimeout(stopPlay, (t0 - ctx.currentTime + (last + 1) * step) * 1000));
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

  btnR.addEventListener('click', function () { setHand('r'); });
  btnL.addEventListener('click', function () { setHand('l'); });
  btnIns.addEventListener('click', function () { insertMode = !insertMode; render(); });
  btnDel.addEventListener('click', deleteCell);
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
        var o = t.colors[id];
        return '<span style="--c:' + (o ? o[0] : BY[id].bg) + '"></span>';
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
      rest.unshift({ name: n, rows: rows, savedAt: Date.now() });
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
    rows = cleanRows(s.rows);
    name = s.name;
    example = false;
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
    if (m) loadSong({ name: m.name, rows: melodyRows(m) });
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
      if (!rows[drag.r][drag.c]) return;
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
        var a = rows[d.r][d.c];
        rows[d.r][d.c] = rows[t.r][t.c];
        rows[t.r][t.c] = a;
        example = false;
        sel = { r: t.r, c: t.c };
        commit();
      } else { render(); }
    } else if (!cancel) {
      sel = { r: d.r, c: d.c };
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
