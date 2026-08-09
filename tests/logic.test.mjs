// tests/logic.test.mjs — bağımlılıksız mantık testleri.
//   node tests/logic.test.mjs
//
// Kart üretimini, kural doğrulamasını ve botlu tam oyun döngüsünü DOM olmadan
// sınar. Oyun döngüsü app.js'teki host akışının birebir kopyasıdır; buradaki
// bir kırılma tarayıcıda da kırılma demektir.

import {
  generateCard, gridFromNumbers, inspectSelection, validateCard, cardNumbers,
  encodeGrid, decodeGrid, shuffle, rowNumbers, ROWS, COLS,
} from '../card.js';
import { evaluate, missedNumbers, validateClaim, resolveClaims } from '../game.js';
import * as NET from '../net-local.js';

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'doğru değil');
}

/* ---------------- Kart ---------------- */

test('generateCard 10.000 kez geçerli kart üretir', () => {
  for (let i = 0; i < 10000; i++) {
    const err = validateCard(generateCard());
    assert(err.length === 0, err.join(', '));
  }
});

test('gridFromNumbers seçilen sayıları geçerli düzene oturtur', () => {
  for (let i = 0; i < 2000; i++) {
    const nums = cardNumbers(generateCard());
    const grid = gridFromNumbers(shuffle(nums));
    const err = validateCard(grid);
    assert(err.length === 0, err.join(', '));
    assert(cardNumbers(grid).join() === nums.join(), 'sayı kümesi korunmadı');
  }
});

test('gridFromNumbers eksik/fazla seçimi reddeder', () => {
  let threw = false;
  try { gridFromNumbers([1, 2, 3]); } catch { threw = true; }
  assert(threw, '15 sayıdan az seçim kabul edildi');
});

test('inspectSelection boş sütunu ve fazla sayıyı yakalar', () => {
  const tekSutun = Array.from({ length: 9 }, (_, i) => i + 1); // hepsi 1. sütun
  const bilgi = inspectSelection([...tekSutun, 10, 11, 12, 20, 21, 22]);
  assert(!bilgi.valid, 'geçersiz seçim geçerli sayıldı');
  assert(bilgi.problems.length > 0, 'sorun bildirilmedi');
});

test('encodeGrid/decodeGrid ızgarayı korur', () => {
  const grid = generateCard();
  const geri = decodeGrid(encodeGrid(grid));
  assert(geri.length === ROWS * COLS, 'hücre sayısı değişti');
  assert(geri.every((v, i) => v === grid[i]), 'değerler değişti');
});

/* ---------------- Kurallar ---------------- */

test('evaluate yalnızca çekilmiş ve işaretlenmiş sayıları sayar', () => {
  const grid = generateCard();
  const nums = cardNumbers(grid);
  // işaretli ama çekilmemiş sayı satır tamamlamamalı
  const st = evaluate(grid, nums, []);
  assert(st.completedRows === 0, 'çekilmemiş sayı satır tamamladı');
  assert(!st.full, 'çekilmemiş sayılarla tombala oldu');
  const hepsi = evaluate(grid, nums, nums);
  assert(hepsi.full, 'tam kart tombala saymadı');
  assert(hepsi.completedRows === ROWS, 'tam kartta satırlar tamamlanmadı');
});

test('missedNumbers çıkmış ama işaretlenmemiş sayıları verir', () => {
  const grid = generateCard();
  const nums = cardNumbers(grid);
  const eksik = missedNumbers(grid, [nums[0]], nums);
  assert(eksik.length === nums.length - 1, 'eksik sayı adedi yanlış');
  assert(!eksik.includes(nums[0]), 'işaretli sayı eksik sayıldı');
});

test('validateClaim hak edilmeyen ilanı reddeder', () => {
  const grid = generateCard();
  const bos = { cinko1: [], cinko2: [], tombala: [] };
  const r = validateClaim({ grid, marked: [], drawn: [], type: 'cinko1', uid: 'a', winners: bos });
  assert(!r.valid, 'boş kartla çinko kabul edildi');
});

