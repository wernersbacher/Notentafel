# Plan: Notentafel als Online-Dienst (Testversion, Konto, Bezahlen)

Bisher läuft die Notentafel als statische Seite über GitHub Pages und speichert alles im `localStorage` des Geräts. Daraus soll ein Dienst werden:

- Eine **offene Testversion** ohne Anmeldung, wie heute: Speichern nur auf dem Gerät, nicht alle Funktionen.
- Eine **volle Version mit Konto**: Lieder liegen im Konto statt auf dem Gerät, alle Funktionen sind da, eventuell gegen Bezahlung.
- Die **Entwicklung lokal** läuft weiter ohne Backend mit `npm start`, standardmäßig mit allen Funktionen und dem `localStorage` als Speicher.

Umgesetzt wird das später. Dieses Dokument hält das Konzept fest.

---

## Festgelegte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Backend | **PocketBase** (eine Go-Datei mit SQLite, Login, REST-API, Admin-Oberfläche) im Docker-Container auf dem eigenen Server. |
| Webserver | **Caddy** davor: liefert die statischen Dateien aus, holt das HTTPS-Zertifikat, leitet `/api/` an PocketBase weiter. Alles läuft unter derselben Domain, darum gibt es kein CORS. |
| Login | Über PocketBase: E-Mail mit Passwort oder Einmal-Code, dazu OAuth (Microsoft und Google, weil Lehrkräfte oft so ein Schulkonto haben). |
| Bezahlen | Ein **Merchant of Record** (Paddle, Lemon Squeezy oder Polar). Er verkauft im eigenen Namen und kümmert sich um die EU-Umsatzsteuer, Rechnungen und den Widerruf. Sein Webhook setzt in PocketBase den Tarif des Nutzers. |
| Frontend | Bleibt reines HTML/JS ohne Build-Schritt. Das PocketBase-SDK kommt als einzelnes ES-Modul nach `js/vendor/` (also nicht von einem CDN geladen, wie bei den Schriften). |
| Speichern | **Erst lokal, dann in die Cloud:** Der `localStorage` bleibt der schnelle Speicher, auf den die App direkt zugreift. Mit Konto wird im Hintergrund mit dem Server abgeglichen. Fällt das Schul-WLAN aus, kann man weiterarbeiten. |
| Funktionen sperren | Pro-Module liefert der Server nur nach dem Login aus. Wer die Dateien einmal hat, kann sie kopieren. Das nehmen wir hin, denn der eigentliche Wert liegt im Konto (Cloud-Speicher). |
| Entwicklung | `npm start` läuft ohne Backend mit allen Funktionen und speichert im `localStorage`. Der Lite-Modus lässt sich lokal nachstellen (`npm run dev:lite`). |

---

## Stufen

| Stufe | Wer | Speichern | Funktionen |
|---|---|---|---|
| **Gast** | Nicht angemeldet (Testversion) | Nur auf dem Gerät, wie heute | Lite |
| **Konto** | Angemeldet, ohne Abo | *offen*, siehe unten | Lite |
| **Pro** | Angemeldet mit Abo (oder von Hand freigeschaltet, z. B. für Testlehrkräfte) | Im Konto, synchron über alle Geräte | Alle |
| **Dev** | Lokal mit `npm start` | `localStorage` | Je nach Modus alle (Standard) oder Lite |

**Mögliche Aufteilung Lite/Pro** (noch nicht entschieden):

- Lite: Melodie und Rhythmus, die bekannten Lieder, Speichern auf dem Gerät mit begrenzter Zahl gespeicherter Lieder (z. B. 5).
- Pro: der Bereich Lied, beliebig viele Lieder, Speichern im Konto, später auch Lieder teilen (Link für die Klasse) und weitere Liedersammlungen.

---

## Wie die App ihre Stufe kennt

Neues Modul **`js/core/plan.js`**. Es ist die einzige Stelle, an der entschieden wird, was erlaubt ist:

```js
// plan.tier: 'guest' | 'account' | 'pro'
// plan.has('lied'), plan.has('cloud'), plan.limit('songs') …
export const plan = { … };
export async function loadPlan() { … }  // wird in main.js vor dem Anmelden der Bereiche abgewartet
```

`loadPlan()` liest zuerst **`js/env.js`**, die Umgebung:

```js
export const ENV = { backend: '/api', tier: null };  // Produktion: Stufe kommt vom Server
export const ENV = { backend: null, tier: 'pro' };   // Dev (Standard)
export const ENV = { backend: null, tier: 'guest' }; // Dev:Lite
```

