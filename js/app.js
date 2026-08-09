import {
  COLUMNS, ROWS, createTicket, inspectSelection, rangeForColumn,
  rowNumbers, ticketFromSelection, ticketNumbers,
} from './core/ticket.js';
import {
  CLAIM_LABELS, CLAIM_TYPES, claimEligibility, emptyWinners, evaluateTicket,
  missingMarks, nextNumber, normalizeWinners, validateClaim, winnerIds,
} from './core/game.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const AVATARS = ['🦊', '🐢', '🦉', '🐙', '🦩', '🐝', '🐧', '🦔'];
const COLORS = ['#ffcc4a', '#ff7a8d', '#53d9a4', '#70b7ff', '#8b7cff', '#ff9257'];
const DEFAULT_SETTINGS = { drawMode: 'auto', drawInterval: 6000, autoMark: true };
const FALSE_CLAIM_PENALTY_MS = 8000;

const state = {
  uid: null,
  code: null,
  room: null,
  previousRoom: null,
  service: null,
  serviceKind: null,
  unsubscribe: null,
  selectedNumbers: new Set(),
  drawTimer: null,
  scheduledRevision: null,
  drawing: false,
  resolvingClaims: false,
  claimingHost: false,
  syncingMarks: false,
  resettingSelf: false,
  claimInFlight: false,
  penaltyUntil: 0,
  lastClaimResult: 0,
  lastWinnerSignature: '',
  lastBall: null,
};

const profile = {
  name: localStorage.getItem('tombala.name') || '',
  avatar: localStorage.getItem('tombala.avatar') || AVATARS[0],
  color: localStorage.getItem('tombala.color') || COLORS[0],
};

let firebaseConfig = null;
try {
  const configModule = await import('../firebase-config.js');
  if (configModule.firebaseConfig?.apiKey && !String(configModule.firebaseConfig.apiKey).includes('BURAYA')) {
    firebaseConfig = configModule.firebaseConfig;
  }
} catch {
  firebaseConfig = null;
}

let toastTimer;
function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message || 'Beklenmeyen bir hata oluştu.';
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function friendlyError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code.includes('permission-denied') || message.toLowerCase().includes('permission_denied')) {
    return 'Firebase bu işlemi reddetti. Realtime Database kurallarını kontrol et.';
  }
  if (code.includes('unauthorized-domain')) return 'Bu alan adı Firebase Authentication izin listesinde değil.';
  if (code.includes('network-request-failed')) return 'Bağlantı kurulamadı. İnternetini kontrol et.';
  if (code.includes('operation-not-allowed')) return 'Firebase Anonymous Authentication etkin değil.';
  return message || 'Beklenmeyen bir hata oluştu.';
}

function setBusy(active) {
  $('#busy').hidden = !active;
  document.body.setAttribute('aria-busy', String(active));
}

async function perform(action, { busy = false, errorToast = true } = {}) {
  if (busy) setBusy(true);
  try {
    return await action();
  } catch (error) {
    console.error(error);
    if (errorToast) showToast(friendlyError(error), true);
    throw error;
  } finally {
    if (busy) setBusy(false);
  }
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection', event.reason);
  showToast(friendlyError(event.reason), true);
  event.preventDefault();
});

function showScreen(screenId) {
  $$('.screen').forEach((screen) => screen.classList.toggle('is-active', screen.id === screenId));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function saveProfile() {
  const name = $('#player-name').value.trim().slice(0, 16);
  if (!name) throw new Error('Oyuncu adını yazmalısın.');
  profile.name = name;
  localStorage.setItem('tombala.name', profile.name);
  localStorage.setItem('tombala.avatar', profile.avatar);
  localStorage.setItem('tombala.color', profile.color);
  return { ...profile };
}

function buildProfileChoices() {
  const avatarRoot = $('#avatar-choices');
  const colorRoot = $('#color-choices');
  avatarRoot.replaceChildren();
  colorRoot.replaceChildren();

  AVATARS.forEach((avatar) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `choice${profile.avatar === avatar ? ' is-selected' : ''}`;
    button.textContent = avatar;
    button.setAttribute('aria-label', `${avatar} karakterini seç`);
    button.setAttribute('aria-pressed', String(profile.avatar === avatar));
    button.addEventListener('click', () => { profile.avatar = avatar; buildProfileChoices(); });
    avatarRoot.append(button);
  });

  COLORS.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `choice choice--color${profile.color === color ? ' is-selected' : ''}`;
    button.style.setProperty('--choice-color', color);
    button.setAttribute('aria-label', `${color} rengini seç`);
    button.setAttribute('aria-pressed', String(profile.color === color));
    button.addEventListener('click', () => { profile.color = color; buildProfileChoices(); });
    colorRoot.append(button);
  });
}

