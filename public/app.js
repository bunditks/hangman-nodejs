// ---------- Small helpers ----------
const $ = (selector) => document.querySelector(selector);

// localStorage can throw (private mode, blocked storage), so wrap it.
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};

async function api(path, body) {
  const options = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : undefined;
  const res = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- State ----------
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const parts = [...document.querySelectorAll('.figure [data-part]')];

let game = null;     // public game state from the server
let playerId = storage.get('hangman.playerId');

// Actions run one at a time, in order. Fast typing queues up guesses
// instead of dropping the keys pressed while a request is in flight.
let queue = Promise.resolve();
function enqueue(action) {
  queue = queue.then(action).catch(showError);
}

// ---------- Setup ----------
async function init() {
  buildKeyboard();

  const { categories, difficulties } = await api('/api/options');

  const categorySelect = $('#category');
  for (const c of categories) categorySelect.add(new Option(c.label, c.key));
  categorySelect.value = storage.get('hangman.category') || 'random';
  categorySelect.addEventListener('change', () => {
    storage.set('hangman.category', categorySelect.value);
    categorySelect.blur(); // so typed letters go to the game, not the dropdown
  });

  const savedDifficulty = storage.get('hangman.difficulty') || 'medium';
  const fieldset = $('#difficulty');
  for (const d of difficulties) {
    const label = document.createElement('label');
    label.title = `${d.maxWrong} wrong guesses allowed`;
    label.innerHTML = `<input type="radio" name="difficulty" value="${d.key}"> ${d.label}`;
    label.querySelector('input').checked = d.key === savedDifficulty;
    $('#difficulty-options').append(label);
  }
  fieldset.addEventListener('change', (e) => storage.set('hangman.difficulty', e.target.value));

  $('#new-game').addEventListener('click', newGame);
  $('#play-again').addEventListener('click', newGame);
  document.addEventListener('keydown', onKeyDown);

  newGame();
}

function buildKeyboard() {
  const keyboard = $('#keyboard');
  for (const row of KEY_ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    for (const letter of row) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'key';
      key.textContent = letter;
      key.dataset.letter = letter;
      key.addEventListener('click', () => guess(letter));
      rowEl.append(key);
    }
    keyboard.append(rowEl);
  }
}

// ---------- Actions ----------
function newGame() {
  enqueue(async () => {
    const inProgress = game?.status === 'playing' && game.guessed.length > 0;
    if (inProgress && !confirm('Starting a new game now counts as a loss. Continue?')) return;

    const data = await api('/api/games', {
      category: $('#category').value,
      difficulty: document.querySelector('input[name="difficulty"]:checked')?.value,
      playerId,
    });
    playerId = data.playerId;
    storage.set('hangman.playerId', playerId);
    render(data);
  });
}

function guess(letter) {
  enqueue(async () => {
    // Checked when the guess actually runs, so queued repeats and
    // letters typed after the game ended are skipped.
    if (!game || game.status !== 'playing' || game.guessed.includes(letter)) return;
    render(await api(`/api/games/${game.id}/guesses`, { letter }));
  });
}

function onKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.matches('select, input')) return;

  if (/^[a-z]$/i.test(e.key)) {
    guess(e.key.toUpperCase());
  } else if (e.key === 'Enter' && game && game.status !== 'playing' && !e.target.matches('button')) {
    e.preventDefault();
    newGame();
  }
}

// ---------- Rendering ----------
function render({ game: g, stats }) {
  game = g;
  const over = game.status !== 'playing';

  // Score
  $('#stat-wins').textContent = stats.wins;
  $('#stat-losses').textContent = stats.losses;
  $('#stat-streak').textContent = stats.streak;
  $('#stat-best').textContent = stats.bestStreak;

  // Hint chips
  $('#category-label').textContent = game.category;
  $('#difficulty-label').textContent = game.difficulty;

  // Word slots. After a loss, letters the player never found are marked "missed".
  const word = $('#word');
  word.style.setProperty('--n', game.pattern.length);
  word.setAttribute('aria-label', game.pattern.map((ch) => ch ?? 'blank').join(' '));
  word.replaceChildren(...game.pattern.map((ch) => {
    const slot = document.createElement('span');
    slot.textContent = ch ?? ' ';
    if (ch && !game.guessed.includes(ch)) slot.className = 'missed';
    return slot;
  }));

  $('#wrong-letters').textContent = game.wrong.join(' ') || '–';

  // Drawing: scale the 8 body parts to this difficulty's number of lives,
  // so the figure is always complete exactly when the player loses.
  const visible = Math.round((game.wrong.length / game.maxWrong) * parts.length);
  parts.forEach((part, i) => part.classList.toggle('show', i < visible));

  // On-screen keyboard
  for (const key of document.querySelectorAll('.key')) {
    const letter = key.dataset.letter;
    const guessed = game.guessed.includes(letter);
    key.classList.toggle('correct', guessed && !game.wrong.includes(letter));
    key.classList.toggle('wrong', game.wrong.includes(letter));
    key.disabled = guessed || over;
  }
  $('#keyboard').classList.toggle('done', over);

  // Status message
  const board = $('.board');
  board.classList.toggle('won', game.status === 'won');
  board.classList.toggle('lost', game.status === 'lost');

  const message = $('#message');
  if (game.status === 'won') {
    message.textContent = `You got it! Streak: ${stats.streak}`;
  } else if (game.status === 'lost') {
    message.textContent = `Out of guesses. The word was ${game.word}.`;
  } else {
    message.textContent = `${game.remaining} wrong ${game.remaining === 1 ? 'guess' : 'guesses'} left`;
  }

  const playAgain = $('#play-again');
  playAgain.hidden = !over;
  if (over) playAgain.focus();
}

function showError(err) {
  $('#message').textContent = `Error: ${err.message}`;
}

init().catch(showError);