test('validateClaim 1. çinko ilan edilmeden 2. çinkoyu reddeder', () => {
  const grid = generateCard();
  const nums = cardNumbers(grid);
  const bos = { cinko1: [], cinko2: [], tombala: [] };
  const r = validateClaim({ grid, marked: nums, drawn: nums, type: 'cinko2', uid: 'a', winners: bos });
  assert(!r.valid, '1. çinko yokken 2. çinko kabul edildi');
});

test('resolveClaims aynı çekilişteki geçerli ilanları paylaştırır', () => {
  const g1 = generateCard();
  const g2 = generateCard();
  const n1 = cardNumbers(g1);
  const n2 = cardNumbers(g2);
  const drawn = [...new Set([...n1, ...n2])];
  const { winners } = resolveClaims({
    claims: {
      a: { type: 'cinko1', atDraw: 40, at: 1 },
      b: { type: 'cinko1', atDraw: 40, at: 2 },
    },
    players: { a: { card: g1, marked: n1 }, b: { card: g2, marked: n2 } },
    drawn,
    winners: { cinko1: [], cinko2: [], tombala: [] },
  });
  assert(winners.cinko1.length === 2, 'aynı çekilişteki ilanlar paylaşılmadı');
});

test('resolveClaims farklı çekilişte ikinci ilanı reddeder', () => {
  const g1 = generateCard();
  const g2 = generateCard();
  const n1 = cardNumbers(g1);
  const n2 = cardNumbers(g2);
  const { results, winners } = resolveClaims({
    claims: {
      a: { type: 'cinko1', atDraw: 40, at: 1 },
      b: { type: 'cinko1', atDraw: 55, at: 2 },
    },
    players: { a: { card: g1, marked: n1 }, b: { card: g2, marked: n2 } },
    drawn: [...new Set([...n1, ...n2])],
    winners: { cinko1: [], cinko2: [], tombala: [] },
  });
  assert(winners.cinko1.length === 1, 'geç kalan ilan da kazandı');
  assert(results.b.valid === false, 'geç kalan ilan reddedilmedi');
});

/* ---------------- Tam oyun döngüsü ---------------- */
// app.js'teki host akışının aynısı. Botların birden çok ilan yapabilmesi ve
// kazananın kendi ilanı yüzünden ceza yememesi burada sınanır.

const ALL = Array.from({ length: 90 }, (_, i) => i + 1);

