// Was zu welcher Stufe gehört. Die einzige Stelle im Server; die Dev-Modi im Frontend bekommen später eine Kopie davon.
module.exports = {
  guest: { features: [], limits: { songs: 5 } },
  account: { features: [], limits: { songs: 5 } },
  pro: { features: ['lied', 'cloud'], limits: { songs: null } }
};
