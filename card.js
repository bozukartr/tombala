// card.js — Türk tombalası kart motoru
// Kart: 3 satır x 9 sütun = 27 hücre. 15 sayı dolu, her satırda tam 5 sayı.
// Sütun aralıkları: 1-9, 10-19, ... 70-79, 80-90. Her sütunda 1-3 sayı.

export const ROWS = 3;
export const COLS = 9;
export const NUMBERS_PER_CARD = 15;
export const PER_ROW = 5;
export const MAX_NUMBER = 90;

export function colRange(c) {
  if (c === 0) return [1, 9];
  if (c === 8) return [80, 90];
  return [c * 10, c * 10 + 9];
}

export function colOf(n) {
  if (n <= 9) return 0;
  if (n >= 80) return 8;
  return Math.floor(n / 10);
}

const randInt = (n) => Math.floor(Math.random() * n);

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Her sütuna 1-3 sayı, toplam 15. */
function pickColumnCounts() {
  const counts = Array(COLS).fill(1);
  let extra = NUMBERS_PER_CARD - COLS;
  while (extra > 0) {
    const i = randInt(COLS);
    if (counts[i] < 3) {
      counts[i]++;
      extra--;
    }
  }
  return counts;
}

/**
 * Sütun adetlerini satırlara dağıtır: her satır tam 5 hücre.
 * Sütunlar adede göre azalan sırada işlenir, her seferinde kapasitesi
 * en yüksek satırlar seçilir (Gale-Ryser açgözlü yerleşim).
 */
function assignRows(counts) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const cap = Array(ROWS).fill(PER_ROW);
    const cells = Array(ROWS * COLS).fill(false);
    const order = counts
      .map((c, i) => ({ c, i, k: Math.random() }))
      .sort((a, b) => b.c - a.c || a.k - b.k);

    let ok = true;
    for (const { c, i } of order) {
      const rows = [0, 1, 2]
        .map((r) => ({ r, cap: cap[r], k: Math.random() }))
        .sort((a, b) => b.cap - a.cap || a.k - b.k)
        .slice(0, c);
      for (const { r } of rows) {
        if (cap[r] <= 0) { ok = false; break; }
        cells[r * COLS + i] = true;
        cap[r]--;
      }
      if (!ok) break;
    }
    if (ok && cap.every((x) => x === 0)) return cells;
  }
  throw new Error('Satır dağılımı kurulamadı');
}

/** Rastgele geçerli bir kart üretir. Dönen dizi: 27 elemanlı, boşlar null. */
export function generateCard() {
  const counts = pickColumnCounts();
  const cells = assignRows(counts);
  const grid = Array(ROWS * COLS).fill(null);

  for (let c = 0; c < COLS; c++) {
    const [lo, hi] = colRange(c);
    const pool = [];
    for (let n = lo; n <= hi; n++) pool.push(n);
    const picked = shuffle(pool).slice(0, counts[c]).sort((a, b) => a - b);
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      if (cells[r * COLS + c]) grid[r * COLS + c] = picked[k++];
    }
  }
  return grid;
}

/** Elle seçilmiş 15 sayıdan geçerli bir kart düzeni kurar. */
export function gridFromNumbers(numbers) {
  const nums = [...new Set(numbers)].sort((a, b) => a - b);
  if (nums.length !== NUMBERS_PER_CARD) throw new Error('15 sayı gerekli');

  const byCol = Array.from({ length: COLS }, () => []);
  for (const n of nums) {
    if (n < 1 || n > MAX_NUMBER) throw new Error('Geçersiz sayı: ' + n);
    byCol[colOf(n)].push(n);
  }
  const counts = byCol.map((a) => a.length);
  if (counts.some((c) => c < 1 || c > 3)) throw new Error('Her sütunda 1-3 sayı olmalı');

  const cells = assignRows(counts);
  const grid = Array(ROWS * COLS).fill(null);
  for (let c = 0; c < COLS; c++) {
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      if (cells[r * COLS + c]) grid[r * COLS + c] = byCol[c][k++];
    }
  }
  return grid;
}

/** Elle kart kurarken anlık geri bildirim. */
export function inspectSelection(numbers) {
  const nums = [...new Set(numbers)];
  const counts = Array(COLS).fill(0);
  for (const n of nums) counts[colOf(n)]++;
  const problems = [];
  if (nums.length > NUMBERS_PER_CARD) problems.push('15 sayıdan fazla seçildi');
  counts.forEach((c, i) => {
    if (c > 3) problems.push(`${i + 1}. sütunda 3'ten fazla sayı var`);
  });
  const emptyCols = counts.filter((c) => c === 0).length;
  if (nums.length === NUMBERS_PER_CARD && emptyCols > 0) {
    problems.push('Boş sütun bırakılamaz');
  }
  return {
    counts,
    remaining: NUMBERS_PER_CARD - nums.length,
    valid: nums.length === NUMBERS_PER_CARD && problems.length === 0,
    problems,
  };
}

export function validateCard(grid) {
  const err = [];
  if (!Array.isArray(grid) || grid.length !== ROWS * COLS) return ['Hücre sayısı 27 değil'];

  const nums = grid.filter((x) => x !== null);
  if (nums.length !== NUMBERS_PER_CARD) err.push('Kartta 15 sayı yok');
  if (new Set(nums).size !== nums.length) err.push('Tekrar eden sayı var');

  for (let r = 0; r < ROWS; r++) {
    let n = 0;
    for (let c = 0; c < COLS; c++) if (grid[r * COLS + c] !== null) n++;
    if (n !== PER_ROW) err.push(`${r + 1}. satırda ${n} sayı var`);
  }
  for (let c = 0; c < COLS; c++) {
    const [lo, hi] = colRange(c);
    const col = [];
    for (let r = 0; r < ROWS; r++) {
      const v = grid[r * COLS + c];
      if (v !== null) {
        if (v < lo || v > hi) err.push(`${v} sayısı ${c + 1}. sütunda olamaz`);
        col.push(v);
      }
    }
    if (col.length < 1) err.push(`${c + 1}. sütun boş`);
    if (col.length > 3) err.push(`${c + 1}. sütunda 3'ten fazla sayı var`);
    for (let i = 1; i < col.length; i++) {
      if (col[i] <= col[i - 1]) err.push(`${c + 1}. sütun artan sırada değil`);
    }
  }
  return err;
}

// Firebase RTDB null değerleri siler; ızgarayı düz metin olarak saklıyoruz.
export const encodeGrid = (grid) => grid.map((v) => v ?? 0).join(',');

export function decodeGrid(str) {
  if (Array.isArray(str)) return str;
  if (typeof str !== 'string') return null;
  const g = str.split(',').map((v) => (Number(v) || null));
  return g.length === ROWS * COLS ? g : null;
}

export const cardNumbers = (grid) => grid.filter((x) => x !== null).sort((a, b) => a - b);

export const rowNumbers = (grid, r) =>
  grid.slice(r * COLS, r * COLS + COLS).filter((x) => x !== null);
