# PocketBase hat kein offizielles Image: Release-Zip laden, Hooks und Migrationen dazulegen.
FROM alpine:3.22
ARG PB_VERSION=0.40.5
# ADD lädt selbst herunter, entpackt wird mit dem unzip aus busybox. So braucht der Build kein apk.
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip pocketbase -d /pb && rm /tmp/pb.zip
COPY pb_hooks /pb/pb_hooks
COPY pb_migrations /pb/pb_migrations
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations"]
