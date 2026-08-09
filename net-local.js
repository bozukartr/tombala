// net-local.js — Firebase olmadan tek cihazda oynanan alıştırma modu.
// net-firebase.js ile aynı arayüzü sunar, böylece app.js iki modu ayırt etmez.
import { generateCard, cardNumbers } from './card.js';
import { evaluate } from './game.js';

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const BOT_NAMES = ['Nihal', 'Ferit', 'Sevim', 'Cemre', 'Orhan'];
const BOT_AVATARS = ['🦊', '🐢', '🦉', '🐝', '🦩'];
const BOT_COLORS = ['#F0517A', '#34D39A', '#FFB43D', '#6BC5F5', '#C084FC'];

const UID = 'local-me';
let state = null;
let listeners = [];
const timers = new Set();

const clone = (o) => JSON.parse(JSON.stringify(o));
const emit = () => listeners.forEach((cb) => cb(clone(state)));
const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };

export async function initNet() { return UID; }
export const myUid = () => UID;

export async function createRoom(profile, settings, botCount = 2) {
  state = {
    code: 'YEREL',
    meta: {
      hostId: UID, status: 'lobby', createdAt: Date.now(), local: true,
      settings: { drawMode: 'auto', drawInterval: 5000, autoMark: true, ...settings },
    },
    players: {
      [UID]: { ...profile, ready: false, card: null, marked: [], connected: true, joinedAt: Date.now() },
    },
    game: { drawn: [], lastNumber: null, drawnAt: 0 },
    claims: {},
    winners: { cinko1: [], cinko2: [], tombala: [] },
  };
  for (let i = 0; i < Math.min(botCount, MAX_PLAYERS - 1); i++) {
    state.players['bot' + i] = {
      name: BOT_NAMES[i], avatar: BOT_AVATARS[i], color: BOT_COLORS[i],
      ready: true, card: generateCard(), marked: [], connected: true,
      joinedAt: Date.now() + i + 1, bot: true,
    };
  }
  emit();
  return state.code;
}

export async function joinRoom() { throw new Error('Yerel modda odaya katılınamaz'); }

export function subscribe(code, cb) {
  listeners.push(cb);
  if (state) cb(clone(state));
  return () => { listeners = listeners.filter((l) => l !== cb); };
}

export async function updateMe(code, patch) {
  Object.assign(state.players[UID], patch);
  emit();
}

export async function updateMeta(code, patch) {
  Object.assign(state.meta, patch);
  emit();
}

export async function pushDraw(code, drawn, lastNumber) {
  state.game = { drawn: [...drawn], lastNumber, drawnAt: Date.now() };
  emit();
  scheduleBots();
}

export async function setWinners(code, winners) { state.winners = clone(winners); emit(); }

export async function sendClaim(code, type, atDraw, who = UID) {
  state.claims[who] = { type, atDraw, at: Date.now() };
  emit();
}

export async function resolveClaimResult(code, id, valid, reason) {
  if (state.claims[id]) Object.assign(state.claims[id], { valid, reason: reason || null });
  emit();
}

export async function clearClaims() { state.claims = {}; emit(); }
export async function maybeClaimHost() {}

export async function leaveRoom() {
  timers.forEach(clearTimeout); timers.clear();
  listeners = []; state = null;
}

export async function resetRoom(code) {
  for (const [id, p] of Object.entries(state.players)) {
    p.marked = [];
    p.ready = !!p.bot;
  }
  state.game = { drawn: [], lastNumber: null, drawnAt: 0 };
  state.winners = { cinko1: [], cinko2: [], tombala: [] };
  state.claims = {};
  state.meta.status = 'lobby';
  emit();
}

/** Botlar sayıları gecikmeyle işaretler ve hak ettiklerinde ilan eder. */
function scheduleBots() {
  const drawn = state.game.drawn;
  // Tepki süresi çekim aralığına oranlı: hızlı ayarda botlar da hızlanır.
  const iv = Number(state.meta.settings.drawInterval) || 5000;
  for (const [id, p] of Object.entries(state.players)) {
    if (!p.bot || !p.card) continue;
    const n = state.game.lastNumber;
    if (!cardNumbers(p.card).includes(n)) continue;
    later(() => {
      if (!state || state.meta.status !== 'playing') return;
      const bot = state.players[id];
      if (!bot.marked.includes(n)) bot.marked.push(n);
      emit();
      later(() => {
        if (!state || state.meta.status !== 'playing' || state.claims[id]) return;
        const st = evaluate(bot.card, bot.marked, state.game.drawn);
        const w = state.winners;
        let type = null;
        if (st.full && !w.tombala.length) type = 'tombala';
        else if (st.completedRows >= 2 && w.cinko1.length && !w.cinko2.length) type = 'cinko2';
        else if (st.completedRows >= 1 && !w.cinko1.length) type = 'cinko1';
        if (type) sendClaim(state.code, type, state.game.drawn.length, id);
      }, iv * (0.08 + Math.random() * 0.18));
    }, iv * (0.1 + Math.random() * 0.28));
  }
  void drawn;
}

export { MAX_PLAYERS, MIN_PLAYERS };

export async function dropClaim(code, id) {
  if (state?.claims?.[id]) { delete state.claims[id]; emit(); }
}
