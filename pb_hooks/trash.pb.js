/// <reference path="../pb_data/types.d.ts" />

// Jede Nacht: Lieder, die länger als 30 Tage im Papierkorb liegen, endgültig löschen (siehe trash.js)
cronAdd('papierkorb', '17 3 * * *', () => {
  const n = require(`${__hooks}/trash.js`).purgeTrash($app);
  if (n) $app.logger().info('Papierkorb geleert', 'lieder', n);
});