function oyunSur({ botSayisi = 2, aralik = 20, zamanAsimi = 30000, insanIlanEder = true } = {}) {
  const S = {
    uid: 'local-me', code: null, room: null, prev: null, drawTimer: null,
    pauseUntil: 0, penaltyUntil: 0, claimedTypes: new Set(), handledClaim: '',
    resolving: false, drawing: false,
  };
  const cezalar = [];
  const ilanlar = [];
  const isHost = () => S.room?.meta?.hostId === S.uid;
  const ayar = () => S.room?.meta?.settings || {};
  const ben = () => S.room?.players?.[S.uid];

  function turSifirla() {
    clearTimeout(S.drawTimer);
    S.drawTimer = null; S.pauseUntil = 0; S.penaltyUntil = 0;
    S.claimedTypes.clear(); S.handledClaim = '';
  }

  async function cek() {
    const room = S.room;
    if (!room || !isHost() || room.meta.status !== 'playing' || S.drawing) return;
    const kalan = ALL.filter((n) => !room.game.drawn.includes(n));
    if (!kalan.length) return bitir();
    const n = shuffle(kalan)[0];
    S.drawing = true;
    try { await NET.pushDraw(S.code, [...room.game.drawn, n], n); } finally { S.drawing = false; }
  }

  async function hostDongusu() {
    const room = S.room;
    clearTimeout(S.drawTimer);
    if (!room || !isHost() || room.meta.status !== 'playing' || S.resolving) return;

    const bekleyen = Object.entries(room.claims || {}).filter(([, c]) => c && c.valid === undefined);
    if (bekleyen.length) {
      S.resolving = true;
      let bitti = false;
      try {
        const res = resolveClaims({
          claims: room.claims, players: room.players, drawn: room.game.drawn, winners: room.winners,
        });
        bitti = res.finished;
        if (JSON.stringify(res.winners) !== JSON.stringify(room.winners)) {
          await NET.setWinners(S.code, res.winners);
          S.pauseUntil = Date.now() + 200;
        }
        for (const [id, r] of Object.entries(res.results)) {
          ilanlar.push({ id, type: room.claims[id].type, valid: r.valid });
          await NET.resolveClaimResult(S.code, id, r.valid, r.reason);
        }
      } finally { S.resolving = false; }
      if (bitti) return bitir();
    }

    if (room.winners.tombala.length || room.game.drawn.length >= 90) return bitir();
    const bekle = Math.max((room.game.drawnAt || 0) + aralik - Date.now(), S.pauseUntil - Date.now(), 15);
    S.drawTimer = setTimeout(cek, bekle);
  }

  async function bitir() {
    clearTimeout(S.drawTimer);
    if (isHost() && S.room?.meta.status !== 'finished') {
      await NET.updateMeta(S.code, { status: 'finished' });
    }
  }

  function odaGuncellendi(room) {
    if (!room) return;
    const prev = S.prev; S.prev = room; S.room = room;
    if (prev && prev.meta.status !== 'lobby' && room.meta.status === 'lobby') turSifirla();

    const benimIlanim = room.claims?.[S.uid];
    if (benimIlanim && benimIlanim.valid !== undefined) {
      const key = `${benimIlanim.type}:${benimIlanim.at}`;
      if (S.handledClaim !== key) {
        S.handledClaim = key;
        if (benimIlanim.valid === false) {
          S.claimedTypes.delete(benimIlanim.type);
          S.penaltyUntil = Date.now() + 10000;
          cezalar.push(benimIlanim.reason);
        }
      }
      NET.dropClaim(S.code, S.uid);
    }

    if (room.meta.status === 'playing' && ben()?.card) {
      if (ayar().autoMark) {
        const kacan = missedNumbers(ben().card, ben().marked, room.game.drawn);
        if (kacan.length) NET.updateMe(S.code, { marked: [...ben().marked, ...kacan] });
      }
      const m = ben();
      const st = evaluate(m.card, m.marked, room.game.drawn);
      const w = room.winners;
      const acik = !!room.claims?.[S.uid] && room.claims[S.uid].valid === undefined;
      const olur = {
        cinko1: st.completedRows >= 1 && !w.cinko1.length,
        cinko2: st.completedRows >= 2 && w.cinko1.length > 0 && !w.cinko2.length,
        tombala: st.full && !w.tombala.length,
      };
      for (const t of insanIlanEder ? ['tombala', 'cinko2', 'cinko1'] : []) {
        if (olur[t] && S.penaltyUntil <= Date.now() && !acik && !S.claimedTypes.has(t)) {
          S.claimedTypes.add(t);
          NET.sendClaim(S.code, t, room.game.drawn.length);
          break;
        }
      }
    }
    hostDongusu();
  }

  return (async () => {
    await NET.initNet();
    S.code = await NET.createRoom(
      { name: 'Ben', avatar: '🦊', color: '#FFB43D' }, { drawInterval: aralik }, botSayisi,
    );
    NET.subscribe(S.code, odaGuncellendi);
    await NET.updateMe(S.code, { card: generateCard(), ready: true });
    await NET.updateMeta(S.code, { status: 'playing' });
    const sonuc = await new Promise((res) => {
      const iv = setInterval(() => {
        if (S.room?.meta.status === 'finished') { clearInterval(iv); res('bitti'); }
      }, 5);
      setTimeout(() => { clearInterval(iv); res('zaman aşımı'); }, zamanAsimi);
    });
    const oda = S.room;
    await NET.leaveRoom(S.code);
    return { sonuc, winners: oda.winners, cekilen: oda.game.drawn.length, cezalar, ilanlar };
  })();
}