async function selectService(kind) {
  if (state.serviceKind === kind && state.service) return state.service;
  if (state.unsubscribe) state.unsubscribe();
  if (kind === 'firebase') {
    if (!firebaseConfig) throw new Error('Önce firebase-config.js dosyasını yeni projenle doldur.');
    state.service = await import('./services/firebase-room.js');
    state.uid = await state.service.connect(firebaseConfig);
  } else {
    state.service = await import('./services/local-room.js');
    state.uid = await state.service.connect();
  }
  state.serviceKind = kind;
  return state.service;
}

function resetClientRound() {
  clearTimeout(state.drawTimer);
  state.drawTimer = null;
  state.scheduledRevision = null;
  state.drawing = false;
  state.resolvingClaims = false;
  state.claimInFlight = false;
  state.penaltyUntil = 0;
  state.lastClaimResult = 0;
  state.lastWinnerSignature = '';
  state.lastBall = null;
}

async function enterRoom(code) {
  state.code = code;
  localStorage.setItem('tombala.activeRoom', state.serviceKind === 'firebase' ? code : '');
  if (state.unsubscribe) state.unsubscribe();
  state.unsubscribe = state.service.subscribe(code, receiveRoom, (error) => {
    showToast(friendlyError(error), true);
    void leaveCurrentRoom({ skipRemote: true });
  });
  $('#room-code').textContent = state.serviceKind === 'local' ? 'YEREL' : code;
  showScreen('lobby-screen');
}

async function createOnlineRoom(kind) {
  const playerProfile = saveProfile();
  await selectService(kind);
  const ticket = createTicket();
  const code = await state.service.createRoom(playerProfile, DEFAULT_SETTINGS, ticket);
  await enterRoom(code);
}

$('#create-room').addEventListener('click', () => {
  void perform(() => createOnlineRoom('firebase'), { busy: true }).catch(() => {});
});

$('#local-game').addEventListener('click', () => {
  void perform(() => createOnlineRoom('local'), { busy: true }).catch(() => {});
});

$('#open-join').addEventListener('click', () => {
  try { saveProfile(); showScreen('join-screen'); $('#room-code-input').focus(); }
  catch (error) { showToast(friendlyError(error), true); }
});

$$('[data-screen]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.screen)));

$('#room-code-input').addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 5);
});

$('#join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void perform(async () => {
    const code = $('#room-code-input').value;
    if (!/^\d{5}$/.test(code)) throw new Error('5 haneli oda kodunu gir.');
    const playerProfile = saveProfile();
    await selectService('firebase');
    await state.service.joinRoom(code, playerProfile, createTicket());
    await enterRoom(code);
  }, { busy: true }).catch(() => {});
});

async function leaveCurrentRoom({ skipRemote = false } = {}) {
  clearTimeout(state.drawTimer);
  if (state.unsubscribe) state.unsubscribe();
  const room = state.room;
  const code = state.code;
  const service = state.service;
  state.unsubscribe = null;
  localStorage.removeItem('tombala.activeRoom');
  if (!skipRemote && service && code && room) {
    const deleteRoom = room.meta.hostId === state.uid && room.meta.status !== 'playing';
    await service.leaveRoom(code, { deleteRoom });
  }
  state.code = null;
  state.room = null;
  state.previousRoom = null;
  resetClientRound();
  showScreen('home-screen');
}

$('#leave-room').addEventListener('click', () => {
  void perform(() => leaveCurrentRoom(), { busy: true }).catch(() => {});
});
$('#result-home').addEventListener('click', () => {
  void perform(() => leaveCurrentRoom(), { busy: true }).catch(() => {});
});

