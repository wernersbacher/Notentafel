/// <reference path="../pb_data/types.d.ts" />

// Gespeicherte Lieder im Konto. Ein Eintrag je Nutzer und Lied; sid ist die id, die das Lied in der App bekommt
// (bleibt beim Umbenennen). Gelöschte Lieder bleiben mit deleted und ihrem Inhalt stehen: So bekommen andere Geräte
// das Löschen mit, und versehentlich Gelöschtes lässt sich wiederherstellen.
// Keine API-Regeln: Lesen und Schreiben gehen nur über POST /api/songs/sync (pb_hooks/songs.pb.js).
migrate((app) => {
  const songs = new Collection({
    type: 'base',
    name: 'songs',
    fields: [
      { type: 'relation', name: 'user', collectionId: '_pb_users_auth_', required: true, maxSelect: 1, cascadeDelete: true },
      { type: 'text', name: 'sid', required: true, min: 9, max: 40, pattern: '^[0-9a-z]+$' },
      { type: 'select', name: 'area', values: ['mel', 'rhy', 'lied'], required: true, maxSelect: 1 },
      { type: 'text', name: 'name', required: true, max: 40 },
      { type: 'json', name: 'data', maxSize: 200000 },
      { type: 'number', name: 'saved_at', onlyInt: true }, // wann der Inhalt gespeichert wurde
      { type: 'number', name: 'changed_at', onlyInt: true }, // wann zuletzt gespeichert, umbenannt oder gelöscht
      { type: 'bool', name: 'deleted' },
      { type: 'autodate', name: 'created', onCreate: true },
      { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true }
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_songs_sid ON songs (user, sid)',
      'CREATE INDEX idx_songs_updated ON songs (user, updated)'
    ]
  });
  app.save(songs);
}, (app) => {
  app.delete(app.findCollectionByNameOrId('songs'));
});
