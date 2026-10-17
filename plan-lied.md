# Plan: Bereich „Lied“ (echtes Notenblatt)

Neben *Melodie* und *Rhythmus* kommt ein dritter Bereich **Lied**. Er zeigt echte Noten auf fünf Notenlinien mit Violinschlüssel: Tonhöhe und Rhythmus zusammen, ohne bunte Punkte und ohne r/l. Melodie und Rhythmus bleiben unverändert.

Vorgehen in zwei Schritten:

1. **Phase 0:** Den Code technisch aufteilen, ohne dass sich etwas am Verhalten ändert. Danach gibt es einen gemeinsamen Kern, die bisherige Tafel (Melodie + Rhythmus) und einen leeren Bereich Lied. Die Bereiche hängen nicht voneinander ab.
2. **Phase 1–3:** Den Bereich Lied Schritt für Schritt bauen. Das Notenblatt ist von Anfang an das Kernstück, auch wenn es zuerst noch nicht perfekt aussieht.

---

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Darstellung | Echte Notenschrift: fünf Linien, Violinschlüssel, Notenköpfe in der Höhe nach Tonhöhe, Hälse, Fähnchen, Balken, Hilfslinien, Vorzeichen. Keine Farben, kein r/l. |
| Unabhängigkeit | Lied hat eigenes Datenmodell, eigene Darstellung, eigene Aktionen und eigenen Speicher. Lied und Tafel importieren nichts voneinander, beide nur aus `core/`. Ein Test prüft das. |
| Eingabe | Der **Wert wird vorgewählt** (wie ein Stift): Man wählt z. B. „Achtel“, jeder folgende Ton wird eine Achtel, bis man einen anderen Wert wählt. |
| Leiste | 5 Wert-Knöpfe statt 10. Selten Gebrauchtes (Taktart, Auftakt, Takt- und Schlussstrich, Automatik) liegt hinter **einem** Knopf „Takt …“ als aufklappbares Feld. |
| Notenwerte | Alle: Ganze, Halbe, Viertel, Achtel, Sechzehntel, jeweils mit Punkt (außer Sechzehntel), dazu die passenden Pausen und den Haltebogen. |
| Taktstriche/Zählzeiten automatisch | Erst einmal 1:1 wie in der Tafel (von Hand oder per Schalter automatisch). Verbessert wird später. |
| Auftakt | Kommt mit (Phase 2). |
| Balken nach Taktart, Haltebogen | Kommt mit (Phase 2). |
| Wiederholungen, 1./2. Ende | Erst einmal nicht. |
| Melodie | Bleibt genau so, wie sie ist. |
| Tonumfang | Alle Töne. Die Leiste zeigt die Stammtöne c–h, die Oktave wählt man dazu. |
| Vorzeichen | Frei an jeder Note: ♯, ♭ und ♮ schalten an der markierten Note um. |
| Zeilenumbruch | Erst einmal nur von Hand („Umbruch“), wie in der Tafel. |
| Notennamen | Lassen sich unter den Noten einblenden (Schalter im Menü). |
| Klang | Klavierähnlich (neuer Klang in `core/audio.js`). |

---

## Phase 0: Technisch aufteilen (Verhalten bleibt gleich) – erledigt

Ziel: Nach Phase 0 sieht man in der App nur einen neuen, leeren Reiter „Lied“ mit leeren Notenlinien. Melodie und Rhythmus verhalten sich genau wie vorher, alle bisherigen Tests laufen weiter und gespeicherte Stände bleiben erhalten.

### Neue Ordnerstruktur

