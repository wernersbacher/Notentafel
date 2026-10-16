# Notentafel

Eine digitale Notentafel für den Musikunterricht. Gebaut fürs **Tablet mit Touch-Bedienung**: Töne antippen, auf die Tafel setzen, verschieben, abspielen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Aufbau und Gestaltung (HTML + CSS) |
| `notentafel.js` | Die gesamte Logik |

Zum Starten `index.html` im Browser öffnen. Beide Dateien müssen im selben Ordner liegen. Ein Server ist nicht nötig, und die App funktioniert auch offline. Die Schriften kommen von Google Fonts (Andika für die Notenbuchstaben, Nunito für die Knöpfe); ohne Internet springen Systemschriften ein.

## Bedienung

- **Ton setzen:** Rechts einen Ton antippen. Er landet auf dem markierten Platz, danach springt die Markierung **genau einen Platz weiter in derselben Zeile**. Das gilt auch beim Austauschen, sodass man mehrere falsche Töne hintereinander korrigieren kann.
- **Zeilen:** Eine Zeile wird so lang, wie man schreibt (bis 32 Plätze). Werden die Zeilen länger, schrumpfen alle Kreise gleichmäßig. Wenn sie zu klein würden, lässt sich die Tafel seitlich wischen. Blasse Plätze liegen hinter dem Zeilenende.
- **Umbruch:** Die Markierung und alles dahinter rutschen in eine neue Zeile darunter. Steht dahinter nichts und ist die nächste Zeile leer, springt die Markierung nur dorthin.
- **Fertig:** Blendet die Markierung und die leeren Plätze aus, damit eine saubere Ansicht für die Klasse bleibt. Ein Tipp auf die Tafel oder ein neuer Ton holt alles zurück.
- **Die Leiste** ist gegliedert in Werkzeuge, **Notennamen** (die bunten Punkte), **Notenwerte** und **Pausenwerte**. Die Zahlen unter den Werten sind Schläge (½ Achtel, 1 Viertel, 2 Halbe, 3 punktierte Halbe, 4 Ganze).
- **Notenwerte:** Steht die Markierung auf einem bunten Punkt, kommt das Notenzeichen darunter. Auf einem leeren Platz wird es eigenständig eingesetzt, anstelle eines Punkts, und klingt beim Abspielen als Klopfen. In beiden Fällen springt die Markierung weiter. So kann man erst die Töne schreiben und dann von vorn den Rhythmus darunter tippen. Bunte Punkte ohne Notenwert zählen einen Schlag. Wird ein Punkt ausgetauscht, behält er seinen Notenwert. Zwei Achtel hintereinander bekommen einen Balken.
- **Pausenwerte** setzen eine Pause mit Pausenzeichen. Ein leerer Platz in der Zeile bleibt ein stiller Schlag ohne Zeichen.
- **Takt:** Setzt oder entfernt einen Taktstrich vor dem markierten Platz. Er belegt keinen eigenen Platz und bleibt stehen, wenn der Ton dahinter ersetzt, verschoben oder entfernt wird.
- **Taktart:** Öffnet eine Auswahl (ohne, 2/2, 2/4, 3/4, 4/4, 6/8) für die markierte Zeile. Die Taktart steht als zwei Zahlen übereinander ganz vorn in der Zeile, eine eingeschaltete Notenlinie läuft zwischen ihnen hindurch. Die bekannten Lieder bringen ihre Taktart in der ersten Zeile mit.
- **Schluss:** Wie „Takt“, setzt aber einen Schlussstrich (dünner und dicker Strich). Auf einem Platz mit Taktstrich wird daraus ein Schlussstrich und umgekehrt.
- **Linie:** Schaltet für die markierte Zeile eine Notenlinie ein oder aus. Sie läuft durch die Kreismitte vom ersten bis zum letzten Zeichen und wächst mit. Die Köpfe eigenständiger Notenzeichen sitzen auf der Linie.
- **Platz wählen:** Auf der Tafel einen Platz antippen.
- **Verschieben/Tauschen:** Einen Ton auf der Tafel ziehen und auf einem anderen Platz loslassen.
- **r / l:** Markiert den Ton für die rechte oder linke Hand.
- **Einfügen:** Schaltet den Einfügen-Modus um. Ein neuer Ton wird an der Markierung eingeschoben, der Rest der Zeile rückt einen Platz weiter. „Lücke zu“ entfernt den markierten Platz und zieht die folgenden Töne der Zeile nach vorne.
- **Entfernen:** Ein Ton mitten in der Zeile wird zur Pause, ein Ton am Zeilenende verschwindet ganz (die Zeile wird kürzer).
- **Abspielen:** Spielt die Tafel Zeile für Zeile bis zur letzten Note. Töne und Pausen dauern so lange wie ihre Länge. Leere Plätze innerhalb einer Zeile sind Pausen von einem Schlag, eine leere Zeile ist keine Pause. Das Tempo stellt man im Menü ein.
- **Rückgängig:** Nimmt die letzten bis zu 60 Schritte zurück, auch das Laden eines Lieds.
- **Alles löschen** und **− Zeile** (wenn in der Zeile Noten stehen) muss man zur Sicherheit zweimal antippen.
- Die Tafel hat höchstens 8 Zeilen.

