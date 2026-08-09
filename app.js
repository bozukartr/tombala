// app.js — ekranlar, oyun akışı, efekt bağlantıları.
import {
  generateCard, gridFromNumbers, inspectSelection, colRange,
  cardNumbers, shuffle, ROWS, COLS,
} from './card.js';
import {
  evaluate, missedNumbers, resolveClaims, CLAIM_LABEL, FALSE_CLAIM_PENALTY_MS,
} from './game.js';
import { sfx, haptic, confetti, shake, unlockAudio, settings as fxSettings, setSetting } from './fx.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ALL_NUMBERS = Array.from({ length: 90 }, (_, i) => i + 1);

const AVATARS = ['🦊', '🐢', '🦉', '🐝', '🦩', '🐙', '🦔', '🐧'];
const COLORS = ['#FFB43D', '#F0517A', '#34D39A', '#6BC5F5', '#C084FC', '#FF8A5B'];

/* ================= Durum ================= */
const S = {
  uid: null,
  code: null,
  room: null,
  unsub: null,
  isLocal: false,
  drawTimer: null,
  pauseUntil: 0,
  penaltyUntil: 0,
  seenDraw: null,
  seenWinners: '',
  builder: new Set(),
  lastRows: [false, false, false],
  claimedTypes: new Set(), // kazanılmış ilanlar — aynı ilan iki kez gönderilmesin
  handledClaim: '',        // sonucuna tepki verdiğim ilan (tekrar tekrar cezalanmayı önler)
  lastAutoMark: '',        // aynı otomatik işaretleme için ses/titreşim tekrarlanmasın
  resolving: false,        // host ilan çözümlemesi sürüyor
  drawing: false,          // çekiliş yazımı sürüyor
};

/** Tur başına sıfırlanan istemci durumu. Yeni tura giren herkes çağırır. */
function resetRoundState() {
  clearTimeout(S.drawTimer);
  S.drawTimer = null;
  S.seenDraw = null;
  S.seenWinners = '';
  S.lastRows = [false, false, false];
  S.pauseUntil = 0;
  S.penaltyUntil = 0;
  S.claimedTypes.clear();
  S.handledClaim = '';
  S.lastAutoMark = '';
}

const profile = {
  name: localStorage.getItem('tmb.name') || '',
  avatar: localStorage.getItem('tmb.avatar') || AVATARS[0],
  color: localStorage.getItem('tmb.color') || COLORS[0],
};

/* ================= Ağ katmanı seçimi ================= */
let firebaseConfig = null;
try {
  ({ firebaseConfig } = await import('./config.js'));
} catch {
  /* config.js yok — sadece yerel mod açık kalır */
}

let NET = null;
let NET_KIND = null;

async function useNet(kind) {
  if (NET_KIND === kind) return NET;
  if (kind === 'fb') {
    if (!firebaseConfig) throw new Error('Firebase ayarları yok');
    NET = await import('./net-firebase.js');
    S.uid = await NET.initNet(firebaseConfig);
  } else {
    NET = await import('./net-local.js');
    S.uid = await NET.initNet();
  }
  NET_KIND = kind;
  S.isLocal = kind === 'local';
  return NET;
}

/* ================= Yardımcılar ================= */
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === id));
}

let toastTimer;
function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('is-bad', bad);
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}

const me = () => S.room?.players?.[S.uid] || null;
const isHost = () => S.room?.meta?.hostId === S.uid;
const roomSettings = () => S.room?.meta?.settings || {};

/* ================= Ana ekran ================= */
function buildPickers() {
  const ap = $('#avatar-picker');
  const cp = $('#color-picker');
  ap.innerHTML = '';
  cp.innerHTML = '';
  AVATARS.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', 'Simge ' + a);
    b.className = a === profile.avatar ? 'is-on' : '';
    b.onclick = () => {
      profile.avatar = a;
      localStorage.setItem('tmb.avatar', a);
      buildPickers();
      sfx.tap();
    };
    ap.append(b);
  });
  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.background = c;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', 'Renk');
    b.className = c === profile.color ? 'is-on' : '';
    b.onclick = () => {
      profile.color = c;
      localStorage.setItem('tmb.color', c);
      buildPickers();
      sfx.tap();
    };
    cp.append(b);
  });
}