```
js/
  main.js              Einstieg: Kern starten, Bereiche anmelden
  core/                gemeinsam, kennt keinen Bereich
    shell.js           Reiter, Bereich wechseln, gemeinsame Knöpfe an den offenen Bereich weiterreichen
    settings.js        gemeinsame Einstellungen: offener Bereich, Tempo, Bildschirm anlassen
    store.js           readJSON/writeJSON, Liederliste und Autosave allgemein (Schlüssel und Prüffunktion kommen vom Bereich)
    history.js         Rückgängig-Stapel allgemein (snap/restore über JSON)
    player.js          spielt einen fertigen Ablaufplan ab (siehe unten), Abspielen/Stopp-Knopf
    audio.js           unverändert (Glockenspiel, Klanghölzer)
    menu.js            Rahmen des Menüs: Speichern, gespeicherte Lieder, Zuletzt ersetzt, Tempo, Bildschirm
    ui.js, wake.js     unverändert
    dom.js             nur noch die Elemente des Kerns
  tafel/               Melodie und Rhythmus (der heutige Code, nur verschoben)
    area.js            meldet die Bereiche 'mel' und 'rhy' an
    config.js, model.js, theory.js, state.js, actions.js, board.js, sidebar.js,
    controls.js, input.js, symbols.js, melodies.js, storage.js, menu.js (Farben, Notenzeichen, Breite, Bekannte Lieder), dom.js
  lied/                neu, siehe Phase 1
    area.js            meldet den Bereich 'lied' an
css/
  base.css, side.css, menu.css   gemeinsam
  tafel.css                      heute board.css
  lied.css                       neu
```

### Schnittstelle eines Bereichs

Jeder Bereich meldet sich beim Kern mit einem Objekt an. Der Kern ruft nur diese Funktionen auf:

```js
{
  id: 'lied', label: 'Lied',
  panel, board,               // seine Elemente in der Leiste und auf der Tafel (der Kern blendet sie ein/aus)
  enter(), leave(),           // Tafel laden bzw. Markierung und Rückgängig parken
  render(),
  tools: { insert, del, brk, done, undo, clear, addRow?, delRow? },  // gemeinsame Knöpfe; fehlt einer, wird er ausgeblendet
  schedule(),                 // Ablaufplan fürs Abspielen
  markPlaying(pos),
  songs: { keys, clean, pack, load(song), saveAs(...) },   // für Speicher und Menü
  menuSections                // eigene Abschnitte im Menü (z. B. Farben, Bekannte Lieder)
}
```

Der **Ablaufplan** für den Player ist reine Daten: `[{ t, len, sound: 'bell' | 'clave', f, pos }]` mit Zeiten in Schlägen. Der Player kennt dadurch weder Zeilen noch Takte. Die Tafel erzeugt ihn aus ihren Plätzen, das Lied aus seinen Noten (Haltebögen sind dann schon zusammengezogen).

### Schritte

1. **`tools/version.js` für Unterordner:** Die Import Map muss alle `.js` unter `js/**` rekursiv aufnehmen, das Cache-Busting alle `css/**`. Heute liest das Skript nur `js/` ohne Unterordner, und die Regex für Stylesheets erlaubt keinen `/` im Pfad.
2. **Dateien verschieben** nach `core/` und `tafel/`, Importe anpassen, Tests auf die neuen Pfade umstellen. Danach `npm test` und ein Durchklicken der App.
3. **Speicher aufteilen:** `core/store.js` bekommt die allgemeinen Funktionen mit Schlüssel und Prüffunktion als Parameter. `tafel/storage.js` behält **genau die bisherigen Schlüssel** (`notentafel.v1`, `notentafel.rhy.v1` usw.). Die Einstellungen bleiben in `notentafel.settings.v1` (Kern und Tafel lesen ihre Felder daraus, damit nichts verloren geht). Lied bekommt eigene Schlüssel (siehe unten). `settings.mode` kennt zusätzlich `'lied'`.
4. **Player aufteilen:** Das Abspielen wandert in `core/player.js` und arbeitet mit dem Ablaufplan. Die Tafel liefert `schedule()` und `markPlaying()`.
5. **Rückgängig allgemein:** `snap/restore` arbeiten auf einem beliebigen Zustand, den der Bereich als JSON liefert.
6. **Menü aufteilen:** Der Rahmen kommt in `core/menu.js`. Farben, Notenzeichen, Breite nach Notenlänge und Bekannte Lieder sind Abschnitte der Tafel. Der Titel kommt vom Bereich („Menü · Lied“).
7. **Shell und Reiter:** Die Reiter werden aus der Liste der angemeldeten Bereiche erzeugt. Die gemeinsamen Knöpfe (einfügen, entfernen, Umbruch, fertig, Abspielen, Rückgängig, Speichern, Alles löschen, ± Zeile) rufen `area.tools.*` des offenen Bereichs auf.
8. **`index.html`:** Auf der Tafel liegen `#grid` (Tafel) und `#sheet` (Lied) nebeneinander, immer nur eins sichtbar. In der Leiste kommt `panelLied` dazu.
9. **Abhängigkeitstest** `test/deps.test.mjs`: liest alle Importe. `core/` darf weder `tafel/` noch `lied/` importieren, `tafel/` und `lied/` nicht einander.
10. **Leerer Bereich Lied:** Reiter, leere Leiste, fünf leere Notenlinien mit Violinschlüssel.

