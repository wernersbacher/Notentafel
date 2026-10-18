# Musiktafel

Eine digitale Musiktafel für den Musikunterricht. Gebaut fürs **Tablet mit Touch-Bedienung**: Töne antippen, auf die Tafel setzen, verschieben, abspielen.

## Dateien

Reines HTML, CSS und JavaScript ohne Build-Schritt und ohne Abhängigkeiten. Das Skript besteht aus ES-Modulen (`<script type="module">`).

Der Code ist in drei Teile getrennt, die nicht voneinander abhängen: **`js/core/`** ist der gemeinsame Rahmen und kennt keinen Bereich, **`js/tafel/`** sind die Bereiche Melodie und Rhythmus, **`js/lied/`** ist der Bereich Lied (im Aufbau, siehe `plan-lied.md`). `tafel/` und `lied/` importieren nur aus sich selbst und aus `core/`; das prüft `test/deps.test.mjs`. Jeder Bereich meldet sich mit `register(area)` bei `core/shell.js` an (die Schnittstelle steht oben in der Datei).

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau der Seite |
| `css/fonts.css`, `fonts/` | Die Schriften als lokale Dateien (WOFF2) mit ihren Lizenzen (SIL Open Font License, `fonts/OFL-*.txt`) |
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
| `js/core/colors.js` | Farben der Stammtöne, gemeinsam für Melodie und Lied |
| `js/core/shapes.js` | Gemeinsame Formen der Notenschrift (Viertelpause) für Tafel und Lied |
| `js/core/glyphs.js` | Gemeinsame Zeichen der Notenschrift (Köpfe, Hälse, Fähnchen, Pausen, Knopf-Zeichen) für Lied und Tafel |
| `js/core/menu.js` | Das Menü: Speichern, Lieder, Zuletzt ersetzt, Tempo, Bildschirm |
| `js/core/plan.js` | Hilfen für Ablaufpläne: Zählschlag einer Taktart, Abspielen ab einer Stelle |
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
| `js/lied/musicxml.js` | Export als MusicXML 4.0 (`songToMusicXML`, reine Funktion) |
| `js/lied/print.js` | Druckansicht des Lieds als HTML (`printHTML`, ein SVG pro System); die Druck-Styles stehen in `css/lied.css` |
| `package.json` | Die Versionsnummer (`version`) und die npm-Befehle |
| `tools/serve.js` | Für `npm start`: kleiner lokaler Server |
| `tools/version.js` | Für `npm run version:set`: Version setzen und in `index.html` eintragen |
| `test/` | Tests für Datenmodell, Zählzeiten, Speicher, Einstellungen, bekannte Lieder, Datenmodell und Notensatz des Lieds und die Abhängigkeiten zwischen den Teilen (`npm test`) |

**Veröffentlichen:** Die Seite läuft über GitHub Pages direkt aus dem Repository, es gibt nichts zu bauen. Vor dem Push die Version hochsetzen: `npm run version:set 1.0.1` (ohne Nummer wird nur `index.html` auf den Stand von `package.json` gebracht, z. B. nach einem neuen Modul). Das Skript schreibt die Nummer in `package.json`, hängt in `index.html` `?v=1.0.1` an Stylesheets und Einstiegs-Script und erneuert die Import Map, die jedes Modul unter `js/` (auch in Unterordnern) auf `js/…?v=1.0.1` umleitet; auch neue Module kommen so automatisch dazu. Damit lädt der Browser nach einem Update alle Dateien neu, statt alte und neue Module zu mischen. Die Version steht ganz unten im Menü.

**Lokal starten:** `npm start` und dann http://localhost:8000/ öffnen (anderer Port: `PORT=8080 npm start`). Der Server in `tools/serve.js` braucht nur Node, keine Pakete. Direkt über `file://` geht es nicht, weil Browser dort keine Module laden. Die Schriften liegen im Projekt (`fonts/`): Playwrite DE Grund, die Deutschland-Grundschrift, für alles auf der Tafel, und Nunito für die Knöpfe. Es werden keine Schriften aus dem Netz geladen, die App sieht also auch ohne Internet gleich aus.

**Tests:** `npm test` (eingebauter Testrunner von Node, keine Pakete).

## Bedienung

