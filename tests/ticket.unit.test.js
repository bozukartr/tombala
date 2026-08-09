import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLUMNS, createTicket, decodeTicket, encodeTicket, inspectSelection,
  rangeForColumn, ticketFromSelection, ticketNumbers, validateTicket,
} from '../js/core/ticket.js';

test('50.000 rastgele kartın tamamı geçerli', () => {
  for (let index = 0; index < 50_000; index += 1) {
    assert.deepEqual(validateTicket(createTicket()), []);
  }
});

test('kodlama ve çözme kartı değiştirmiyor', () => {
  for (let index = 0; index < 1_000; index += 1) {
    const ticket = createTicket();
    assert.deepEqual(decodeTicket(encodeTicket(ticket)), ticket);
  }
});

test('elle seçilen sayılar geçerli karta dönüşüyor', () => {
  for (let index = 0; index < 2_000; index += 1) {
    const numbers = ticketNumbers(createTicket());
    const ticket = ticketFromSelection(numbers.reverse());
    assert.deepEqual(validateTicket(ticket), []);
    assert.deepEqual(ticketNumbers(ticket).sort((a, b) => a - b), numbers.sort((a, b) => a - b));
  }
});

test('tüm mümkün sütun adetleri yerleştirilebiliyor', () => {
  let patternCount = 0;
  function visit(counts, column, total) {
    if (column === COLUMNS) {
      if (total !== 15) return;
      patternCount += 1;
      const selection = [];
      counts.forEach((count, columnIndex) => {
        const [minimum] = rangeForColumn(columnIndex);
        for (let offset = 0; offset < count; offset += 1) selection.push(minimum + offset);
      });
      assert.deepEqual(validateTicket(ticketFromSelection(selection)), []);
      return;
    }
    for (let count = 1; count <= 3; count += 1) {
      if (total + count <= 15) visit([...counts, count], column + 1, total + count);
    }
  }
  visit([], 0, 0);
  assert.equal(patternCount, 1_554);
});

test('eksik sütun ve dördüncü sayı reddediliyor', () => {
  const selection = [1, 2, 3, 4, 10, 20, 30, 40, 50, 60, 70, 80, 81, 82, 83];
  const inspection = inspectSelection(selection);
  assert.equal(inspection.valid, false);
  assert.ok(inspection.messages.length > 0);
});

test('bozuk veritabanı değeri null olarak çözülüyor', () => {
  assert.equal(decodeTicket(null), null);
  assert.equal(decodeTicket('1,2,3'), null);
  assert.equal(decodeTicket('x,'.repeat(26) + 'x'), null);
});
