import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {ref,set,get,update,runTransaction,remove,onValue} from 'firebase/database';
import * as api from 'firebase/database';
import {reserveRoom,reserveSeat} from '../room-transactions.js';
import {newRoom,newPlayer,members,startRound,drawNext,resetRound,encodeCard,makeCard,drawnNumbers} from '../core.js';
// Firebase's Node WebSocket transport ignores NO_PROXY. These tests use only
// the loopback emulator; do not route its WebSocket through an external proxy.
if (process.env.FIREBASE_DATABASE_EMULATOR_HOST === '127.0.0.1:9000') { delete process.env.HTTP_PROXY; delete process.env.http_proxy; }
const enabled=!!process.env.FIREBASE_DATABASE_EMULATOR_HOST;
let env;const listeners=[];
before(async()=>{if(enabled)env=await initializeTestEnvironment({projectId:'demo-tombala',database:{host:'127.0.0.1',port:9000,rules:await readFile(new URL('../database.rules.json',import.meta.url),'utf8')}});});
after(async()=>{listeners.forEach(stop=>stop());await env?.cleanup();});
const db=uid=>uid?env.authenticatedContext(uid).database():env.unauthenticatedContext().database();
let counter=1100;
async function table(){const code=String(counter++),host=db('host'),p2=db('p2'),path=`tombalaV3/${code}`;await assertSucceeds(set(ref(host,path),newRoom('host','Burak')));await assertSucceeds(set(ref(p2,path+'/players/1'),newPlayer('p2','Deniz',1)));return{code,path,host,p2};}
const t=(name,fn)=>test(name,{skip:!enabled,timeout:20000},fn);
t('RTDB: anonim kimlik gerekli, oda listesi kapalı, kod 4 haneli',async()=>{
 await assertFails(get(ref(db(),'tombalaV3/1111')));
 await assertFails(get(ref(db('host'),'tombalaV3')));
 await assertFails(set(ref(db('host'),'tombalaV3/12345'),newRoom('host','Burak')));
 const {path,host}=await table();await assertSucceeds(get(ref(host,path)));
});
t('RTDB: aynı oda kodunu iki kişi transaction ile alamaz',async()=>{
 const code=String(counter++),a=db('a'),b=db('b');
 const results=await Promise.allSettled([runTransaction(ref(a,`tombalaV3/${code}`),r=>r?undefined:newRoom('a','A'),{applyLocally:false}),runTransaction(ref(b,`tombalaV3/${code}`),r=>r?undefined:newRoom('b','B'),{applyLocally:false})]);
 assert.equal(results.filter(r=>r.status==='fulfilled'&&r.value.committed).length,1);
});
t('RTDB: eşzamanlı koltuk yarışı, 4 kişi sınırı ve başka oyuncuyu değiştirme koruması',async()=>{
 const {path,host,p2}=await table();const a=db('a'),b=db('b');
 const result=await Promise.allSettled([runTransaction(ref(a,path+'/players/2'),r=>r?undefined:newPlayer('a','A'),{applyLocally:false}),runTransaction(ref(b,path+'/players/2'),r=>r?undefined:newPlayer('b','B'),{applyLocally:false})]);
 assert.equal(result.filter(r=>r.status==='fulfilled'&&r.value.committed).length,1);
 await assertSucceeds(set(ref(db('four'),path+'/players/3'),newPlayer('four','Dört')));
 await assertFails(set(ref(db('five'),path+'/players/4'),newPlayer('five','Beş')));
 await assertFails(update(ref(p2,path+'/players/0'),{name:'Sahte'}));
 await assertFails(set(ref(p2,path+'/players/1/uid'),'other'));
 await assertFails(set(ref(p2,path+'/players/3'),newPlayer('p2','Çift koltuk')));
 assert.equal(members((await get(ref(host,path))).val()).length,4);
});
t('RTDB: hazır kart kilidi, oyun sırasında kart ve çekiliş koruması, host devralma ve yeniden lobi',async()=>{
 const {path,host,p2}=await table();
 await assertSucceeds(update(ref(host,path+'/players/0'),{readyRound:1}));
 await assertSucceeds(update(ref(p2,path+'/players/1'),{readyRound:1}));
 await assertFails(update(ref(p2,path+'/players/1'),{card:encodeCard(makeCard())}));
 await new Promise(resolve=>listeners.push(onValue(ref(host,path),resolve)));
 const started=await assertSucceeds(runTransaction(ref(host,path),r=>r?startRound(r):undefined,{applyLocally:false}));
 assert.equal(started.committed,true);
 await assertFails(update(ref(p2,path+'/players/1'),{card:encodeCard(makeCard())}));
 await assertFails(remove(ref(p2,path+'/players/1')));
 await assertFails(set(ref(p2,path+'/game/drawn'),'42'));
 await assertFails(set(ref(db('late'),path+'/players/2'),newPlayer('late','Geç')));
 await assertFails(update(ref(p2,path+'/meta'),{hostId:'p2'}));
 await assertSucceeds(set(ref(host,path+'/players/0/online'),false));
 await assertSucceeds(update(ref(p2,path+'/meta'),{hostId:'p2'}));
 await assertFails(runTransaction(ref(host,path),r=>r?drawNext(r):undefined,{applyLocally:false}));
 // P2 artık host. Aynı çekiliş mantığı ile oyunu bitirir.
 let state=(await get(ref(p2,path))).val();while(state.meta.phase==='playing')drawNext(state);
 await assertSucceeds(set(ref(p2,path),state));assert.ok(drawnNumbers(state.game).length<=90);
 resetRound(state);await assertSucceeds(set(ref(p2,path),state));
 await assertSucceeds(update(ref(host,path+'/players/0'),{card:encodeCard(makeCard())}));
 assert.equal((await get(ref(p2,path+'/meta/phase'))).val(),'lobby');
});

t('RTDB: gerçek oda servisi kod çakışmasından sonra yeniden dener',async()=>{
 const {code}=await table();let attempt=0;const free=String(counter++);
 assert.equal(await reserveRoom(api,db('new-host'),'new-host','Yeni',()=>attempt++===0?code:free),free);
});
t('RTDB: gerçek oda servisi 4 eşzamanlı katılımda yalnızca 3 boş koltuğu doldurur',async()=>{
 const code=String(counter++),host=db('host');await set(ref(host,`tombalaV3/${code}`),newRoom('host','Burak'));
 const outcomes=await Promise.allSettled(['a','b','c','d'].map(uid=>reserveSeat(api,db(uid),uid,code,uid)));
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,3);
 assert.equal(members((await get(ref(host,`tombalaV3/${code}`))).val()).length,4);
 const denied=outcomes.find(r=>r.status==='rejected');assert.match(denied.reason.message,/dolu/);
});

t('RTDB: eski kart, kaydırılmış boşluk ve yanlış sütun aralığı reddedilir',async()=>{
 const {host,path}=await table();const card=makeCard();
 await assertFails(update(ref(host,path+'/players/0'),{card:Array(27).fill(0).join(',')}));
 const shifted=[...card];[shifted[0],shifted[1]]=[shifted[1],shifted[0]];
 await assertFails(update(ref(host,path+'/players/0'),{card:encodeCard(shifted)}));
 const wrong=[...card];wrong[0]=15;await assertFails(update(ref(host,path+'/players/0'),{card:encodeCard(wrong)}));
 await assertSucceeds(update(ref(host,path+'/players/0'),{card:encodeCard(card)}));
});