$('#room-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(state.code); showToast('Oda kodu kopyalandı.'); }
  catch { showToast('Kod kopyalanamadı.', true); }
});

$('#share-room').addEventListener('click', async () => {
  const text = `Tombala odam: ${state.code}\n${location.href.split('#')[0]}`;
  try {
    if (navigator.share) await navigator.share({ title: 'Tombala', text });
    else { await navigator.clipboard.writeText(text); showToast('Davet bağlantısı kopyalandı.'); }
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Davet paylaşılamadı.', true);
  }
});

function currentPlayer() { return state.room?.players?.[state.uid] || null; }
function isHost() { return state.room?.meta?.hostId === state.uid; }
function connectedPlayers() { return Object.entries(state.room?.players || {}).filter(([, player]) => player.connected); }

function safeColor(color) {
  return /^#[\da-f]{6}$/i.test(String(color)) ? color : COLORS[0];
}

function renderTicket(root, ticket, { marked = [], drawn = [], completedRows = [], interactive = false } = {}) {
  root.replaceChildren();
  if (!ticket) {
    const message = document.createElement('p');
    message.className = 'notice is-error';
    message.textContent = 'Kart yüklenemedi.';
    root.append(message);
    return;
  }
  const markedSet = new Set(marked);
  const drawnSet = new Set(drawn);
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const number = ticket[row * COLUMNS + column];
      const cell = document.createElement(number && interactive ? 'button' : 'div');
      cell.className = `ticket-cell${number ? '' : ' is-blank'}`;
      if (number) {
        cell.textContent = number;
        cell.dataset.number = String(number);
        cell.dataset.row = String(row);
        if (drawnSet.has(number) && !markedSet.has(number)) cell.classList.add('is-hot');
        if (markedSet.has(number)) {
          cell.classList.add('is-marked');
          cell.style.setProperty('--stamp-angle', `${(number % 11) - 5}deg`);
        }
        if (completedRows[row]) cell.classList.add('is-complete');
        if (interactive) {
          cell.type = 'button';
          cell.setAttribute('aria-label', `${number}${markedSet.has(number) ? ', işaretli' : ''}`);
        }
      }
      root.append(cell);
    }
  }
}

function renderLobby() {
  const room = state.room;
  const players = Object.entries(room.players).sort((left, right) => Number(left[1].joinedAt) - Number(right[1].joinedAt));
  $('#player-count').textContent = `${players.filter(([, player]) => player.connected).length}/${state.service.MAX_PLAYERS || 6}`;
  const list = $('#lobby-players');
  list.replaceChildren();

  for (const [playerId, player] of players) {
    const item = document.createElement('li');
    item.className = `player${player.connected ? '' : ' is-offline'}`;
    const avatar = document.createElement('span');
    avatar.className = 'player__avatar';
    avatar.style.background = safeColor(player.color);
    avatar.textContent = String(player.avatar || '🙂').slice(0, 8);
    const name = document.createElement('span');
    name.className = 'player__name';
    name.textContent = `${String(player.name || 'Oyuncu').slice(0, 16)}${playerId === room.meta.hostId ? '  👑' : ''}`;
    const playerState = document.createElement('span');
    playerState.className = `player__state${player.ready ? ' is-ready' : ''}`;
    playerState.textContent = !player.connected ? 'çevrimdışı' : player.ready ? 'hazır' : 'bekliyor';
    item.append(avatar, name, playerState);
    list.append(item);
  }

  const me = currentPlayer();
  renderTicket($('#lobby-ticket'), me?.ticket);
  $('#ticket-status').textContent = me?.ticket ? 'Hazır' : 'Hata';
  $('#toggle-ready').textContent = me?.ready ? 'Hazır değilim' : 'Hazırım';
  $('#toggle-ready').classList.toggle('button--primary', !me?.ready);

  const host = isHost();
  $('#host-settings').hidden = !host;
  $('#start-game').hidden = !host;
  const connected = connectedPlayers().map(([, player]) => player);
  $('#start-game').disabled = connected.length < 2 || connected.some((player) => !player.ready || !player.ticket);
  renderSettings();
}

