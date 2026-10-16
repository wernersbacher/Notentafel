# Notentafel

Eine digitale Notentafel für den Musikunterricht. Gebaut fürs **Tablet mit Touch-Bedienung**: Töne antippen, auf die Tafel setzen, verschieben, abspielen.

## Dateien

| Datei | Inhalt |
|---|---|
| `Notentafel.html` | Aufbau und Gestaltung (HTML + CSS) |
| `notentafel.js` | Die gesamte Logik |

Zum Starten `Notentafel.html` im Browser öffnen. Beide Dateien müssen im selben Ordner liegen. Ein Server ist nicht nötig, und die App funktioniert auch offline. Die Schriften kommen von Google Fonts; ohne Internet springen Systemschriften ein.

## Bedienung

- **Ton setzen:** Rechts einen Ton antippen. Er landet auf dem markierten Platz, danach springt die Markierung **genau einen Platz weiter**. Das gilt auch beim Austauschen, sodass man mehrere falsche Töne hintereinander korrigieren kann.
- **Platz wählen:** Auf der Tafel einen Platz antippen.
- **Verschieben/Tauschen:** Einen Ton auf der Tafel ziehen und auf einem anderen Platz loslassen.
- **r / l:** Markiert den Ton für die rechte oder linke Hand.
- **Einfügen:** Schaltet den Einfügen-Modus um. Ein neuer Ton wird an der Markierung eingeschoben, alles danach rückt einen Platz weiter (wenn nötig, kommt eine Zeile dazu). „Lücke zu“ entfernt den markierten Platz und zieht die folgenden Töne nach vorne.
- **Abspielen:** Spielt die Tafel von vorne bis zur letzten Note. Leere Plätze dazwischen sind Pausen. Das Tempo stellt man im Menü ein.
- **Rückgängig:** Nimmt die letzten bis zu 60 Schritte zurück, auch das Laden eines Lieds.
- **Alles löschen** und **− Zeile** (wenn in der Zeile Noten stehen) muss man zur Sicherheit zweimal antippen.
- Die Tafel hat höchstens 8 Zeilen. Am Ende erscheint ein Hinweis, dass ein weiterer Ton den letzten ersetzt.

### Menü

- **Lied speichern / laden / löschen.** Gleicher Name heißt ersetzen (mit Rückfrage).
- **Farben:** Zur Wahl stehen *Original* und *Oktavfarben* (hohe Töne in der Farbe ihres Grundtons).
- **Tempo** beim Abspielen (50–160 pro Minute).

## Speicherung

Alles liegt im `localStorage` des Browsers, also nur auf diesem Gerät und in diesem Browser:

| Schlüssel | Inhalt |
|---|---|
| `notentafel.v1` | Die aktuelle Tafel |
| `notentafel.songs.v1` | Gespeicherte Lieder |
| `notentafel.settings.v1` | Farbthema und Tempo |

Wenn man die Website-Daten des Browsers löscht oder im privaten Modus arbeitet, ist alles weg.

## Bewusste Entscheidungen

- **Halbtöne:** Absichtlich gibt es nur **Fis** und **B**, weil das für das verwendete Liedgut reicht. Weitere (Cis, Es, Gis …) lassen sich in `notentafel.js` über die Liste `NOTES` und die Gruppen in `GROUPS` ergänzen.
- **Hohe Töne im Original-Thema alle rot:** Das ist gewollt. Wer die Oktave farblich zuordnen will, nimmt das Thema *Oktavfarben*.
- **Keine Tastaturbedienung als Hauptweg:** Die App ist für Touch gedacht.

## Hinweis für iPad/iPhone

Ist der Stummschalter am Gerät aktiv, bleibt das Abspielen in Safari stumm. Das ist eine iOS-Eigenheit bei Web-Audio.
