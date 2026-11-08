import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import * as api from 'firebase/database';
import {createAwardFeed} from '../game-events.js';
import {reserveRoom,reserveSeat,commitMark,sendReaction,ROOM_BASE,REACTION_BASE} from '../room-transactions.js';
import {newRoom,newPlayer,cardPatch,makeCard,decodeCard,members,startRound,drawNext,markNumber,resetRound,setPace,range} from '../core.js';
const{ref,set,get,update,remove,onValue,runTransaction,serverTimestamp}=api;
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000'){delete process.env.HTTP_PROXY;delete process.env.http_proxy;}
const enabled=!!process.env.FIREBASE_DATABASE_EMULATOR_HOST;let env;const listeners=[];
before(async()=>{if(enabled)env=await initializeTestEnvironment({projectId:'demo-tombala',database:{host:'127.0.0.1',port:9000,rules:await readFile(new URL('../database.rules.json',import.meta.url),'utf8')}});});
after(async()=>{listeners.forEach(s=>s());await env?.cleanup();});
const db=uid=>uid?env.authenticatedContext(uid).database():env.unauthenticatedContext().database();
const t=(name,fn)=>test(name,{skip:!enabled,timeout:30000},fn);let counter=1100;
const observe=(d,path,cb,predicate=()=>true)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Beklenen canlı durum gelmedi: '+path)),8000);listeners.push(onValue(ref(d,path),s=>{cb?.(s.val());if(predicate(s.val())){clearTimeout(timer);resolve(s.val());}},reject));});
async function table(playing=false){const code=String(counter++),path=ROOM_BASE+'/'+code,host=db('host'),p2=db('p2');await set(ref(host,path),newRoom('host','Burak'));await set(ref(p2,path+'/players/1'),newPlayer('p2','Deniz',1));await observe(host,path);await observe(p2,path);if(playing){await update(ref(host,path+'/players/0'),{readyRound:1});await update(ref(p2,path+'/players/1'),{readyRound:1});await observe(host,path,null,r=>members(r).every(([,p])=>p.readyRound===1));const r=await runTransaction(ref(host,path),r=>r?startRound(r):r,{applyLocally:false});assert.ok(r.committed);await env.withSecurityRulesDisabled(async ctx=>update(ref(ctx.database(),path+'/game'),{drawn:','+range(90).map(n=>n+1).join(',')+',',lastDraw:90}));await observe(host,path,null,r=>r.game.lastDraw===90);await observe(p2,path,null,r=>r.game.lastDraw===90);}return{code,path,host,p2};}
async function state(d,path){return(await get(ref(d,path))).val();}
async function move(d,path,fn){return runTransaction(ref(d,path),r=>r?fn(r):r,{applyLocally:false});}
t('RTDB: oturum, dört haneli kod, oda listesinin gizliliği',async()=>{await assertFails(get(ref(db(),ROOM_BASE+'/1111')));await assertFails(get(ref(db('host'),ROOM_BASE)));await assertFails(set(ref(db('host'),ROOM_BASE+'/12345'),newRoom('host','Burak')));const{host,path}=await table();await assertSucceeds(get(ref(host,path)));});
t('RTDB: oda kodu çakışması yeniden denenir',async()=>{const{code}=await table();const free=String(counter++);let i=0;assert.equal(await reserveRoom(api,db('new'),'new','Yeni',()=>i++===0?code:free),free);});
t('RTDB: dört eşzamanlı katılım yalnızca üç boş sandalyeyi doldurur',async()=>{const code=String(counter++),host=db('host'),path=ROOM_BASE+'/'+code;await set(ref(host,path),newRoom('host','Burak'));const out=await Promise.allSettled(['a','b','c','d'].map(uid=>reserveSeat(api,db(uid),uid,code,uid)));assert.equal(out.filter(r=>r.status==='fulfilled').length,3);const r=await state(host,path);assert.equal(members(r).length,4);for(const[slot,p]of members(r))assert.equal(p.cardNo,Number(slot)+1);await assertFails(set(ref(db('five'),path+'/players/4'),newPlayer('five','Beş',3)));});
t('RTDB: kart ve kimlik lobide doğrulanır, hazır kart değiştirilemez',async()=>{const{host,p2,path}=await table();await assertFails(update(ref(p2,path+'/players/0'),{name:'Sahte'}));await assertFails(update(ref(p2,path+'/players/1'),{cardNo:99}));await assertSucceeds(update(ref(p2,path+'/players/1'),cardPatch(makeCard())));await assertFails(update(ref(p2,path+'/players/1'),{hits0:5}));await assertFails(update(ref(p2,path+'/players/1'),{marks:',14,'}));await update(ref(p2,path+'/players/1'),{readyRound:1});await assertFails(update(ref(p2,path+'/players/1'),cardPatch(makeCard())));await assertFails(update(ref(host,path+'/players/0'),{card:Array(30).fill(0).join(',')}));});
t('RTDB: sayı çekilmesi otomatik işaret veya ödül üretmez',async()=>{const{host,p2,path}=await table();await update(ref(host,path+'/players/0'),{readyRound:1});await update(ref(p2,path+'/players/1'),{readyRound:1});await observe(host,path,null,r=>members(r).every(([,p])=>p.readyRound===1));await assertSucceeds(move(host,path,startRound));await assertSucceeds(move(host,path,drawNext));const r=await state(host,path);assert.equal(r.game.seq,0);assert.equal(r.players[0].marks,',');assert.equal(r.game.awards.first.uid,'');await assertFails(set(ref(p2,path+'/game/drawn'),',42,'));});
t('RTDB: oyuncunun manuel işaretlemesi iki dinleyiciye de canlı ulaşır',async()=>{const{host,p2,path,code}=await table(true);let seenHost,seenPeer;await observe(host,path,r=>seenHost=r);await observe(p2,path,r=>seenPeer=r);const r=await state(p2,path),n=decodeCard(r.players[1].card).filter(Boolean)[0];assert.ok(await commitMark(api,p2,'p2',code,n));await observe(host,path,null,r=>r.game.seq===1);await observe(p2,path,null,r=>r.game.seq===1);assert.ok(seenHost.players[1].marks.includes(','+n+','));assert.ok(seenPeer.players[1].marks.includes(','+n+','));assert.equal(seenHost.game.seq,1);assert.equal(seenPeer.game.seq,1);assert.equal(seenHost.players[0].marks,',');await assertFails(set(ref(p2,path+'/players/1/marks'),',42,'));});
t('RTDB: sahte işaret, sıra atlama, başka oyuncunun kartı ve ödül çalma engellenir',async()=>{const{host,p2,path}=await table(true);const original=await state(p2,path),n=decodeCard(original.players[1].card).filter(Boolean)[0];const valid=markNumber(structuredClone(original),'p2',n);for(const mutate of [r=>r.game.seq++,r=>r.game.lastRow=(r.game.lastRow+1)%3,r=>r.players[1]['hits'+r.game.lastRow]=5,r=>r.players[0].marks=',42,',r=>r.players[0].cardNo=4,r=>r.players[1].card=original.players[0].card,r=>r.game.awards.first={uid:'p2',seq:1,number:n,row:0},r=>delete r.players[0]]){const bad=structuredClone(valid);mutate(bad);await assertFails(set(ref(p2,path),bad));}await assertFails(set(ref(db('spectator'),path),valid));await assertSucceeds(set(ref(p2,path),valid));const drawn=drawNext(structuredClone(valid));drawn.players[1].marks=',';drawn.players[1]['hits'+valid.game.lastRow]=0;await assertFails(set(ref(host,path),drawn));});
t('RTDB: çıkmamış sayı için elle üretilmiş transaction reddedilir',async()=>{const{p2,path}=await table(true);const r=await state(p2,path),n=decodeCard(r.players[1].card).filter(Boolean)[0];await env.withSecurityRulesDisabled(ctx=>update(ref(ctx.database(),path+'/game'),{drawn:',',lastDraw:0}));const bad=markNumber(r,'p2',n);bad.game.drawn=',';bad.game.lastDraw=0;await assertFails(set(ref(p2,path),bad));});
t('RTDB: aynı son sayıya eşzamanlı dokunuşta tek çinko kazananı ve tek sıra vardır',async()=>{const{host,p2,path,code}=await table();const c=decodeCard((await state(host,path)).players[0].card);await update(ref(p2,path+'/players/1'),cardPatch(c));await update(ref(host,path+'/players/0'),{readyRound:1});await update(ref(p2,path+'/players/1'),{readyRound:1});await observe(host,path,null,r=>members(r).every(([,p])=>p.readyRound===1));await move(host,path,startRound);await env.withSecurityRulesDisabled(ctx=>update(ref(ctx.database(),path+'/game'),{drawn:','+range(90).map(n=>n+1).join(',')+',',lastDraw:90}));await observe(host,path,null,r=>r.game.lastDraw===90);await observe(p2,path,null,r=>r.game.lastDraw===90);const feedA=createAwardFeed(),feedB=createAwardFeed(),eventsA=[],eventsB=[];await observe(host,path,r=>eventsA.push(...feedA.update(r,code)));await observe(p2,path,r=>eventsB.push(...feedB.update(r,code)));const nums=c.slice(0,9).filter(Boolean);for(const n of nums.slice(0,4)){await commitMark(api,host,'host',code,n);await commitMark(api,p2,'p2',code,n);}const out=await Promise.all([commitMark(api,host,'host',code,nums[4]),commitMark(api,p2,'p2',code,nums[4])]);assert.ok(out.every(Boolean));await observe(host,path,null,r=>r.game.seq===10);await observe(p2,path,null,r=>r.game.seq===10);const r=await state(host,path);assert.deepEqual(eventsA,eventsB);assert.equal(eventsA.length,1);assert.equal(eventsA[0].kind,'first');assert.equal(r.game.seq,10);assert.equal(r.game.awards.first.seq,9);assert.ok(['host','p2'].includes(r.game.awards.first.uid));assert.equal(r.game.awards.second.uid,'');});
t('RTDB: tombala ilk manuel tamamlayana gider, tekrar lobide herkesin işaretleri temizlenir',async()=>{
 const{host,p2,path,code}=await table(true),card=decodeCard((await state(p2,path)).players[1].card);
 for(const n of card.filter(Boolean))assert.ok(await commitMark(api,p2,'p2',code,n));
 // Karşı istemcinin get() önbelleği henüz son transaction'ı içermeyebilir.
 // Sonuç, gerçek onValue güncellemesi bu istemciye ulaştığında doğrulanır.
 const r=await observe(host,path,null,r=>r.meta.phase==='finished');
 assert.equal(r.game.awards.tombala.uid,'p2');assert.equal(r.game.awards.tombala.seq,15);
 await assertSucceeds(move(host,path,resetRound));
 const isNewLobby=r=>r.meta.phase==='lobby'&&r.meta.round===2;
 const[reset,peerReset]=await Promise.all([observe(host,path,null,isNewLobby),observe(p2,path,null,isNewLobby)]);
 assert.equal(reset.players[1].marks,',');assert.equal(reset.players[1].hits0,0);assert.equal(reset.game.awards.first.uid,'');assert.equal(reset.players[1].card,r.players[1].card);
 assert.deepEqual(peerReset.players,reset.players);assert.deepEqual(peerReset.game,reset.game);
});
t('RTDB: ev sahibi bağlantısı kesilince devralma ve manuel oyun sürer',async()=>{const{host,p2,path,code}=await table(true);await assertFails(update(ref(p2,path+'/meta'),{hostId:'p2'}));await set(ref(host,path+'/players/0/online'),false);await assertSucceeds(update(ref(p2,path+'/meta'),{hostId:'p2'}));const r=await state(p2,path),n=decodeCard(r.players[1].card).filter(Boolean)[0];assert.ok(await commitMark(api,p2,'p2',code,n));await assertFails(remove(ref(p2,path+'/players/1')));});

