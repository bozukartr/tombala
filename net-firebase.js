// net-firebase.js — Firebase Realtime Database taşıma katmanı.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, remove, onValue, onDisconnect, runTransaction,
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { encodeGrid, decodeGrid } from './card.js';

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

let app, auth, db, uid = null;

export async function initNet(config) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getDatabase(app);
  await signInAnonymously(auth);
  uid = await new Promise((res) => {
    const off = onAuthStateChanged(auth, (u) => { if (u) { off(); res(u.uid); } });
  });
  return uid;
}

export const myUid = () => uid;

const randCode = () => String(Math.floor(10000 + Math.random() * 90000));

function normalize(code, raw) {
  if (!raw || !raw.meta) return null;
  const players = {};
  for (const [id, p] of Object.entries(raw.players || {})) {
    players[id] = {
      ...p,
      card: p.card ? decodeGrid(p.card) : null,
      marked: p.marked ? String(p.marked).split(',').filter(Boolean).map(Number) : [],
    };
  }
  return {
    code,
    meta: raw.meta,
    players,
    game: {
      drawn: raw.game?.drawn ? String(raw.game.drawn).split(',').filter(Boolean).map(Number) : [],
      lastNumber: raw.game?.lastNumber ?? null,
      drawnAt: raw.game?.drawnAt ?? 0,
    },
    claims: raw.claims || {},
    winners: { cinko1: [], cinko2: [], tombala: [], ...(raw.winners || {}) },
  };
}

export async function createRoom(profile, settings) {
  for (let i = 0; i < 5; i++) {
    const code = randCode();
    const metaRef = ref(db, `rooms/${code}/meta`);
    const meta = {
      hostId: uid,
      status: 'lobby',
      createdAt: Date.now(),
      settings: { drawMode: 'auto', drawInterval: 5000, autoMark: true, ...settings },
    };
    const t = await runTransaction(metaRef, (cur) => {
      if (cur && Date.now() - (cur.createdAt || 0) < ROOM_TTL_MS) return; // dolu, iptal
      return meta;
    });
    if (t.committed) {
      await set(ref(db, `rooms/${code}/game`), { drawn: '', lastNumber: null, drawnAt: 0 });
      await set(ref(db, `rooms/${code}/winners`), { cinko1: [], cinko2: [], tombala: [] });
      await joinRoom(code, profile);
      return code;
    }
  }
  throw new Error('Oda kodu üretilemedi, tekrar dene');
}

export async function joinRoom(code, profile) {
  const snap = await get(ref(db, `rooms/${code}`));
  const raw = snap.val();
  if (!raw?.meta) throw new Error('Oda bulunamadı');
  if (Date.now() - (raw.meta.createdAt || 0) > ROOM_TTL_MS) throw new Error('Oda bulunamadı');

  const players = raw.players || {};
  const returning = !!players[uid];
  if (!returning) {
    if (Object.keys(players).length >= MAX_PLAYERS) throw new Error('Oda dolu');
    if (raw.meta.status !== 'lobby') throw new Error('Bu oyun çoktan başladı');
  }

  const me = ref(db, `rooms/${code}/players/${uid}`);
  await update(me, returning
    ? { connected: true, name: profile.name, avatar: profile.avatar, color: profile.color }
    : { ...profile, ready: false, card: null, marked: '', connected: true, joinedAt: Date.now() });

  onDisconnect(ref(db, `rooms/${code}/players/${uid}/connected`)).set(false);
  return code;
}

export function subscribe(code, cb) {
  return onValue(ref(db, `rooms/${code}`), (snap) => cb(normalize(code, snap.val())));
}

export const updateMe = (code, patch) => {
  const p = { ...patch };
  if (p.card !== undefined) p.card = p.card ? encodeGrid(p.card) : null;
  if (p.marked !== undefined) p.marked = (p.marked || []).join(',');
  return update(ref(db, `rooms/${code}/players/${uid}`), p);
};

export const updateMeta = (code, patch) => update(ref(db, `rooms/${code}/meta`), patch);

export const pushDraw = (code, drawn, lastNumber) =>
  update(ref(db, `rooms/${code}/game`), {
    drawn: drawn.join(','), lastNumber, drawnAt: Date.now(),
  });

export const setWinners = (code, winners) => set(ref(db, `rooms/${code}/winners`), winners);

export const sendClaim = (code, type, atDraw) =>
  set(ref(db, `rooms/${code}/claims/${uid}`), { type, atDraw, at: Date.now() });

export const resolveClaimResult = (code, id, valid, reason) =>
  update(ref(db, `rooms/${code}/claims/${id}`), { valid, reason: reason || null });

export const clearClaims = (code) => remove(ref(db, `rooms/${code}/claims`));

/** Host bağlantısı koptuysa en erken katılan bağlı oyuncu hostluğu devralır. */
export async function maybeClaimHost(code, room) {
  const host = room.players[room.meta.hostId];
  if (host?.connected) return;
  const alive = Object.entries(room.players)
    .filter(([, p]) => p.connected)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
  if (!alive.length || alive[0][0] !== uid) return;
  await runTransaction(ref(db, `rooms/${code}/meta/hostId`), (cur) =>
    cur === room.meta.hostId ? uid : undefined);
}

export const leaveRoom = (code) => remove(ref(db, `rooms/${code}/players/${uid}`));

/**
 * Yeni tur: yalnızca oda düzeyindeki düğümler sıfırlanır.
 * Her oyuncu kendi marked/ready alanını temizler (güvenlik kuralları gereği
 * host başkasının düğümüne yazamaz).
 */
export async function resetRoom(code) {
  await update(ref(db, `rooms/${code}`), {
    game: { drawn: '', lastNumber: null, drawnAt: 0 },
    winners: { cinko1: [], cinko2: [], tombala: [] },
    claims: null,
    'meta/status': 'lobby',
  });
}

export { MAX_PLAYERS, MIN_PLAYERS };

export const dropClaim = (code, id) => remove(ref(db, `rooms/${code}/claims/${id}`));