function renderSettings() {
  const settings = { ...DEFAULT_SETTINGS, ...(state.room?.meta?.settings || {}) };
  $$('[data-setting]').forEach((group) => {
    const key = group.dataset.setting;
    $$('button', group).forEach((button) => {
      button.classList.toggle('is-selected', String(settings[key]) === button.dataset.value);
      button.disabled = !isHost();
    });
  });
  $('[data-interval-setting]').hidden = settings.drawMode !== 'auto';
}

$$('[data-setting]').forEach((group) => group.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || !isHost()) return;
  void perform(async () => {
    const key = group.dataset.setting;
    let value = button.dataset.value;
    if (key === 'drawInterval') value = Number(value);
    if (key === 'autoMark') value = value === 'true';
    const settings = { ...DEFAULT_SETTINGS, ...(state.room.meta.settings || {}), [key]: value };
    await state.service.updateSettings(state.code, settings);
  }).catch(() => {});
}));

async function replaceTicket(ticket) {
  await state.service.updateMe(state.code, { ticket, ready: false, marked: [] });
  showToast('Yeni kartın hazır.');
}

$('#random-ticket').addEventListener('click', () => {
  void perform(() => replaceTicket(createTicket()), { busy: true }).catch(() => {});
});

$('#toggle-ready').addEventListener('click', () => {
  void perform(async () => {
    const player = currentPlayer();
    if (!player?.ticket) throw new Error('Önce geçerli bir kart seç.');
    await state.service.updateMe(state.code, { ready: !player.ready });
  }).catch(() => {});
});

$('#start-game').addEventListener('click', () => {
  void perform(async () => {
    if (!isHost()) throw new Error('Oyunu yalnızca host başlatabilir.');
    const players = connectedPlayers().map(([, player]) => player);
    if (players.length < 2) throw new Error('En az iki oyuncu gerekli.');
    if (players.some((player) => !player.ready || !player.ticket)) throw new Error('Tüm oyuncular hazır olmalı.');
    resetClientRound();
    await state.service.updateStatus(state.code, 'playing');
  }, { busy: true }).catch(() => {});
});

function openTicketBuilder() {
  state.selectedNumbers = new Set(ticketNumbers(currentPlayer()?.ticket));
  renderNumberPicker();
  $('#ticket-dialog').showModal();
}

$('#custom-ticket').addEventListener('click', openTicketBuilder);
$('#clear-ticket').addEventListener('click', () => { state.selectedNumbers.clear(); renderNumberPicker(); });

function renderNumberPicker() {
  const inspection = inspectSelection([...state.selectedNumbers]);
  const root = $('#number-picker');
  root.replaceChildren();
  for (let column = 0; column < COLUMNS; column += 1) {
    const container = document.createElement('div');
    container.className = `number-column${inspection.counts[column] > 3 ? ' is-invalid' : ''}`;
    const [minimum, maximum] = rangeForColumn(column);
    for (let number = minimum; number <= maximum; number += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `number-button${state.selectedNumbers.has(number) ? ' is-selected' : ''}`;
      button.textContent = number;
      button.addEventListener('click', () => {
        if (state.selectedNumbers.has(number)) state.selectedNumbers.delete(number);
        else if (state.selectedNumbers.size < 15) state.selectedNumbers.add(number);
        else showToast('Kartta en fazla 15 sayı olabilir.', true);
        renderNumberPicker();
      });
      container.append(button);
    }
    root.append(container);
  }
  const validation = $('#ticket-validation');
  validation.textContent = inspection.messages[0] || (inspection.valid ? 'Kartın hazır.' : `${inspection.remaining} sayı daha seç.`);
  validation.classList.toggle('is-error', inspection.messages.length > 0);
  $('#save-ticket').disabled = !inspection.valid;
}

$('#save-ticket').addEventListener('click', () => {
  void perform(async () => {
    const ticket = ticketFromSelection([...state.selectedNumbers]);
    await replaceTicket(ticket);
    $('#ticket-dialog').close();
  }, { busy: true }).catch(() => {});
});