t('RTDB: eşzamanlı son dokunuşta tek tombala kaydı oluşur',async()=>{
 const {host,p2,path,code}=await table();const c=decodeCard((await state(host,path)).players[0].card);
 await update(ref(p2,path+'/players/1'),cardPatch(c));await update(ref(host,path+'/players/0'),{readyRound:1});await update(ref(p2,path+'/players/1'),{readyRound:1});
 await observe(host,path,null,r=>members(r).every(([,p])=>p.readyRound===1));await move(host,path,startRound);
 await env.withSecurityRulesDisabled(ctx=>update(ref(ctx.database(),path+'/game'),{drawn:','+range(90).map(n=>n+1).join(',')+',',lastDraw:90}));
 await observe(host,path,null,r=>r.game.lastDraw===90);await observe(p2,path,null,r=>r.game.lastDraw===90);
 const numbers=c.filter(Boolean);for(const n of numbers.slice(0,14)){await commitMark(api,host,'host',code,n);await commitMark(api,p2,'p2',code,n);}
 await observe(host,path,null,r=>r.game.seq===28);await observe(p2,path,null,r=>r.game.seq===28);
 const results=await Promise.allSettled([commitMark(api,host,'host',code,numbers[14]),commitMark(api,p2,'p2',code,numbers[14])]);
 assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value===true).length,1);
 await observe(host,path,null,r=>r.meta.phase==='finished');const r=await state(host,path);
 assert.equal(r.game.seq,29);assert.equal(r.game.awards.tombala.seq,29);assert.ok(['host','p2'].includes(r.game.awards.tombala.uid));
});

