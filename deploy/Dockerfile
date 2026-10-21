# Ein Image für alles: PocketBase liefert die App (pb_public), die API und die Admin-Oberfläche aus.
# HTTPS und die Domain übernimmt der Caddy auf dem Server davor.
FROM alpine:3.22
ARG PB_VERSION=0.40.5
# amd64 oder arm64, setzt Docker passend zur Zielplattform; so heißen auch die Release-Zips von PocketBase
ARG TARGETARCH=amd64
# ADD lädt selbst herunter, entpackt wird mit dem unzip aus busybox. So braucht der Build kein apk.
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip pocketbase -d /pb && rm /tmp/pb.zip
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations
COPY index.html impressum.html datenschutz.html /pb/pb_public/
COPY css /pb/pb_public/css
COPY fonts /pb/pb_public/fonts
COPY js /pb/pb_public/js
COPY deploy/env.prod.js /pb/pb_public/js/env.js
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations"]