**Fertig, wenn:** Alle Tests laufen, das Durchklicken von Melodie und Rhythmus zeigt keine Unterschiede, ein alter Speicherstand lädt, der Abhängigkeitstest ist grün und der Reiter Lied ist da.

---

## Bereich Lied: Technik

### Datenmodell (`lied/model.js`)

Ein Lied ist **eine durchgehende Folge von Ereignissen**, keine Zeilen mit Plätzen. Die Zeilen (Notensysteme) entstehen beim Zeichnen.

```js
song = {
  meter: '4/4',          // Taktart des ganzen Lieds ('' = ohne); Taktwechsel mitten im Lied gibt es (noch) nicht
  pickup: 0,             // Auftakt in Ticks (0 = keiner), Phase 2
  ev: [                  // Ereignisse
    { p: 'c1', v: 4 },               // Note c', Viertel
    { p: 'f1', acc: 1, v: 8, dot: 1 },  // fis', punktierte Achtel
    { v: 2 },                        // Halbe Pause (ohne p)
    { p: 'g1', v: 4, tie: 1 },       // Haltebogen zur nächsten Note (Phase 2)
    { p: 'g1', v: 4, bar: 2 },       // bar: Takt- (1) oder Schlussstrich (2) dahinter
    { p: 'a1', v: 4, brk: 1 }        // Zeilenumbruch dahinter (von Hand)
  ]
}
```

Takt-, Schlussstrich und Umbruch stehen **hinter** einem Ereignis (anders als in der Tafel, wo sie davor stehen). So kann man sie auch am Ende setzen, wo noch kein Ereignis ist. Die Knöpfe wirken trotzdem „vor der Markierung“, also auf das Ereignis davor. Der Name steht nicht im Lied, sondern daneben wie in der Tafel.

- **`v`** ist der Grundwert als Bruch der Ganzen: 1, 2, 4, 8, 16. Dazu kommt **`dot`**.
- **Dauer in Ticks** (ganze Zahlen, keine Kommazahlen): Viertel = 8 Ticks, also Ganze 32, Halbe 16, Achtel 4, Sechzehntel 2. Mit Punkt mal 1,5: punktierte Halbe 24, punktierte Viertel 12, punktierte Achtel 6. Die punktierte Sechzehntel lassen wir weg.
- **Tonhöhe `p`:** Stammton + Oktave, `c1` = c', `c2` = c'', `a0` = a (klein). Das Vorzeichen ist ein eigenes Feld `acc` (1 ♯, −1 ♭, 0 ♮ ausdrücklich, fehlt = keins), damit Ton und Vorzeichen getrennt umschaltbar sind. Daraus berechnen sich Frequenz und **Linienplatz**: der Abstand in Stufen (halben Linienabständen) von der untersten Linie e' (e' = 0, f' = 1, g' = 2 … c' = −2).
- Prüfen, Packen und Entpacken gespeicherter Stände wie in der Tafel (`cleanSong`). Alles sind reine Funktionen mit Tests.

### Markierung und Eingabe