- **Ton setzen:** Rechts einen Ton antippen. Er landet auf dem markierten Platz, danach springt die Markierung **genau einen Platz weiter in derselben Zeile**. Das gilt auch beim Austauschen, sodass man mehrere falsche Töne hintereinander korrigieren kann.
- **Zeilen:** Eine Zeile wird so lang, wie man schreibt, höchstens 10 Plätze; ist sie voll, geht es automatisch am Anfang der nächsten Zeile weiter (ältere Stände mit längeren Zeilen bleiben, wie sie sind). Mit Taktart geht kein Takt über zwei Zeilen: Ist am Zeilenende ein Takt angefangen, wandert er beim Umbruch ganz in die nächste Zeile. Werden die Zeilen länger, schrumpfen alle Kreise gleichmäßig. Wenn sie zu klein würden, lässt sich die Tafel seitlich wischen. Blasse Plätze liegen hinter dem Zeilenende. **Bei Rhythmus** hat jede Zeile 12 Felder (ein Feld pro Schlag, z. B. drei 4/4-Takte), die die Breite füllen; ist sie voll, geht es automatisch am Anfang der nächsten Zeile weiter (gibt es keine, kommt eine dazu, bis 8 Zeilen). Beim Einfügen rutscht, was nicht mehr passt, in die nächste Zeile.
- **Umbruch:** Die Markierung und alles dahinter rutschen in eine neue Zeile darunter. Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
- **Leiste einklappen:** Der runde Pfeil oben rechts auf der Tafel klappt die Leiste ein und wieder aus. Eingeklappt nutzt die Tafel die ganze Breite und das Bearbeiten ist beendet: Markierung und leere Plätze sind ausgeblendet – eine saubere Ansicht für die Klasse. Ausgeklappt erscheint die Markierung wieder. (Den früheren Knopf „fertig“ gibt es nicht mehr.)
- **Die Leiste oben** über die ganze Breite trägt links den Titel, rechts *Lieder* (Liedersammlung) und *Einstellungen* und schaltet in der Mitte zwischen den Bereichen *Melodie*, *Rhythmus* und *Lied* um; der Pfeil rechts klappt sie für mehr Platz ein, ein kleiner Griff oben in der Mitte holt sie zurück (wird gemerkt) (die App merkt sich, welcher zuletzt offen war). **Jeder Bereich hat seine eigene Tafel** mit eigenem Speicherstand, eigener Markierung und eigenem Rückgängig. Man kann hin und her wechseln, ohne etwas zu verlieren; die Tafeln bleiben immer gespeichert, Markierung und Rückgängig-Verlauf der anderen Tafel bis zum Schließen der App. Gemeinsam sind die Werkzeuge *einfügen, löschen, entfernen, Umbruch* und unten *Rückgängig, Speichern, + Zeile, − Zeile, Alles löschen* (Abspielen, Einzählen und Metronom sitzen unten rechts auf der Tafel). Melodie und Rhythmus nutzen die Tafel mit bunten Punkten, *Lied* ein echtes Notenblatt (siehe unten). *+ Zeile* und *− Zeile* gibt es nur auf der Tafel.
- **Speichern** (unten in der Leiste) öffnet ein Feld für den Namen, vorbelegt mit dem Namen der Tafel. Gespeichert wird in die Liste des offenen Bereichs. Gleicher Name heißt ersetzen, dafür den Knopf ein zweites Mal tippen.
  - **Melodie:** drei nummerierte Blöcke wie im Lied: **1 Einrichten** (Taktart, Automatisch: Taktstriche, Zählzeiten), **2 Melodie schreiben** (Töne, Notenwert, Pause, Wiederholung, Hand).
  - **Rhythmus:** **1 Einrichten** (Taktart, Automatisch: Taktstriche, Zählzeiten, Rhythmussprache), **2 Rhythmus schreiben** (Notenwert, Pause, Takt und Wiederholung, Zählzeiten von Hand).
  - **Notenwerte und Pausen** sind bei Melodie, Rhythmus und Lied gleich angeordnet: Ganze, Halbe, Viertel, Achtel, (im Lied Sechzehntel), Punkt; darunter die Pausen. Der **Punkt** macht aus der Halben eine punktierte Halbe und aus der Viertel eine punktierte Viertel (an der Markierung oder bei der gerade gesetzten Note davor); nochmal tippen nimmt ihn weg. Eine eigene punktierte Pause gibt es nicht mehr. Rhythmussprache der punktierten Viertel: *ta i*.
  - Die Zahlen unter den Werten sind Schläge (½ Achtel, 1 Viertel, 2 Halbe, 3 punktierte Halbe, 4 Ganze).
