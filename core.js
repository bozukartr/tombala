// Oyun kuralları. Ağ ve DOM bağımlılığı içermez.
export const COLORS=['coral','sage','gold','blue'];
export const COLOR_NAMES=['Mercan','Adaçayı','Bal','Deniz'];
export const CARD_ROWS=3,CARD_COLUMNS=9,CARD_SIZE=27,CARD_ID_INDEX=9;
export const STAGES=['first','second','tombala'];
export const STAGE_LABELS={first:'1. Çinko',second:'2. Çinko',tombala:'Tombala'};
// Ödül puanları masa skoruna eklenir ve turlar boyunca korunur.
export const STAGE_POINTS={first:1,second:2,tombala:3};
const STAGE_ROWS={first:1,second:2,tombala:3};
// Otomatik çekiliş aralıkları (ms). 0, oda sahibinin sayıları elle çekmesidir.
export const PACES=[8000,5000,3000];
export const DEFAULT_PACE=5000;
// Masadaki herkesin görebildiği kısa tepkiler. Veritabanında sıra numarası saklanır.
export const REACTIONS=['👏','🔥','😮','😂','🙈'];
export const validPace=value=>value===0||PACES.includes(value);
export const range=n=>Array.from({length:n},(_,i)=>i);
export function randomInt(max){const limit=Math.floor(0x100000000/max)*max,a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max;}
export function shuffle(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export const columnRange=c=>[c===0?1:c*10,c===8?90:c*10+9];
// Referanslardaki iki yerleşim ailesi; orta sol hücre oyun sayısı değil kart kimliği.
const layouts=[
 [[0,2,4,6,7],[1,3,5,7,8],[0,2,4,6,8]],
 [[0,1,3,5,7],[1,2,4,6,8],[0,2,3,5,7]],
];
export const CARD_PATTERNS=layouts.flatMap(rows=>[rows,[rows[2],rows[1],rows[0]]]).map(rows=>range(CARD_SIZE).map(i=>rows[Math.floor(i/CARD_COLUMNS)].includes(i%CARD_COLUMNS)));
export const hasCardNumber=(index,card)=>index!==CARD_ID_INDEX&&Boolean(card?.[index]);
export function makeCard(){
 const mask=CARD_PATTERNS[randomInt(CARD_PATTERNS.length)],card=Array(CARD_SIZE).fill(0);
 range(CARD_COLUMNS).forEach(c=>{const [lo,hi]=columnRange(c),rows=range(3).filter(r=>mask[r*9+c]);const nums=shuffle(range(hi-lo+1).map(n=>n+lo)).slice(0,rows.length);rows.forEach((r,i)=>card[r*9+c]=nums[i]);});
 return card;
}
// Kart düzenleyici yardımcıları: düzen (boşluk deseni) seçimi, sütun sütun taşıma ve rastgele tamamlama.
export const patternOf=card=>CARD_PATTERNS.findIndex(mask=>mask.every((filled,i)=>filled===Boolean(card[i])));
export const slotsOf=pattern=>range(CARD_SIZE).filter(i=>CARD_PATTERNS[pattern]?.[i]);
// Yeni desende sayı aynı satırda yer bulursa orada kalır; kalanlar sütundaki boş karelere
// yukarıdan aşağı taşınır. Yeni desende yeri olmayan sayı düşer.
export function applyPattern(cells,pattern){
 const mask=CARD_PATTERNS[pattern],next=Array(CARD_SIZE).fill(0);
 for(let c=0;c<CARD_COLUMNS;c++){
  const rest=[];
  for(const r of range(3)){const n=cells[r*9+c];if(!n||!inColumn(c,n))continue;if(mask[r*9+c])next[r*9+c]=n;else rest.push(n);}
  for(const r of range(3))if(mask[r*9+c]&&!next[r*9+c]&&rest.length)next[r*9+c]=rest.shift();
 }
 return next;
}
const inColumn=(c,n)=>{const[lo,hi]=columnRange(c);return n>=lo&&n<=hi;};
// Desendeki boş karelere, sütun aralığından o sütunda kullanılmamış sayılar konur.
export function fillCard(cells,pattern){
 const mask=CARD_PATTERNS[pattern],next=[...cells];
 for(let c=0;c<CARD_COLUMNS;c++){
  const[lo,hi]=columnRange(c),used=new Set(range(3).map(r=>next[r*9+c]).filter(Boolean));
  const free=shuffle(range(hi-lo+1).map(n=>n+lo).filter(n=>!used.has(n)));
  for(const r of range(3))if(mask[r*9+c]&&!next[r*9+c])next[r*9+c]=free.pop();
 }
 return next;
}
export const encodeCard=card=>card.join(',');
export const decodeCard=value=>typeof value==='string'?value.split(',').map(Number):[];
export function cardPatch(card){return{card:encodeCard(card),row0:encodeCard(card.slice(0,9)),row1:encodeCard(card.slice(9,18)),row2:encodeCard(card.slice(18,27))};}
export function validateCard(card){
 if(card.length!==CARD_SIZE)return 'Kart 3 satır ve 9 sütundan oluşmalı.';
 if(card.some(n=>!Number.isInteger(n)||n<0||n>90))return 'Sayılar 1–90 arasında olmalı.';
 if(card[CARD_ID_INDEX]!==0)return 'Sol ortadaki hücre kart numarasına ayrılmıştır.';
 if(range(3).some(r=>card.slice(r*9,r*9+9).filter(Boolean).length!==5))return 'Her satırda 5 oyun sayısı olmalı.';
 if(new Set(card.filter(Boolean)).size!==15)return 'Oyun sayıları tekrar edemez.';
 if(!CARD_PATTERNS.some(mask=>mask.every((filled,i)=>filled===Boolean(card[i]))))return 'Sayılar kartın seçilen yerleşimine uygun olmalı.';
 for(let c=0;c<9;c++){const[lo,hi]=columnRange(c),col=range(3).map(r=>card[r*9+c]).filter(Boolean);if(col.length<1||col.length>2||col.some(n=>n<lo||n>hi))return `${c+1}. sütun ${lo}–${hi} aralığında 1 veya 2 sayı içermeli.`;}
 return '';
}
const list=value=>typeof value==='string'?value.split(',').filter(Boolean).map(Number):[];
export const drawnNumbers=game=>list(game?.drawn);
export const markedNumbers=player=>list(player?.marks);
export function progress(card,marked=[]){const set=new Set(marked),completed=range(3).filter(r=>{const row=card.slice(r*9,r*9+9).filter(Boolean);return row.length===5&&row.every(n=>set.has(n));});return{hits:card.filter(n=>n&&set.has(n)).length,rows:completed.length,completed};}
// Sıradaki boş ödül. Ödüller yalnızca 1. çinko → 2. çinko → tombala sırasıyla verilir.
export const nextStage=awards=>STAGES.find(key=>!awards?.[key]?.uid)||null;
// Oyuncunun belirtilen ödüle kaç işaret uzakta olduğunu yalnızca kendi işaretlerinden hesaplar.
// Çıkmış ama işaretlenmemiş sayılar ipucu vermemek için hesaba katılmaz.
export function remainingFor(card,marked,stage){
 if(!STAGE_ROWS[stage])return Infinity;
 const set=new Set(marked),missing=range(3).map(r=>card.slice(r*9,r*9+9).filter(n=>n&&!set.has(n)).length).sort((a,b)=>a-b);
 return missing.slice(0,STAGE_ROWS[stage]).reduce((sum,n)=>sum+n,0);
}
const ONES=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
const TENS=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
export const numberWord=n=>Number.isInteger(n)&&n>=1&&n<=90?[TENS[Math.floor(n/10)],ONES[n%10]].filter(Boolean).join(' '):'';
export const members=room=>Object.entries(room?.players||{}).filter(([,p])=>p).sort((a,b)=>Number(a[0])-Number(b[0]));
export function canStart(room){const ps=members(room);return room.meta.phase==='lobby'&&ps.length>=2&&ps.length<=4&&ps.every(([,p])=>p.online&&p.readyRound===room.meta.round&&!validateCard(decodeCard(p.card)));}
export const emptyAwards=()=>Object.fromEntries(STAGES.map(key=>[key,{uid:'',seq:0,number:0,row:-1}]));
export const emptyGame=(interval=DEFAULT_PACE,auto=false)=>({drawn:',',lastDraw:0,auto,interval:PACES.includes(interval)?interval:DEFAULT_PACE,updatedAt:0,seq:0,lastUid:'',lastNumber:0,lastRow:-1,awards:emptyAwards()});
export const emptyMarks=()=>({marks:',',hits0:0,hits1:0,hits2:0});
export function newPlayer(uid,name,color=0){return{uid,name,color,cardNo:color+1,...cardPatch(makeCard()),...emptyMarks(),score:0,readyRound:0,online:true,joinedAt:Date.now()};}
export function newRoom(uid,name,pace=DEFAULT_PACE){return{meta:{hostId:uid,phase:'lobby',round:1,createdAt:Date.now(),pace:validPace(pace)?pace:DEFAULT_PACE},players:{0:newPlayer(uid,name)},game:emptyGame(pace||DEFAULT_PACE)};}
// Oda ayarı turdan tura korunur: 0 elle çekiliş, diğerleri otomatik çekiliş aralığıdır.
const roundInterval=room=>PACES.includes(room.meta.pace)?room.meta.pace:PACES.includes(room.game?.interval)?room.game.interval:DEFAULT_PACE;
export function startRound(room,now=Date.now()){if(!canStart(room))throw new Error('Başlamak için en az 2 kişi ve herkesin hazır olması gerekiyor.');room.meta.phase='playing';room.game={...emptyGame(roundInterval(room),room.meta.pace>0),updatedAt:now};for(const[,p]of members(room))Object.assign(p,emptyMarks());return room;}
// Oda sahibinin çekiliş ayarı. Oyun sırasında 0 otomatik çekilişi duraklatır.
export function setPace(room,pace,now=Date.now()){
 if(!validPace(pace))throw new Error('Geçersiz çekiliş hızı.');
 if(room.meta.phase==='finished')throw new Error('Tur tamamlandı.');
 room.meta.pace=pace;
 if(room.meta.phase==='playing'){if(pace)room.game.interval=pace;room.game.auto=pace>0&&drawnNumbers(room.game).length<90;room.game.updatedAt=now;}
 return room;
}
export function drawNext(room,now=Date.now()){
 if(room.meta.phase!=='playing')return room;
 const drawn=drawnNumbers(room.game),remaining=range(90).map(n=>n+1).filter(n=>!drawn.includes(n));
 if(!remaining.length)return room;
 const n=remaining[randomInt(remaining.length)];room.game.drawn+=n+',';room.game.lastDraw=n;room.game.updatedAt=now;
 if(remaining.length===1)room.game.auto=false;
 return room;
}
// Tüm işaretlemeler aynı oda transaction'ında sıra alır. İstemci saati kazananı belirlemez.
export function markNumber(room,uid,number){
 if(room.meta.phase!=='playing')throw new Error('Tur henüz başlamadı veya tamamlandı.');
 const p=members(room).find(([,p])=>p.uid===uid)?.[1];if(!p)throw new Error('Bu masada yerin bulunamadı.');
 const card=decodeCard(p.card),index=card.indexOf(number);
 if(!Number.isInteger(number)||number<1||index<0||index===CARD_ID_INDEX)throw new Error('Bu sayı kartındaki bir oyun sayısı değil.');
 if(!drawnNumbers(room.game).includes(number))throw new Error('Bu sayı henüz torbadan çıkmadı.');
 if(markedNumbers(p).includes(number))return room;
 const row=Math.floor(index/9);p.marks+=number+',';p['hits'+row]++;
 room.game.seq++;room.game.lastUid=uid;room.game.lastNumber=number;room.game.lastRow=row;
 const count=progress(card,markedNumbers(p)).rows;
 for(const key of STAGES)if(!room.game.awards[key].uid&&count>=STAGE_ROWS[key]){room.game.awards[key]={uid,seq:room.game.seq,number,row};p.score=(p.score||0)+STAGE_POINTS[key];}
 if(room.game.awards.tombala.uid){room.meta.phase='finished';room.game.auto=false;}
 return room;
}
export function resetRound(room){if(room.meta.phase!=='finished')throw new Error('Oyun henüz bitmedi.');room.meta.phase='lobby';room.meta.round++;room.game=emptyGame(roundInterval(room));for(const[,p]of members(room))Object.assign(p,emptyMarks());return room;}
// Puan tablosu: önce masa puanı, eşitlikte bu turdaki işaret sayısı, sonra koltuk sırası.
export function standings(room){
 return members(room).map(([slot,p])=>({slot:Number(slot),player:p,score:p.score||0,hits:progress(decodeCard(p.card),markedNumbers(p)).hits})).sort((a,b)=>b.score-a.score||b.hits-a.hits||a.slot-b.slot);
}
