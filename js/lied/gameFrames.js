// Der Rahmen der vier Spiele des Notenblatts in #liedPlay: was über dem Startknopf steht und was der Startseite erklärt
// wird. fillGameFrames aus core/game.js baut daraus den Hinweis und den Startknopf; die Abschnitte stehen in index.html.
// Reines Modul ohne DOM: nur Texte und ids, so wie sie früher im HTML standen.
export const LIED_FRAMES = [
  {
    game: 'quiz',
    intro: 'Eine Note erscheint auf den Notenlinien. Wie heißt sie? Tippe unten ihren Namen.',
    hint: 'Eine Note erscheint, die Kinder tippen unten auf der Tafel ihren Namen – in der Farbe des Tons, mit Oktavstrichen.',
    go: 'liedQuizGo',
    label: 'Quiz starten'
  },
  {
    game: 'place',
    intro: 'Unten steht ein Notenname. Schiebe die Note mit dem Finger auf die Linie oder in den Zwischenraum, wo sie hingehört, und lass los.',
    hint: 'Ein Notenname erscheint unter den Notenlinien. Die Kinder schieben mit dem Finger eine Note auf die Linie oder in den Zwischenraum, sie rastet ein; erst das Loslassen zählt – eine falsche Note wird kurz rot.',
    go: 'placeGo',
    label: 'Spiel starten'
  },
  {
    game: 'step',
    intro: 'Zwei Noten erklingen nacheinander. Ist es ein Schritt, ein Sprung oder derselbe Ton? Tippe unten deine Antwort.',
    hint: 'Zwei Noten stehen nebeneinander und erklingen. Die Kinder sagen, ob es ein Schritt (zum Nachbarton), ein Sprung oder derselbe Ton ist.',
    go: 'stepGo',
    label: 'Spiel starten'
  },
  {
    game: 'values',
    intro: 'Eine Note oder Pause erscheint und erklingt. Wie heißt sie? Tippe unten ihren Namen.',
    hint: 'Eine Note oder Pause steht auf der Tafel und erklingt, jeder Schlag klickt dabei. Die Kinder tippen unten, wie sie heißt.',
    go: 'valuesGo',
    label: 'Spiel starten'
  }
];