- In der **Produktion** liegt `js/env.js` als echte Datei im Docker-Image. `loadPlan()` fragt dann `GET /api/me` (eigene PocketBase-Route) und bekommt `{ tier, features, limits, user }` zurück. Ohne Anmeldung oder bei einem Fehler gilt `guest`.
- In der **Entwicklung** erzeugt `tools/serve.js` die Datei `js/env.js` beim Abruf selbst, abhängig vom Modus. Es gibt dann kein Backend, und `plan` nimmt die Stufe direkt aus `ENV.tier`.
- `js/env.js` steht in `.gitignore`, damit niemand aus Versehen eine Dev-Umgebung veröffentlicht. Ist die Datei nicht da, startet die App als `guest` ohne Backend. Das ist der sichere Fall.

Welche Funktionen und Grenzen zu einer Stufe gehören, steht **an einer Stelle im Server** (die Antwort von `/api/me`). Für die Dev-Modi gibt es eine Kopie davon in `plan.js`. Ein Test prüft, dass beide übereinstimmen.

---

## Speichern im Konto

### Heute

`makeStore` in `js/core/store.js` arbeitet synchron auf dem `localStorage`. Alle Bereiche nutzen nur diese Schnittstelle (`loadBoard`, `saveBoard`, `loadSongs`, `saveSong`, `deleteSong`, `loadAuto`, `saveAuto`). Das ist eine gute Ausgangslage.

### Später

Die Schnittstelle von `makeStore` bleibt synchron und unverändert. Darunter kommt eine Schicht zum Abgleichen:

1. **Lesen und Schreiben** gehen weiter sofort in den `localStorage`. Die Bereiche merken also nichts davon.
2. **Jede Änderung** (Lied gespeichert oder gelöscht, Tafel geändert, Einstellungen) kommt zusätzlich in eine Warteschlange, `core/sync.js`. Die schickt sie gebündelt und verzögert an PocketBase (Tafel z. B. höchstens alle paar Sekunden). Ohne Netz bleibt die Warteschlange liegen und wird später gesendet.
3. **Beim Start und nach dem Login** holt `sync.js` den Stand vom Server und führt ihn mit dem lokalen zusammen. Ändert sich dabei etwas, zeichnet der offene Bereich neu, z. B. über ein Ereignis `store-changed`.
4. **Konflikte:** Pro Lied gewinnt der neuere Stand (`savedAt`). Gelöschte Lieder bleiben als „gelöscht“ markiert (`deleted: true`), damit sie nicht von einem anderen Gerät wiederkommen. Bei der aktuellen Tafel gewinnt ebenfalls der neuere Stand. Was dabei überschrieben wird, landet im Autosave-Platz „Zuletzt ersetzt“, so geht nichts verloren.

**Getrennte Speicher pro Konto:** Angemeldet liegen die Daten unter eigenen Schlüsseln, z. B. `notentafel.u.<userId>.lied.v1`. Der Gast benutzt weiter die heutigen Schlüssel. Auf einem Tablet, das sich mehrere Lehrkräfte teilen, mischt sich so nichts. **Abmelden** löscht die Schlüssel des Kontos auf dem Gerät.

**Erster Login:** Hat der Gast auf dem Gerät schon Lieder, fragt die App einmal: „Lieder von diesem Gerät ins Konto übernehmen?“ Bei Namensgleichheit gilt die Regel „gleicher Name heißt ersetzen“ nicht. Die übernommenen Lieder bekommen dann einen Zusatz, z. B. „(Gerät)“.

`makeStore` bekommt dafür einen Präfix für die Schlüssel und eine Rückmeldung bei Änderungen (`onChange`). Die Bereiche müssen nur ihre Schlüssel nicht mehr fest verdrahten.

### Daten in PocketBase

| Collection | Felder | Regel |
|---|---|---|
| `users` (eingebaut) | `tier` (`account`/`pro`), `pro_until`, `billing_customer_id`, `billing_subscription_id` | Nutzer liest nur sich selbst, ändert `tier` nie selbst |
| `songs` | `user`, `area` (`mel`/`rhy`/`lied`), `name`, `data` (JSON wie heute im `localStorage`), `savedAt`, `deleted` | nur `user = @request.auth.id` |
| `slots` | `user`, `area`, `kind` (`board`/`auto`), `data`, `savedAt` | wie oben, eindeutig je `user`+`area`+`kind` |
| `settings` | `user`, `data` (beide heutigen Einstellungs-Objekte) | wie oben |

Die Prüffunktionen der Bereiche (`unpack`) laufen weiter im Frontend. Der Server speichert `data` so, wie es kommt, und begrenzt nur die Größe.