await testAsync('botlu oyun tombalayla biter ve üç aşama da alınır', async () => {
  for (let tur = 0; tur < 5; tur++) {
    const r = await oyunSur();
    assert(r.sonuc === 'bitti', `oyun bitmedi (${r.sonuc}, ${r.cekilen} sayı çekildi)`);
    assert(r.winners.cinko1.length > 0, '1. çinko kimseye verilmedi');
    assert(r.winners.cinko2.length > 0, '2. çinko kimseye verilmedi');
    assert(r.winners.tombala.length > 0, 'tombala kimseye verilmedi');
  }
});

await testAsync('kazanan kendi ilanı yüzünden ceza yemez', async () => {
  for (let tur = 0; tur < 5; tur++) {
    const r = await oyunSur();
    assert(r.cezalar.length === 0, 'haksız ceza: ' + r.cezalar.join(' / '));
    const red = r.ilanlar.filter((c) => !c.valid);
    assert(red.length === 0, 'reddedilen ilan: ' + JSON.stringify(red));
  }
});

await testAsync('oyuncu pasifken botlar oyunu kendi başına bitirir', async () => {
  // Regresyon: bot ilan ettikten sonra kilitlenirse, insan oyuncu ilan
  // etmediğinde geriye kalan aşamalar kimseye verilmez.
  for (let tur = 0; tur < 3; tur++) {
    const r = await oyunSur({ botSayisi: 3, insanIlanEder: false });
    assert(r.winners.cinko1.length > 0, '1. çinko kimseye verilmedi');
    assert(r.winners.cinko2.length > 0, '2. çinko kimseye verilmedi');
  }
});

await testAsync('bot ilanı karara bağlandıktan sonra tekrar ilan edebilir', async () => {
  // Botun ilan kaydı temizlenmezse 1. çinkoyu alan bot bir daha ilan edemez.
  // Çekilişi elle sürdürüp botun ikinci ilanını doğrudan bekliyoruz.
  const ARALIK = 40;
  let oda = null;
  await NET.initNet();
  const code = await NET.createRoom(
    { name: 'Ben', avatar: '🦊', color: '#FFB43D' }, { drawInterval: ARALIK }, 1,
  );
  const unsub = NET.subscribe(code, (r) => { oda = r; });
  await NET.updateMe(code, { card: generateCard(), ready: true });
  await NET.updateMeta(code, { status: 'playing' });

  const botId = Object.keys(oda.players).find((id) => oda.players[id].bot);
  const kart = oda.players[botId].card;
  const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

  async function satirCek(r) {
    for (const n of rowNumbers(kart, r)) {
      if (oda.game.drawn.includes(n)) continue;
      await NET.pushDraw(code, [...oda.game.drawn, n], n);
      await bekle(ARALIK);
    }
    await bekle(ARALIK * 3);
  }

  await satirCek(0);
  const ilk = oda.claims[botId];
  assert(ilk && ilk.type === 'cinko1', 'bot 1. çinko ilan etmedi');

  // host ilanı kabul ediyor
  await NET.setWinners(code, { cinko1: [botId], cinko2: [], tombala: [] });
  await NET.resolveClaimResult(code, botId, true, null);

  await satirCek(1);
  const ikinci = oda.claims[botId];
  assert(ikinci && ikinci.type === 'cinko2' && ikinci.valid === undefined,
    'bot ikinci kez ilan edemedi (ilan kaydı temizlenmiyor)');

  unsub();
  await NET.leaveRoom(code);
});

/* ---------------- Sonuç ---------------- */

console.log(`\n${passed}/${passed + failures.length} test geçti`);
if (failures.length) {
  console.log('\nBAŞARISIZ:');
  failures.forEach((f) => console.log('  !!', f));
  process.exit(1);
}