function readProfile() {
  const n = $('#in-name').value.trim();
  profile.name = n || 'Oyuncu';
  localStorage.setItem('tmb.name', profile.name);
  return { name: profile.name, avatar: profile.avatar, color: profile.color };
}

/* ================= Oda kur / katıl ================= */
async function enterRoom(code) {
  S.code = code;
  localStorage.setItem('tmb.room', S.isLocal ? '' : code);
  if (S.unsub) S.unsub();
  S.unsub = NET.subscribe(code, onRoom);
  $('#roomcode-value').textContent = S.isLocal ? 'YEREL' : code;
  show('s-lobby');
}

$('#b-create').onclick = async () => {
  const p = readProfile();
  try {
    await useNet('fb');
    const code = await NET.createRoom(p, {});
    await enterRoom(code);
  } catch (e) {
    toast(e.message || 'Oda kurulamadı', true);
  }
};

$('#b-local').onclick = async () => {
  const p = readProfile();
  await useNet('local');
  const code = await NET.createRoom(p, {}, 2);
  await enterRoom(code);
  toast('İki bot rakip eklendi');
};

$('#b-goto-join').onclick = () => {
  readProfile();
  show('s-join');
  $('#code-input input').focus();
};

$$('[data-back]').forEach((b) => { b.onclick = () => show(b.dataset.back); });

/* Kod girişi: otomatik ilerleme, geri silme, yapıştırma */
const codeInputs = $$('#code-input input');
codeInputs.forEach((inp, i) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
    if (inp.value && i < 4) codeInputs[i + 1].focus();
    $('#b-join').disabled = codeInputs.some((x) => !x.value);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !inp.value && i > 0) codeInputs[i - 1].focus();
  });
  inp.addEventListener('paste', (e) => {
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 5);
    if (!d) return;
    e.preventDefault();
    d.split('').forEach((ch, k) => { codeInputs[k].value = ch; });
    codeInputs[Math.min(d.length, 4)].focus();
    $('#b-join').disabled = codeInputs.some((x) => !x.value);
  });
});

$('#b-join').onclick = async () => {
  const code = codeInputs.map((i) => i.value).join('');
  $('#b-join').disabled = true;
  try {
    await useNet('fb');
    await NET.joinRoom(code, readProfile());
    await enterRoom(code);
  } catch (e) {
    toast(e.message || 'Odaya girilemedi', true);
    sfx.error();
    haptic.error();
    shake($('#code-input'));
  } finally {
    $('#b-join').disabled = false;
  }
};

$('#b-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(S.code);
    toast('Kod kopyalandı');
  } catch { toast('Kopyalanamadı', true); }
};

