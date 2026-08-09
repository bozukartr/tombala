// game.js — oyun kuralları. Saf mantık, DOM ve ağ bilmez.
import { ROWS, COLS, shuffle, rowNumbers, cardNumbers } from './card.js';

export const CLAIM_TYPES = ['cinko1', 'cinko2', 'tombala'];
export const CLAIM_LABEL = { cinko1: '1. Çinko', cinko2: '2. Çinko', tombala: 'Tombala' };

export const createBag = () => shuffle(Array.from({ length: 90 }, (_, i) => i + 1));

/**
 * Bir kartın durumunu değerlendirir.
 * Geçerli sayılar = oyuncunun işaretledikleri ∩ torbadan çıkanlar.
 * Otomatik işaretleme açıkken marked zaten drawn'ın alt kümesidir.
 */
export function evaluate(grid, marked, drawn) {
  const drawnSet = new Set(drawn);
  const ok = new Set((marked || []).filter((n) => drawnSet.has(n)));
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(rowNumbers(grid, r).every((n) => ok.has(n)));
  }
  const all = cardNumbers(grid);
  return {
    rows,
    completedRows: rows.filter(Boolean).length,
    markedCount: all.filter((n) => ok.has(n)).length,
    full: all.every((n) => ok.has(n)),
  };
}

/** Kartta olup henüz işaretlenmemiş, çekilmiş sayılar. */
export function missedNumbers(grid, marked, drawn) {
  const m = new Set(marked || []);
  const d = new Set(drawn);
  return cardNumbers(grid).filter((n) => d.has(n) && !m.has(n));
}

/**
 * Bir ilanın geçerliliği. winners = { cinko1: [], cinko2: [], tombala: [] }
 * Otorite (host) tarafından çağrılır; istemcinin "kazandım" iddiasına güvenilmez.
 */
export function validateClaim({ grid, marked, drawn, type, uid, winners }) {
  if (!CLAIM_TYPES.includes(type)) return { valid: false, reason: 'Bilinmeyen ilan' };
  const w = { cinko1: [], cinko2: [], tombala: [], ...(winners || {}) };
  if (w[type].includes(uid)) return { valid: false, reason: 'Bu ilanı zaten yaptın' };
  if (w[type].length > 0) return { valid: false, reason: CLAIM_LABEL[type] + ' alındı' };

  const st = evaluate(grid, marked, drawn);
  if (type === 'cinko1') {
    if (st.completedRows < 1) return { valid: false, reason: 'Tamamlanmış satır yok' };
  } else if (type === 'cinko2') {
    if (w.cinko1.length === 0) return { valid: false, reason: 'Önce 1. çinko ilan edilmeli' };
    if (st.completedRows < 2) return { valid: false, reason: 'İki satır tamamlanmadı' };
  } else if (type === 'tombala') {
    if (!st.full) return { valid: false, reason: 'Kart tamamlanmadı' };
  }
  return { valid: true };
}

/**
 * Bekleyen ilanları sırayla işler. Aynı çekilişte gelen geçerli ilanlar
 * paylaşımlı sayılır (aynı atDraw değerine sahip olanların hepsi kazanır).
 */
export function resolveClaims({ claims, players, drawn, winners }) {
  const w = {
    cinko1: [...(winners?.cinko1 || [])],
    cinko2: [...(winners?.cinko2 || [])],
    tombala: [...(winners?.tombala || [])],
  };
  const results = {};
  const pending = Object.entries(claims || {})
    .filter(([, c]) => c && c.valid === undefined)
    .sort((a, b) => (a[1].atDraw ?? 0) - (b[1].atDraw ?? 0) || (a[1].at ?? 0) - (b[1].at ?? 0));

  for (const [uid, claim] of pending) {
    if (results[uid]) continue; // aynı turda paylaşımlı olarak zaten karara bağlandı
    const p = players?.[uid];
    if (!p?.card) {
      results[uid] = { valid: false, reason: 'Kart bulunamadı' };
      continue;
    }
    const r = validateClaim({
      grid: p.card,
      marked: p.marked || [],
      drawn,
      type: claim.type,
      uid,
      winners: w,
    });
    results[uid] = r;

    if (r.valid) {
      w[claim.type].push(uid);
      // Aynı çekilişte gelen diğer geçerli ilanlar da kabul edilsin.
      for (const [uid2, c2] of pending) {
        if (uid2 === uid || results[uid2] || c2.type !== claim.type) continue;
        if ((c2.atDraw ?? -1) !== (claim.atDraw ?? -2)) continue;
        const p2 = players?.[uid2];
        if (!p2?.card) continue;
        const st = evaluate(p2.card, p2.marked || [], drawn);
        const need = claim.type === 'tombala' ? st.full : st.completedRows >= (claim.type === 'cinko2' ? 2 : 1);
        if (need) {
          results[uid2] = { valid: true };
          w[claim.type].push(uid2);
        }
      }
    }
  }
  return { results, winners: w, finished: w.tombala.length > 0 };
}

export const FALSE_CLAIM_PENALTY_MS = 10000;
