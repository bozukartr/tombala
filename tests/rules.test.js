import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { get, ref, remove, set, update } from 'firebase/database';
import { createTicket, encodeTicket } from '../js/core/ticket.js';

const PROJECT_ID = 'demo-tombala';
const CODE = '54321';
const HOST = 'host-user';
const PLAYER = 'player-user';
const THIRD = 'third-user';
let environment;

const now = () => Date.now();
const member = (name, joinedAt = now()) => ({
  name, avatar: '🦊', color: '#ffcc4a', ready: false,
  ticket: encodeTicket(createTicket()), marked: '', connected: true, joinedAt,
});
const room = () => {
  const timestamp = now();
  return {
    meta: {
      hostId: HOST, status: 'lobby', createdAt: timestamp, expiresAt: timestamp + 21_600_000,
      settings: { drawMode: 'auto', drawInterval: 6000, autoMark: true },
    },
    members: { [HOST]: member('Host', timestamp) },
    game: { drawn: '', lastNumber: 0, revision: 0, updatedAt: timestamp },
  };
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: { rules: await readFile(new URL('../database.rules.json', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => environment.clearDatabase());
after(async () => environment.cleanup());

const db = (uid) => environment.authenticatedContext(uid).database();

test('oda tek atomik yazımla kuruluyor', async () => {
  await assertSucceeds(set(ref(db(HOST), `rooms/${CODE}`), room()));
});

test('giriş yapmayan kullanıcı odayı okuyamıyor', async () => {
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), room()));
  await assertFails(get(ref(environment.unauthenticatedContext().database(), `rooms/${CODE}`)));
  await assertSucceeds(get(ref(db(PLAYER), `rooms/${CODE}`)));
});

test('aktif oda başka kullanıcı tarafından ezilemiyor', async () => {
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), room()));
  const replacement = room();
  replacement.meta.hostId = PLAYER;
  replacement.members = { [PLAYER]: member('Yeni') };
  await assertFails(set(ref(db(PLAYER), `rooms/${CODE}`), replacement));
});

test('süresi dolmuş oda atomik olarak yenilenebiliyor', async () => {
  const expired = room();
  expired.meta.createdAt = now() - 30_000_000;
  expired.meta.expiresAt = now() - 1_000;
  expired.members[HOST].connected = false;
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), expired));
  const replacement = room();
  replacement.meta.hostId = PLAYER;
  replacement.members = { [PLAYER]: member('Yeni') };
  await assertSucceeds(set(ref(db(PLAYER), `rooms/${CODE}`), replacement));
});

test('süresi dolsa bile host bağlıysa aktif oda ezilemiyor', async () => {
  const active = room();
  active.meta.createdAt = now() - 30_000_000;
  active.meta.expiresAt = now() - 1_000;
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), active));
  const replacement = room();
  replacement.meta.hostId = PLAYER;
  replacement.members = { [PLAYER]: member('Yeni') };
  await assertFails(set(ref(db(PLAYER), `rooms/${CODE}`), replacement));
});

test('oyuncu yalnızca lobide katılabiliyor', async () => {
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), room()));
  await assertSucceeds(set(ref(db(PLAYER), `rooms/${CODE}/members/${PLAYER}`), member('Oyuncu')));
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}/meta/status`), 'playing'));
  await assertFails(set(ref(db(THIRD), `rooms/${CODE}/members/${THIRD}`), member('Geç kalan')));
});

test('kart oyun sırasında değiştirilemiyor ama işaret yazılabiliyor', async () => {
  const seeded = room();
  seeded.members[PLAYER] = member('Oyuncu');
  seeded.meta.status = 'playing';
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), seeded));
  await assertFails(set(ref(db(PLAYER), `rooms/${CODE}/members/${PLAYER}/ticket`), encodeTicket(createTicket())));
  await assertSucceeds(set(ref(db(PLAYER), `rooms/${CODE}/members/${PLAYER}/marked`), '1,2,3'));
});

test('sayıları yalnızca host yazabiliyor', async () => {
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), room()));
  const game = { drawn: '4', lastNumber: 4, revision: 1, updatedAt: now() };
  await assertSucceeds(set(ref(db(HOST), `rooms/${CODE}/game`), game));
  await assertFails(set(ref(db(PLAYER), `rooms/${CODE}/game`), game));
});

test('oyuncu yalnızca kendi ilanını açabiliyor ve sonucu onaylayamıyor', async () => {
  const seeded = room();
  seeded.members[PLAYER] = member('Oyuncu');
  seeded.meta.status = 'playing';
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), seeded));
  const claim = { type: 'cinko1', atDraw: 10, createdAt: now() };
  await assertSucceeds(set(ref(db(PLAYER), `rooms/${CODE}/claims/${PLAYER}`), claim));
  await assertFails(set(ref(db(THIRD), `rooms/${CODE}/claims/${PLAYER}`), claim));
  await assertFails(set(ref(db(PLAYER), `rooms/${CODE}/claimResults/${PLAYER}`), {
    type: 'cinko1', valid: true, reason: '', resolvedAt: now(),
  }));
});

test('host ilan sonucunu ve kazananı atomik yazabiliyor', async () => {
  const seeded = room();
  seeded.members[PLAYER] = member('Oyuncu');
  seeded.meta.status = 'playing';
  seeded.claims = { [PLAYER]: { type: 'cinko1', atDraw: 10, createdAt: now() } };
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), seeded));
  await assertSucceeds(update(ref(db(HOST), `rooms/${CODE}`), {
    [`winners/cinko1/${PLAYER}`]: true,
    [`claimResults/${PLAYER}`]: { type: 'cinko1', valid: true, reason: '', resolvedAt: now() },
    [`claims/${PLAYER}`]: null,
  }));
});

test('host ayrılınca bağlı oyuncu hostluğu devralabiliyor', async () => {
  const seeded = room();
  seeded.members[PLAYER] = member('Oyuncu');
  seeded.members[HOST].connected = false;
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), seeded));
  await assertSucceeds(set(ref(db(PLAYER), `rooms/${CODE}/meta/hostId`), PLAYER));
});

test('odayı sadece host tamamen silebiliyor', async () => {
  await environment.withSecurityRulesDisabled((context) => set(ref(context.database(), `rooms/${CODE}`), room()));
  await assertFails(remove(ref(db(PLAYER), `rooms/${CODE}`)));
  await assertSucceeds(remove(ref(db(HOST), `rooms/${CODE}`)));
  assert.equal((await get(ref(db(HOST), `rooms/${CODE}`))).exists(), false);
});
