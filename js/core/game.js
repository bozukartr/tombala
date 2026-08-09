import { rowNumbers, ticketNumbers } from './ticket.js';

export const CLAIM_TYPES = ['cinko1', 'cinko2', 'tombala'];
export const CLAIM_LABELS = { cinko1: '1. Çinko', cinko2: '2. Çinko', tombala: 'Tombala' };

export function emptyWinners() {
  return { cinko1: {}, cinko2: {}, tombala: {} };
}

export function normalizeWinners(value) {
  return {
    cinko1: { ...(value?.cinko1 || {}) },
    cinko2: { ...(value?.cinko2 || {}) },
    tombala: { ...(value?.tombala || {}) },
  };
}

export function winnerIds(winners, type) {
  return Object.keys(winners?.[type] || {}).filter((uid) => winners[type][uid] === true);
}

export function evaluateTicket(ticket, marked = [], drawn = []) {
  const drawnSet = new Set(drawn);
  const validMarks = new Set(marked.filter((number) => drawnSet.has(number)));
  const rows = [0, 1, 2].map((row) => rowNumbers(ticket, row).every((number) => validMarks.has(number)));
  const numbers = ticketNumbers(ticket);
  return {
    rows,
    completedRows: rows.filter(Boolean).length,
    markedCount: numbers.filter((number) => validMarks.has(number)).length,
    full: numbers.every((number) => validMarks.has(number)),
  };
}

export function missingMarks(ticket, marked = [], drawn = []) {
  const markedSet = new Set(marked);
  const drawnSet = new Set(drawn);
  return ticketNumbers(ticket).filter((number) => drawnSet.has(number) && !markedSet.has(number));
}

export function claimEligibility(ticket, marked, drawn, winners) {
  const state = evaluateTicket(ticket, marked, drawn);
  return {
    cinko1: state.completedRows >= 1 && winnerIds(winners, 'cinko1').length === 0,
    cinko2: state.completedRows >= 2 && winnerIds(winners, 'cinko1').length > 0 && winnerIds(winners, 'cinko2').length === 0,
    tombala: state.full && winnerIds(winners, 'tombala').length === 0,
  };
}

export function validateClaim({ type, uid, player, drawn, winners }) {
  if (!CLAIM_TYPES.includes(type)) return { valid: false, reason: 'Bilinmeyen ilan.' };
  if (!player?.ticket) return { valid: false, reason: 'Oyuncunun geçerli kartı yok.' };
  if (winnerIds(winners, type).length) return { valid: false, reason: `${CLAIM_LABELS[type]} daha önce alındı.` };

  const eligibility = claimEligibility(player.ticket, player.marked, drawn, winners);
  if (!eligibility[type]) {
    const reason = type === 'cinko1'
      ? 'Henüz tamamlanmış bir satırın yok.'
      : type === 'cinko2'
        ? 'İki satır tamamlanmadı veya önce 1. Çinko alınmalı.'
        : 'Kartındaki 15 sayının tamamı işaretlenmedi.';
    return { valid: false, reason };
  }
  return { valid: true, uid, type };
}

export function parseNumberList(value) {
  if (Array.isArray(value)) return value.map(Number).filter((number) => Number.isInteger(number) && number >= 1 && number <= 90);
  if (!value) return [];
  return [...new Set(String(value).split(',').map(Number).filter((number) => Number.isInteger(number) && number >= 1 && number <= 90))];
}

export function encodeNumberList(numbers) {
  return [...new Set(numbers)].filter((number) => Number.isInteger(number) && number >= 1 && number <= 90).join(',');
}

export function nextNumber(drawn, random = Math.random) {
  const used = new Set(drawn);
  const remaining = Array.from({ length: 90 }, (_, index) => index + 1).filter((number) => !used.has(number));
  return remaining.length ? remaining[Math.floor(random() * remaining.length)] : null;
}
