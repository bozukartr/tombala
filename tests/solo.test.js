import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocalTransport} from '../solo.js';
import {members,decodeCard,drawnNumbers,markedNumbers,progress,STAGES} from '../core.js';
// Sahte saat: zamanlayıcıları sırasıyla ve anında çalıştırır.
function fakeClock(){
 let time=1000,id=0;const queue=new Map();
 return{
  now:()=>time,
  setTimeout(fn,ms){queue.set(++id,{at:time+Math.max(0,ms),fn});return id;},
  clearTimeout(i){queue.delete(i);},
  pending:()=>queue.size,
  advance(ms){const end=time+ms;for(;;){let next=null;for(const[i,x]of queue)if(x.at<=end&&(!next||x.at<next[1].at))next=[i,x];if(!next)break;queue.delete(next[0]);time=next[1].at;next[1].fn();}time=end;}
 };
}
function seeded(seed=7){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}
async function table(options={}){
 const clock=fakeClock(),t=createLocalTransport({clock,random:seeded(options.seed),...options});
 await t.create('Burak');let room;const reactions=[];
 await t.watch(r=>room=r,()=>{});t.watchReactions(r=>reactions.push(r));
 return{t,clock,get room(){return room;},reactions};
}
test('Solo: botlar yalnızca çıkan sayıları işaretler ve tur tek tombalayla biter',async()=>{
 const s=await table({bots:3});assert.equal(members(s.room).length,4);assert.ok(members(s.room).slice(1).every(([,p])=>p.bot&&p.readyRound===1));
 s.t.setLevel('zor');await s.t.hostAction('pace',3000);await s.t.hostAction('start');
 assert.equal(s.room.meta.phase,'playing');assert.equal(s.room.game.auto,true);
 s.clock.advance(400000);
 const r=s.room;assert.equal(r.meta.phase,'finished');
 const drawn=new Set(drawnNumbers(r.game));
 for(const[,p]of members(r))for(const n of markedNumbers(p))assert.ok(drawn.has(n)&&decodeCard(p.card).includes(n));
 assert.equal(markedNumbers(members(r)[0][1]).length,0,'Oyuncu dokunmadan işaret oluşmaz.');
 for(const key of STAGES)assert.ok(r.game.awards[key].uid.startsWith('bot-'));
 assert.ok(r.game.awards.first.seq<r.game.awards.second.seq&&r.game.awards.second.seq<r.game.awards.tombala.seq);
 assert.equal(members(r).reduce((sum,[,p])=>sum+p.score,0),6);
 s.clock.advance(5000);assert.equal(s.clock.pending(),0,'Tur bitince zamanlayıcı kalmaz.');
});
test('Solo: otomatik çekiliş seçilen aralıkta ilerler; elle çekiliş zamanlayıcıyı yeniler',async()=>{
 const s=await table({bots:1});await s.t.hostAction('pace',5000);await s.t.hostAction('start');
 s.clock.advance(4999);assert.equal(drawnNumbers(s.room.game).length,0);s.clock.advance(1);assert.equal(drawnNumbers(s.room.game).length,1);
 s.clock.advance(3000);await s.t.hostAction('draw');assert.equal(drawnNumbers(s.room.game).length,2);
 s.clock.advance(4999);assert.equal(drawnNumbers(s.room.game).length,2);s.clock.advance(1);assert.equal(drawnNumbers(s.room.game).length,3);
 await s.t.hostAction('pace',0);s.clock.advance(60000);assert.equal(drawnNumbers(s.room.game).length,3,'Elle modunda kendiliğinden sayı çıkmaz.');
});
test('Solo: arka plana geçince çekiliş ve botlar durur, dönünce tam aralık beklenir',async()=>{
 const s=await table({bots:3});s.t.setLevel('zor');await s.t.hostAction('pace',3000);await s.t.hostAction('start');s.clock.advance(30000);
 const marks=()=>members(s.room).map(([,p])=>p.marks).join('|'),count=drawnNumbers(s.room.game).length;
 s.t.setPaused(true);const frozen=marks();s.clock.advance(120000);
 assert.equal(drawnNumbers(s.room.game).length,count);assert.equal(marks(),frozen);
 s.t.setPaused(false);s.clock.advance(2999);assert.equal(drawnNumbers(s.room.game).length,count);s.clock.advance(1);assert.equal(drawnNumbers(s.room.game).length,count+1);
});
test('Solo: oyuncu işaretleyip kazanabilir; tekrar oynamada puan korunur, botlar yeni kartla hazır',async()=>{
 const s=await table({bots:1});s.t.setLevel('kolay');await s.t.hostAction('pace',0);await s.t.hostAction('start');
 const mine=decodeCard(members(s.room)[0][1].card).filter(Boolean),botCard=members(s.room)[1][1].card;
 await assert.rejects(s.t.mark(mine[0]),/henüz/);
 while(s.room.meta.phase==='playing'){
  await s.t.hostAction('draw');const last=s.room.game.lastDraw;
  if(mine.includes(last))await s.t.mark(last);
 }
 const winner=s.room.game.awards.tombala.uid,me=members(s.room)[0][1];
 if(winner==='me')assert.equal(progress(decodeCard(me.card),markedNumbers(me)).hits,15);
 const scores=members(s.room).map(([,p])=>p.score);
 await s.t.hostAction('reset');const r=s.room;
 assert.equal(r.meta.phase,'lobby');assert.equal(r.meta.round,2);assert.deepEqual(members(r).map(([,p])=>p.score),scores);
 assert.equal(members(r)[1][1].readyRound,2);assert.notEqual(members(r)[1][1].card,botCard);assert.equal(members(r)[0][1].marks,',');
});
test('Solo: masada 1–3 bot bulunur; botlar yalnızca lobide eklenip çıkarılır',async()=>{
 const s=await table({bots:2});assert.equal(members(s.room).length,3);
 s.t.addBot();s.t.addBot();assert.equal(members(s.room).length,4);
 s.t.removeBot(1);s.t.removeBot(2);s.t.removeBot(3);assert.equal(members(s.room).length,2,'En az bir bot kalır.');
 s.t.removeBot(0);assert.equal(members(s.room)[0][1].uid,'me');
 assert.equal(new Set(members(s.room).map(([,p])=>p.name)).size,members(s.room).length);
 await s.t.hostAction('start');s.t.addBot();assert.equal(members(s.room).length,2);
});
test('Solo: ödüllerde botlar tepki verir; tepki sırası zamanla artar',async()=>{
 const s=await table({bots:3,seed:11});s.t.setLevel('zor');await s.t.hostAction('pace',3000);await s.t.hostAction('start');s.clock.advance(400000);
 const last=s.reactions.at(-1);assert.ok(Object.keys(last).length>0);
 const stamps=s.reactions.flatMap(r=>Object.values(r).map(x=>x.t));assert.ok(stamps.every(Number.isFinite));
 await s.t.react(2);assert.equal(s.reactions.at(-1)[0].e,2);
});
