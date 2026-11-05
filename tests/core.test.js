import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCard,validateCard,encodeCard,decodeCard,newRoom,newPlayer,startRound,drawNext,drawnNumbers,resetRound,progress,canStart,CARD_SIZE,CARD_COLUMNS,hasCardNumber} from '../core.js';
test('1000 kart: 3×10, her satır 5 sayı, sütun aralığı, benzersizlik ve sıralama',()=>{
 for(let i=0;i<1000;i++){const card=makeCard();assert.equal(validateCard(card),'');assert.equal(card.length,30);for(let c=0;c<10;c++)assert.equal([card[c],card[10+c],card[20+c]].filter(Boolean).length,c%2===0?2:1);for(let i=0;i<30;i++)assert.equal(Boolean(card[i]),hasCardNumber(i));assert.deepEqual(decodeCard(encodeCard(card)),card);}
});
test('Hatalı özel kartlar reddedilir',()=>{
 const card=makeCard();assert.ok(validateCard(Array(CARD_SIZE).fill(0)));
 const duplicate=[...card],numbers=card.flatMap((n,i)=>n?[i]:[]);duplicate[numbers[1]]=duplicate[numbers[0]];assert.ok(validateCard(duplicate));
 const wrong=[...card];wrong[numbers[0]]=91;assert.ok(validateCard(wrong));
 assert.ok(validateCard(card.slice(1)));
});
function table(count=4){const room=newRoom('host','Burak');for(let i=1;i<count;i++)room.players[i]=newPlayer('p'+i,'Oyuncu '+i,i);for(const p of Object.values(room.players))p.readyRound=1;return room;}
test('2–4 kişi ve herkesin hazır olması gerekir; kopan oyuncu başlatmayı engeller',()=>{
 assert.equal(canStart(table(1)),false);for(let n=2;n<=4;n++)assert.equal(canStart(table(n)),true);
 const room=table();room.players[2].readyRound=0;assert.equal(canStart(room),false);assert.throws(()=>startRound(room));
 room.players[2].readyRound=1;room.players[2].online=false;assert.equal(canStart(room),false);
 const extra=table();extra.players[4]=newPlayer('p4','Fazla');assert.equal(canStart(extra),false);
});
test('100 tam oyun: tekrarsız 1–90 çekiliş, doğru çinko ve tombala, lobiye dönüş',()=>{
 for(let run=0;run<100;run++){
  const room=table();startRound(room);let steps=0;
  while(room.meta.phase==='playing'&&steps++<91){drawNext(room);const drawn=drawnNumbers(room.game);assert.equal(new Set(drawn).size,drawn.length);assert.ok(drawn.every(n=>n>=1&&n<=90));}
  assert.equal(room.meta.phase,'finished');assert.ok(steps<=90);
  const drawn=drawnNumbers(room.game),awards=JSON.parse(room.game.awards);
  for(const [key,target]of [['first',1],['second',2],['tombala',3]]){
   assert.ok(awards[key]);for(const uid of awards[key].uids){const p=Object.values(room.players).find(p=>p.uid===uid);assert.ok(progress(decodeCard(p.card),drawn.slice(0,awards[key].at)).rows>=target);assert.ok(progress(decodeCard(p.card),drawn.slice(0,awards[key].at-1)).rows<target);}
  }
  const cards=Object.values(room.players).map(p=>p.card);resetRound(room);
  assert.equal(room.meta.phase,'lobby');assert.equal(room.meta.round,2);assert.equal(room.game.drawn,'');assert.equal(canStart(room),false);assert.deepEqual(Object.values(room.players).map(p=>p.card),cards);
 }
});
test('Aynı sayıda bitirenler tombalayı paylaşır',()=>{
 const room=table(2);room.players[1].card=room.players[0].card;startRound(room);while(room.meta.phase==='playing')drawNext(room);
 assert.deepEqual(JSON.parse(room.game.awards).tombala.uids,['host','p1']);
});

test('Örnekteki dönüşümlü yerleşim geçerli; kaydırılmış boşluk ve eski 3×9 kart reddedilir',()=>{
 const sample=[1,0,22,0,45,0,60,0,84,0,0,14,0,37,0,52,0,70,0,90,8,0,29,0,49,0,69,0,88,0];
 assert.equal(validateCard(sample),'');
 const wrong=[...sample];[wrong[0],wrong[1]]=[wrong[1],wrong[0]];assert.match(validateCard(wrong),/dönüşümlü/);
 assert.ok(validateCard(Array(27).fill(0)));
 assert.deepEqual(progress(sample,sample.slice(0,10).filter(Boolean)),{hits:5,rows:1});
 assert.deepEqual(progress(sample,sample.slice(0,20).filter(Boolean)),{hits:10,rows:2});
});
