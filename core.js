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
export const CARD_ROWS = 3;
export const CARD_COLUMNS = 10;
export const CARD_SIZE = CARD_ROWS * CARD_COLUMNS;
export const columnRange = c => c === 9 ? [90,90] : [c === 0 ? 1 : c*10, c*10+9];
// İlk ve üçüncü satır: sayı/boş. İkinci satır: boş/sayı.
// Sütunlar 2,1,2,1… sayı taşır; her satırda 5, kartta toplam 15 sayı vardır.
export const hasCardNumber = index => (Math.floor(index/CARD_COLUMNS)+index%CARD_COLUMNS)%2 === 0;
export function makeCard() {
  const card = Array(CARD_SIZE).fill(0);
  range(CARD_COLUMNS).forEach(c => {
    const [lo,hi] = columnRange(c);
    const rows=range(CARD_ROWS).filter(r=>hasCardNumber(r*CARD_COLUMNS+c));
    const nums=shuffle(range(hi-lo+1).map(n=>n+lo)).slice(0,rows.length).sort((a,b)=>a-b);
    rows.forEach((r,i)=>card[r*CARD_COLUMNS+c]=nums[i]);
  });
  return card;
}
export const encodeCard = card => card.join(',');
export const decodeCard = value => typeof value === 'string' ? value.split(',').map(Number) : [];
export function validateCard(card) {
  if(card.length!==CARD_SIZE) return 'Kart 3 satır ve 10 sütundan oluşmalı.';
  if(card.some(n=>!Number.isInteger(n)||n<0||n>90))return 'Sayılar 1–90 arasında olmalı.';
  if(card.some((n,i)=>n&&!hasCardNumber(i)))return 'Sayılar ve boş kareler dönüşümlü dizilmeli. Boş kareler sabittir.';
  if(card.some((n,i)=>hasCardNumber(i)&&!n))return 'Her satırdaki 5 sayı alanını doldur.';
  if(range(CARD_ROWS).some(r=>card.slice(r*CARD_COLUMNS,(r+1)*CARD_COLUMNS).filter(Boolean).length!==5))return 'Her satırda tam 5 sayı olmalı.';
  if(new Set(card.filter(Boolean)).size!==15)return 'Aynı sayı birden fazla kullanılamaz.';
  for(let c=0;c<CARD_COLUMNS;c++){
    const [lo,hi]=columnRange(c);
    const col=range(CARD_ROWS).map(r=>card[r*CARD_COLUMNS+c]).filter(Boolean);
    if(col.some((n,i)=>n<lo||n>hi||(i>0&&n<=col[i-1])))return `${c+1}. sütun ${lo}–${hi} aralığında, yukarıdan aşağı artan olmalı.`;
  }
  return '';
}
export const drawnNumbers = game => game?.drawn ? game.drawn.split(',').map(Number) : [];
export function progress(card, drawn) {
  const set = new Set(drawn);
  const rows = range(CARD_ROWS).map(r=>card.slice(r*CARD_COLUMNS,(r+1)*CARD_COLUMNS).filter(Boolean));
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