---

## Funktionen sperren, indem der Server sie nicht ausliefert

Ziel: Pro-Code wie den Bereich Lied bekommt der Browser gar nicht erst, wenn man nicht Pro ist. Perfekt muss es nicht sein.

**Im Frontend:**

- `main.js` importiert gesperrte Bereiche nicht mehr fest, sondern lädt sie nur bei Bedarf nach:
  ```js
  if (plan.has('lied')) (await import('./lied/area.js')).registerLied();
  else registerLocked('lied');  // Reiter mit Schloss und Hinweis „Mit Pro“
  ```
- Schlägt das Nachladen fehl (z. B. 403 vom Server), wird ebenfalls der gesperrte Reiter angezeigt.
- Kleinere Pro-Funktionen innerhalb eines Bereichs fragen nur `plan.has(…)` ab. Die sind dann nur im Frontend gesperrt, für Kleinigkeiten reicht das.
- Die Shell muss damit umgehen, dass ein gespeicherter offener Bereich (`settings.mode`) gerade nicht verfügbar ist. Sie prüft das schon heute („ob es ihn gibt, prüft die Shell“).
- `test/deps.test.mjs` sichert weiter ab, dass `tafel/` nichts aus `lied/` importiert. Damit ist garantiert, dass Lite ohne die Pro-Ordner funktioniert.

**Auf dem Server:**

- Dynamische Imports schicken keinen `Authorization`-Header mit. Darum setzt PocketBase nach dem Login zusätzlich ein **HttpOnly-Cookie** mit dem Token (eigene Route `POST /api/session`, beim Abmelden `DELETE`).
- Caddy prüft die gesperrten Pfade mit `forward_auth` gegen eine PocketBase-Route:
  ```
  @pro path /js/lied/* /css/lied.css
  forward_auth @pro pocketbase:8090 { uri /api/pro-check }
  ```
  `/api/pro-check` liest das Cookie und antwortet mit 200 bei Pro, sonst mit 403.
- Die gesperrten Dateien bekommen `Cache-Control: private, no-store`, damit kein Proxy sie für andere zwischenspeichert.
- Welche Pfade gesperrt sind, steht nur im `Caddyfile`. Für den Dev-Modus Lite gibt es eine Kopie in `tools/serve.js`.

**Import Map und Versionen:** `tools/version.js` trägt weiter alle Module in die Import Map ein, auch die gesperrten. Das verrät nur Dateinamen und ist unkritisch. `css/lied.css` wird nicht mehr fest in `index.html` eingebunden, sondern beim Anmelden des Bereichs geladen.

---

## Entwicklung lokal

| Befehl | Modus | Verhalten |
|---|---|---|
| `npm start` | Dev:Pro | Wie heute: alles freigeschaltet, `localStorage`, kein Backend |
| `npm run dev:lite` | Dev:Lite | Stufe `guest`. `tools/serve.js` antwortet auf die gesperrten Pfade mit 403, genau wie Caddy in der Produktion |
| `npm run dev:backend` (später) | Dev mit Backend | `docker compose up` mit PocketBase lokal, `env.js` zeigt auf `http://localhost:8090/api`. Zum Testen von Login, Abgleich und Webhooks |

Umgesetzt wird das über eine Umgebungsvariable (`MODE=lite`) in `tools/serve.js`. Die erzeugt `js/env.js` und kennt die Liste der gesperrten Pfade. Dazu kommen nur zwei Zeilen unter `scripts` in `package.json`, ohne neue Pakete.

Zusätzlich lässt sich zum schnellen Umschalten im Dev-Modus `?tier=guest` an die Adresse hängen. Das wirkt nur, wenn `ENV.backend` leer ist, in der Produktion also nicht.

Die Tests (`npm test`) laufen weiter ohne Backend. `sync.js` bekommt Tests mit einem nachgebauten Server-Objekt, das die Antworten nur vortäuscht.

---

## Bezahlen