$('#game-ticket').addEventListener('click', (event) => {
  const cell = event.target.closest('[data-number]');
  if (!cell || state.room?.meta?.settings?.autoMark) return;
  const number = Number(cell.dataset.number);
  void perform(async () => {
    const player = currentPlayer();
    if (!state.room.game.drawn.includes(number)) throw new Error('Bu sayı henüz çekilmedi.');
    if (player.marked.includes(number)) return;
    await state.service.updateMe(state.code, { marked: [...player.marked, number] });
    playTone(620, .055);
  }).catch(() => {});
});

function renderGame() {
  const room = state.room;
  const player = currentPlayer();
  if (!player?.ticket) return;
  const evaluation = evaluateTicket(player.ticket, player.marked, room.game.drawn);
  $('#drawn-count').textContent = room.game.drawn.length;
  $('#remaining-count').textContent = 90 - room.game.drawn.length;

  const lastBall = $('#last-ball');
  lastBall.textContent = room.game.lastNumber || '—';
  if (room.game.lastNumber && state.lastBall !== room.game.lastNumber) {
    state.lastBall = room.game.lastNumber;
    lastBall.classList.remove('is-new');
    void lastBall.offsetWidth;
    lastBall.classList.add('is-new');
    playTone(320 + room.game.lastNumber * 2, .09);
  }

  const recentRoot = $('#recent-balls');
  recentRoot.replaceChildren();
  room.game.drawn.slice(-6, -1).reverse().forEach((number) => {
    const ball = document.createElement('span');
    ball.className = 'recent-ball';
    ball.textContent = number;
    recentRoot.append(ball);
  });

  const progressRoot = $('#progress-strip');
  progressRoot.replaceChildren();
  Object.entries(room.players).filter(([, item]) => item.ticket && item.connected).forEach(([playerId, item]) => {
    const progress = evaluateTicket(item.ticket, item.marked, room.game.drawn);
    const chip = document.createElement('div');
    chip.className = 'progress-chip';
    const top = document.createElement('div');
    top.className = 'progress-chip__top';
    const name = document.createElement('span');
    name.textContent = playerId === state.uid ? 'Sen' : String(item.name || 'Oyuncu').slice(0, 12);
    const score = document.createElement('span');
    score.textContent = `${progress.markedCount}/15`;
    top.append(name, score);
    const bar = document.createElement('span');
    bar.className = 'progress-chip__bar';
    const fill = document.createElement('i');
    fill.style.width = `${(progress.markedCount / 15) * 100}%`;
    bar.append(fill);
    chip.append(top, bar);
    progressRoot.append(chip);
  });

  renderTicket($('#game-ticket'), player.ticket, {
    marked: player.marked, drawn: room.game.drawn, completedRows: evaluation.rows,
    interactive: !room.meta.settings?.autoMark,
  });

  const pending = Boolean(room.claims?.[state.uid]) || state.claimInFlight;
  const penalty = state.penaltyUntil > Date.now();
  const eligibility = claimEligibility(player.ticket, player.marked, room.game.drawn, room.winners);
  $$('[data-claim]').forEach((button) => {
    const enabled = eligibility[button.dataset.claim] && !pending && !penalty;
    button.disabled = !enabled;
    button.classList.toggle('is-live', enabled);
  });

  const manualDraw = isHost() && room.meta.settings?.drawMode === 'manual';
  $('#draw-number').hidden = !manualDraw;
  $('#draw-number').disabled = state.drawing || room.game.drawn.length >= 90;
  $('#game-hint').textContent = penalty
    ? `Yanlış ilan: ${Math.ceil((state.penaltyUntil - Date.now()) / 1000)} saniye bekle.`
    : room.meta.settings?.autoMark
      ? 'Çıkan sayılar kartında otomatik işaretlenir.'
      : 'Çıkan sayıyı kartında bulup dokun.';
}

$$('[data-claim]').forEach((button) => button.addEventListener('click', () => {
  if (state.claimInFlight) return;
  state.claimInFlight = true;
  button.disabled = true;
  void perform(async () => {
    await state.service.submitClaim(state.code, button.dataset.claim, state.room.game.drawn.length);
    showToast(`${CLAIM_LABELS[button.dataset.claim]} ilan edildi.`);
  }).catch(() => { state.claimInFlight = false; });
}));

