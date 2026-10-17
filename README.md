# Notentafel

Eine digitale Notentafel für den Musikunterricht. Gebaut fürs **Tablet mit Touch-Bedienung**: Töne antippen, auf die Tafel setzen, verschieben, abspielen.

## Dateien

Reines HTML, CSS und JavaScript ohne Build-Schritt und ohne Abhängigkeiten. Das Skript besteht aus ES-Modulen (`<script type="module">`).

Der Code ist in drei Teile getrennt, die nicht voneinander abhängen: **`js/core/`** ist der gemeinsame Rahmen und kennt keinen Bereich, **`js/tafel/`** sind die Bereiche Melodie und Rhythmus, **`js/lied/`** ist der Bereich Lied (im Aufbau, siehe `plan-lied.md`). `tafel/` und `lied/` importieren nur aus sich selbst und aus `core/`; das prüft `test/deps.test.mjs`. Jeder Bereich meldet sich mit `register(area)` bei `core/shell.js` an (die Schnittstelle steht oben in der Datei).

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau der Seite |
| `css/base.css` | Farben, Schriften, Grundlayout, Knöpfe, Rahmen der Tafel |
| `css/tafel.css` | Die Tafel (Melodie und Rhythmus) |
| `css/lied.css` | Das Notenblatt (Lied) |
| `css/side.css` | Die Leiste |
| `css/menu.css` | Das Menü |
| `js/main.js` | Einstieg: meldet die Bereiche an und startet den Rahmen |
| `js/core/shell.js` | Reiter, Wechsel zwischen den Bereichen, gemeinsame Knöpfe, Speichern-Feld der Leiste |
| `js/core/settings.js` | Gemeinsame Einstellungen (Tempo, offener Bereich, Bildschirm anlassen); Bereiche ergänzen ihre mit `useSettings` |
| `js/core/store.js` | Lesen und Schreiben im `localStorage`, Liederliste und Autosave eines Bereichs (`makeStore`) |
| `js/core/history.js` | Rückgängig-Verlauf |
| `js/core/menu.js` | Das Menü: Speichern, Lieder, Zuletzt ersetzt, Tempo, Bildschirm |
| `js/core/player.js`, `js/core/audio.js` | Abspielen eines Ablaufplans und Klangerzeugung |
| `js/core/wake.js` | Bildschirm anlassen (Screen Wake Lock) |
| `js/core/ui.js`, `js/core/dom.js` | Einblendung, Nochmal-tippen-Bestätigung, Popups, gemeinsame Element-Verweise |
| `js/tafel/area.js` | Meldet Melodie und Rhythmus an, Wechsel zwischen beiden Tafeln, Ablaufplan fürs Abspielen |
| `js/tafel/config.js` | Töne (`NOTES`, `GROUPS`), Farbthemen, Notenwerte, Taktarten |
| `js/tafel/melodies.js` | Die bekannten Lieder (`MELODIES`) |
| `js/tafel/model.js` | Datenmodell der Tafel (reine Funktionen) und Prüfung gespeicherter Stände |
| `js/tafel/theory.js` | Taktarten, Zählzeiten, automatische Taktstriche |
| `js/tafel/storage.js` | Speicherschlüssel und Einstellungen der Tafel |
| `js/tafel/state.js` | Laufender Zustand (Tafel, Markierung, Rückgängig, Einstellungen) |
| `js/tafel/actions.js` | Alles, was die Tafel verändert |
| `js/tafel/render.js` | Neu zeichnen (`render`) und Änderung abschließen (`commit`) |
| `js/tafel/board.js` | Darstellung der Tafel |
| `js/tafel/sidebar.js` | Darstellung der Leiste |
| `js/tafel/symbols.js` | SVG-Zeichen für Noten, Pausen, Taktarten |
| `js/tafel/controls.js` | Bedienung der Tafel-eigenen Knöpfe in der Leiste |
| `js/tafel/input.js` | Antippen und Ziehen auf der Tafel |
| `js/tafel/menu.js` | Abschnitte der Tafel im Menü (Bekannte Lieder, Farben, Notenzeichen, Breite) |
| `js/tafel/dom.js` | Element-Verweise der Tafel |
| `js/lied/area.js` | Meldet den Bereich Lied an, verdrahtet Leiste und Notenblatt, Ablaufplan fürs Abspielen |
| `js/lied/model.js` | Datenmodell des Lieds (reine Funktionen): Tonhöhen, Notenwerte in Ticks, Taktstriche, Prüfung gespeicherter Stände |
| `js/lied/layout.js` | Notensatz ohne DOM: Zeilen, Abstände, Hälse, Balken, Hilfslinien |
| `js/lied/glyphs.js` | Die Zeichen der Notenschrift als SVG (Violinschlüssel, Köpfe, Pausen, Vorzeichen …) |
| `js/lied/sheet.js` | Zeichnet das Notenblatt als SVG |
| `js/lied/state.js`, `js/lied/storage.js` | Laufender Zustand, Speicherschlüssel und Einstellungen des Lieds |
| `js/lied/actions.js` | Alles, was das Lied verändert |
| `js/lied/render.js`, `js/lied/sidebar.js`, `js/lied/dom.js` | Neu zeichnen, Leiste, Element-Verweise |
| `js/lied/input.js` | Antippen und Ziehen auf dem Notenblatt |
| `js/lied/songs.js` | Die bekannten Lieder in kurzer Schreibweise (`SONGS`, `songOf`) |
| `package.json` | Die Versionsnummer (`version`) und die npm-Befehle |
| `tools/serve.js` | Für `npm start`: kleiner lokaler Server |
| `tools/version.js` | Für `npm run version:set`: Version setzen und in `index.html` eintragen |
| `test/` | Tests für Datenmodell, Zählzeiten, Speicher, Einstellungen, bekannte Lieder, Datenmodell und Notensatz des Lieds und die Abhängigkeiten zwischen den Teilen (`npm test`) |

