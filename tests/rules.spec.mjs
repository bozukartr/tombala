// tests/rules.spec.mjs — güvenlik kurallarının davranış testleri.
//
// Firebase emulator'ü ayrı bir terminalde çalıştır:
//   npx firebase-tools emulators:start --only database --project tombala
// sonra:
//   npm i @firebase/rules-unit-testing firebase
//   node tests/rules.spec.mjs
//
// Emulator kural motoru yayındakiyle aynıdır: dosya burada derlenmiyorsa
// `firebase deploy --only database` de reddeder.
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import { ref, set, update, remove, get } from 'firebase/database';

const RULES = process.argv[2] || new URL('../database.rules.json', import.meta.url).pathname;
const env = await initializeTestEnvironment({
  projectId: process.env.FIREBASE_PROJECT || 'tombala',
  database: { host: '127.0.0.1', port: 9000, rules: readFileSync(RULES, 'utf8') },
});

const fails = [];
let passed = 0;
async function check(name, want, fn) {
  try {
    await (want === 'izin' ? assertSucceeds(fn()) : assertFails(fn()));
    passed++;
    console.log(`[GECTI] ${name}`);
  } catch (e) {
    fails.push(name);
    console.log(`[KALDI] ${name}  (beklenen: ${want})`);
  }
}

const HOST = 'uidHost01', P2 = 'uidPlayer2', P3 = 'uidPlayer3';
const db = (uid) => env.authenticatedContext(uid).database();
const dbAnon = () => env.unauthenticatedContext().database();
const CODE = '90001';
const now = Date.now();
const META = {
  hostId: HOST, status: 'lobby', createdAt: now,
  settings: { drawMode: 'auto', drawInterval: 5000, autoMark: true },
};
const player = (name, j) => ({
  name, avatar: 'A', color: '#FFB43D', ready: false, marked: '', connected: true, joinedAt: j,
});
const CARD = Array.from({ length: 27 }, (_, i) => (i % 2 ? 0 : i + 1)).join(',');

async function seed() {
  await env.withSecurityRulesDisabled(async (c) => {
    await set(ref(c.database(), `rooms/${CODE}`), null);
    await set(ref(c.database(), `rooms/${CODE}`), {
      meta: META,
      players: { [HOST]: player('Host', now), [P2]: player('Iki', now + 1) },
      game: { drawn: '', drawnAt: 0 },
      winners: { cinko1: [], cinko2: [], tombala: [] },
    });
  });
}

console.log('\n=== Kural davranis testleri ===\n');

// 1) Oda kurma sırası — net-firebase.js önce meta yazar, oyuncu düğümünü sonra
await env.withSecurityRulesDisabled(async (c) => {
  await set(ref(c.database(), `rooms/${CODE}`), null);
});
await check('createRoom sirasi: oyuncu dugumu yokken meta yazilabiliyor', 'izin', () =>
  set(ref(db(HOST), `rooms/${CODE}/meta`), META));

// 2) Okuma
await seed();
await check('giris yapmamis kullanici odayi okuyamiyor', 'red', () =>
  get(ref(dbAnon(), `rooms/${CODE}`)));
await check('giris yapmis kullanici odayi okuyabiliyor', 'izin', () =>
  get(ref(db(P3), `rooms/${CODE}`)));

// 3) Oyuncu düğümü yetkileri
await check('oyuncu kendi dugumunu yazabiliyor', 'izin', () =>
  update(ref(db(P2), `rooms/${CODE}/players/${P2}`), { ready: true }));
await check('baskasinin dugumune yazilamiyor', 'red', () =>
  update(ref(db(P3), `rooms/${CODE}/players/${P2}`), { ready: false }));

// 4) Host yetkileri
await check('host sayi cekebiliyor', 'izin', () =>
  update(ref(db(HOST), `rooms/${CODE}/game`), { drawn: '1,2,3', lastNumber: 3, drawnAt: now }));
await check('host olmayan sayi cekemiyor', 'red', () =>
  update(ref(db(P2), `rooms/${CODE}/game`), { drawn: '1,2,3,4' }));