- **Notenwerte:** Steht die Markierung auf einem bunten Punkt, kommt das Notenzeichen darunter. Im Bereich *Rhythmus* wird es auf einem leeren Platz eigenständig eingesetzt, anstelle eines Punkts, und klingt beim Abspielen wie Klanghölzer. Im Bereich *Melodie* geht das nicht, dort gibt es einen Hinweis. In beiden Fällen springt die Markierung weiter. So kann man erst die Töne schreiben und dann von vorn den Rhythmus darunter tippen. Bunte Punkte ohne Notenwert zählen einen Schlag. Wird ein Punkt ausgetauscht, behält er seinen Notenwert. Zwei Achtel hintereinander bekommen einen Balken.
- **Pausenwerte** setzen eine Pause mit Pausenzeichen. Ein leerer Platz in der Zeile bleibt ein stiller Schlag ohne Zeichen.
- **Takt:** Setzt oder entfernt einen Taktstrich vor dem markierten Platz. Er belegt keinen eigenen Platz und bleibt stehen, wenn der Ton dahinter ersetzt, verschoben oder entfernt wird.
- **Taktart:** Die Taktarten stehen nebeneinander (ohne, 2/2, 2/4, 3/4, 4/4, 6/8); antippen setzt sie für die markierte Zeile, die geltende ist hervorgehoben. Sie steht vorn in jeder Zeile, in der etwas steht – auch nach einem automatischen Umbruch –, bis eine andere Taktart kommt. Die Taktart steht als zwei Zahlen übereinander ganz vorn in der Zeile, eine eingeschaltete Notenlinie läuft zwischen ihnen hindurch. Die bekannten Lieder bringen ihre Taktart in der ersten Zeile mit.
- **Schluss:** Wie „Takt“, setzt aber einen Schlussstrich (dünner und dicker Strich). Auf einem Platz mit Taktstrich wird daraus ein Schlussstrich und umgekehrt.
- **Wdh. Anfang / Wdh. Ende** (Rhythmus in der Reihe *Takt*, Melodie unter *Wiederholung*): setzen ‖: bzw. :‖ vor dem markierten Platz; beides zusammen ergibt :‖:. Ohne ‖: wird vom Anfang an wiederholt. Beim Abspielen wird die Wiederholung einmal mitgespielt. Die Zeichen bleiben auch mit automatischen Taktstrichen stehen.
- **Zählzeiten von Hand:** Unter einer Note oder Pause *1–6* oder *+* („und“) tippen. Dauert das Zeichen mehrere Zählzeiten (z. B. eine Halbe im 4/4-Takt: *1*, *2*), bleibt die Markierung stehen, bis alle getippt sind, danach springt sie weiter. Ein erneuter Tipp auf einem fertigen Platz ersetzt die Zählzeiten, der Löschknopf entfernt sie. Wird das Zeichen ausgetauscht, bleiben die Zählzeiten stehen.
- **Automatisch: Zählzeiten** zeigt unter allen Noten und Pausen die Zählzeiten nach der Taktart, gehaltene Zählzeiten blasser (Halbe im 4/4: **1** 2). Zwischen zwei Zählzeiten steht „+“. Im 6/8-Takt wird in Achteln gezählt (1–6), im 2/2 in Halben. Solange das an ist, sind die Zählzeit-Knöpfe aus; von Hand getippte Zählzeiten bleiben gespeichert und erscheinen wieder, wenn man es ausschaltet.
- **Rhythmussprache** (Rhythmus, unter *Automatisch*): schreibt unter die Notenzeichen *ta* (Viertel), *ti ti* (zwei Achtel), *taja* (Halbe), *tajaja* (punktierte Halbe) und *tajajaja* (Ganze); eine einzelne Achtel ist *ti*, Pausen bleiben ohne. Weil bei Rhythmus jeder Schlag ein Feld hat, stehen die Silben unter ihren Schlägen: bei der Halben *ta* unter Schlag 1 und *ja* unter Schlag 2, passend zu den Zählzeiten. Jede Silbengruppe liegt auf einem Farbfeld (ta, ti, ti ti, ta ja, ta ja ja ja; was zusammen gesprochen wird, auf einem gemeinsamen), die Farbe zeigt den Notenwert: Viertel gelb, Achtel blau, Halbe grün, punktierte Halbe lila, Ganze orange.
- **Automatisch: Taktstriche** setzt die Taktstriche nach der Taktart. Geht ein Takt genau am Zeilenende auf, steht der Strich hinter dem letzten Zeichen. Von Hand gesetzte Taktstriche sind dann ausgeblendet (und der Knopf *Takt* aus), der Schlussstrich bleibt.
- **Beides automatisch** zählt ab der ersten Zeile mit Taktart durchgehend über die Zeilen hinweg; eine Zeile mit neuer Taktart beginnt wieder bei 1. Zeilen davor bleiben leer. Leere Plätze zählen einen Schlag. Ein Auftakt wird nicht erkannt.
- **Linie:** Schaltet für die markierte Zeile eine Notenlinie ein oder aus. Sie läuft durch die Kreismitte vom ersten bis zum letzten Zeichen und wächst mit. Die Köpfe eigenständiger Notenzeichen sitzen auf der Linie. **Bei Rhythmus** ist die Linie auf einer neuen oder geleerten Tafel und in jeder neuen Zeile von Anfang an eingeschaltet und läuft wie im Lied über die ganze Zeile – zu sehen ist sie, sobald das erste Zeichen in der Zeile steht.
- **Platz wählen:** Auf der Tafel einen Platz antippen.
- **Verschieben/Tauschen:** Einen Ton auf der Tafel ziehen und auf einem anderen Platz loslassen.
- **r / l:** Markiert den Ton für die rechte oder linke Hand.
- **Einfügen:** Schaltet den Einfügen-Modus um. Ein neuer Ton wird an der Markierung eingeschoben, der Rest der Zeile rückt einen Platz weiter.
- **Löschen:** Das Gegenstück dazu, wie die Löschtaste: Steht die Markierung auf einem Zeichen, verschwindet es und die folgenden Töne der Zeile rücken nach vorne (mehrmals tippen löscht nach rechts). Steht sie hinter dem letzten Zeichen, verschwindet das Zeichen davor und die Markierung rückt nach (wie die Rücktaste); am Anfang einer leeren Zeile geht es am Ende der Zeile darüber weiter.
- **Entfernen:** Ein Ton mitten in der Zeile wird zur Pause, ein Ton am Zeilenende verschwindet ganz (die Zeile wird kürzer).
- **Abspielen:** Spielt die Tafel Zeile für Zeile bis zur letzten Note. Töne und Pausen dauern so lange wie ihre Länge. Bunte Punkte klingen wie ein Glockenspiel (eine Oktave über dem notierten Ton, am Ende der Notenlänge abgedämpft), Notenzeichen ohne Punkt wie Klanghölzer. Leere Plätze innerhalb einer Zeile sind Pausen von einem Schlag, eine leere Zeile ist keine Pause. Das Tempo stellt man im Menü ein. Steht die Markierung mitten auf der Tafel, beginnt das Abspielen dort; steht sie hinter dem letzten Ton, von vorn. Die Stelle, die gerade klingt, leuchtet als gelber Balken über die ganze Zeilenhöhe, das Zeichen wird größer (im Lied rot) – gut sichtbar auch von hinten im Klassenraum.
- **Rückgängig:** Nimmt die letzten bis zu 60 Schritte zurück, auch das Laden eines Lieds.
- **Alles löschen** und **− Zeile** (wenn in der Zeile Noten stehen) muss man zur Sicherheit zweimal antippen.
- Die Tafel hat höchstens 8 Zeilen.

