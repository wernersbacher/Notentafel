// Kleiner lokaler Server zum Ausprobieren (ES-Module laden nicht über file://). Ohne Abhängigkeiten.
// Aufruf: npm start  (Port mit PORT=8080 npm start ändern)
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
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(root, rel);
  // Nichts außerhalb des Projektordners ausliefern
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Nicht gefunden'); return; }
    // Kein Cache, damit Änderungen beim Neuladen sofort da sind
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log('Notentafel läuft auf http://localhost:' + port + '/'));