- Die Markierung ist ein **Index** in `ev`. `ev.length` ist der Platz hinter der letzten Note (dort wird angehängt).
- **Stift** = vorgewählter Wert `{ v, dot }`, Start: Viertel.
- **Wert antippen:** stellt den Stift. Steht die Markierung auf einer Note oder Pause, bekommt auch diese den Wert. Die Markierung bleibt stehen, damit man danach noch die Tonhöhe ändern kann.
- **Punkt antippen:** schaltet den Punkt am Stift (und an der markierten Note) um.
- **Tonname antippen:** am Ende eine neue Note mit dem Stift-Wert. Auf einer vorhandenen Note wird nur die Tonhöhe getauscht, der Wert bleibt (wie in der Tafel). Danach geht die Markierung einen weiter.
- **Pause antippen:** wie ein Tonname, setzt aber eine Pause mit dem Stift-Wert. Dafür reicht **ein Knopf** statt fünf Pausenwerten.
- **einfügen / entfernen / Lücke zu / Umbruch / fertig / Rückgängig** wie in der Tafel. „Entfernen“ macht aus einer Note eine Pause gleicher Länge, damit die Takte stimmen bleiben. „Lücke zu“ nimmt das Ereignis ganz heraus. „Umbruch“ setzt `brk` hinter das Zeichen vor der Markierung (nochmal tippen nimmt ihn weg).
- **Antippen auf dem Notenblatt** markiert. Jede Note bekommt eine unsichtbare Tippfläche über die ganze Höhe des Systems, damit man auch mit dem Finger sicher trifft.

### Leiste im Bereich Lied

```
[ c d e f g a h ]             Stammtöne (neutral, ohne Farbe)
[ tiefer ] [ c' ] [ höher ]   Oktave der nächsten Töne (und der markierten Note)
[ ♯ ] [ ♭ ] [ ♮ ]             Vorzeichen an der markierten Note umschalten
[𝅝] [𝅗𝅥] [♩] [♪] [𝅘𝅥𝅯] [ · ]       Stift: 5 Werte + Punkt
[ Pause ] [ Bogen ]           Pause mit Stift-Wert, Haltebogen zur nächsten Note
[ Takt … ]                    klappt auf: Taktart, Auftakt, Taktstrich, Schlussstrich,
                              automatisch: Taktstriche / Zählzeiten
```

### Zeichnen (`lied/layout.js` + `lied/sheet.js`)

Getrennt in zwei Schritte, damit sich die Rechnung ohne Browser testen lässt:

