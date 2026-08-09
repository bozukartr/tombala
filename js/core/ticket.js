export const ROWS = 3;
export const COLUMNS = 9;
export const CELL_COUNT = ROWS * COLUMNS;
export const NUMBER_COUNT = 15;
export const NUMBERS_PER_ROW = 5;

export function rangeForColumn(column) {
  if (column === 0) return [1, 9];
  if (column === 8) return [80, 90];
  return [column * 10, column * 10 + 9];
}

export function columnForNumber(number) {
  if (number < 10) return 0;
  if (number >= 80) return 8;
  return Math.floor(number / 10);
}

export function shuffled(values, random = Math.random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createColumnCounts(random) {
  const counts = Array(COLUMNS).fill(1);
  let remaining = NUMBER_COUNT - COLUMNS;
  while (remaining) {
    const column = Math.floor(random() * COLUMNS);
    if (counts[column] === ROWS) continue;
    counts[column] += 1;
    remaining -= 1;
  }
  return counts;
}

function placeColumnsIntoRows(counts, random = Math.random) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const rowCapacity = Array(ROWS).fill(NUMBERS_PER_ROW);
    const occupied = Array(CELL_COUNT).fill(false);
    const columns = counts
      .map((count, column) => ({ count, column, tie: random() }))
      .sort((left, right) => right.count - left.count || left.tie - right.tie);

    let valid = true;
    for (const { count, column } of columns) {
      const candidateRows = rowCapacity
        .map((capacity, row) => ({ capacity, row, tie: random() }))
        .filter(({ capacity }) => capacity > 0)
        .sort((left, right) => right.capacity - left.capacity || left.tie - right.tie)
        .slice(0, count);

      if (candidateRows.length !== count) {
        valid = false;
        break;
      }
      for (const { row } of candidateRows) {
        occupied[row * COLUMNS + column] = true;
        rowCapacity[row] -= 1;
      }
    }
    if (valid && rowCapacity.every((capacity) => capacity === 0)) return occupied;
  }
  throw new Error('Kart düzeni oluşturulamadı. Lütfen tekrar dene.');
}

function ticketFromColumns(columns, random = Math.random) {
  const counts = columns.map((numbers) => numbers.length);
  const occupied = placeColumnsIntoRows(counts, random);
  const ticket = Array(CELL_COUNT).fill(0);

  for (let column = 0; column < COLUMNS; column += 1) {
    const numbers = [...columns[column]].sort((left, right) => left - right);
    let numberIndex = 0;
    for (let row = 0; row < ROWS; row += 1) {
      if (occupied[row * COLUMNS + column]) {
        ticket[row * COLUMNS + column] = numbers[numberIndex];
        numberIndex += 1;
      }
    }
  }
  return ticket;
}

export function createTicket(random = Math.random) {
  const counts = createColumnCounts(random);
  const columns = counts.map((count, column) => {
    const [minimum, maximum] = rangeForColumn(column);
    const pool = Array.from({ length: maximum - minimum + 1 }, (_, index) => minimum + index);
    return shuffled(pool, random).slice(0, count);
  });
  return ticketFromColumns(columns, random);
}

export function ticketFromSelection(selection, random = Math.random) {
  const numbers = [...new Set(selection.map(Number))].sort((left, right) => left - right);
  const inspection = inspectSelection(numbers);
  if (!inspection.valid) throw new Error(inspection.messages[0] || 'Geçersiz kart seçimi.');
  const columns = Array.from({ length: COLUMNS }, () => []);
  numbers.forEach((number) => columns[columnForNumber(number)].push(number));
  return ticketFromColumns(columns, random);
}

export function inspectSelection(selection) {
  const numbers = [...new Set(selection.map(Number).filter(Number.isInteger))];
  const counts = Array(COLUMNS).fill(0);
  const messages = [];

  for (const number of numbers) {
    if (number < 1 || number > 90) messages.push(`${number} geçerli bir tombala sayısı değil.`);
    else counts[columnForNumber(number)] += 1;
  }
  counts.forEach((count, column) => {
    if (count > ROWS) messages.push(`${column + 1}. sütunda en fazla 3 sayı olabilir.`);
  });
  if (numbers.length > NUMBER_COUNT) messages.push('En fazla 15 sayı seçebilirsin.');
  if (numbers.length === NUMBER_COUNT && counts.some((count) => count === 0)) {
    messages.push('Her sütundan en az bir sayı seçmelisin.');
  }

  return {
    counts,
    remaining: Math.max(0, NUMBER_COUNT - numbers.length),
    valid: numbers.length === NUMBER_COUNT && counts.every((count) => count >= 1 && count <= ROWS) && messages.length === 0,
    messages,
  };
}

export function ticketNumbers(ticket) {
  return Array.isArray(ticket) ? ticket.filter((number) => Number.isInteger(number) && number > 0) : [];
}

export function rowNumbers(ticket, row) {
  return ticket.slice(row * COLUMNS, row * COLUMNS + COLUMNS).filter(Boolean);
}

export function validateTicket(ticket) {
  const errors = [];
  if (!Array.isArray(ticket) || ticket.length !== CELL_COUNT) return ['Kart 27 hücreden oluşmalı.'];
  const numbers = ticketNumbers(ticket);
  if (numbers.length !== NUMBER_COUNT) errors.push('Kartta tam 15 sayı olmalı.');
  if (new Set(numbers).size !== numbers.length) errors.push('Kartta tekrarlanan sayı var.');

  for (let row = 0; row < ROWS; row += 1) {
    if (rowNumbers(ticket, row).length !== NUMBERS_PER_ROW) errors.push(`${row + 1}. satırda tam 5 sayı olmalı.`);
  }
  for (let column = 0; column < COLUMNS; column += 1) {
    const [minimum, maximum] = rangeForColumn(column);
    const columnNumbers = [];
    for (let row = 0; row < ROWS; row += 1) {
      const value = ticket[row * COLUMNS + column];
      if (!Number.isInteger(value) || value < 0) errors.push('Kart hücreleri tam sayı olmalı.');
      if (value) {
        if (value < minimum || value > maximum) errors.push(`${value}, ${column + 1}. sütunda olamaz.`);
        columnNumbers.push(value);
      }
    }
    if (columnNumbers.length < 1 || columnNumbers.length > ROWS) errors.push(`${column + 1}. sütunda 1–3 sayı olmalı.`);
    if (columnNumbers.some((number, index) => index && number <= columnNumbers[index - 1])) errors.push(`${column + 1}. sütun artan sırada olmalı.`);
  }
  return [...new Set(errors)];
}

export function encodeTicket(ticket) {
  const errors = validateTicket(ticket);
  if (errors.length) throw new Error(errors[0]);
  return ticket.join(',');
}

export function decodeTicket(value) {
  if (Array.isArray(value)) return validateTicket(value).length ? null : value;
  if (typeof value !== 'string') return null;
  const ticket = value.split(',').map((part) => Number(part));
  return validateTicket(ticket).length ? null : ticket;
}
