// Version setzen und Cache-Busting in app/index.html nachziehen. Ohne Abhängigkeiten.
// Aufruf: npm run version:set 1.0.1  (ohne Nummer: nur app/index.html auf die Version aus package.json bringen)
// Umgeschrieben werden nur: die Import Map (alle Module unter app/js/, auch in Unterordnern, und shared/*.js), ?v= an Stylesheets (css/ und /shared/) und Einstiegs-Script, der Text „Version …“ im Menü.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgFile = path.join(root, 'package.json');
const htmlFile = path.join(root, 'app', 'index.html');

const pkgText = fs.readFileSync(pkgFile, 'utf8');
const arg = process.argv[2];
if (arg && !/^\d+\.\d+\.\d+$/.test(arg)) { console.error('Version bitte als x.y.z angeben, z. B. 1.0.1'); process.exit(1); }
const v = arg || JSON.parse(pkgText).version;
if (arg) fs.writeFileSync(pkgFile, pkgText.replace(/("version":\s*")[^"]*(")/, (m, a, b) => a + v + b));

// Alle .js-Dateien unter dir, auch in Unterordnern, als Pfade mit / (z. B. 'core/shell.js')
const walk = (dir, pre = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name), pre + d.name + '/') : d.name.endsWith('.js') ? [pre + d.name] : []);

// Jedes Modul unter js/ (samt Unterordnern) auf die versionierte Adresse umleiten. Greift auch für relative Imports
// wie './config.js' oder '../core/ui.js', weil Import Maps die aufgelöste URL vergleichen (die Schlüssel gelten relativ zur Seite).
// Dazu die Module aus shared/ (außer env.js, das jede Umgebung selbst liefert): die Seite liegt unter /app/, ihr
// Schlüssel heißt darum ../shared/..., und die App importiert sie relativ (../../../shared/auth.js), das ergibt dieselbe Adresse.
const mods = walk(path.join(root, 'app', 'js')).sort();
const shared = walk(path.join(root, 'shared')).filter(f => !f.includes('/') && f !== 'env.js').sort();
const map = '<script type="importmap">\n{ "imports": {\n'
  + [...mods.map(f => `  "./js/${f}": "./js/${f}?v=${v}"`), ...shared.map(f => `  "../shared/${f}": "../shared/${f}?v=${v}"`)].join(',\n')
  + '\n} }\n</script>';

let html = fs.readFileSync(htmlFile, 'utf8');
const n = html.length;
// Import Map ersetzen oder (beim ersten Mal) vor dem Modul-Script einfügen; sie muss davor stehen
html = /<script type="importmap">[\s\S]*?<\/script>/.test(html)
  ? html.replace(/<script type="importmap">[\s\S]*?<\/script>/, map)
  : html.replace(/<script type="module"/, map + '\n<script type="module"');
html = html
  .replace(/(href="(?:css|\/shared)\/[\w/-]+\.css)(\?v=[^"]*)?"/g, (m, a) => `${a}?v=${v}"`)
  .replace(/(src="js\/[\w/-]+\.js)(\?v=[^"]*)?"/g, (m, a) => `${a}?v=${v}"`)
  .replace(/(<p class="version">Version )[^<]*/, (m, a) => a + v);
fs.writeFileSync(htmlFile, html);
console.log(`Version ${v}: ${mods.length + shared.length} Module in der Import Map, app/index.html ${html.length - n >= 0 ? '+' : ''}${html.length - n} Zeichen`);
