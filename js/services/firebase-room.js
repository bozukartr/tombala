import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  getDatabase, get, onDisconnect, onValue, ref, remove, runTransaction,
  set, update,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js';
import { decodeTicket, encodeTicket } from '../core/ticket.js';
import { emptyWinners, encodeNumberList, normalizeWinners, parseNumberList } from '../core/game.js';

export const MAX_PLAYERS = 6;
export const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;

let database;
let auth;
let uid;
let serverOffset = 0;
let presenceRegistration = null;
let activeRoomCode = null;

function serverNow() {
  return Date.now() + serverOffset;
}

function normalizeRoom(code, raw) {
  if (!raw?.meta) return null;
  const players = {};
  for (const [playerId, player] of Object.entries(raw.members || {})) {
    if (!player || typeof player !== 'object') continue;
    players[playerId] = {
      ...player,
      ticket: decodeTicket(player.ticket),
      marked: parseNumberList(player.marked),
      connected: player.connected === true,
      ready: player.ready === true,
    };
  }
  return {
    code,
    meta: raw.meta,
    players,
    game: {
      drawn: parseNumberList(raw.game?.drawn),
      lastNumber: Number(raw.game?.lastNumber) || null,
      revision: Number(raw.game?.revision) || 0,
      updatedAt: Number(raw.game?.updatedAt) || 0,
    },
    claims: raw.claims || {},
    claimResults: raw.claimResults || {},
    winners: normalizeWinners(raw.winners),
  };
}

function serializeProfile(profile, ticket, joinedAt = serverNow()) {
  return {
    name: String(profile.name).slice(0, 16),
    avatar: String(profile.avatar).slice(0, 8),
    color: String(profile.color),
    ready: false,
    ticket: encodeTicket(ticket),
    marked: '',
    connected: true,
    joinedAt,
  };
}

async function registerPresence(code) {
  if (presenceRegistration) {
    try { await presenceRegistration.cancel(); } catch { /* previous connection is already gone */ }
  }
  activeRoomCode = code;
  const connectedRef = ref(database, `rooms/${code}/members/${uid}/connected`);
  presenceRegistration = onDisconnect(connectedRef);
  await presenceRegistration.set(false);
}

export async function connect(config) {
  if (uid && database) return uid;
  const app = getApps().length ? getApp() : initializeApp(config);
  auth = getAuth(app);
  database = getDatabase(app);
  if (!auth.currentUser) await signInAnonymously(auth);
  uid = auth.currentUser?.uid || await new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      unsubscribe();
      resolve(user.uid);
    }, reject);
  });
  try {
    const offsetSnapshot = await get(ref(database, '.info/serverTimeOffset'));
    serverOffset = Number(offsetSnapshot.val()) || 0;
  } catch {
    serverOffset = 0;
  }
  return uid;
}

export const myUid = () => uid;

function randomCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export async function createRoom(profile, settings, ticket) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode();
    const now = serverNow();
    const room = {
      meta: {
        hostId: uid,
        status: 'lobby',
        createdAt: now,
        expiresAt: now + ROOM_LIFETIME_MS,
        settings: { drawMode: 'auto', drawInterval: 6000, autoMark: true, ...settings },
      },
      members: { [uid]: serializeProfile(profile, ticket, now) },
      game: { drawn: '', lastNumber: 0, revision: 0, updatedAt: now },
      winners: emptyWinners(),
    };
    const transaction = await runTransaction(ref(database, `rooms/${code}`), (current) => {
      if (current?.meta) {
        const expiresAt = Number(current.meta.expiresAt) || 0;
        const hostConnected = current.members?.[current.meta.hostId]?.connected === true;
        const hardStale = expiresAt < now - 86_400_000;
        if (expiresAt > now || (hostConnected && current.meta.status !== 'finished' && !hardStale)) return;
      }
      return room;
    }, { applyLocally: false });
    if (!transaction.committed) continue;
    await registerPresence(code);
    return code;
  }
  throw new Error('Uygun oda kodu bulunamadı. Lütfen tekrar dene.');
}

