import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../src/words.js';
import { DIFFICULTIES, GameError, createGame, guessLetter, toPublicState } from '../src/game.js';

test('every category has words for every difficulty', () => {
  for (const [catKey, cat] of Object.entries(CATEGORIES)) {
    for (const [diffKey, d] of Object.entries(DIFFICULTIES)) {
      const count = cat.words.filter((w) => w.length >= d.minLength && w.length <= d.maxLength).length;
      assert.ok(count >= 3, `${catKey}/${diffKey} only has ${count} words`);
    }
  }
});

test('words contain only letters', () => {
  for (const cat of Object.values(CATEGORIES)) {
    for (const w of cat.words) assert.match(w, /^[a-z]+$/, w);
  }
});

test('correct guesses reveal letters and can win the game', () => {
  const game = { ...createGame('fruits', 'easy'), word: 'KIWI' };
  assert.equal(guessLetter(game, 'k'), 'correct');
  assert.deepEqual(toPublicState(game).pattern, ['K', null, null, null]);
  assert.equal(guessLetter(game, 'I'), 'correct');
  assert.equal(guessLetter(game, 'w'), 'correct');
  assert.equal(game.status, 'won');
});

test('wrong guesses use up lives and can lose the game', () => {
  const game = { ...createGame('fruits', 'hard'), word: 'PINEAPPLE' };
  for (const letter of 'BCDFG') guessLetter(game, letter);
  assert.equal(game.status, 'lost');
  assert.equal(toPublicState(game).word, 'PINEAPPLE');
});

test('repeated guesses are free and the word stays secret while playing', () => {
  const game = { ...createGame('animals', 'medium'), word: 'RABBIT' };
  guessLetter(game, 'z');
  assert.equal(guessLetter(game, 'z'), 'repeat');
  assert.equal(game.wrong.length, 1);
  assert.equal(toPublicState(game).word, undefined);
});

test('invalid input is rejected', () => {
  const game = createGame('random', 'easy');
  assert.throws(() => guessLetter(game, 'ab'), GameError);
  assert.throws(() => guessLetter(game, '1'), GameError);
  assert.throws(() => createGame('planets', 'easy'), GameError);
});
