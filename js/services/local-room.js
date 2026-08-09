import { createTicket } from '../core/ticket.js';
import { claimEligibility, emptyWinners, evaluateTicket, missingMarks, normalizeWinners } from '../core/game.js';

export const MAX_PLAYERS = 6;
const LOCAL_UID = 'local-player';
const BOT_PROFILES = [
  ['Ece', '🐢', '#53d9a4'], ['Mert', '🦊', '#ff7a8d'], ['Seda', '🐙', '#8b7cff'],
];

let room = null;
let listeners = new Set();

const clone = (value) => structuredClone(value);
function emit() { listeners.forEach((listener) => listener(clone(room))); }

export async function connect() { return LOCAL_UID; }
export const myUid = () => LOCAL_UID;

export async function createRoom(profile, settings, ticket) {
  const now = Date.now();
  room = {
    code: 'YEREL',
    meta: {
      hostId: LOCAL_UID, status: 'lobby', createdAt: now, expiresAt: now + 21_600_000,
      settings: { drawMode: 'auto', drawInterval: 1200, autoMark: true, ...settings },
    },
    players: {
      [LOCAL_UID]: { ...profile, ticket, marked: [], ready: false, connected: true, joinedAt: now },
    },
    game: { drawn: [], lastNumber: null, revision: 0, updatedAt: now },
    claims: {}, claimResults: {}, winners: emptyWinners(),
  };
  BOT_PROFILES.slice(0, 2).forEach(([name, avatar, color], index) => {
    room.players[`bot-${index}`] = {
      name, avatar, color, ticket: createTicket(), marked: [], ready: true,
      connected: true, joinedAt: now + index + 1, bot: true,
    };
  });
  emit();
  return room.code;
}

export async function joinRoom() { throw new Error('Yerel oyuna kodla katılınamaz.'); }

export function subscribe(code, onRoom) {
  listeners.add(onRoom);
  if (room) onRoom(clone(room));
  return () => listeners.delete(onRoom);
}

export async function updateMe(code, patch) { Object.assign(room.players[LOCAL_UID], patch); emit(); }
export async function updateSettings(code, settings) { room.meta.settings = clone(settings); emit(); }
export async function updateStatus(code, status) { room.meta.status = status; emit(); }

export async function pushDraw(code, expectedRevision, drawn, lastNumber) {
  if (room.game.revision !== expectedRevision) return false;
  room.game = { drawn: [...drawn], lastNumber, revision: expectedRevision + 1, updatedAt: Date.now() };
  for (const [playerId, player] of Object.entries(room.players)) {
    if (!player.bot) continue;
    player.marked.push(...missingMarks(player.ticket, player.marked, room.game.drawn));
    const eligible = claimEligibility(player.ticket, player.marked, room.game.drawn, room.winners);
    const type = eligible.tombala ? 'tombala' : eligible.cinko2 ? 'cinko2' : eligible.cinko1 ? 'cinko1' : null;
    if (type && !room.claims[playerId]) room.claims[playerId] = { type, atDraw: drawn.length, createdAt: Date.now() };
  }
  emit();
  return true;
}

export async function submitClaim(code, type, atDraw) {
  room.claims[LOCAL_UID] = { type, atDraw, createdAt: Date.now() };
  emit();
}

export async function resolveClaim(code, playerId, result, winners) {
  room.winners = normalizeWinners(winners);
  room.claimResults[playerId] = { ...result, resolvedAt: Date.now() };
  delete room.claims[playerId];
  emit();
}

export async function clearClaimResult() { delete room.claimResults[LOCAL_UID]; emit(); }

export async function resetRoom() {
  room.meta.status = 'lobby';
  room.game = { drawn: [], lastNumber: null, revision: 0, updatedAt: Date.now() };
  room.claims = {}; room.claimResults = {}; room.winners = emptyWinners();
  Object.values(room.players).forEach((player) => {
    player.marked = [];
    player.ready = !!player.bot;
    if (player.bot) player.ticket = createTicket();
  });
  emit();
}

export async function maybeClaimHost() { return false; }
export async function leaveRoom() { room = null; listeners.clear(); }
export async function deleteDisconnectedPlayer() {}

export function botProgress(player) {
  return evaluateTicket(player.ticket, player.marked, room?.game?.drawn || []);
}
