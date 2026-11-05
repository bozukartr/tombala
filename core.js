// Saf oyun kuralları: DOM ve ağ bağımlılığı yok.
export const COLORS = ['coral', 'sage', 'gold', 'blue'];
export const COLOR_NAMES = ['Mercan', 'Adaçayı', 'Bal', 'Deniz'];
export function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const a = new Uint32Array(1);
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % max;
}
export function shuffle(values) {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const range = n => Array.from({length:n}, (_,i)=>i);
export const columnRange = c => [c === 0 ? 1 : c * 10, c === 8 ? 90 : c * 10 + 9];
export function makeCard() {
  // Her satırda 5 sayı, her sütunda en az bir sayı. Sütunlar yukarıdan aşağı sıralı.
  let positions;
  do { positions = range(3).map(() => shuffle(range(9)).slice(0,5)); }
  while (range(9).some(c => !positions.some(row => row.includes(c))));
  const card = Array(27).fill(0);
  range(9).forEach(c => {
    const [lo,hi] = columnRange(c);
    const rows = range(3).filter(r => positions[r].includes(c));
    const nums = shuffle(range(hi-lo+1).map(n => n+lo)).slice(0,rows.length).sort((a,b)=>a-b);
    rows.forEach((r,i) => card[r*9+c] = nums[i]);
  });
  return card;
}
export const encodeCard = card => card.join(',');
export const decodeCard = value => typeof value === 'string' ? value.split(',').map(Number) : [];
export function validateCard(card) {
  if (card.length !== 27 || card.some(n=>!Number.isInteger(n)||n<0||n>90)) return 'Sayılar 1–90 arasında olmalı.';
  if (range(3).some(r => card.slice(r*9,r*9+9).filter(Boolean).length !== 5)) return 'Her satırda tam 5 sayı olmalı.';
  const nums = card.filter(Boolean);
  if (new Set(nums).size !== 15) return 'Aynı sayı birden fazla kullanılamaz.';
  for (let c=0;c<9;c++) {
    const [lo,hi] = columnRange(c);
    const col = range(3).map(r=>card[r*9+c]).filter(Boolean);
    if (!col.length) return 'Her sütunda en az bir sayı olmalı.';
    if (col.some((n,i)=>n<lo||n>hi||(i>0&&n<=col[i-1]))) return `${c+1}. sütun ${lo}–${hi} aralığında, yukarıdan aşağı artan olmalı.`;
  }
  return '';
}
export const drawnNumbers = game => game?.drawn ? game.drawn.split(',').map(Number) : [];
export function progress(card, drawn) {
  const set = new Set(drawn);
  const rows = range(3).map(r=>card.slice(r*9,r*9+9).filter(Boolean));
  return { hits:card.filter(n=>n&&set.has(n)).length, rows:rows.filter(row=>row.length===5&&row.every(n=>set.has(n))).length };
}
export const members = room => Object.entries(room?.players || {}).filter(([,p])=>p).sort((a,b)=>Number(a[0])-Number(b[0]));
export function canStart(room) {
  const players = members(room);
  return room.meta.phase==='lobby' && players.length>=2 && players.length<=4 && players.every(([,p])=>p.online&&p.readyRound===room.meta.round&&!validateCard(decodeCard(p.card)));
}
export function newPlayer(uid, name, color=0) {
  return { uid, name, color, card:encodeCard(makeCard()), readyRound:0, online:true, joinedAt:Date.now() };
}
export function newRoom(uid, name) {
  return { meta:{hostId:uid,phase:'lobby',round:1,createdAt:Date.now()}, players:{0:newPlayer(uid,name)}, game:{drawn:'',auto:false,interval:5000,updatedAt:0,awards:'{}'} };
}
export function startRound(room) {
  if (!canStart(room)) throw new Error('Başlamak için en az 2 kişi ve herkesin hazır olması gerekiyor.');
  room.meta.phase='playing';
  room.game={drawn:'',auto:false,interval:5000,updatedAt:Date.now(),awards:'{}'};
  return room;
}
export function drawNext(room, now=Date.now()) {
  if (room.meta.phase!=='playing') return room;
  const drawn=drawnNumbers(room.game);
  const remaining=range(90).map(n=>n+1).filter(n=>!drawn.includes(n));
  if (!remaining.length) return room;
  drawn.push(remaining[randomInt(remaining.length)]);
  const awards=JSON.parse(room.game.awards||'{}');
  for (const [key,target] of [['first',1],['second',2],['tombala',3]]) {
    if (!awards[key]) {
      const winners=members(room).filter(([,p])=>progress(decodeCard(p.card),drawn).rows>=target).map(([,p])=>p.uid);
      if (winners.length) awards[key]={uids:winners,at:drawn.length};
    }
  }
  room.game.drawn=drawn.join(','); room.game.updatedAt=now; room.game.awards=JSON.stringify(awards);
  if (awards.tombala) {room.meta.phase='finished';room.game.auto=false;}
  return room;
}
export function resetRound(room) {
  if(room.meta.phase!=='finished') throw new Error('Oyun henüz bitmedi.');
  room.meta.phase='lobby';room.meta.round++;
  room.game={drawn:'',auto:false,interval:5000,updatedAt:0,awards:'{}'};
  return room;
}
