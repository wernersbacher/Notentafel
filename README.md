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
| `js/lied/area.js` | Der Bereich Lied (bisher nur leere Notenlinien) |
| `package.json` | Die Versionsnummer (`version`) und die npm-Befehle |
| `tools/serve.js` | Für `npm start`: kleiner lokaler Server |
| `tools/version.js` | Für `npm run version:set`: Version setzen und in `index.html` eintragen |
| `test/` | Tests für Datenmodell, Zählzeiten, Speicher, Einstellungen, bekannte Lieder und die Abhängigkeiten zwischen den Teilen (`npm test`) |

**Veröffentlichen:** Die Seite läuft über GitHub Pages direkt aus dem Repository, es gibt nichts zu bauen. Vor dem Push die Version hochsetzen: `npm run version:set 1.0.1` (ohne Nummer wird nur `index.html` auf den Stand von `package.json` gebracht, z. B. nach einem neuen Modul). Das Skript schreibt die Nummer in `package.json`, hängt in `index.html` `?v=1.0.1` an Stylesheets und Einstiegs-Script und erneuert die Import Map, die jedes Modul unter `js/` (auch in Unterordnern) auf `js/…?v=1.0.1` umleitet; auch neue Module kommen so automatisch dazu. Damit lädt der Browser nach einem Update alle Dateien neu, statt alte und neue Module zu mischen. Die Version steht ganz unten im Menü.

**Lokal starten:** `npm start` und dann http://localhost:8000/ öffnen (anderer Port: `PORT=8080 npm start`). Der Server in `tools/serve.js` braucht nur Node, keine Pakete. Direkt über `file://` geht es nicht, weil Browser dort keine Module laden. Die Schriften kommen von Google Fonts (Playwrite DE Grund, die Deutschland-Grundschrift, für alles auf der Tafel, Nunito für die Knöpfe); ohne Internet springen Systemschriften ein.

**Tests:** `npm test` (eingebauter Testrunner von Node, keine Pakete).

## Bedienung

- **Ton setzen:** Rechts einen Ton antippen. Er landet auf dem markierten Platz, danach springt die Markierung **genau einen Platz weiter in derselben Zeile**. Das gilt auch beim Austauschen, sodass man mehrere falsche Töne hintereinander korrigieren kann.
- **Zeilen:** Eine Zeile wird so lang, wie man schreibt (bis 32 Plätze). Werden die Zeilen länger, schrumpfen alle Kreise gleichmäßig. Wenn sie zu klein würden, lässt sich die Tafel seitlich wischen. Blasse Plätze liegen hinter dem Zeilenende.
- **Umbruch:** Die Markierung und alles dahinter rutschen in eine neue Zeile darunter. Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
- **Fertig:** Blendet die Markierung und die leeren Plätze aus, damit eine saubere Ansicht für die Klasse bleibt. Ein Tipp auf die Tafel oder ein neuer Ton holt alles zurück.
- **Die Leiste** hat oben einen Umschalter zwischen den Bereichen *Melodie*, *Rhythmus* und *Lied* (die App merkt sich, welcher zuletzt offen war). **Jeder Bereich hat seine eigene Tafel** mit eigenem Speicherstand, eigener Markierung und eigenem Rückgängig. Man kann hin und her wechseln, ohne etwas zu verlieren; die Tafeln bleiben immer gespeichert, Markierung und Rückgängig-Verlauf der anderen Tafel bis zum Schließen der App. Gemeinsam sind die Werkzeuge *einfügen, entfernen, Umbruch, fertig* und unten *Abspielen, Rückgängig, Speichern, + Zeile, − Zeile, Alles löschen*. Der Bereich *Lied* (echtes Notenblatt) ist noch im Aufbau und zeigt bisher nur leere Notenlinien.
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

### Menü

- Das Menü gehört immer zum offenen Bereich (Titel „Menü · Melodie“, „Menü · Rhythmus“ usw.). Melodien und Rhythmen werden in **getrennten Listen** gespeichert und in die Tafel des offenen Bereichs geladen.
- **Lied speichern / laden / löschen.** Gleicher Name heißt ersetzen (mit Rückfrage).
- **Zuletzt ersetzt:** Die aktuelle Tafel wird ohnehin laufend gesichert. Lädt man ein anderes Lied oder tippt „Alles löschen“, wandert die bisherige Tafel in den Autosave-Platz ihres Bereichs (einer pro Bereich) und lässt sich von dort wieder laden (auch nach dem Schließen). Beim Laden tauschen Tafel und Autosave die Plätze.
- **Bekannte Lieder** (nur im Bereich Melodie): Fest eingebaute Melodien (Alle meine Entchen, Hänschen klein, Kuckuck, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude). Sie belegen keinen Speicherplatz und lassen sich nicht löschen. Neue trägt man in `js/tafel/melodies.js` in die Liste `MELODIES` ein: `|` trennt Zeilen, `-` ist eine Pause, `:2` hängt die Länge in Schlägen an (z. B. `G:2`, `C+:.5`, `-:2`), `meter` ist die Taktart der ersten Zeile. Eine punktierte Viertel gibt es nicht, darum stehen in der Ode an die Freude dort zwei Viertel.
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

Wenn man die Website-Daten des Browsers löscht oder im privaten Modus arbeitet, ist alles weg.

## Bewusste Entscheidungen

- **Halbtöne:** Absichtlich gibt es nur **Fis** und **B**, weil das für das verwendete Liedgut reicht. Weitere (Cis, Es, Gis …) lassen sich in `js/tafel/config.js` über die Liste `NOTES` und die Gruppen in `GROUPS` ergänzen.
- **Schrift auf den Tönen immer schwarz:** Darum muss jede Tonfarbe hell genug sein (Kontrast ≥ 4,5). Das A ist deshalb ein helleres Lila. Neue Farben in `NOTES` bitte auch daraufhin prüfen.
- **Oktavfarben als Standard:** Hohe Töne haben die Farbe ihres Grundtons. Im Thema *Original* sind sie alle rot, das ist gewollt.
- **Keine Tastaturbedienung als Hauptweg:** Die App ist für Touch gedacht.

## Hinweis für iPad/iPhone

Ist der Stummschalter am Gerät aktiv, bleibt das Abspielen in Safari stumm. Das ist eine iOS-Eigenheit bei Web-Audio.
