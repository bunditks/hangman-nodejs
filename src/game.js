import { randomInt, randomUUID } from 'node:crypto';
import { CATEGORIES } from './words.js';

// Difficulty controls which word lengths are allowed and how many
// wrong guesses the player gets before losing.
export const DIFFICULTIES = {
  easy:   { label: 'Easy',   minLength: 3, maxLength: 5,        maxWrong: 8 },
  medium: { label: 'Medium', minLength: 6, maxLength: 8,        maxWrong: 6 },
  hard:   { label: 'Hard',   minLength: 9, maxLength: Infinity, maxWrong: 5 },
};

// An error caused by bad player input (shown to the client as HTTP 400).
export class GameError extends Error {}

function pickRandom(list) {
  return list[randomInt(list.length)];
}

export function createGame(categoryKey, difficultyKey) {
  const difficulty = DIFFICULTIES[difficultyKey];
  if (!difficulty) throw new GameError(`Unknown difficulty: ${difficultyKey}`);

  if (categoryKey === 'random') categoryKey = pickRandom(Object.keys(CATEGORIES));
  const category = CATEGORIES[categoryKey];
  if (!category) throw new GameError(`Unknown category: ${categoryKey}`);

  const candidates = category.words.filter(
    (w) => w.length >= difficulty.minLength && w.length <= difficulty.maxLength,
  );

  return {
    id: randomUUID(),
    word: pickRandom(candidates).toUpperCase(),
    category: categoryKey,
    difficulty: difficultyKey,
    maxWrong: difficulty.maxWrong,
    guessed: new Set(),
    wrong: [],
    status: 'playing', // 'playing' | 'won' | 'lost'
    createdAt: Date.now(),
  };
}

// Applies one guess to the game. Returns 'correct', 'wrong' or 'repeat'.
export function guessLetter(game, input) {
  const letter = String(input ?? '').toUpperCase();
  if (!/^[A-Z]$/.test(letter)) throw new GameError('Guess must be a single letter A-Z');
  if (game.status !== 'playing') throw new GameError('This game is already over');
  if (game.guessed.has(letter)) return 'repeat';

  game.guessed.add(letter);

  if (!game.word.includes(letter)) {
    game.wrong.push(letter);
    if (game.wrong.length >= game.maxWrong) game.status = 'lost';
    return 'wrong';
  }

  if ([...game.word].every((ch) => game.guessed.has(ch))) game.status = 'won';
  return 'correct';
}

// What the browser is allowed to see. The secret word stays hidden
// (unknown letters are null) until the game is over.
export function toPublicState(game) {
  const over = game.status !== 'playing';
  return {
    id: game.id,
    category: CATEGORIES[game.category].label,
    difficulty: DIFFICULTIES[game.difficulty].label,
    pattern: [...game.word].map((ch) => (over || game.guessed.has(ch) ? ch : null)),
    guessed: [...game.guessed],
    wrong: game.wrong,
    maxWrong: game.maxWrong,
    remaining: game.maxWrong - game.wrong.length,
    status: game.status,
    word: over ? game.word : undefined,
  };
}