1. In der App führt „Pro holen“ zur Checkout-Seite des Zahlungsdienstes. Die PocketBase-`userId` geht als `custom_data` mit, damit der Webhook die Zahlung dem richtigen Konto zuordnen kann.
2. Der Zahlungsdienst schickt Webhooks (`subscription_created`, `…_updated`, `…_cancelled`, `…_expired`) an eine PocketBase-Route `/api/billing/webhook`. Die prüft die Signatur und setzt `tier` und `pro_until`.
3. `pro_until` statt nur eines Schalters: Ein gekündigtes Abo läuft bis zum Ende des bezahlten Zeitraums weiter. Auch Freischaltungen von Hand (Testlehrkräfte, Schullizenz) laufen so ab, ohne dass jemand daran denken muss.
4. „Abo verwalten“ im Menü öffnet das Kundenportal des Zahlungsdienstes (kündigen, Zahlungsart, Rechnungen). Eine eigene Oberfläche dafür gibt es nicht.
5. Läuft Pro aus, bleiben die Lieder im Konto erhalten. Sie lassen sich weiter ansehen und laden, aber in Lite-Bereichen nur bis zur Grenze neu speichern. Lieder im Bereich Lied lassen sich exportieren (*offen*, siehe unten).

---

## Betrieb

```
Internet ──► Caddy (HTTPS, statische Dateien, forward_auth für Pro-Pfade)
               ├── /            → Dateien aus dem Image (index.html, css/, js/, fonts/)
               └── /api/*       → PocketBase (Login, Daten, /me, /pro-check, Webhook)
                                    └── pb_data/ (SQLite) als Volume, tägliches Backup
```

- `docker-compose.yml` mit den Diensten `caddy` und `pocketbase`. Die Hooks und Routen liegen als `pb_hooks/*.pb.js` im Repository.
- **Backup:** Die SQLite-Datei regelmäßig sichern (PocketBase hat eingebaute Backups, alternativ Litestream) und an einen zweiten Ort kopieren.
- **E-Mail** (Bestätigung, Passwort vergessen, Einmal-Code): ein SMTP-Anbieter mit Sitz in der EU.
- **GitHub Pages** entfällt dann oder leitet auf die neue Domain um.
- `npm run version:set` bleibt der Schritt vor einem Release, danach wird das Image gebaut.

---

## Rechtliches (vor dem ersten bezahlten Abo)

- Impressum, Datenschutzerklärung (Login, Speicherung, Zahlungsdienst, E-Mail-Versand), AGB, Widerrufsbelehrung für digitale Inhalte.
- Gewerbe anmelden, Kleinunternehmerregelung prüfen. Die Steuer gegenüber Kunden übernimmt der Merchant of Record.
- Für Schulen: In der App werden keine Schülerdaten gespeichert, nur Lieder der Lehrkraft. Das so festhalten, denn manche Schulen fragen nach einem Auftragsverarbeitungsvertrag (AVV).
- Der Cookie für Pro-Dateien ist technisch notwendig, ein Cookie-Banner braucht es dafür nicht. Kein Tracking.

---

## Reihenfolge der Umsetzung

1. **Stufen ohne Backend:** `core/plan.js`, `js/env.js` aus `tools/serve.js`, `npm run dev:lite`, Bereich Lied per dynamischem Import mit gesperrtem Reiter, Liedgrenze für Lite. Danach verhält sich die App lokal schon wie später, nur ohne Server.
2. **Speicher vorbereiten:** `makeStore` mit Schlüssel-Präfix und `onChange`, Bereiche zeichnen bei `store-changed` neu. Noch ohne Server, mit Tests.
3. **Backend und Login:** Docker Compose mit Caddy und PocketBase, Collections, `/api/me`, Login im Menü, Cookie, `forward_auth`.
4. **Abgleich:** `core/sync.js`, erster Login mit Übernahme der Gerätelieder, Abmelden.
5. **Bezahlen:** Zahlungsdienst auswählen und einrichten, Checkout, Webhook, Kundenportal, `pro_until`.
6. **Rechtliches und Start:** Seiten, Domain, Backup, Umzug von GitHub Pages.

Nach Schritt 1 und 2 ist die App weiter voll nutzbar wie heute. Ein Backend wird erst ab Schritt 3 gebraucht.

---

## Offen

- Genaue Aufteilung Lite/Pro (siehe oben). Ist der Bereich Lied wirklich Pro?
- Bekommt ein Konto ohne Abo schon Cloud-Speicher mit Grenze (als Anreiz zum Anmelden) oder nur Lite?
- Preis und Modell: Monats- oder Jahresabo, Einmalkauf, Schullizenz für mehrere Lehrkräfte.
- Welcher Zahlungsdienst (Paddle, Lemon Squeezy oder Polar): Gebühren und Auszahlung vergleichen.
- Export und Import von Liedern als Datei (auch als Ausweg, wenn Pro ausläuft).
- Lieder teilen: Link zum Ansehen für Schüler, ohne dass die ein Konto brauchen.
- Offline-Fähigkeit als PWA (Service Worker). Passt gut zu „erst lokal speichern“, ist aber ein eigenes Thema.