export async function joinRoom(code, profile, ticket) {
  const roomRef = ref(database, `rooms/${code}`);
  const snapshot = await get(roomRef);
  const raw = snapshot.val();
  const now = serverNow();
  if (!raw?.meta || Number(raw.meta.expiresAt) <= now) throw new Error('Oda bulunamadı veya süresi doldu.');
  if (raw.meta.status !== 'lobby' && !raw.members?.[uid]) throw new Error('Bu oyun başlamış.');

  const connectedPlayers = Object.values(raw.members || {}).filter((player) => player?.connected === true);
  if (!raw.members?.[uid] && connectedPlayers.length >= MAX_PLAYERS) throw new Error('Oda dolu.');

  const memberRef = ref(database, `rooms/${code}/members/${uid}`);
  if (raw.members?.[uid]) {
    const patch = {
      name: String(profile.name).slice(0, 16), avatar: String(profile.avatar).slice(0, 8),
      color: String(profile.color), connected: true,
    };
    if (raw.meta.status === 'lobby' && !decodeTicket(raw.members[uid].ticket)) {
      Object.assign(patch, { ticket: encodeTicket(ticket), marked: '', ready: false });
    }
    await update(memberRef, patch);
  } else {
    await set(memberRef, serializeProfile(profile, ticket, now));
  }
  await registerPresence(code);
  return code;
}

export function subscribe(code, onRoom, onError) {
  return onValue(ref(database, `rooms/${code}`), (snapshot) => {
    onRoom(normalizeRoom(code, snapshot.val()));
  }, onError);
}

export async function updateMe(code, patch) {
  const serialized = { ...patch };
  if ('ticket' in serialized) serialized.ticket = encodeTicket(serialized.ticket);
  if ('marked' in serialized) serialized.marked = encodeNumberList(serialized.marked);
  await update(ref(database, `rooms/${code}/members/${uid}`), serialized);
}

export async function updateSettings(code, settings) {
  await set(ref(database, `rooms/${code}/meta/settings`), settings);
}

export async function updateStatus(code, status) {
  await set(ref(database, `rooms/${code}/meta/status`), status);
}

export async function pushDraw(code, expectedRevision, drawn, lastNumber) {
  const gameRef = ref(database, `rooms/${code}/game`);
  const now = serverNow();
  const result = await runTransaction(gameRef, (current) => {
    if ((Number(current?.revision) || 0) !== expectedRevision) return;
    return { drawn: encodeNumberList(drawn), lastNumber, revision: expectedRevision + 1, updatedAt: now };
  }, { applyLocally: false });
  return result.committed;
}

export async function submitClaim(code, type, atDraw) {
  await set(ref(database, `rooms/${code}/claims/${uid}`), { type, atDraw, createdAt: serverNow() });
}

export async function resolveClaim(code, playerId, result, winners) {
  await update(ref(database, `rooms/${code}`), {
    [`winners/${result.type}`]: winners[result.type],
    [`claimResults/${playerId}`]: {
      type: result.type,
      valid: result.valid,
      reason: result.reason || '',
      resolvedAt: serverNow(),
    },
    [`claims/${playerId}`]: null,
  });
}

export async function clearClaimResult(code) {
  await remove(ref(database, `rooms/${code}/claimResults/${uid}`));
}

export async function resetRoom(code) {
  const now = serverNow();
  await update(ref(database, `rooms/${code}`), {
    'meta/status': 'lobby',
    'meta/expiresAt': now + ROOM_LIFETIME_MS,
    game: { drawn: '', lastNumber: 0, revision: 0, updatedAt: now },
    winners: null,
    claims: null,
    claimResults: null,
  });
}

export async function maybeClaimHost(code, room) {
  const currentHost = room.players[room.meta.hostId];
  if (currentHost?.connected) return false;
  const connected = Object.entries(room.players)
    .filter(([, player]) => player.connected)
    .sort((left, right) => Number(left[1].joinedAt) - Number(right[1].joinedAt));
  if (!connected.length || connected[0][0] !== uid) return false;
  const result = await runTransaction(ref(database, `rooms/${code}/meta/hostId`), (hostId) => (
    hostId === room.meta.hostId ? uid : undefined
  ), { applyLocally: false });
  return result.committed;
}

export async function leaveRoom(code, { deleteRoom = false } = {}) {
  if (presenceRegistration) {
    try { await presenceRegistration.cancel(); } catch { /* already disconnected */ }
    presenceRegistration = null;
  }
  if (deleteRoom) await remove(ref(database, `rooms/${code}`));
  else await remove(ref(database, `rooms/${code}/members/${uid}`));
  if (activeRoomCode === code) activeRoomCode = null;
}

export async function deleteDisconnectedPlayer(code, playerId) {
  await remove(ref(database, `rooms/${code}/members/${playerId}`));
}
