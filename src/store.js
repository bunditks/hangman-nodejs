import { randomUUID } from 'node:crypto';

// In-memory storage. Everything resets when the server restarts,
// which is fine for a session-based score.
const games = new Map();   // gameId -> game
const players = new Map(); // playerId -> { stats, currentGameId, lastSeen }

const GAME_TTL_MS = 60 * 60 * 1000;          // forget games after 1 hour
const PLAYER_TTL_MS = 24 * 60 * 60 * 1000;   // forget idle players after 1 day

export function getOrCreatePlayer(playerId) {
  let player = players.get(playerId);
  if (!player) {
    playerId = randomUUID();
    player = {
      id: playerId,
      stats: { wins: 0, losses: 0, streak: 0, bestStreak: 0 },
      currentGameId: null,
    };
    players.set(playerId, player);
  }
  player.lastSeen = Date.now();
  return player;
}

export function saveGame(game) {
  games.set(game.id, game);
}

export function getGame(gameId) {
  return games.get(gameId);
}

export function recordResult(player, won) {
  const s = player.stats;
  if (won) {
    s.wins++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.losses++;
    s.streak = 0;
  }
}

// Periodically drop old games and idle players so memory doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [id, game] of games) {
    if (now - game.createdAt > GAME_TTL_MS) games.delete(id);
  }
  for (const [id, player] of players) {
    if (now - player.lastSeen > PLAYER_TTL_MS) players.delete(id);
  }
}, 10 * 60 * 1000).unref();