t('RTDB: ödül puanı yalnızca kazanan işaretlemeyle artar ve tekrar oynamada korunur',async()=>{
 const{host,p2,path,code}=await table(true),card=decodeCard((await state(p2,path)).players[1].card),row=card.slice(0,9).filter(Boolean);
 for(const n of row.slice(0,4))assert.ok(await commitMark(api,p2,'p2',code,n));
 await observe(p2,path,null,r=>r.game.seq===4);
 const before=await state(p2,path),winning=markNumber(structuredClone(before),'p2',row[4]);
 assert.equal(winning.players[1].score,1);
 for(const mutate of [r=>r.players[1].score=0,r=>r.players[1].score=3,r=>r.players[0].score=1]){const bad=structuredClone(winning);mutate(bad);await assertFails(set(ref(p2,path),bad));}
 const extra=markNumber(structuredClone(before),'p2',card.slice(9,18).filter(Boolean)[0]);extra.players[1].score=1;await assertFails(set(ref(p2,path),extra));
 await assertSucceeds(set(ref(p2,path),winning));
 for(const n of card.filter(Boolean))await commitMark(api,p2,'p2',code,n);
 const done=await observe(host,path,null,r=>r.meta.phase==='finished');assert.equal(done.players[1].score,6);assert.equal(done.players[0].score,0);
 const forged=resetRound(structuredClone(done));forged.players[1].score=0;await assertFails(set(ref(host,path),forged));
 await assertSucceeds(move(host,path,resetRound));const lobby=await observe(p2,path,null,r=>r.meta.phase==='lobby');assert.equal(lobby.players[1].score,6);
 await assertFails(update(ref(p2,path+'/players/1'),{score:9}));await assertFails(set(ref(p2,path+'/players/1/score'),7));await assertFails(update(ref(host,path+'/players/1'),{score:0}));
 const joiner=newPlayer('late','Geç',2);joiner.score=4;await assertFails(set(ref(db('late'),path+'/players/2'),joiner));joiner.score=0;await assertSucceeds(set(ref(db('late'),path+'/players/2'),joiner));
});
t('RTDB: çekiliş hızını yalnızca oda sahibi geçerli değerlerle değiştirir',async()=>{
 const{host,p2,path}=await table();
 await assertSucceeds(update(ref(host,path+'/meta'),{pace:3000}));await assertFails(update(ref(host,path+'/meta'),{pace:4000}));await assertFails(update(ref(p2,path+'/meta'),{pace:8000}));
 await assertSucceeds(update(ref(host,path+'/meta'),{pace:0}));await assertSucceeds(move(host,path,r=>setPace(r,8000)));
 await assertFails(update(ref(host,path+'/game'),{interval:4000}));
 await update(ref(host,path+'/players/0'),{readyRound:1});await update(ref(p2,path+'/players/1'),{readyRound:1});await observe(host,path,null,r=>members(r).every(([,p])=>p.readyRound===1));
 await assertSucceeds(move(host,path,startRound));let r=await state(host,path);assert.equal(r.game.auto,true);assert.equal(r.game.interval,8000);
 await assertSucceeds(move(host,path,room=>setPace(room,0)));r=await state(host,path);assert.equal(r.game.auto,false);assert.equal(r.meta.pace,0);
 await assertSucceeds(move(host,path,room=>setPace(room,3000)));r=await state(host,path);assert.equal(r.game.interval,3000);assert.equal(r.game.auto,true);
 await assertFails(set(ref(p2,path+'/game/auto'),false));await assertFails(update(ref(p2,path+'/meta'),{pace:5000}));
 await assertSucceeds(move(host,path,drawNext));
 await env.withSecurityRulesDisabled(ctx=>update(ref(ctx.database(),path+'/game'),{drawn:','+range(90).map(n=>n+1).join(',')+',',lastDraw:90}));
 const drawn=await observe(p2,path,null,r=>r.game.lastDraw===90),n=decodeCard(drawn.players[1].card).filter(Boolean)[0];
 const bad=markNumber(structuredClone(drawn),'p2',n);bad.meta.pace=5000;await assertFails(set(ref(p2,path),bad));
 await assertSucceeds(set(ref(p2,path),markNumber(structuredClone(drawn),'p2',n)));
});
t('RTDB: tepkiyi yalnızca masadaki oyuncu kendi koltuğuna, sınırlı sıklıkla yazar',async()=>{
 const{host,p2,code}=await table(),base=REACTION_BASE+'/'+code;
 await assertSucceeds(sendReaction(api,p2,code,1,0));await assertFails(sendReaction(api,p2,code,1,2));
 await assertFails(sendReaction(api,p2,code,0,1));await assertFails(sendReaction(api,db('stranger'),code,2,1));
 await assertFails(set(ref(host,base+'/0'),{e:9,t:serverTimestamp()}));await assertFails(set(ref(host,base+'/0'),{e:1,t:Date.now()-5000}));await assertFails(set(ref(host,base+'/0'),{e:1,t:serverTimestamp(),x:1}));
 await new Promise(resolve=>setTimeout(resolve,800));await assertSucceeds(sendReaction(api,p2,code,1,3));
 const seen=await observe(host,base,null,r=>r?.[1]?.e===3);assert.equal(typeof seen[1].t,'number');
 await assertFails(get(ref(db(),base)));await assertFails(get(ref(db('host'),REACTION_BASE)));
 await assertFails(sendReaction(api,host,'12345',0,1));
});