1. **`layout.js` (rein, mit Tests):** Ereignisse + verfügbare Breite → Takte (automatisch oder von Hand) → Systeme (Zeilen). Pro Note: x-Position, Linienplatz, Halsrichtung, Hilfslinien, Vorzeichen, Balkengruppe, Bogen.
   - **Abstand:** Jede Note bekommt eine Grundbreite plus etwas mehr, je länger sie ist (ungefähr logarithmisch, wie im Notensatz üblich). Die Takte einer Zeile werden auf die volle Breite gestreckt.
   - **Umbruch:** erst einmal nur von Hand (`brk`). Wird eine Zeile zu lang, schrumpft das Notenbild bzw. lässt sich seitlich wischen, wie in der Tafel. Jede Zeile beginnt mit dem Violinschlüssel, die erste auch mit der Taktart.
   - **Halsrichtung:** ab h' (Linienplatz 4) nach unten, sonst nach oben. Bei Balken entscheidet die Note, die am weitesten von der Mittellinie entfernt ist.
   - **Hilfslinien:** unter Platz −2 (c') und über Platz 10 (a'').
2. **`sheet.js`:** baut daraus ein **SVG**. Die Zeichen (Violinschlüssel, Köpfe, Fähnchen, Pausen, ♯ ♭ ♮, Punkt) liegen als eigene SVG-Pfade in `lied/glyphs.js`, **keine Notenschrift aus dem Netz**: Die App muss auch ohne Internet richtig aussehen. Die Pausenpfade aus `tafel/symbols.js` werden dafür kopiert, nicht importiert (Unabhängigkeit geht hier vor).

Markierung: farbig hinterlegte Spalte. Hinter der letzten Note steht eine blasse Platzhalter-Note. Beim Abspielen wird die klingende Note hervorgehoben.

### Abspielen

`lied/schedule.js` macht aus den Ereignissen den Ablaufplan für `core/player.js`. Ticks werden in Schläge umgerechnet, Noten mit Haltebogen zusammengezogen. Klang: ein neuer, klavierähnlicher Ton in `core/audio.js`.

### Speicher

| Schlüssel | Inhalt |
|---|---|
| `notentafel.lied.v1` | aktuelles Lied |
| `notentafel.lied.songs.v1` | gespeicherte Lieder |
| `notentafel.lied.autosave.v1` | zuletzt ersetzt |
| `notentafel.lied.settings.v1` | Einstellungen nur für Lied (z. B. Notengröße, Stift) |

---

## Phase 1: Notenblatt und Eingabe (Kern) – erledigt

- [x] `lied/model.js`: Ereignisse, Ticks, Tonhöhen (Frequenz, Linienplatz), Prüfen/Packen + Tests
- [x] alle Notenwerte im Modell: Ganze, Halbe, Viertel, Achtel, Sechzehntel, punktiert Ganze/Halbe/Viertel/Achtel, Pausen dazu
- [x] `lied/layout.js`: Takte (Taktstriche von Hand oder automatisch 1:1 wie in der Tafel), Zeilen, Abstände, Halsrichtung, Hilfslinien + Tests
- [x] `lied/glyphs.js`: Violinschlüssel, Köpfe (voll/hohl/Ganze), Fähnchen (Achtel, Sechzehntel), alle Pausen, Punkt, ♯ ♭ ♮, Taktart, Takt- und Schlussstrich
- [x] `lied/sheet.js`: SVG zeichnen, Markierung, Platzhalter am Ende, Tippflächen
- [x] Balken zunächst einfach: gleiche Werte innerhalb eines Schlags, waagerecht
- [x] Leiste: Tonnamen, Vorzeichen, 5 Werte + Punkt, Pause, Aufklappfeld „Takt …“
- [x] Stift-Logik, einfügen/entfernen/Lücke zu/Umbruch/fertig, Rückgängig
- [x] Speichern, Laden, Zuletzt ersetzt, Menü
- [x] Abspielen mit Mitlauf-Markierung, Klavierklang
- [x] Notennamen unter den Noten (Schalter im Menü)

**Fertig, wenn:** man „Alle meine Entchen“ und „Hänschen klein“ in wenigen Minuten nur per Tippen als Noten aufschreiben, abspielen und speichern kann und das Bild als Notenblatt erkennbar ist.

## Phase 2: Musikalisch richtig – erledigt

- [x] **Balken nach Taktart:** 2/4, 3/4: pro Schlag; 4/4: Achtel pro halbem Takt; 2/2: pro Halbe; 6/8: pro punktierter Viertel. Sechzehntel immer pro Schlag. Pausen unterbrechen den Balken. Leicht geneigte Balken.
- [x] **Haltebogen:** Knopf „Bogen“ an der markierten Note (nur zur nächsten Note gleicher Tonhöhe). Bogen zeichnen, auch über den Zeilenumbruch, und beim Abspielen zusammenziehen.
- [x] **Auftakt:** im Feld „Takt …“ die Länge wählen (keiner, ¼, ½, 1, 2, 3 Schläge). Die automatischen Taktstriche und Zählzeiten zählen danach richtig, der Auftakt bekommt die letzten Zählzeiten des Takts (z. B. „4“).
- [x] **Zählzeiten automatisch** unter dem System, wie in der Tafel

Umsetzung im Detail:
- **Balken:** In 4/4 werden zwei volle Schläge aus einfachen Achteln in derselben Takthälfte zusammengefasst. Mit Sechzehnteln oder Punkten bleibt es pro Schlag. In 2/2 werden Gruppen mit Sechzehnteln pro Viertel getrennt. Neigung aus erstem und letztem Kopf, höchstens ein Linienabstand. Waagerecht, wenn ein innerer Kopf weiter außen liegt. Jeder Hals ist mindestens 3,5 Linienabstände lang.
- **Haltebogen:** Er lässt sich an jede Note setzen und wird zur nächsten Note gezeichnet. Zusammengezogen (ein langer Ton, zweite Zählzeit blass) wird nur bei gleicher Tonhöhe samt Vorzeichen. Hat die letzte Note einen Bogen, erscheint er als kurzer Ansatz.
- **Auftakt:** Achtel, Viertel, punktierte Viertel, Halbe, punktierte Halbe, jeweils nur wenn kürzer als ein Takt. Ändert man die Taktart und der Auftakt passt nicht mehr, fällt er weg.

## Phase 3: Feinschliff – erledigt

- [x] **Bekannte Lieder** im Lied-Format (`lied/songs.js`, eigene kurze Schreibweise, z. B. `c1:4 d1 e1 f1 g1:2 g1 | …`, der Wert gilt weiter bis zum nächsten). Darin auch die Ode an die Freude endlich mit punktierter Viertel.
- [x] **Takt-Prüfung** (Vorschlag): Takte, die zu voll oder nicht voll sind, werden markiert (außer Auftakt und letzter Takt).
- [x] Notengröße im Menü (fürs Zeigen vor der Klasse)
- [x] Note **nach oben/unten ziehen** ändert die Tonhöhe, zur Seite ziehen verschiebt
- [x] Vorzeichen-Regel im Takt (ein ♯ gilt bis zum Taktstrich, danach ♮ wenn nötig)

Umsetzung im Detail:
- **Ziehen:** Nur die markierte Note lässt sich ziehen, damit das Notenblatt überall sonst mit dem Finger scrollt. Über ihr liegt ein unsichtbares HTML-Feld mit `touch-action: none` (SVG-Elemente beachten das nicht in allen Browsern). Senkrecht ändert sich die Tonhöhe stufenweise (mit Vorhör-Ton), waagerecht wird wie auf der Tafel getauscht statt verschoben; die Striche und Umbrüche bleiben an ihrer Stelle.
- **Vorzeichen-Regel:** Im Modell steht das klingende Vorzeichen. Gezeichnet wird nach der Regel im Takt (`shownAccidentals`); ein ausdrückliches ♮ bleibt sichtbar, eine Note hinter einem Haltebogen zeigt keins.
- **Takt-Prüfung** (`badMeasures`): Abschnitte zwischen gezeichneten Strichen; der erste wird am Auftakt gemessen, der letzte nie. Schalter im Menü, Standard an.
- **Notengröße:** normal, groß, sehr groß setzen die kleinste Größe eines Linienabstands auf 8, 16 bzw. 22 Pixel; passt eine Zeile nicht, wird seitlich gewischt.
- **Bekannte Lieder:** die sechs der Tafel plus „Zum Geburtstag viel Glück“ (3/4 mit Auftakt).

## Später / bewusst nicht jetzt

- Wiederholungszeichen, 1./2. Ende
- Liedtext (braucht die Tastatur)
- Tonart-Vorzeichen am Zeilenanfang (z. B. F-Dur mit einem ♭)
- Triolen, Bassschlüssel, mehrere Stimmen
- Automatisches Teilen einer Note am Taktstrich mit Haltebogen
- Automatischer Zeilenumbruch nach Breite
- Export/Import von Liedern (passt zum Eintrag in `todo.md`)

---

## Risiken und Probleme

- **Platz in der Leiste:** Mit 7 Stammtönen, Oktave, 3 Vorzeichen, 6 Wertknöpfen und Pause/Bogen wird es auf dem Tablet trotzdem eng. Vor Phase 1 auf dem echten Gerät mit einem Entwurf ausprobieren.
- **Treffsicherheit beim Tippen:** Notenköpfe sind klein. Darum die breite Tippfläche pro Note und eine ausreichend große Notenschrift. Tonhöhe per Ziehen (Phase 3) braucht große Linienabstände.
- **Notensatz:** Balken, Halsrichtung und Abstände haben viele Sonderfälle. Ziel ist „gut lesbar“, nicht „wie gedruckt“. Darum ist die Rechnung in `layout.js` getrennt und testbar, damit man später nachbessern kann, ohne das Zeichnen anzufassen.
- **Violinschlüssel als SVG-Pfad:** Der muss einmal ordentlich gezeichnet werden. Ohne fertige Notenschrift ist das der aufwendigste Einzelglyph.
- **Aufteilen in Phase 0:** Viele Dateien werden verschoben. Gefahr: die Speicherstände. Darum bleiben alle bisherigen Schlüssel exakt gleich, und ein Test lädt ein altes Format.
- **Doppelter Code:** Durch die Trennung gibt es manches zweimal (Taktart-Rechnung, Pausenzeichen). Das ist gewollt. Gemeinsam wird nur, was wirklich nichts über Noten weiß (Speicher, Audio, Player, Oberflächen-Bausteine).