### Lied (echtes Notenblatt)

Fünf Notenlinien mit Violinschlüssel, ohne Farben. Wiederholungszeichen und Liedtext gibt es (noch) nicht (siehe `plan-lied.md`).

- **Aufbau der Leiste** (von oben): **Anzeige** (Notennamen, Farben, Zählzeiten), dann drei nummerierte Blöcke in der Reihenfolge, in der man arbeitet: **1 Lied einrichten** (Taktart, Auftakt, Tonart – einmal am Anfang), **2 Noten schreiben** (Notenwert, Pause, Töne mit Vorzeichen, Bögen und Striche), **3 Liedtext**; ganz unten *Als Melodie übernehmen*.
- **Taktart:** Die Taktarten stehen nebeneinander (ohne, 2/2, 2/4, 3/4, 4/4, 6/8); Antippen stellt sie für das ganze Lied ein.
- **Notenwert vorwählen:** Unter *Notenwert* einen Wert antippen (Ganze, Halbe, Viertel, Achtel, Sechzehntel), danach bekommen alle folgenden Töne diesen Wert. Der Punkt (anderthalbmal so lang) wird nach dem Wert dazugetippt und gilt ebenfalls weiter; ein neuer Wert ist wieder ohne Punkt. Eine punktierte Sechzehntel gibt es nicht.
- **Töne:** Die Leiste zeigt die Töne c' bis h'' mit ihrer Bezeichnung, eine Reihe je Oktave, die höchste oben. Der Knopf darunter klappt auch die kleine (c–h) und die dreigestrichene Oktave (c'''–h''') aus; das bleibt gespeichert. Antippen setzt den Ton. *Kreuz*, *Be* und *Auflöser* schalten das Vorzeichen um, nochmal tippen nimmt es weg. Vorzeichen wirken auf den zuletzt gesetzten Ton (blau), bis man woanders hin tippt; dann auf den markierten.
- **Pausen:** Die Reihe *Pausen* zeigt alle Pausenwerte (Ganze bis Sechzehntel). Antippen setzt die Pause mit diesem Wert an der Markierung.
- **Bogen:** Haltebogen vom zuletzt gesetzten (oder markierten) Ton zur nächsten Note, nochmal tippen nimmt ihn weg. Zwei gleiche Töne mit Bogen klingen als ein langer Ton, der zweite wird nicht neu angeschlagen. Tippt man nach dem Bogen denselben Ton, übernimmt er das Vorzeichen. Steht die nächste Note in der nächsten Zeile, läuft der Bogen bis zum Zeilenende und beginnt dort neu.
- **Markieren:** Eine Note antippen. Der Stift übernimmt ihren Wert. Ein Tonname tauscht dann nur die Tonhöhe (der Wert bleibt), ein Notenwert oder Punkt ändert den Wert der markierten Note. Tippt man neben die Noten, kommt die Markierung ans Zeilenende.
- **Ziehen:** Die markierte Note mit dem Finger nach oben oder unten ziehen ändert die Tonhöhe Stufe für Stufe, man hört dabei den neuen Ton (ein Vorzeichen fällt weg). Zur Seite auf ein anderes Zeichen ziehen tauscht beide, Takt-, Schlussstrich und Umbruch bleiben an ihrer Stelle. Nur die markierte Note lässt sich ziehen; überall sonst scrollt der Finger das Notenblatt wie gewohnt.
- **einfügen:** Töne und Pausen kommen an der Markierung dazu, statt zu ersetzen; Notenwerte ändern dann nur den Stift.
- **entfernen:** Eine Note wird zur Pause gleicher Länge, damit die Takte stimmen. Eine Pause oder das letzte Zeichen verschwinden ganz.
- **löschen:** Das Zeichen an der Markierung verschwindet ganz, alles dahinter rückt nach vorn. Steht die Markierung am Ende, verschwindet das Zeichen davor (wie die Rücktaste) – mehrmals tippen löscht so von hinten nach vorn.
- **Umbruch:** Ab der Markierung geht es in einer neuen Zeile weiter; nochmal tippen holt die Zeile wieder hoch. Dazu bricht das Notenblatt von selbst um (siehe Menü, *Zeilen*).
- **Anzeige:** *Notennamen* zeigt unter jeder Note ihren Namen mit Oktavstrichen (c', fis'', b …), *Farben* färbt die Notenköpfe wie die Punkte bei Melodie (C rot, D orange, E gelb, F hellgrün, G grün, A lila, H pink; in jeder Oktave gleich, Fis wie F, B wie H). Beides gibt es auch als Schalter im Menü und gilt auch für den Druck.
- **Auftakt** (unter der Taktart): ohne, Achtel, Viertel, punktierte Viertel, Halbe, punktierte Halbe – nur was kürzer als ein Takt ist. Mit Auftakt zählen Taktstriche und Zählzeiten erst danach los; der Auftakt bekommt die letzten Zählzeiten des Takts (z. B. „3“ im 3/4-Takt).
- **Tonart** (unter dem Auftakt): ◀ ♭ und ♯ ▶ wählen die Tonart von 6 ♭ bis 6 ♯ (der Name steht dazwischen, z. B. „G-Dur · 1♯“). Die Vorzeichen stehen vorn in jedem System; eine Note ohne eigenes Vorzeichen klingt nach der Tonart, *Auflöser* hebt das für diese Note auf. Notennamen, Abspielen und MusicXML folgen der Tonart.
- **Taktstriche automatisch** (Menü, Standard: an): wie auf der Tafel; von Hand gesetzte Taktstriche sind dann ausgeblendet, der Schlussstrich bleibt. Passt eine Note, die man setzt oder deren Wert man ändert, nicht mehr in den Takt, wird sie am Taktstrich aufgeteilt und mit einem Haltebogen verbunden, z. B. eine Halbe auf der 4 zu zwei Vierteln; Pausen ebenso, ohne Bogen. Ragt trotzdem eine Note über die Grenze (etwa weil davor etwas eingefügt wurde), kommt der Strich direkt hinter sie, der Takt wird als zu voll markiert und danach wird neu gezählt.
- **Zählzeiten** (Leiste, Anzeige) zeigt die Zählzeiten nach der Taktart unter den Noten.
- **Taktstrich / Schluss:** setzen oder entfernen einen Takt- bzw. Schlussstrich vor der Markierung (wie bei Rhythmus). Solange *Taktstriche automatisch* an ist, ist *Taktstrich* aus; der Schlussstrich geht immer.
- **Wdh. Anfang / Wdh. Ende / Klammer:** setzen ‖: bzw. :‖ vor der Markierung (beides zusammen ergibt :‖:). Ohne ‖: wird vom Anfang an wiederholt. *Klammer* (nur an einem :‖) macht den Takt davor zur 1. Klammer und den Takt danach zur 2. Klammer. Ein ‖: am Zeilenende steht am Anfang der nächsten Zeile. Beim Abspielen wird die Wiederholung mitgespielt, beim zweiten Mal ohne die 1. Klammer.
- **Liedtext:** Note antippen und die Silbe ins Feld *Liedtext* schreiben; *weiter* (oder die Eingabetaste) springt zur nächsten Note. Ein „-“ am Ende verbindet mit der nächsten Silbe (z. B. *Al-* *le*). Der Text steht unter dem System (unter den Zählzeiten), auch im Druck und im MusicXML-Export. Beim Aufteilen einer Note am Taktstrich bleibt die Silbe am ersten Stück.
- **Zählzeiten** stehen wie auf der Tafel unter dem System: die Zahl auf der Zählzeit, „+“ genau dazwischen, gehaltene Zählzeiten blasser an ihrer Stelle. Im 6/8-Takt wird in Achteln gezählt, im 2/2 in Halben. Eine Note hinter einem Haltebogen zählt blass, weil sie nicht neu angeschlagen wird.
- **Balken:** Achtel und Sechzehntel innerhalb eines Schlags bekommen von selbst einen Balken (im 6/8-Takt drei Achtel, im 2/2 eine Halbe). Im 4/4-Takt bekommen vier einfache Achtel in einer Takthälfte einen gemeinsamen Balken. Pausen, Taktstriche und Umbrüche unterbrechen ihn. Der Balken folgt leicht der Melodie (höchstens einen Linienabstand).
- **Abspielen** klingt wie ein Klavier.
- **Vorzeichen** werden wie in echten Noten gezeichnet: Ein ♯ oder ♭ gilt bis zum Taktstrich und wird im selben Takt nicht wiederholt; steht danach derselbe Ton ohne Vorzeichen, bekommt er von selbst ein ♮. Gespielt wird immer der Ton, den man eingegeben hat. Ein ausdrücklich gesetztes ♮ (*Auflöser*) bleibt immer sichtbar.
- **Zeilen automatisch umbrechen** (Menü, Standard: an): Die Notengröße steht fest, und jede Zeile wird Takt für Takt gefüllt, solange sie auf den Bildschirm passt, höchstens mit fünf Takten; dann geht es hinter dem letzten Taktstrich in der nächsten Zeile weiter. Volle Zeilen werden auf die ganze Breite gestreckt. Ohne Taktart zählt für den Umbruch je eine Ganze (vier Viertel) als Takt, ohne dass Striche erscheinen. Umbrüche von Hand bleiben. Passt nicht einmal der breiteste Takt in eine Zeile, werden die Noten so weit kleiner. Beim Drehen des Tablets wird neu umbrochen. Ausgeschaltet bleiben die Zeilen, wie man sie umbrochen hat: Das Notenblatt wird so groß, dass die längste Zeile die Breite füllt, und lässt sich sonst seitlich wischen.
- Im Menü:
  - **Bekannte Lieder:** Alle meine Entchen, Hänschen klein, Kuckuck, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude (jetzt mit punktierter Viertel) und Zum Geburtstag viel Glück (mit Auftakt). Neue trägt man in `js/lied/songs.js` ein, die Schreibweise steht oben in der Datei.
  - **Notennamen** unter den Noten mit Oktavstrichen (c', fis'', b, es' …).
  - **Notengröße** *normal*, *groß*, *sehr groß* zum Zeigen vor der Klasse (14, 20 bzw. 28 Pixel pro Linienabstand, mit automatischem Umbruch).
  - **Takte prüfen** (Standard: an): Ein Takt, der zu voll oder nicht voll ist, wird rot hinterlegt. Auftakt (mit seiner eigenen Länge) und Schlusstakt sind ausgenommen.
  - **Exportieren:** *Als PDF drucken* öffnet den Druckdialog (dort „Als PDF speichern“, auf dem iPad über Teilen). Gedruckt wird das Notenblatt so, wie es eingestellt ist (Notennamen, Zählzeiten, Notengröße), schwarz auf weiß auf A4, mit dem Liednamen als Titel, ohne Markierung und rote Takte. Die Zeilen füllen die Seitenbreite (die letzte nicht), kein System wird über einen Seitenumbruch geteilt.
    *Als MusicXML speichern* lädt das Lied als `.musicxml`-Datei herunter (Dateiname = Liedname). MusicXML ist das Austauschformat der Notenprogramme; in MuseScore, Sibelius, Dorico usw. lässt sich das Lied öffnen, weiter bearbeiten und als PDF drucken. Mit dabei: Titel, Taktart, Auftakt, Takte (wie gerade angezeigt), Vorzeichen, Haltebögen, Balken, Umbrüche, Schlussstrich und das Tempo.

- **Abspielen** in allen Bereichen: runde Knöpfe unten rechts auf der Tafel – ▶ (beim Abspielen rot mit ■), daneben Einzählen (1 2 3 4) und Metronom; eingeschaltet sind sie dunkel.

### Liedersammlung und Einstellungen

- In der Leiste oben rechts gibt es zwei Knöpfe statt eines Menüs: **Lieder** öffnet die **Liedersammlung** (speichern, gespeicherte Lieder, Zuletzt ersetzt, bekannte Lieder, Exportieren, Ins Lied übernehmen), **Einstellungen** die Einstellungen des offenen Bereichs und die für alle Bereiche (Tempo, Bildschirm anlassen). Beide nutzen dieselbe Seitenleiste.
- Das Menü gehört immer zum offenen Bereich (Titel „Menü · Melodie“, „Menü · Rhythmus“ usw.). Melodien und Rhythmen werden in **getrennten Listen** gespeichert und in die Tafel des offenen Bereichs geladen.
- **Lied speichern / laden / löschen.** Gleicher Name heißt ersetzen (mit Rückfrage).
- **Zuletzt ersetzt:** Die aktuelle Tafel wird ohnehin laufend gesichert. Lädt man ein anderes Lied oder tippt „Alles löschen“, wandert die bisherige Tafel in den Autosave-Platz ihres Bereichs (einer pro Bereich) und lässt sich von dort wieder laden (auch nach dem Schließen). Beim Laden tauschen Tafel und Autosave die Plätze.
- **Bekannte Lieder** (im Bereich Melodie; die des Bereichs Lied stehen oben): Fest eingebaute Melodien (Alle meine Entchen, Hänschen klein, Kuckuck, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude). Sie belegen keinen Speicherplatz und lassen sich nicht löschen. Neue trägt man in `js/tafel/melodies.js` in die Liste `MELODIES` ein: `|` trennt Zeilen, `-` ist eine Pause, `:2` hängt die Länge in Schlägen an (z. B. `G:2`, `C+:.5`, `-:2`), `meter` ist die Taktart der ersten Zeile. Eine punktierte Viertel gibt es nicht, darum stehen in der Ode an die Freude dort zwei Viertel.
- **Farben:** Zur Wahl stehen *Oktavfarben* (Standard, hohe Töne in der Farbe ihres Grundtons) und *Original*.
- **Notenzeichen** unter den bunten Punkten ein- und ausschalten. Ausgeschaltet werden die Kreise größer. Die Werte gelten beim Abspielen trotzdem, eigenständige Notenzeichen und Pausen bleiben sichtbar.
- **Ein Platz pro Schlag** (Melodie und Rhythmus, immer): Jedes Zeichen bekommt so viel Platz, wie es dauert. Ein Schlag ist einen Kreis breit; eine Halbe hält den nächsten Platz frei, eine punktierte Halbe zwei, eine Ganze drei. Bei Melodie wird ein Schlag mit Achteln zwei Kreise breit, damit die bunten Kreise ihre Größe behalten; bei Rhythmus teilen sich zwei Achtel ein Feld. Gehaltene Zählzeiten stehen an ihrer Stelle. (Früher war das eine Einstellung im Menü.)
- **Tempo** beim Abspielen (50–160 pro Minute).
- **Einzählen** und **Metronom** (runde Knöpfe unten rechts auf der Tafel neben ▶, die Einstellung gilt für alle Bereiche): Einzählen klickt vor dem Abspielen einen Takt vorweg, das Metronom klickt jeden Schlag mit (der erste im Takt heller). Gezählt wird nach der Taktart: 2/2 in Halben, 6/8 in Achteln, sonst in Vierteln; ohne Taktart vier Viertel.
- **Transponieren** (Lied, im Block „Lied einrichten“ unter der Tonart): ½ Ton tiefer oder höher; das ganze Lied wandert samt Tonart (die mit den wenigsten Vorzeichen), die Noten werden in der neuen Tonart richtig geschrieben.
- **Ins Lied übernehmen** (Melodie und Rhythmus): macht aus der Tafel echte Noten im Bereich Lied. Bunte Punkte werden Noten auf ihrer Tonhöhe (die Farben werden eingeschaltet), Notenzeichen Noten auf der Mittellinie, Pausen und leere Plätze Pausen; jede Zeile wird eine Zeile, am Ende steht ein Schlussstrich. Was über einen Taktstrich ragt, wird aufgeteilt und übergebunden. Das bisherige Lied liegt danach unter „Zuletzt ersetzt“.
- **Als Melodie übernehmen** (Knopf ganz unten in der Lied-Leiste): macht aus dem Lied Farbpunkte im Bereich Melodie, jede Note ein Punkt mit Notenwert. Übergebundene Noten werden zu einer langen zusammengefasst, wenn es die Länge gibt; Sechzehntel werden zu Achteln, andere Längen auf die nächste gerundet. Töne außerhalb der Farbpunkte (c' bis f'', dazu Fis und B; die Tonart wird berücksichtigt) werden Pausen gleicher Länge – der Hinweis sagt, wie viele. Takte bleiben in einer Zeile (bis 10 Schläge), Umbrüche, Taktart, Schluss- und Wiederholungsstriche kommen mit; der Liedtext nicht. Höchstens 8 Zeilen passen auf die Tafel. Die bisherige Melodie liegt danach unter „Zuletzt ersetzt“.
- **Bildschirm anlassen** (Standard: an): Solange die App offen ist, geht der Bildschirm nicht aus. Manche Browser erlauben das erst nach der ersten Berührung. Kann der Browser es nicht, fehlt der Schalter.

## Speicherung

Alles liegt im `localStorage` des Browsers, also nur auf diesem Gerät und in diesem Browser:

| Schlüssel | Inhalt |
|---|---|
| `notentafel.v1` / `notentafel.rhy.v1` | Die aktuelle Tafel (Melodie / Rhythmus) |
| `notentafel.songs.v1` / `notentafel.rhy.songs.v1` | Gespeicherte Melodien / Rhythmen |
| `notentafel.autosave.v1` / `notentafel.rhy.autosave.v1` | Die zuletzt ersetzte Tafel (ein Platz pro Bereich) |
| `notentafel.settings.v1` | Farbthema, Tempo, ob Notenzeichen angezeigt werden, offener Bereich, die Automatik-Schalter, Rhythmussprache, Einzählen, Metronom und Bildschirm anlassen |
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
