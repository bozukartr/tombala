import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeCard,validateCard,cardPatch,decodeCard,newRoom,newPlayer,startRound,drawNext,drawnNumbers,markedNumbers,resetRound,progress,canStart,markNumber,CARD_PATTERNS,range} from '../core.js';
const sample=[1,0,24,0,43,0,62,70,0,0,14,0,33,0,54,0,75,85,4,0,29,0,45,0,69,0,81];
function table(){const r=newRoom('host','Burak');r.players[1]=newPlayer('p2','Deniz',1);for(const p of Object.values(r.players))p.readyRound=1;return r;}
function allDrawn(r){while(drawnNumbers(r.game).length<90)drawNext(r);return r;}
test('2000 kart: 3×9, kimlik hücresi boş veri, 15 benzersiz sayı, satırda 5, sütunda 1–2',()=>{let reversed=false,with90=false,without90=false;for(let i=0;i<2000;i++){const c=makeCard();assert.equal(validateCard(c),'');assert.equal(c.length,27);assert.equal(c[9],0);assert.ok(CARD_PATTERNS.some(mask=>mask.every((n,i)=>n===Boolean(c[i]))));assert.equal(new Set(c.filter(Boolean)).size,15);for(let col=0;col<9;col++)assert.ok([1,2].includes([c[col],c[9+col],c[18+col]].filter(Boolean).length));if(c[0]>c[18])reversed=true;if(c.includes(90))with90=true;else without90=true;}assert.ok(reversed,'Referanslardaki gibi dikey sıralama zorunlu değil.');assert.ok(with90&&without90,'90 her kartta zorunlu olmamalı.');});
test('Beş gerçek referanstaki oyun sayıları geçerli; kart numarası veriye dahil değildir',()=>{
 const refs=[sample,[3,0,22,0,45,0,60,72,0,0,18,0,38,0,51,0,78,81,7,0,29,0,48,0,66,0,86],[7,0,26,0,46,0,63,72,0,0,15,0,34,0,56,0,76,86,5,0,22,0,48,0,62,0,89],[8,10,0,36,0,50,0,71,0,0,15,26,0,40,0,60,0,83,2,0,21,39,0,56,0,74,0],[6,11,0,35,0,50,0,72,0,0,15,27,0,44,0,63,0,82,8,0,28,37,0,59,0,77,0]];
 for(const c of refs)assert.equal(validateCard(c),'');
 const wrong=[...sample];wrong[9]=10;assert.match(validateCard(wrong),/kart numarası/);assert.ok(validateCard(Array(30).fill(0)));
});
test('Eksik, tekrar eden ve yanlış aralıktaki kartlar reddedilir',()=>{const c=makeCard();c[0]=91;assert.ok(validateCard(c));const d=[...sample];d[18]=d[0];assert.ok(validateCard(d));assert.ok(validateCard(sample.slice(1)));});
test('2–4 kişi, herkesin hazır ve bağlı olması gerekir',()=>{const r=table();assert.ok(canStart(r));r.players[1].readyRound=0;assert.ok(!canStart(r));assert.throws(()=>startRound(r));r.players[1].readyRound=1;r.players[1].online=false;assert.ok(!canStart(r));delete r.players[1];assert.ok(!canStart(r));});
test('90 sayı çıksa bile dokunulmadan sayı/çinko/tombala bulunmuş sayılmaz',()=>{const r=startRound(table());allDrawn(r);assert.equal(r.meta.phase,'playing');assert.equal(r.game.seq,0);for(const p of Object.values(r.players))assert.equal(progress(decodeCard(p.card),markedNumbers(p)).hits,0);for(const a of Object.values(r.game.awards))assert.equal(a.uid,'');assert.equal(new Set(drawnNumbers(r.game)).size,90);});
test('Çıkmamış sayı, başka kartın sayısı ve kart kimliği işaretlenemez; aynı sayı tekrar sayılmaz',()=>{const r=startRound(table());Object.assign(r.players[0],cardPatch(sample));r.players[0].cardNo=10;assert.throws(()=>markNumber(r,'host',1),/henüz/);r.game.drawn=',1,10,';assert.throws(()=>markNumber(r,'host',10),/oyun sayısı/);markNumber(r,'host',1);markNumber(r,'host',1);assert.equal(r.game.seq,1);assert.equal(r.players[0].hits0,1);assert.equal(r.players[0].marks,',1,');});
test('Çinko ve tombala ilk manuel tamamlayanındır; aynı çekilişte ortak kazanan oluşturulmaz',()=>{
 const r=startRound(table());for(const p of Object.values(r.players))Object.assign(p,cardPatch(sample));allDrawn(r);const row=sample.slice(0,9).filter(Boolean);
 for(const n of row.slice(0,4)){markNumber(r,'host',n);markNumber(r,'p2',n);}markNumber(r,'p2',row[4]);assert.equal(r.game.awards.first.uid,'p2');const first={...r.game.awards.first};markNumber(r,'host',row[4]);assert.deepEqual(r.game.awards.first,first);
 for(const n of sample.slice(9,18).filter(Boolean))markNumber(r,'host',n);assert.equal(r.game.awards.second.uid,'host');
 for(const n of sample.slice(9).filter(Boolean))markNumber(r,'p2',n);assert.equal(r.game.awards.tombala.uid,'p2');assert.equal(r.meta.phase,'finished');assert.throws(()=>markNumber(r,'host',sample[18]),/tamamlandı/);
});
test('100 tam manuel tur: canlı işaretler, sıralı ödüller ve tekrar lobide temiz kartlar',()=>{
 for(let i=0;i<100;i++){const r=startRound(table());allDrawn(r);const p=r.players[1],card=p.card;for(const n of decodeCard(card).filter(Boolean))markNumber(r,p.uid,n);assert.equal(r.meta.phase,'finished');const a=r.game.awards;assert.ok(a.first.seq<a.second.seq&&a.second.seq<a.tombala.seq);assert.equal(a.tombala.seq,15);resetRound(r);assert.equal(r.meta.round,2);assert.equal(r.meta.phase,'lobby');assert.equal(r.players[1].card,card);assert.equal(r.players[1].marks,',');assert.equal(r.players[1].hits0,0);assert.ok(!canStart(r));assert.equal(r.game.awards.first.uid,'');}
});