$('#draw-number').addEventListener('click', () => { void drawOneNumber(); });

async function syncAutomaticMarks() {
  if (state.syncingMarks || !state.room?.meta?.settings?.autoMark) return;
  const player = currentPlayer();
  if (!player?.ticket) return;
  const missing = missingMarks(player.ticket, player.marked, state.room.game.drawn);
  if (!missing.length) return;
  state.syncingMarks = true;
  try { await state.service.updateMe(state.code, { marked: [...player.marked, ...missing] }); }
  finally { state.syncingMarks = false; }
}

async function drawOneNumber() {
  if (state.drawing || !isHost() || state.room?.meta?.status !== 'playing') return;
  const room = state.room;
  const number = nextNumber(room.game.drawn);
  if (number == null) {
    await state.service.updateStatus(state.code, 'finished');
    return;
  }
  state.drawing = true;
  try {
    await state.service.pushDraw(state.code, room.game.revision, [...room.game.drawn, number], number);
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    state.drawing = false;
  }
}

function scheduleDraw() {
  const room = state.room;
  if (!room || !isHost() || room.meta.status !== 'playing' || room.meta.settings?.drawMode !== 'auto' || state.resolvingClaims) {
    clearTimeout(state.drawTimer);
    state.drawTimer = null;
    state.scheduledRevision = null;
    return;
  }
  if (state.drawTimer && state.scheduledRevision === room.game.revision) return;
  clearTimeout(state.drawTimer);
  const interval = Math.max(2500, Number(room.meta.settings?.drawInterval) || 6000);
  state.scheduledRevision = room.game.revision;
  state.drawTimer = setTimeout(() => {
    state.drawTimer = null;
    state.scheduledRevision = null;
    void drawOneNumber();
  }, interval);
}

async function resolvePendingClaims() {
  if (state.resolvingClaims || !isHost() || state.room?.meta?.status !== 'playing') return;
  const pending = Object.entries(state.room.claims || {}).sort((left, right) => Number(left[1].createdAt) - Number(right[1].createdAt));
  if (!pending.length) return;
  state.resolvingClaims = true;
  clearTimeout(state.drawTimer);
  state.drawTimer = null;
  state.scheduledRevision = null;
  try {
    for (const [playerId, claim] of pending) {
      const room = state.room;
      if (!room?.claims?.[playerId]) continue;
      const result = validateClaim({
        type: claim.type, uid: playerId, player: room.players[playerId],
        drawn: room.game.drawn, winners: room.winners,
      });
      const winners = normalizeWinners(room.winners);
      if (result.valid) winners[result.type][playerId] = true;
      await state.service.resolveClaim(state.code, playerId, { ...result, type: claim.type }, winners);
      if (result.valid && result.type === 'tombala') {
        await state.service.updateStatus(state.code, 'finished');
        break;
      }
    }
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    state.resolvingClaims = false;
    scheduleDraw();
  }
}

function handleOwnClaimResult() {
  const result = state.room?.claimResults?.[state.uid];
  if (!result || Number(result.resolvedAt) <= state.lastClaimResult) return;
  state.lastClaimResult = Number(result.resolvedAt);
  state.claimInFlight = false;
  if (result.valid) showToast(`${CLAIM_LABELS[result.type]} kabul edildi!`);
  else {
    state.penaltyUntil = Date.now() + FALSE_CLAIM_PENALTY_MS;
    showToast(result.reason || 'İlan geçersiz.', true);
  }
  void state.service.clearClaimResult(state.code).catch((error) => console.error(error));
}

function announceWinners() {
  const signature = JSON.stringify(state.room?.winners || {});
  if (!state.lastWinnerSignature) { state.lastWinnerSignature = signature; return; }
  if (signature === state.lastWinnerSignature) return;
  state.lastWinnerSignature = signature;
  playTone(740, .15);
}

