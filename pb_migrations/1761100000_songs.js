/// <reference path="../pb_data/types.d.ts" />

// Gespeicherte Lieder im Konto. Ein Eintrag je Nutzer, Bereich und Name (ohne Groß/klein, im Feld key).
// Gelöschte Lieder bleiben als Eintrag mit deleted stehen, damit andere Geräte das Löschen mitbekommen.
// Keine API-Regeln: Lesen und Schreiben gehen nur über POST /api/songs/sync (pb_hooks/songs.pb.js).
migrate((app) => {
  const songs = new Collection({
    type: 'base',
    name: 'songs',
    fields: [
      { type: 'relation', name: 'user', collectionId: '_pb_users_auth_', required: true, maxSelect: 1, cascadeDelete: true },
      { type: 'select', name: 'area', values: ['mel', 'rhy', 'lied'], required: true, maxSelect: 1 },
      { type: 'text', name: 'key', required: true, max: 40 },
      { type: 'text', name: 'name', required: true, max: 40 },
      { type: 'json', name: 'data', maxSize: 200000 },
      { type: 'number', name: 'saved_at', onlyInt: true },
      { type: 'bool', name: 'deleted' },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_songs_key ON songs (user, area, key)',
      'CREATE INDEX idx_songs_updated ON songs (user, updated)'
    ]
  });
  app.save(songs);
}, (app) => {
  app.delete(app.findCollectionByNameOrId('songs'));
});