**Veröffentlichen:** Die Seite läuft über GitHub Pages direkt aus dem Repository, es gibt nichts zu bauen. Vor dem Push die Version hochsetzen: `npm run version:set 1.0.1` (ohne Nummer wird nur `index.html` auf den Stand von `package.json` gebracht, z. B. nach einem neuen Modul). Das Skript schreibt die Nummer in `package.json`, hängt in `index.html` `?v=1.0.1` an Stylesheets und Einstiegs-Script und erneuert die Import Map, die jedes Modul unter `js/` (auch in Unterordnern) auf `js/…?v=1.0.1` umleitet; auch neue Module kommen so automatisch dazu. Damit lädt der Browser nach einem Update alle Dateien neu, statt alte und neue Module zu mischen. Die Version steht ganz unten im Menü.

**Lokal starten:** `npm start` und dann http://localhost:8000/ öffnen (anderer Port: `PORT=8080 npm start`). Der Server in `tools/serve.js` braucht nur Node, keine Pakete. Direkt über `file://` geht es nicht, weil Browser dort keine Module laden. Die Schriften kommen von Google Fonts (Playwrite DE Grund, die Deutschland-Grundschrift, für alles auf der Tafel, Nunito für die Knöpfe); ohne Internet springen Systemschriften ein.

**Tests:** `npm test` (eingebauter Testrunner von Node, keine Pakete).

## Bedienung

