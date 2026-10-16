import express from 'express';
import { CATEGORIES } from './src/words.js';
import { DIFFICULTIES, GameError, createGame, guessLetter, toPublicState } from './src/game.js';
import { getOrCreatePlayer, getGame, saveGame, recordResult } from './src/store.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies (we'll need this for the game API)
app.use(express.json());

// Serve the front-end files (HTML, CSS, JS) from the "public" folder
app.use(express.static('public'));

// Lists the categories and difficulties so the UI can build its menus.
app.get('/api/options', (req, res) => {
  res.json({
    categories: Object.entries(CATEGORIES).map(([key, c]) => ({ key, label: c.label })),
    difficulties: Object.entries(DIFFICULTIES).map(([key, d]) => ({ key, label: d.label, maxWrong: d.maxWrong })),
  });
});

// Starts a new game. Body: { category, difficulty, playerId? }
app.post('/api/games', (req, res) => {
  const { category = 'random', difficulty = 'medium', playerId } = req.body ?? {};
  const player = getOrCreatePlayer(playerId);

  // Quitting a game you've already guessed in counts as a loss,
  // so you can't protect your streak by starting over.
  const previous = getGame(player.currentGameId);
  if (previous?.status === 'playing' && previous.guessed.size > 0) {
    previous.status = 'lost';
    recordResult(player, false);
  }

  const game = createGame(category, difficulty);
  game.playerId = player.id;
  saveGame(game);
  player.currentGameId = game.id;

  res.status(201).json({ playerId: player.id, game: toPublicState(game), stats: player.stats });
});

// Makes a guess. Body: { letter }
app.post('/api/games/:id/guesses', (req, res) => {
  const game = getGame(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const result = guessLetter(game, req.body?.letter);
  const player = getOrCreatePlayer(game.playerId);
  if (result !== 'repeat' && game.status !== 'playing') {
    recordResult(player, game.status === 'won');
  }

  res.json({ result, game: toPublicState(game), stats: player.stats });
});

// Turn errors into JSON responses: bad input -> 400, anything else -> 500.
app.use((err, req, res, next) => {
  if (err instanceof GameError) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Hangman running at http://localhost:${PORT}`);
});
