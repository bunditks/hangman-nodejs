# Hangman

A Hangman word game for the browser, built with Node.js and Express.

The server picks the secret word and checks every guess, so the answer never
reaches the browser until the game is over: no peeking in DevTools.

## Features

- **4 categories:** Animals, Countries, Fruits and Sports (or Random). The category is shown as a hint.
- **3 difficulty levels**

  | Difficulty | Word length | Wrong guesses allowed |
  |------------|-------------|-----------------------|
  | Easy       | 3–5 letters | 8                     |
  | Medium     | 6–8 letters | 6                     |
  | Hard       | 9+ letters  | 5                     |

- **Score tracking:** wins, losses, current streak and best streak
- **Keyboard support:** click the on-screen letters or type on your keyboard; press <kbd>Enter</kbd> to play again
- Works on phones, and supports light and dark mode

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (developed on Node 22)

## Getting started

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

To restart the server automatically when you edit server code:

```bash
npm run dev
```

To use a different port:

```bash
PORT=8080 npm start
```

## Running the tests

```bash
npm test
```

The tests use Node's built-in test runner and cover the game rules and word lists.

## Project structure

```
server.js          Express app: serves the page and the game API
src/
  game.js          Game rules: create a game, apply a guess, hide the word
  words.js         Word lists per category
  store.js         In-memory storage for games and player scores
public/
  index.html       Page layout and the hangman drawing (SVG)
  style.css        Styles, including dark mode and phone layout
  app.js           Browser code: talks to the API and draws the game
test/
  game.test.js     Unit tests
```

## API

| Method | Path                     | Body                                   | Returns                          |
|--------|--------------------------|----------------------------------------|----------------------------------|
| GET    | `/api/options`           |                                        | Categories and difficulties      |
| POST   | `/api/games`             | `{ category, difficulty, playerId? }`  | `{ playerId, game, stats }`      |
| POST   | `/api/games/:id/guesses` | `{ letter }`                           | `{ result, game, stats }`        |

`game.pattern` lists the word's letters, with `null` for each one not guessed yet.
`game.word` is only included once the game is won or lost. `result` is
`"correct"`, `"wrong"` or `"repeat"`.

## Game rules

- Guessing a letter you've already tried is free.
- Starting a new game after making a guess counts as a loss, so you can't
  protect your streak by quitting a game you're about to lose.
- Scores are kept in server memory, so they reset when the server restarts.