- **Ton setzen:** Rechts einen Ton antippen. Er landet auf dem markierten Platz, danach springt die Markierung **genau einen Platz weiter in derselben Zeile**. Das gilt auch beim Austauschen, sodass man mehrere falsche Töne hintereinander korrigieren kann.
- **Zeilen:** Eine Zeile wird so lang, wie man schreibt (bis 32 Plätze). Werden die Zeilen länger, schrumpfen alle Kreise gleichmäßig. Wenn sie zu klein würden, lässt sich die Tafel seitlich wischen. Blasse Plätze liegen hinter dem Zeilenende.
- **Umbruch:** Die Markierung und alles dahinter rutschen in eine neue Zeile darunter. Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
- **Fertig:** Blendet die Markierung und die leeren Plätze aus, damit eine saubere Ansicht für die Klasse bleibt. Ein Tipp auf die Tafel oder ein neuer Ton holt alles zurück.
- **Die Leiste** hat oben einen Umschalter zwischen den Bereichen *Melodie*, *Rhythmus* und *Lied* (die App merkt sich, welcher zuletzt offen war). **Jeder Bereich hat seine eigene Tafel** mit eigenem Speicherstand, eigener Markierung und eigenem Rückgängig. Man kann hin und her wechseln, ohne etwas zu verlieren; die Tafeln bleiben immer gespeichert, Markierung und Rückgängig-Verlauf der anderen Tafel bis zum Schließen der App. Gemeinsam sind die Werkzeuge *einfügen, entfernen, Umbruch, fertig* und unten *Abspielen, Rückgängig, Speichern, + Zeile, − Zeile, Alles löschen*. Melodie und Rhythmus nutzen die Tafel mit bunten Punkten, *Lied* ein echtes Notenblatt (siehe unten). *+ Zeile* und *− Zeile* gibt es nur auf der Tafel.
- **Speichern** (unten in der Leiste) öffnet ein Feld für den Namen, vorbelegt mit dem Namen der Tafel. Gespeichert wird in die Liste des offenen Bereichs. Gleicher Name heißt ersetzen, dafür den Knopf ein zweites Mal tippen.
  - **Melodie:** **Notennamen** (die bunten Punkte), **Notenwerte** (nur unter einen bunten Punkt) und **r/l**.
  - **Rhythmus:** **Takt** (Taktart, Linie, Taktstrich, Schlussstrich), **Notenwerte**, **Pausenwerte**, **Zählzeiten** und die Schalter **Automatisch: Taktstriche / Zählzeiten**.
  - Die Zahlen unter den Werten sind Schläge (½ Achtel, 1 Viertel, 2 Halbe, 3 punktierte Halbe, 4 Ganze).