$('#b-share').onclick = async () => {
  const text = `Tombala oynayalım. Oda kodu: ${S.code}\n${location.href.split('#')[0]}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Tombala', text }); } catch { /* iptal */ }
  } else {
    try { await navigator.clipboard.writeText(text); toast('Davet kopyalandı'); }
    catch { toast('Paylaşım desteklenmiyor', true); }
  }
};

$('#b-leave').onclick = async () => {
  if (S.unsub) S.unsub();
  resetRoundState();
  try { await NET.leaveRoom(S.code); } catch { /* zaten kopmuş */ }
  localStorage.removeItem('tmb.room');
  S.code = null; S.room = null; S.unsub = null;
  show('s-home');
};

/* ================= Lobi ================= */
$('#b-random-card').onclick = () => {
  NET.updateMe(S.code, { card: generateCard() });
  sfx.tap();
  haptic.mark();
};

$('#b-ready').onclick = () => {
  const m = me();
  if (!m?.card) return toast('Önce kart seç', true);
  NET.updateMe(S.code, { ready: !m.ready });
  sfx.tap();
};

$('#b-start').onclick = async () => {
  const players = Object.values(S.room.players);
  if (players.length < 2) return toast('En az 2 oyuncu gerekli', true);
  if (!players.every((p) => p.ready && p.card)) return toast('Herkes hazır değil', true);
  await NET.updateMeta(S.code, { status: 'playing' });
  sfx.cinko();
};

$$('#host-settings .seg').forEach((seg) => {
  seg.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || !isHost()) return;
    const key = seg.dataset.setting;
    let v = b.dataset.value;
    if (key === 'drawInterval') v = Number(v);
    if (key === 'autoMark') v = v === '1';
    NET.updateMeta(S.code, { settings: { ...roomSettings(), [key]: v } });
    sfx.tap();
  };
});

function renderSettings() {
  const st = roomSettings();
  $('#host-settings').hidden = !isHost();
  $$('#host-settings .seg').forEach((seg) => {
    const key = seg.dataset.setting;
    const cur = key === 'autoMark' ? (st.autoMark ? '1' : '0') : String(st[key]);
    $$('button', seg).forEach((b) => b.classList.toggle('is-on', b.dataset.value === cur));
  });
}

function renderLobby() {
  const room = S.room;
  const players = Object.entries(room.players)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));

  $('#player-count').textContent = `${players.length}/6`;
  const ul = $('#lobby-players');
  ul.innerHTML = '';
  for (const [id, p] of players) {
    const li = document.createElement('li');
    li.className = 'player' + (p.connected ? '' : ' is-off');
    li.innerHTML = `
      <span class="player__avatar" style="background:${safeColor(p.color)}">${safeAvatar(p.avatar)}</span>
      <span class="player__name">${safeName(p.name)}${id === room.meta.hostId ? ' 👑' : ''}</span>
      <span class="player__tag ${p.ready ? 'is-ready' : ''}">${
        !p.connected ? 'bağlantı koptu' : p.ready ? 'hazır' : p.card ? 'kart seçti' : 'kart bekleniyor'
      }</span>`;
    ul.append(li);
  }

  const m = me();
  $('#card-state').textContent = m?.card ? 'Hazır' : 'Seçilmedi';
  renderCard($('#lobby-card'), m?.card || null, { preview: true });
  $('#b-ready').textContent = m?.ready ? 'Hazır değilim' : 'Hazırım';

  const allReady = players.length >= 2 && players.every(([, p]) => p.ready && p.card);
  $('#b-start').hidden = !isHost();
  $('#b-start').disabled = !allReady;
  renderSettings();
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Ad, renk ve simge başka bir istemciden gelir; hiçbiri doğrudan HTML'e gömülmez.
const safeColor = (c) => (/^#[0-9a-fA-F]{3,8}$/.test(String(c ?? '')) ? String(c) : COLORS[0]);
const safeAvatar = (a) => escapeHtml([...String(a ?? '')].slice(0, 2).join('')) || '🙂';
const safeName = (n) => escapeHtml(String(n ?? '').slice(0, 12)) || 'Oyuncu';

/* ================= Kart kurma çekmecesi ================= */
$('#b-build-card').onclick = () => {
  S.builder = new Set(cardNumbers(me()?.card || []));
  renderBuilder();
  $('#builder').hidden = false;
};
$('#b-builder-close').onclick = () => { $('#builder').hidden = true; };
$('#b-builder-clear').onclick = () => { S.builder.clear(); renderBuilder(); sfx.tap(); };
$('#b-builder-save').onclick = () => {
  try {
    const grid = gridFromNumbers([...S.builder]);
    NET.updateMe(S.code, { card: grid });
    $('#builder').hidden = true;
    toast('Kartın kaydedildi');
    sfx.row();
  } catch (e) { toast(e.message, true); }
};

function renderBuilder() {
  const grid = $('#numgrid');
  const info = inspectSelection([...S.builder]);
  grid.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'numcol' + (info.counts[c] > 3 ? ' is-bad' : '');
    const [lo, hi] = colRange(c);
    for (let n = lo; n <= hi; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'num' + (S.builder.has(n) ? ' is-on' : '');
      b.textContent = n;
      b.onclick = () => {
        if (S.builder.has(n)) S.builder.delete(n);
        else if (S.builder.size >= 15) { toast('15 sayı doldu', true); return sfx.error(); }
        else S.builder.add(n);
        haptic.mark();
        sfx.mark();
        renderBuilder();
      };
      col.append(b);
    }
    grid.append(col);
  }
  $('#builder-count').textContent = info.remaining > 0 ? `Kalan ${info.remaining}` : 'Tamam';
  $('#builder-warn').textContent = info.problems[0] || '';
  $('#b-builder-save').disabled = !info.valid;
}

/* ================= Kart çizimi ================= */
function renderCard(el, grid, { preview = false, drawn = [], marked = [], rows = [] } = {}) {
  el.innerHTML = '';
  el.classList.toggle('card--empty', !grid);
  if (!grid) return;
  const drawnSet = new Set(drawn);
  const markedSet = new Set(marked);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = grid[r * COLS + c];
      const cell = document.createElement(n ? 'button' : 'div');
      cell.className = 'cell' + (n ? '' : ' cell--empty');
      if (n) {
        cell.type = 'button';
        cell.textContent = n;
        cell.dataset.n = n;
        cell.dataset.row = r;
        if (markedSet.has(n)) {
          cell.classList.add('is-marked');
          cell.style.setProperty('--stamp-rot', `${(n % 9) - 4}deg`);
          cell.setAttribute('aria-label', `${n}, işaretli`);
        } else if (drawnSet.has(n) && !preview) {
          cell.classList.add('is-hot');
        }
        if (rows[r]) cell.classList.add('is-rowdone');
        if (preview) cell.disabled = true;
      }
      el.append(cell);
    }
  }
}

/* Hücreye dokunma: elle işaretleme */
$('#game-card').addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell || !cell.dataset.n) return;
  const n = Number(cell.dataset.n);
  const m = me();
  if (!m || m.marked.includes(n)) return;

  if (!S.room.game.drawn.includes(n)) {
    toast('Bu sayı henüz çıkmadı', true);
    sfx.error();
    haptic.error();
    shake(cell);
    return;
  }
  markNumber(n, cell, e);
});

function markNumber(n, cell, evt) {
  const m = me();
  if (!m || m.marked.includes(n)) return;
  NET.updateMe(S.code, { marked: [...m.marked, n] });
  sfx.mark();
  haptic.mark();
  if (cell && evt) spawnRipple(cell, evt);
}

function spawnRipple(cell, evt) {
  const rect = cell.getBoundingClientRect();
  const d = Math.max(rect.width, rect.height);
  const rip = document.createElement('span');
  rip.className = 'ripple';
  rip.style.width = rip.style.height = d + 'px';
  rip.style.left = (evt.clientX - rect.left - d / 2) + 'px';
  rip.style.top = (evt.clientY - rect.top - d / 2) + 'px';
  cell.append(rip);
  setTimeout(() => rip.remove(), 480);
}

/* ================= Oyun ekranı ================= */
function renderGame() {
  const room = S.room;
  if (!me()?.card) return;

  const drawn = room.game.drawn;

  // Çekilen sayı
  const tile = $('#drawn-tile');
  const last = room.game.lastNumber;
  if (last !== S.seenDraw) {
    S.seenDraw = last;
    tile.textContent = last ?? '—';
    tile.classList.toggle('is-empty', last == null);
    if (last != null) {
      tile.classList.remove('is-drop');
      void tile.offsetWidth;
      tile.classList.add('is-drop');
      $('#pouch').classList.remove('is-squeeze');
      void $('#pouch').offsetWidth;
      $('#pouch').classList.add('is-squeeze');
      sfx.draw();
      haptic.draw();
    }
  }

  // Otomatik işaretleme yalnızca son sayıya bakarsa, bağlantı koptuğunda ya da
  // ayar oyun ortasında açıldığında kaçan sayılar bir daha işaretlenmez.
  if (roomSettings().autoMark) {
    const missed = missedNumbers(me().card, me().marked, drawn);
    const key = missed.join(',');
    if (missed.length) {
      NET.updateMe(S.code, { marked: [...me().marked, ...missed] });
      if (key !== S.lastAutoMark) { sfx.mark(); haptic.mark(); }
    }
    S.lastAutoMark = key;
  }

  // İşaretleme ağ katmanını tetiklediği için durum bu noktada yeniden okunur.
  const m = me();
  const st = evaluate(m.card, m.marked, drawn);

  $('#drawn-count').textContent = drawn.length;
  $('#left-count').textContent = 90 - drawn.length;

  const rec = $('#recents');
  rec.innerHTML = '';
  drawn.slice(-6, -1).reverse().forEach((n) => {
    const t = document.createElement('span');
    t.className = 'tile';
    t.textContent = n;
    rec.append(t);
  });

  // Oyuncu şeridi
  const strip = $('#pstrip');
  strip.innerHTML = '';
  Object.entries(room.players)
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))
    .forEach(([id, p]) => {
      if (!p.card) return;
      const pst = evaluate(p.card, p.marked, drawn);
      const chip = document.createElement('div');
      chip.className = 'pchip' + (p.connected ? '' : ' is-off');
      chip.innerHTML = `
        <span class="pchip__dot" style="background:${safeColor(p.color)}">${safeAvatar(p.avatar)}</span>
        <span>${id === S.uid ? 'Sen' : safeName(p.name)}</span>
        <span class="pchip__bar"><i style="width:${(pst.markedCount / 15) * 100}%"></i></span>`;
      strip.append(chip);
    });

  renderCard($('#game-card'), m.card, {
    drawn, marked: m.marked, rows: st.rows,
  });

  // Satır tamamlandı efekti
  st.rows.forEach((done, r) => {
    if (done && !S.lastRows[r]) {
      sweepRow(r);
      sfx.row();
      haptic.cinko();
    }
  });
  S.lastRows = st.rows;

  // İlan butonları
  const w = room.winners;
  const penalty = S.penaltyUntil > Date.now();
  const claimed = !!room.claims?.[S.uid] && room.claims[S.uid].valid === undefined;
  const canClaim = {
    cinko1: st.completedRows >= 1 && !w.cinko1.length,
    cinko2: st.completedRows >= 2 && w.cinko1.length > 0 && !w.cinko2.length,
    tombala: st.full && !w.tombala.length,
  };
  $$('[data-claim]').forEach((b) => {
    const t = b.dataset.claim;
    // İlanım kabul edilip claims'ten silindiği an ile winners'ın gelmesi arasında
    // buton bir anlığına yeniden açılıyordu; ikinci ilan "zaten yaptın" diye
    // reddedilip kazanana ceza yazıyordu. Kabul edilen ilan tur boyunca kilitli.
    const on = canClaim[t] && !penalty && !claimed && !S.claimedTypes.has(t);
    b.disabled = !on;
    b.classList.toggle('is-live', on);
  });

  // Host kontrolleri
  const manual = roomSettings().drawMode === 'manual';
  $('#b-draw').hidden = !(isHost() && manual);
  $('#b-draw').disabled = drawn.length >= 90;

  // İpucu satırı
  let hint = '';
  if (penalty) hint = `Yanlış ilan — ${Math.ceil((S.penaltyUntil - Date.now()) / 1000)} sn bekle`;
  else if (!roomSettings().autoMark) hint = 'Çıkan sayılara dokunarak işaretle';
  else if (isHost() && manual) hint = 'Sayıyı sen çekiyorsun';
  $('#game-hint').textContent = hint;
}

function sweepRow(r) {
  $$('#game-card .cell').forEach((c) => {
    if (Number(c.dataset.row) === r) {
      c.classList.add('sweep');
      setTimeout(() => c.classList.remove('sweep'), 620);
    }
  });
}

$$('[data-claim]').forEach((b) => {
  b.onclick = () => {
    const type = b.dataset.claim;
    if (S.claimedTypes.has(type) || S.penaltyUntil > Date.now()) return;
    S.claimedTypes.add(type);
    NET.sendClaim(S.code, type, S.room.game.drawn.length);
    b.disabled = true;
    b.classList.remove('is-live');
    toast(CLAIM_LABEL[type] + ' ilan edildi');
  };
});

$('#b-draw').onclick = () => doDraw();

$('#b-sound').onclick = () => {
  const on = !fxSettings.sound;
  setSetting('sound', on);
  setSetting('haptics', on);
  $('#b-sound').textContent = on ? '🔊' : '🔇';
  if (on) sfx.tap();
};

/* ================= Host: çekiliş ve ilan çözümleme ================= */
async function doDraw() {
  const room = S.room;
  if (!room || !isHost() || room.meta.status !== 'playing') return;
  if (S.drawing) return; // aynı anda iki çekiliş yazılmasın
  const drawn = room.game.drawn;
  const remaining = ALL_NUMBERS.filter((n) => !drawn.includes(n));
  if (!remaining.length) return finishGame();
  const n = shuffle(remaining)[0];
  S.drawing = true;
  try {
    await NET.pushDraw(S.code, [...drawn, n], n);
  } finally {
    S.drawing = false;
  }
}

async function hostLoop() {
  const room = S.room;
  clearTimeout(S.drawTimer);
  if (!room || !isHost() || room.meta.status !== 'playing') return;
  // Ağ yazımı yeni bir oda güncellemesi doğurduğu için hostLoop kendi içinden
  // tekrar çağrılabiliyor. Çözümleme sürerken iç içe çağrıyı at; zamanlayıcıyı
  // dıştaki çağrı kuracak.
  if (S.resolving) return;

  // 1) Bekleyen ilanları çöz
  const pending = Object.entries(room.claims || {}).filter(([, c]) => c && c.valid === undefined);
  if (pending.length) {
    S.resolving = true;
    let finished = false;
    try {
      const res = resolveClaims({
        claims: room.claims,
        players: room.players,
        drawn: room.game.drawn,
        winners: room.winners,
      });
      finished = res.finished;
      // Kazananlar önce yazılır: ilan sonucu istemciye kazananlardan önce
      // ulaşırsa ilan butonu bir kare için yeniden açılıyordu.
      if (JSON.stringify(res.winners) !== JSON.stringify(room.winners)) {
        await NET.setWinners(S.code, res.winners);
        S.pauseUntil = Date.now() + 2600; // kutlama için kısa duraklama
      }
      for (const [id, r] of Object.entries(res.results)) {
        await NET.resolveClaimResult(S.code, id, r.valid, r.reason);
      }
    } finally {
      S.resolving = false;
    }
    if (finished) return finishGame();
  }

  if (room.winners.tombala.length || room.game.drawn.length >= 90) return finishGame();
  if (roomSettings().drawMode === 'manual') return;

  const interval = Number(roomSettings().drawInterval) || 5000;
  const wait = Math.max(
    (room.game.drawnAt || 0) + interval - Date.now(),
    S.pauseUntil - Date.now(),
    250,
  );
  S.drawTimer = setTimeout(doDraw, wait);
}

async function finishGame() {
  clearTimeout(S.drawTimer);
  if (isHost() && S.room?.meta.status !== 'finished') {
    await NET.updateMeta(S.code, { status: 'finished' });
  }
}

/* ================= Sonuç ================= */
function renderResult() {
  const room = S.room;
  const name = (id) => (id === S.uid ? 'Sen' : room.players[id]?.name || 'Ayrılan oyuncu');
  const rows = [
    ['1. Çinko', room.winners.cinko1],
    ['2. Çinko', room.winners.cinko2],
    ['Tombala', room.winners.tombala],
  ];
  $('#result-list').innerHTML = rows.map(([label, ids]) => `
    <div class="result-row">
      <span class="result-row__label">${label}</span>
      <span class="result-row__who ${ids.length ? '' : 'is-none'}">${
        ids.length ? ids.map(name).map(escapeHtml).join(', ') : 'kimse alamadı'
      }</span>
    </div>`).join('');

  const won = room.winners.tombala.includes(S.uid);
  $('#result-title').textContent = won ? 'Tombala senin!' : 'Oyun bitti';
  $('#b-again').hidden = !isHost();
}

$('#b-again').onclick = async () => {
  // Tur durumu artık lobiye dönüşte herkeste sıfırlanıyor (bkz. onRoom).
  await NET.resetRoom(S.code);
  show('s-lobby');
};

$('#b-home').onclick = () => $('#b-leave').click();

/* ================= Oda güncellemesi ================= */
let hintTimer = null;

async function onRoom(room) {
  if (!room) {
    toast('Oda kapandı', true);
    localStorage.removeItem('tmb.room');
    show('s-home');
    return;
  }
  const prev = S.room;
  S.room = room;

  // Yeni tur: tur durumu yalnızca "Tekrar oyna"ya basan hostta sıfırlanıyordu,
  // diğer oyuncularda önceki turun sayısı/satırları/cezası taşınıyordu.
  if (prev && prev.meta.status !== 'lobby' && room.meta.status === 'lobby') resetRoundState();

  if (!S.isLocal) await NET.maybeClaimHost(S.code, room);

  // Kendi ilanımın sonucu — her oda güncellemesinde değil, ilan başına bir kez.
  const myClaim = room.claims?.[S.uid];
  if (myClaim && myClaim.valid !== undefined) {
    const key = `${myClaim.type}:${myClaim.at}`;
    if (S.handledClaim !== key) {
      S.handledClaim = key;
      if (myClaim.valid === false) {
        S.claimedTypes.delete(myClaim.type); // koşullar oluşursa tekrar denenebilir
        S.penaltyUntil = Date.now() + FALSE_CLAIM_PENALTY_MS;
        toast(myClaim.reason || 'Yanlış ilan', true);
        sfx.error();
        haptic.error();
        shake(document.body, 'sm');
      }
    }
    NET.dropClaim?.(S.code, S.uid);
  }

  // Kazanan duyurusu
  const wKey = JSON.stringify(room.winners);
  if (wKey !== S.seenWinners) {
    if (S.seenWinners) announceWinners(prev?.winners, room.winners);
    S.seenWinners = wKey;
  }

  if (room.meta.status === 'lobby') {
    // Yeni tura dönüşte herkes kendi işaretlerini temizler.
    const m = me();
    if (m && (m.marked.length || m.ready) && prev?.meta.status === 'finished') {
      NET.updateMe(S.code, { marked: [], ready: false });
    }
    show('s-lobby');
    renderLobby();
  } else if (room.meta.status === 'playing') {
    show('s-game');
    renderGame();
  } else {
    show('s-result');
    renderResult();
    if (room.winners.tombala.length && prev?.meta.status !== 'finished') {
      confetti({ count: 160, origin: { x: 0.5, y: 0.4 }, spread: 1.3 });
      shake(document.body, 'lg');
      sfx.tombala();
      haptic.tombala();
    }
  }

  hostLoop();

  // Ceza geri sayımını canlı tut
  clearInterval(hintTimer);
  if (S.penaltyUntil > Date.now()) {
    hintTimer = setInterval(() => {
      if (S.penaltyUntil <= Date.now()) { clearInterval(hintTimer); }
      if (S.room?.meta.status === 'playing') renderGame();
    }, 500);
  }
}

function announceWinners(before, after) {
  for (const type of ['cinko1', 'cinko2', 'tombala']) {
    const fresh = after[type].filter((id) => !(before?.[type] || []).includes(id));
    if (!fresh.length) continue;
    const who = fresh.map((id) => (id === S.uid ? 'Sen' : S.room.players[id]?.name || '?')).join(', ');
    toast(`${CLAIM_LABEL[type]}: ${who}`);
    if (type === 'tombala') continue; // kutlama sonuç ekranında
    confetti({ count: 110, origin: { x: 0.5, y: 0.35 } });
    sfx.cinko();
    haptic.cinko();
  }
}

/* ================= Açılış ================= */
function boot() {
  $('#in-name').value = profile.name;
  buildPickers();
  $('#b-sound').textContent = fxSettings.sound ? '🔊' : '🔇';

  if (!firebaseConfig) {
    const note = $('#net-note');
    note.hidden = false;
    note.textContent = 'Çevrimiçi oyun için config.js dosyasını ekle. Şimdilik tek cihaz modu açık.';
    $('#b-create').disabled = true;
    $('#b-goto-join').disabled = true;
  }

  // İlk dokunuşta ses motorunu aç (mobil autoplay kuralı)
  const unlock = () => { unlockAudio(); document.removeEventListener('pointerdown', unlock); };
  document.addEventListener('pointerdown', unlock);

  // Kopan bağlantıdan dönüş
  const saved = localStorage.getItem('tmb.room');
  if (saved && firebaseConfig) {
    useNet('fb')
      .then(() => NET.joinRoom(saved, { name: profile.name || 'Oyuncu', avatar: profile.avatar, color: profile.color }))
      .then(() => enterRoom(saved))
      .catch(() => localStorage.removeItem('tmb.room'));
  }
}

boot();
