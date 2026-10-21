# Caddy mit den Dateien der App. Kein Build-Schritt, es wird nur kopiert.
FROM caddy:2.11-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY index.html /srv/
COPY css /srv/css
COPY fonts /srv/fonts
COPY js /srv/js
COPY deploy/env.prod.js /srv/js/env.js
