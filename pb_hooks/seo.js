// Adressen der Website (seo.pb.js und tools/serve.js): Platzhalter {{APP_URL}} in den Seiten, robots.txt, sitemap.xml
// und die alten Adressen der rechtlichen Seiten. Reine Funktionen, ohne PocketBase; test/seo.test.mjs prüft sie.
// Der Host steht nie im Repo: Die Seiten tragen {{APP_URL}}, ersetzt wird beim Ausliefern.
// PocketBase lädt nur *.pb.js als Handler, diese Datei wird darum nur per require geladen.

// Seiten für die Sitemap (Login und Konto gehören nicht hinein)
const PAGES = ['/', '/imprint/', '/privacy/'];
// Was Suchmaschinen nicht durchsuchen sollen
const HIDDEN = ['/account/', '/login/', '/api/', '/_/'];
// Alte Adressen, per 301 auf die neuen
const MOVED = { '/impressum.html': '/imprint/', '/datenschutz.html': '/privacy/' };

// Basisadresse ohne Slash am Ende: die eingestellte (appURL der PocketBase-Einstellungen), sonst Schema und Host der Anfrage
// req: die Anfrage (e.request in PocketBase, http.Request in Go); hinter dem Caddy kommt https nur als Kopfzeile an
function baseUrl(appUrl, req) {
  const scheme = req.header.get('X-Forwarded-Proto') || (req.tls ? 'https' : 'http');
  return String(appUrl || (scheme + '://' + req.host)).replace(/\/+$/, '');
}

// Platzhalter {{APP_URL}} durch die Basisadresse ersetzen
function fillAppUrl(html, base) {
  return html.split('{{APP_URL}}').join(base);
}

function robotsTxt(base) {
  return ['User-agent: *', ...HIDDEN.map((p) => 'Disallow: ' + p), '', 'Sitemap: ' + base + '/sitemap.xml', ''].join('\n');
}

function sitemapXml(base) {
  const urls = PAGES.map((p) => '  <url><loc>' + base + p + '</loc></url>');
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n');
}

module.exports = { PAGES, HIDDEN, MOVED, baseUrl, fillAppUrl, robotsTxt, sitemapXml };