function renderResults() {
  const winners = state.room.winners;
  const root = $('#result-list');
  root.replaceChildren();
  CLAIM_TYPES.forEach((type) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    const label = document.createElement('strong');
    label.textContent = CLAIM_LABELS[type];
    const names = winnerIds(winners, type).map((playerId) => (
      playerId === state.uid ? 'Sen' : String(state.room.players[playerId]?.name || 'Ayrılan oyuncu').slice(0, 16)
    ));
    const value = document.createElement('span');
    value.textContent = names.length ? names.join(', ') : 'Kazanan yok';
    row.append(label, value);
    root.append(row);
  });
  const won = winnerIds(winners, 'tombala').includes(state.uid);
  $('#result-title').textContent = won ? 'Tombala senin!' : 'Sonuçlar';
  $('#play-again').hidden = !isHost();
}

$('#play-again').addEventListener('click', () => {
  void perform(() => state.service.resetRoom(state.code), { busy: true }).catch(() => {});
});

async function resetSelfForNewRound() {
  if (state.resettingSelf) return;
  state.resettingSelf = true;
  try { await state.service.updateMe(state.code, { ticket: createTicket(), marked: [], ready: false }); }
  catch (error) { showToast(friendlyError(error), true); }
  finally { state.resettingSelf = false; }
}

async function receiveRoom(room) {
  if (!room) {
    showToast('Oda kapandı veya süresi doldu.', true);
    await leaveCurrentRoom({ skipRemote: true });
    return;
  }
  const previous = state.room;
  state.previousRoom = previous;
  state.room = room;

  if (previous && previous.meta.status !== 'lobby' && room.meta.status === 'lobby') {
    resetClientRound();
    void resetSelfForNewRound();
  }

  if (state.serviceKind === 'firebase' && !state.claimingHost && room.meta.status !== 'finished') {
    const host = room.players[room.meta.hostId];
    if (!host?.connected) {
      state.claimingHost = true;
      try { await state.service.maybeClaimHost(state.code, room); }
      catch (error) { console.error('Host claim failed', error); }
      finally { state.claimingHost = false; }
    }
  }

  handleOwnClaimResult();
  announceWinners();

  if (room.meta.status === 'lobby') {
    showScreen('lobby-screen');
    renderLobby();
  } else if (room.meta.status === 'playing') {
    showScreen('game-screen');
    renderGame();
    void syncAutomaticMarks();
    void resolvePendingClaims();
    scheduleDraw();
  } else {
    clearTimeout(state.drawTimer);
    showScreen('result-screen');
    renderResults();
  }
}

let audioContext = null;
let soundEnabled = localStorage.getItem('tombala.sound') !== '0';
function playTone(frequency, duration) {
  if (!soundEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ||= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gain.gain.setValueAtTime(.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.08, audioContext.currentTime + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + .02);
}

$('#sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('tombala.sound', soundEnabled ? '1' : '0');
  $('#sound-toggle').textContent = soundEnabled ? '♪' : '×';
  if (soundEnabled) playTone(680, .08);
});

setInterval(() => {
  if (state.room?.meta?.status === 'playing' && state.penaltyUntil > Date.now()) renderGame();
}, 500);

async function reconnectSavedRoom() {
  const code = localStorage.getItem('tombala.activeRoom');
  if (!code || !firebaseConfig || !/^\d{5}$/.test(code)) return;
  try {
    await selectService('firebase');
    await state.service.joinRoom(code, { ...profile, name: profile.name || 'Oyuncu' }, createTicket());
    await enterRoom(code);
  } catch (error) {
    console.warn('Saved room could not be restored', error);
    localStorage.removeItem('tombala.activeRoom');
  }
}

function boot() {
  $('#player-name').value = profile.name;
  buildProfileChoices();
  $('#sound-toggle').textContent = soundEnabled ? '♪' : '×';
  if (!firebaseConfig) {
    const notice = $('#firebase-notice');
    notice.hidden = false;
    notice.textContent = 'Çevrimiçi oyun için yeni Firebase bilgilerini firebase-config.js dosyasına ekle. Yerel deneme modu hazır.';
    $('#create-room').disabled = true;
    $('#open-join').disabled = true;
  }
  void reconnectSavedRoom();
}

boot();
