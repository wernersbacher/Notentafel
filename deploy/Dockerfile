# Ein Image für alles: PocketBase liefert die Seiten (pb_public: Landing und Rechtliches, dazu /app/ und /shared/), die API und die Admin-Oberfläche aus.
# HTTPS und die Domain übernimmt der Caddy auf dem Server davor.
FROM alpine:3.22
ARG PB_VERSION=0.40.5
# amd64 oder arm64, setzt Docker passend zur Zielplattform; so heißen auch die Release-Zips von PocketBase
ARG TARGETARCH=amd64
# ADD lädt selbst herunter (so braucht der Build kein apk), geprüft wird die Datei gleich danach mit dem sha256sum
# aus busybox. Die Prüfsummen stammen aus checksums.txt des Releases v0.40.5; sie müssen bei einem Versionswechsel
# mitgezogen werden.
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip /tmp/pb.zip
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) sha=1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4 ;; \
      arm64) sha=570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3 ;; \
      *) echo "unbekannte Architektur: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    printf '%s  %s\n' "$sha" /tmp/pb.zip > /tmp/pb.sha256; \
    sha256sum -c /tmp/pb.sha256; \
    unzip /tmp/pb.zip pocketbase -d /pb; \
    rm /tmp/pb.zip /tmp/pb.sha256
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations
COPY site /pb/pb_public
COPY app /pb/pb_public/app
COPY shared /pb/pb_public/shared
COPY deploy/env.prod.js /pb/pb_public/shared/env.js
EXPOSE 8090
# --indexFallback=false: sonst liefert jeder unbekannte Pfad die Landing Page (index.html) statt 404
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations", "--indexFallback=false"]