- **Notenwerte:** Steht die Markierung auf einem bunten Punkt, kommt das Notenzeichen darunter. Im Bereich *Rhythmus* wird es auf einem leeren Platz eigenständig eingesetzt, anstelle eines Punkts, und klingt beim Abspielen wie Klanghölzer. Im Bereich *Melodie* geht das nicht, dort gibt es einen Hinweis. In beiden Fällen springt die Markierung weiter. So kann man erst die Töne schreiben und dann von vorn den Rhythmus darunter tippen. Bunte Punkte ohne Notenwert zählen einen Schlag. Wird ein Punkt ausgetauscht, behält er seinen Notenwert. Zwei Achtel hintereinander bekommen einen Balken.
- **Pausenwerte** setzen eine Pause mit Pausenzeichen. Ein leerer Platz in der Zeile bleibt ein stiller Schlag ohne Zeichen.
- **Takt:** Setzt oder entfernt einen Taktstrich vor dem markierten Platz. Er belegt keinen eigenen Platz und bleibt stehen, wenn der Ton dahinter ersetzt, verschoben oder entfernt wird.
- **Taktart:** Öffnet eine Auswahl (ohne, 2/2, 2/4, 3/4, 4/4, 6/8) für die markierte Zeile. Die Taktart steht als zwei Zahlen übereinander ganz vorn in der Zeile, eine eingeschaltete Notenlinie läuft zwischen ihnen hindurch. Die bekannten Lieder bringen ihre Taktart in der ersten Zeile mit.
- **Schluss:** Wie „Takt“, setzt aber einen Schlussstrich (dünner und dicker Strich). Auf einem Platz mit Taktstrich wird daraus ein Schlussstrich und umgekehrt.
- **Zählzeiten von Hand:** Unter einer Note oder Pause *1–6* oder *+* („und“) tippen. Dauert das Zeichen mehrere Zählzeiten (z. B. eine Halbe im 4/4-Takt: *1*, *2*), bleibt die Markierung stehen, bis alle getippt sind, danach springt sie weiter. Ein erneuter Tipp auf einem fertigen Platz ersetzt die Zählzeiten, der Löschknopf entfernt sie. Wird das Zeichen ausgetauscht, bleiben die Zählzeiten stehen.
- **Automatisch: Zählzeiten** zeigt unter allen Noten und Pausen die Zählzeiten nach der Taktart, gehaltene Zählzeiten blasser (Halbe im 4/4: **1** 2). Zwischen zwei Zählzeiten steht „+“. Im 6/8-Takt wird in Achteln gezählt (1–6), im 2/2 in Halben. Solange das an ist, sind die Zählzeit-Knöpfe aus; von Hand getippte Zählzeiten bleiben gespeichert und erscheinen wieder, wenn man es ausschaltet.
- **Automatisch: Taktstriche** setzt die Taktstriche nach der Taktart. Geht ein Takt genau am Zeilenende auf, steht der Strich hinter dem letzten Zeichen. Von Hand gesetzte Taktstriche sind dann ausgeblendet (und der Knopf *Takt* aus), der Schlussstrich bleibt.
- **Beides automatisch** zählt ab der ersten Zeile mit Taktart durchgehend über die Zeilen hinweg; eine Zeile mit neuer Taktart beginnt wieder bei 1. Zeilen davor bleiben leer. Leere Plätze zählen einen Schlag. Ein Auftakt wird nicht erkannt.
- **Linie:** Schaltet für die markierte Zeile eine Notenlinie ein oder aus. Sie läuft durch die Kreismitte vom ersten bis zum letzten Zeichen und wächst mit. Die Köpfe eigenständiger Notenzeichen sitzen auf der Linie.
- **Platz wählen:** Auf der Tafel einen Platz antippen.
- **Verschieben/Tauschen:** Einen Ton auf der Tafel ziehen und auf einem anderen Platz loslassen.
- **r / l:** Markiert den Ton für die rechte oder linke Hand.
- **Einfügen:** Schaltet den Einfügen-Modus um. Ein neuer Ton wird an der Markierung eingeschoben, der Rest der Zeile rückt einen Platz weiter. „Lücke zu“ entfernt den markierten Platz und zieht die folgenden Töne der Zeile nach vorne.
- **Entfernen:** Ein Ton mitten in der Zeile wird zur Pause, ein Ton am Zeilenende verschwindet ganz (die Zeile wird kürzer).
- **Abspielen:** Spielt die Tafel Zeile für Zeile bis zur letzten Note. Töne und Pausen dauern so lange wie ihre Länge. Bunte Punkte klingen wie ein Glockenspiel (eine Oktave über dem notierten Ton, am Ende der Notenlänge abgedämpft), Notenzeichen ohne Punkt wie Klanghölzer. Leere Plätze innerhalb einer Zeile sind Pausen von einem Schlag, eine leere Zeile ist keine Pause. Das Tempo stellt man im Menü ein.
- **Rückgängig:** Nimmt die letzten bis zu 60 Schritte zurück, auch das Laden eines Lieds.
- **Alles löschen** und **− Zeile** (wenn in der Zeile Noten stehen) muss man zur Sicherheit zweimal antippen.
- Die Tafel hat höchstens 8 Zeilen.

### Lied (echtes Notenblatt)

Fünf Notenlinien mit Violinschlüssel, ohne Farben. Wiederholungszeichen und Liedtext gibt es (noch) nicht (siehe `plan-lied.md`).