### Menü

- **Lied speichern / laden / löschen.** Gleicher Name heißt ersetzen (mit Rückfrage).
- **Zuletzt ersetzt:** Die aktuelle Tafel wird ohnehin laufend gesichert. Lädt man ein anderes Lied oder tippt „Alles löschen“, wandert die bisherige Tafel in diesen einen Autosave-Platz und lässt sich von dort wieder laden (auch nach dem Schließen). Beim Laden tauschen Tafel und Autosave die Plätze.
- **Bekannte Lieder:** Fest eingebaute Melodien (Alle meine Entchen, Hänschen klein, Kuckuck, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude). Sie belegen keinen Speicherplatz und lassen sich nicht löschen. Neue trägt man in `notentafel.js` in die Liste `MELODIES` ein: `|` trennt Zeilen, `-` ist eine Pause, `:2` hängt die Länge in Schlägen an (z. B. `G:2`, `C+:.5`, `-:2`), `meter` ist die Taktart der ersten Zeile. Eine punktierte Viertel gibt es nicht, darum stehen in der Ode an die Freude dort zwei Viertel.
- **Farben:** Zur Wahl stehen *Original* und *Oktavfarben* (hohe Töne in der Farbe ihres Grundtons).
- **Notenzeichen** unter den bunten Punkten ein- und ausschalten. Ausgeschaltet werden die Kreise größer. Die Werte gelten beim Abspielen trotzdem, eigenständige Notenzeichen und Pausen bleiben sichtbar.
- **Tempo** beim Abspielen (50–160 pro Minute).

## Speicherung

Alles liegt im `localStorage` des Browsers, also nur auf diesem Gerät und in diesem Browser:

| Schlüssel | Inhalt |
|---|---|
| `notentafel.v1` | Die aktuelle Tafel |
| `notentafel.songs.v1` | Gespeicherte Lieder |
| `notentafel.autosave.v1` | Die zuletzt ersetzte Tafel (ein Platz) |
| `notentafel.settings.v1` | Farbthema, Tempo und ob Notenzeichen angezeigt werden |

Wenn man die Website-Daten des Browsers löscht oder im privaten Modus arbeitet, ist alles weg.

## Bewusste Entscheidungen

- **Halbtöne:** Absichtlich gibt es nur **Fis** und **B**, weil das für das verwendete Liedgut reicht. Weitere (Cis, Es, Gis …) lassen sich in `notentafel.js` über die Liste `NOTES` und die Gruppen in `GROUPS` ergänzen.
- **Schrift auf den Tönen immer schwarz:** Darum muss jede Tonfarbe hell genug sein (Kontrast ≥ 4,5). Das A ist deshalb ein helleres Lila. Neue Farben in `NOTES` bitte auch daraufhin prüfen.
- **Hohe Töne im Original-Thema alle rot:** Das ist gewollt. Wer die Oktave farblich zuordnen will, nimmt das Thema *Oktavfarben*.
- **Keine Tastaturbedienung als Hauptweg:** Die App ist für Touch gedacht.

## Hinweis für iPad/iPhone

Ist der Stummschalter am Gerät aktiv, bleibt das Abspielen in Safari stumm. Das ist eine iOS-Eigenheit bei Web-Audio.
