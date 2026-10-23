/// <reference path="../pb_data/types.d.ts" />

// Adressen der Website, siehe seo.js. Alte Adressen der rechtlichen Seiten gehen per 301 auf die neuen; Seiten unter
// pb_public (nicht /app/, /shared/) werden mit ersetztem {{APP_URL}} ausgeliefert, robots.txt und sitemap.xml
// entstehen hier. Nur GET. Basisadresse: appURL aus den Einstellungen, sonst die der Anfrage (seo.js).
routerUse((e) => {
  if (e.request.method !== 'GET') return e.next();
  const p = e.request.url.path;
  const { MOVED, baseUrl, fillAppUrl } = require(`${__hooks}/seo.js`);
  if (MOVED[p]) return e.redirect(301, MOVED[p]);
  if (p.startsWith('/app/') || p.startsWith('/shared/') || p.startsWith('/api/') || p.startsWith('/_/') || p.includes('..')) return e.next();
  // Ordner liefern ihre index.html, sonst nur .html-Dateien
  const rel = p.endsWith('/') ? p + 'index.html' : p;
  if (!rel.endsWith('.html')) return e.next();
  let html;
  try { html = toString($os.readFile(`${__hooks}/../pb_public${rel}`)); } catch (_) { return e.next(); }
  e.response.header().set('Cache-Control', 'no-cache');
  return e.html(200, fillAppUrl(html, baseUrl($app.settings().meta.appURL, e.request)));
});

routerAdd('GET', '/robots.txt', (e) => {
  const { baseUrl, robotsTxt } = require(`${__hooks}/seo.js`);
  return e.blob(200, 'text/plain; charset=utf-8', robotsTxt(baseUrl($app.settings().meta.appURL, e.request)));
});

routerAdd('GET', '/sitemap.xml', (e) => {
  const { baseUrl, sitemapXml } = require(`${__hooks}/seo.js`);
  return e.blob(200, 'application/xml; charset=utf-8', sitemapXml(baseUrl($app.settings().meta.appURL, e.request)));
});
