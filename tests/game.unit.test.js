import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicket, rowNumbers, ticketNumbers } from '../js/core/ticket.js';
import {
  claimEligibility, emptyWinners, encodeNumberList, evaluateTicket,
  missingMarks, nextNumber, parseNumberList, validateClaim,
} from '../js/core/game.js';

test('yalnızca çekilmiş ve işaretlenmiş sayılar sayılıyor', () => {
  const ticket = createTicket();
  const numbers = ticketNumbers(ticket);
  assert.equal(evaluateTicket(ticket, numbers, []).markedCount, 0);
  const completed = evaluateTicket(ticket, numbers, numbers);
  assert.equal(completed.full, true);
  assert.equal(completed.completedRows, 3);
});

test('eksik otomatik işaretler bulunuyor', () => {
  const ticket = createTicket();
  const numbers = ticketNumbers(ticket);
  assert.deepEqual(missingMarks(ticket, [numbers[0]], numbers).sort((a, b) => a - b), numbers.slice(1).sort((a, b) => a - b));
});

test('çinko sırası zorlanıyor', () => {
  const ticket = createTicket();
  const firstRow = rowNumbers(ticket, 0);
  const secondRow = rowNumbers(ticket, 1);
  const winners = emptyWinners();
  const first = claimEligibility(ticket, firstRow, firstRow, winners);
  assert.equal(first.cinko1, true);
  assert.equal(first.cinko2, false);

  const player = { ticket, marked: [...firstRow, ...secondRow] };
  const invalidSecond = validateClaim({ type: 'cinko2', uid: 'p1', player, drawn: player.marked, winners });
  assert.equal(invalidSecond.valid, false);
  winners.cinko1.p1 = true;
  const validSecond = validateClaim({ type: 'cinko2', uid: 'p1', player, drawn: player.marked, winners });
  assert.equal(validSecond.valid, true);
});

test('tombala 15 sayı tamamlanmadan kabul edilmiyor', () => {
  const ticket = createTicket();
  const numbers = ticketNumbers(ticket);
  const player = { ticket, marked: numbers.slice(0, -1) };
  const result = validateClaim({ type: 'tombala', uid: 'p1', player, drawn: numbers, winners: emptyWinners() });
  assert.equal(result.valid, false);
});

test('çekiliş aynı sayıyı tekrar vermiyor', () => {
  const drawn = [];
  while (drawn.length < 90) drawn.push(nextNumber(drawn));
  assert.equal(new Set(drawn).size, 90);
  assert.equal(nextNumber(drawn), null);
});

test('sayı listesi kodlaması güvenli normalize ediliyor', () => {
  assert.equal(encodeNumberList([1, 1, 2, 91, 0]), '1,2');
  assert.deepEqual(parseNumberList('1,2,2,90,x,91'), [1, 2, 90]);
});