- **Notenwert vorwählen:** Unter *Notenwert* einen Wert antippen (Ganze, Halbe, Viertel, Achtel, Sechzehntel), danach bekommen alle folgenden Töne und Pausen diesen Wert. Der Punkt (anderthalbmal so lang) wird nach dem Wert dazugetippt und gilt ebenfalls weiter; ein neuer Wert ist wieder ohne Punkt. Eine punktierte Sechzehntel gibt es nicht.
- **Töne:** *C D E F G A H* setzen einen Ton. Er kommt in die Oktave, die dem vorigen Ton am nächsten liegt (der erste in c'–h'). Mit *höher* / *tiefer* verschiebt man ihn um eine Oktave (von c bis h'''). *Kreuz*, *Be* und *Auflöser* schalten das Vorzeichen um, nochmal tippen nimmt es weg. Oktave und Vorzeichen wirken auf den zuletzt gesetzten Ton (blau), bis man woanders hin tippt; dann auf den markierten.
- **Pause:** setzt eine Pause mit dem vorgewählten Wert.
- **Bogen:** Haltebogen vom zuletzt gesetzten (oder markierten) Ton zur nächsten Note, nochmal tippen nimmt ihn weg. Zwei gleiche Töne mit Bogen klingen als ein langer Ton, der zweite wird nicht neu angeschlagen. Tippt man nach dem Bogen denselben Ton, übernimmt er das Vorzeichen. Steht die nächste Note in der nächsten Zeile, läuft der Bogen bis zum Zeilenende und beginnt dort neu.
- **Markieren:** Eine Note antippen. Der Stift übernimmt ihren Wert. Ein Tonname tauscht dann nur die Tonhöhe (der Wert bleibt), ein Notenwert oder Punkt ändert den Wert der markierten Note. Tippt man neben die Noten, kommt die Markierung ans Zeilenende.
- **Ziehen:** Die markierte Note mit dem Finger nach oben oder unten ziehen ändert die Tonhöhe Stufe für Stufe, man hört dabei den neuen Ton (ein Vorzeichen fällt weg). Zur Seite auf ein anderes Zeichen ziehen tauscht beide, Takt-, Schlussstrich und Umbruch bleiben an ihrer Stelle. Nur die markierte Note lässt sich ziehen; überall sonst scrollt der Finger das Notenblatt wie gewohnt.
- **einfügen:** Töne und Pausen kommen an der Markierung dazu, statt zu ersetzen; Notenwerte ändern dann nur den Stift.
- **entfernen:** Eine Note wird zur Pause gleicher Länge, damit die Takte stimmen. Eine Pause oder das letzte Zeichen verschwinden ganz. Im Einfügen-Modus (*Lücke zu*) verschwindet das Zeichen immer.
- **Umbruch:** Ab der Markierung geht es in einer neuen Zeile weiter; nochmal tippen holt die Zeile wieder hoch. Dazu bricht das Notenblatt von selbst um (siehe Menü, *Zeilen*).
- **Takt …** öffnet ein Feld mit der Taktart des Lieds (ohne, 2/2, 2/4, 3/4, 4/4, 6/8), dem **Auftakt** (ohne, Achtel, Viertel, punktierte Viertel, Halbe, punktierte Halbe; nur was kürzer als ein Takt ist), *Taktstrich* und *Schlussstrich* vor der Markierung, *Taktstriche automatisch* (Standard: an; wie auf der Tafel, von Hand gesetzte Taktstriche sind dann ausgeblendet, der Schlussstrich bleibt) und *Zählzeiten automatisch*. Mit Auftakt zählen Taktstriche und Zählzeiten erst danach los; der Auftakt bekommt die letzten Zählzeiten des Takts (z. B. „3“ im 3/4-Takt).
- **Zählzeiten** stehen wie auf der Tafel unter dem System: die Zahl auf der Zählzeit, „+“ genau dazwischen, gehaltene Zählzeiten blasser an ihrer Stelle. Im 6/8-Takt wird in Achteln gezählt, im 2/2 in Halben. Eine Note hinter einem Haltebogen zählt blass, weil sie nicht neu angeschlagen wird.
- **Balken:** Achtel und Sechzehntel innerhalb eines Schlags bekommen von selbst einen Balken (im 6/8-Takt drei Achtel, im 2/2 eine Halbe). Im 4/4-Takt bekommen vier einfache Achtel in einer Takthälfte einen gemeinsamen Balken. Pausen, Taktstriche und Umbrüche unterbrechen ihn. Der Balken folgt leicht der Melodie (höchstens einen Linienabstand).
- **Abspielen** klingt wie ein Klavier.
- **Vorzeichen** werden wie in echten Noten gezeichnet: Ein ♯ oder ♭ gilt bis zum Taktstrich und wird im selben Takt nicht wiederholt; steht danach derselbe Ton ohne Vorzeichen, bekommt er von selbst ein ♮. Gespielt wird immer der Ton, den man eingegeben hat. Ein ausdrücklich gesetztes ♮ (*Auflöser*) bleibt immer sichtbar.
- **Zeilen automatisch umbrechen** (Menü, Standard: an): Die Notengröße steht fest, und jede Zeile wird Takt für Takt gefüllt, solange sie auf den Bildschirm passt; dann geht es hinter dem letzten Taktstrich in der nächsten Zeile weiter. Volle Zeilen werden auf die ganze Breite gestreckt. Umbrüche von Hand bleiben. Passt nicht einmal der breiteste Takt in eine Zeile, werden die Noten so weit kleiner. Beim Drehen des Tablets wird neu umbrochen. Ausgeschaltet bleiben die Zeilen, wie man sie umbrochen hat: Das Notenblatt wird so groß, dass die längste Zeile die Breite füllt, und lässt sich sonst seitlich wischen.
- Im Menü:
  - **Bekannte Lieder:** Alle meine Entchen, Hänschen klein, Kuckuck, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude (jetzt mit punktierter Viertel) und Zum Geburtstag viel Glück (mit Auftakt). Neue trägt man in `js/lied/songs.js` ein, die Schreibweise steht oben in der Datei.
  - **Notennamen** unter den Noten (C, Fis, B, Es …).
  - **Notengröße** *normal*, *groß*, *sehr groß* zum Zeigen vor der Klasse (14, 20 bzw. 28 Pixel pro Linienabstand, mit automatischem Umbruch).
  - **Takte prüfen** (Standard: an): Ein Takt, der zu voll oder nicht voll ist, wird rot hinterlegt. Auftakt (mit seiner eigenen Länge) und Schlusstakt sind ausgenommen.

### Menü

- Das Menü gehört immer zum offenen Bereich (Titel „Menü · Melodie“, „Menü · Rhythmus“ usw.). Melodien und Rhythmen werden in **getrennten Listen** gespeichert und in die Tafel des offenen Bereichs geladen.
- **Lied speichern / laden / löschen.** Gleicher Name heißt ersetzen (mit Rückfrage).
- **Zuletzt ersetzt:** Die aktuelle Tafel wird ohnehin laufend gesichert. Lädt man ein anderes Lied oder tippt „Alles löschen“, wandert die bisherige Tafel in den Autosave-Platz ihres Bereichs (einer pro Bereich) und lässt sich von dort wieder laden (auch nach dem Schließen). Beim Laden tauschen Tafel und Autosave die Plätze.
- **Bekannte Lieder** (im Bereich Melodie; die des Bereichs Lied stehen oben): Fest eingebaute Melodien (Alle meine Entchen, Hänschen klein, Kuckuck, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude). Sie belegen keinen Speicherplatz und lassen sich nicht löschen. Neue trägt man in `js/tafel/melodies.js` in die Liste `MELODIES` ein: `|` trennt Zeilen, `-` ist eine Pause, `:2` hängt die Länge in Schlägen an (z. B. `G:2`, `C+:.5`, `-:2`), `meter` ist die Taktart der ersten Zeile. Eine punktierte Viertel gibt es nicht, darum stehen in der Ode an die Freude dort zwei Viertel.
- **Farben:** Zur Wahl stehen *Oktavfarben* (Standard, hohe Töne in der Farbe ihres Grundtons) und *Original*.
- **Notenzeichen** unter den bunten Punkten ein- und ausschalten. Ausgeschaltet werden die Kreise größer. Die Werte gelten beim Abspielen trotzdem, eigenständige Notenzeichen und Pausen bleiben sichtbar.
- **Breite nach Notenlänge:** Jedes Zeichen bekommt so viel Platz, wie es dauert. Ein Schlag ist einen Kreis breit, also eine Viertel (und ein bunter Punkt ohne Notenwert) so breit wie sonst ein Platz, eine Halbe doppelt, eine Ganze viermal. Steht auf einem Schlag eine Achtel, wird dieser Schlag in dieser Zeile zwei Kreise breit, damit die Achtel genauso groß bleiben wie alle anderen Zeichen. Jede Zeile wird für sich eingeteilt, die Taktstriche stehen also nicht unbedingt untereinander. Alle Kreise sind in allen Zeilen gleich groß; erst wenn die längste Zeile nicht mehr passt, schrumpft alles. Das Zeichen steht vorn in seinem Platz, gehaltene Zählzeiten stehen darunter an ihrer Stelle.
- **Tempo** beim Abspielen (50–160 pro Minute).
- **Bildschirm anlassen** (Standard: an): Solange die App offen ist, geht der Bildschirm nicht aus. Manche Browser erlauben das erst nach der ersten Berührung. Kann der Browser es nicht, fehlt der Schalter.

## Speicherung

Alles liegt im `localStorage` des Browsers, also nur auf diesem Gerät und in diesem Browser:

| Schlüssel | Inhalt |
|---|---|
| `notentafel.v1` / `notentafel.rhy.v1` | Die aktuelle Tafel (Melodie / Rhythmus) |
| `notentafel.songs.v1` / `notentafel.rhy.songs.v1` | Gespeicherte Melodien / Rhythmen |
| `notentafel.autosave.v1` / `notentafel.rhy.autosave.v1` | Die zuletzt ersetzte Tafel (ein Platz pro Bereich) |
| `notentafel.settings.v1` | Farbthema, Tempo, ob Notenzeichen angezeigt werden, offener Bereich, die Automatik-Schalter, Breite nach Notenlänge und Bildschirm anlassen |
| `notentafel.lied.v1`, `notentafel.lied.songs.v1`, `notentafel.lied.autosave.v1` | Das aktuelle Lied, gespeicherte Lieder und das zuletzt ersetzte Lied |
| `notentafel.lied.settings.v1` | Einstellungen nur für Lied: Taktstriche und Zählzeiten automatisch, Notennamen, Takte prüfen, Notengröße, Zeilen automatisch umbrechen |

Wenn man die Website-Daten des Browsers löscht oder im privaten Modus arbeitet, ist alles weg.

## Bewusste Entscheidungen

- **Halbtöne:** Absichtlich gibt es nur **Fis** und **B**, weil das für das verwendete Liedgut reicht. Weitere (Cis, Es, Gis …) lassen sich in `js/tafel/config.js` über die Liste `NOTES` und die Gruppen in `GROUPS` ergänzen.
- **Schrift auf den Tönen immer schwarz:** Darum muss jede Tonfarbe hell genug sein (Kontrast ≥ 4,5). Das A ist deshalb ein helleres Lila. Neue Farben in `NOTES` bitte auch daraufhin prüfen.
- **Oktavfarben als Standard:** Hohe Töne haben die Farbe ihres Grundtons. Im Thema *Original* sind sie alle rot, das ist gewollt.
- **Keine Tastaturbedienung als Hauptweg:** Die App ist für Touch gedacht.

## Hinweis für iPad/iPhone

Ist der Stummschalter am Gerät aktiv, bleibt das Abspielen in Safari stumm. Das ist eine iOS-Eigenheit bei Web-Audio.
