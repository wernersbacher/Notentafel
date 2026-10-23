// Kleiner lokaler Server zum Ausprobieren (ES-Module laden nicht über file://). Ohne Abhängigkeiten.
// Aufruf: npm start  (Port mit PORT=8080 npm start ändern)
// Liefert aus wie der Container: /app/* aus app/, /shared/* aus shared/, alles andere aus site/.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = +process.env.PORT || 8000;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
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
    res.end(data);
  });
}).listen(port, () => console.log('Musiktafel läuft auf http://localhost:' + port + '/ (App unter /app/)'));
