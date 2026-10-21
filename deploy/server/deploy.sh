#!/bin/sh
# Wird über den Deploy-Schlüssel aufgerufen (command= in authorized_keys). Der Commit-SHA kommt als SSH-Befehl an.
# Von Hand, z. B. zum Zurückrollen: SSH_ORIGINAL_COMMAND=<sha> /opt/musiktafel/deploy.sh
set -eu
TAG="${SSH_ORIGINAL_COMMAND:-}"
case "$TAG" in ""|*[!0-9a-f]*) echo "ungültiger Tag: $TAG" >&2; exit 1;; esac
cd /opt/musiktafel
sed -i "s/^TAG=.*/TAG=$TAG/" .env
docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
echo "Deployed: $TAG"
