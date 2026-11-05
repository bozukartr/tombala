// Oyun kuralları. Ağ ve DOM bağımlılığı içermez.
export const COLORS=['coral','sage','gold','blue'];
export const COLOR_NAMES=['Mercan','Adaçayı','Bal','Deniz'];
export const CARD_ROWS=3,CARD_COLUMNS=9,CARD_SIZE=27,CARD_ID_INDEX=9;
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
export const members=room=>Object.entries(room?.players||{}).filter(([,p])=>p).sort((a,b)=>Number(a[0])-Number(b[0]));
export function canStart(room){const ps=members(room);return room.meta.phase==='lobby'&&ps.length>=2&&ps.length<=4&&ps.every(([,p])=>p.online&&p.readyRound===room.meta.round&&!validateCard(decodeCard(p.card)));}
export const emptyAwards=()=>Object.fromEntries(['first','second','tombala'].map(key=>[key,{uid:'',seq:0,number:0,row:-1}]));
export const emptyGame=()=>({drawn:',',lastDraw:0,auto:false,interval:5000,updatedAt:0,seq:0,lastUid:'',lastNumber:0,lastRow:-1,awards:emptyAwards()});
export const emptyMarks=()=>({marks:',',hits0:0,hits1:0,hits2:0});
export function newPlayer(uid,name,color=0){return{uid,name,color,cardNo:color+1,...cardPatch(makeCard()),...emptyMarks(),readyRound:0,online:true,joinedAt:Date.now()};}
export function newRoom(uid,name){return{meta:{hostId:uid,phase:'lobby',round:1,createdAt:Date.now()},players:{0:newPlayer(uid,name)},game:emptyGame()};}
export function startRound(room){if(!canStart(room))throw new Error('Başlamak için en az 2 kişi ve herkesin hazır olması gerekiyor.');room.meta.phase='playing';room.game={...emptyGame(),updatedAt:Date.now()};for(const[,p]of members(room))Object.assign(p,emptyMarks());return room;}
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
 for(const[key,target]of [['first',1],['second',2],['tombala',3]])if(!room.game.awards[key].uid&&count>=target)room.game.awards[key]={uid,seq:room.game.seq,number,row};
 if(room.game.awards.tombala.uid){room.meta.phase='finished';room.game.auto=false;}
 return room;
}
export function resetRound(room){if(room.meta.phase!=='finished')throw new Error('Oyun henüz bitmedi.');room.meta.phase='lobby';room.meta.round++;room.game=emptyGame();for(const[,p]of members(room))Object.assign(p,emptyMarks());return room;}
