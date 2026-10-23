// Kleiner lokaler Server zum Ausprobieren (ES-Module laden nicht über file://). Ohne Abhängigkeiten.
// Aufruf: npm start  (Port mit PORT=8080 npm start ändern); npm run dev:lite startet als Gast (Stufe guest)
// Im Dev zusätzlich ?tier=guest|account|pro an der App-Adresse zum Umschalten (core/tier.js)
// Liefert aus wie der Container: /app/* aus app/, /shared/* aus shared/, alles andere aus site/; dazu wie der Hook
// pb_hooks/seo.pb.js: {{APP_URL}} in den Seiten, robots.txt, sitemap.xml und die alten Adressen der rechtlichen Seiten.
const http = require('http');
const fs = require('fs');
const path = require('path');
const seo = require('../pb_hooks/seo.js');
const known = require('../pb_hooks/known.js');

const root = path.resolve(__dirname, '..');
const port = +process.env.PORT || 8000;
// Modus: npm start = pro (alles frei), npm run dev:lite (--lite oder MODE=lite) = guest
const lite = process.argv.includes('--lite') || process.env.MODE === 'lite';
const envJs = "export const ENV = { backend: null, tier: '" + (lite ? 'guest' : 'pro') + "' };\n";
const appUrl = 'http://localhost:' + port;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Wurzelordner und Pfad darin zu einer Adresse
function resolve(url) {
  for (const dir of ['app', 'shared']) {
    if (url === '/' + dir || url.startsWith('/' + dir + '/')) return { base: path.join(root, dir), rel: url.slice(dir.length + 1) };
  }
  return { base: path.join(root, 'site'), rel: url };
}

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (seo.MOVED[url]) { res.writeHead(301, { Location: seo.MOVED[url] }); res.end(); return; }
  // Wie pb_hooks/known.pb.js: die bekannten Lieder nur mit Pro (hier: der Modus), sonst 403. Ohne Backend gibt es keine Konten.
  if (url === '/api/known') {
    const pro = !lite;
    res.writeHead(pro ? 200 : 403, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(pro ? { mel: known.MELODIES, lied: known.SONGS } : { message: 'Bekannte Lieder gibt es mit Pro.' }));
    return;
  }
  const generated = { '/robots.txt': [seo.robotsTxt, 'text/plain; charset=utf-8'], '/sitemap.xml': [seo.sitemapXml, 'application/xml; charset=utf-8'] }[url];
  if (generated) { res.writeHead(200, { 'Content-Type': generated[1], 'Cache-Control': 'no-store' }); res.end(generated[0](appUrl)); return; }
  // shared/env.js gibt es nur im Image; hier entsteht sie je nach Modus (steht in .gitignore, falls doch eine liegt)
  if (url === '/shared/env.js') { res.writeHead(200, { 'Content-Type': types['.js'], 'Cache-Control': 'no-store' }); res.end(envJs); return; }
  const { base, rel } = resolve(url);
  let file = path.join(base, rel);
  // Nichts außerhalb des jeweiligen Wurzelordners ausliefern
  if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
  // Ein Ordner ohne Slash wird umgeleitet, sonst brechen die relativen Pfade der Seite
  if (!url.endsWith('/') && fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    res.writeHead(301, { Location: url + '/' }); res.end(); return;
  }
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Nicht gefunden'); return; }
    // Kein Cache, damit Änderungen beim Neuladen sofort da sind
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    // Nur Seiten aus site/ tragen den Platzhalter
    res.end(path.extname(file) === '.html' && base.endsWith('site') ? seo.fillAppUrl(data.toString('utf8'), appUrl) : data);
  });
}).listen(port, () => console.log('Musiktafel läuft auf http://localhost:' + port + '/ (App unter /app/), Stufe ' + (lite ? 'guest' : 'pro')));