await check('host kazanan yazabiliyor', 'izin', () =>
  set(ref(db(HOST), `rooms/${CODE}/winners`), { cinko1: [P2], cinko2: [], tombala: [] }));
await check('host olmayan kazanan yazamiyor', 'red', () =>
  set(ref(db(P2), `rooms/${CODE}/winners`), { cinko1: [P2], cinko2: [], tombala: [] }));

// 5) İlanlar
await seed();
await check('oyuncu kendi ilanini acabiliyor', 'izin', () =>
  set(ref(db(P2), `rooms/${CODE}/claims/${P2}`), { type: 'cinko1', atDraw: 5, at: now }));
await check('baskasinin adina ilan acilamiyor', 'red', () =>
  set(ref(db(P3), `rooms/${CODE}/claims/${P2}`), { type: 'tombala', atDraw: 5, at: now }));
await check('gecersiz ilan turu reddediliyor', 'red', () =>
  set(ref(db(P3), `rooms/${CODE}/claims/${P3}`), { type: 'hepsi', atDraw: 5, at: now }));
await check('host ilani karara baglayabiliyor', 'izin', () =>
  update(ref(db(HOST), `rooms/${CODE}/claims/${P2}`), { valid: true, reason: null }));

// 6) Kart yalnızca lobide
await seed();
await check('lobide kart yazilabiliyor', 'izin', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/card`), CARD));
await env.withSecurityRulesDisabled((c) =>
  set(ref(c.database(), `rooms/${CODE}/meta/status`), 'playing'));
await check('oyun basladiktan sonra kart degistirilemiyor', 'red', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/card`), CARD));
await check('oyun sirasinda isaretleme yazilabiliyor', 'izin', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/marked`), '1,2,3'));

// 7) Hostluk devri
await seed();
await check('host bagliyken hostluk calinamiyor', 'red', () =>
  set(ref(db(P2), `rooms/${CODE}/meta/hostId`), P2));

await env.withSecurityRulesDisabled((c) =>
  set(ref(c.database(), `rooms/${CODE}/players/${HOST}/connected`), false));
await check('host baglantisi kopunca hostluk devralinabiliyor', 'izin', () =>
  set(ref(db(P2), `rooms/${CODE}/meta/hostId`), P2));

await seed();
await env.withSecurityRulesDisabled((c) =>
  remove(ref(c.database(), `rooms/${CODE}/players/${HOST}`)));
await check('host odadan cikinca hostluk devralinabiliyor (duzeltme #9)', 'izin', () =>
  set(ref(db(P2), `rooms/${CODE}/meta/hostId`), P2));

await seed();
await check('odada olmayan biri host yapilamiyor', 'red', () =>
  set(ref(db(HOST), `rooms/${CODE}/meta/hostId`), 'hayalet-uid'));

// 8) Meta ayarları
await seed();
await check('host ayarlari degistirebiliyor', 'izin', () =>
  update(ref(db(HOST), `rooms/${CODE}/meta`), { settings: { drawMode: 'manual', drawInterval: 3000, autoMark: false } }));
await check('host olmayan ayarlari degistiremiyor', 'red', () =>
  update(ref(db(P2), `rooms/${CODE}/meta`), { status: 'finished' }));

// 9) Profil alanları
await seed();
await check('gecerli renk kabul ediliyor', 'izin', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/color`), '#34D39A'));
await check('renk alanina markup yazilamiyor', 'red', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/color`), '"><img src=x onerror=alert(1)>'));
await check('asiri uzun simge reddediliyor', 'red', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/avatar`), 'x'.repeat(200)));
await check('12 karakterden uzun ad reddediliyor', 'red', () =>
  set(ref(db(P2), `rooms/${CODE}/players/${P2}/name`), 'x'.repeat(50)));

await env.cleanup();
console.log(`\n${passed}/${passed + fails.length} gecti`);
if (fails.length) {
  console.log('BASARISIZ:');
  fails.forEach((f) => console.log('  !!', f));
  process.exit(1);
}
