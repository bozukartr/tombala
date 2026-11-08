import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAwardFeed,createReactionFeed} from '../game-events.js';import{newRoom}from'../core.js';
test('Her ekran yeni çinkoları aynı sırada bir kez görür; ilk yükleme eski ödülleri oynatmaz',()=>{
 const room=newRoom('a','A'),a=createAwardFeed(),b=createAwardFeed();a.update(room,'1234');b.update(room,'1234');room.game.awards.first={uid:'a',seq:5,number:24,row:0};
 assert.deepEqual(a.update(room,'1234'),b.update(room,'1234'));assert.deepEqual(a.update(room,'1234'),[]);
 room.game.awards.second={uid:'b',seq:14,number:45,row:2};room.game.awards.tombala={uid:'a',seq:27,number:85,row:1};assert.deepEqual(a.update(room,'1234').map(e=>e.kind),['second','tombala']);
 assert.deepEqual(createAwardFeed().update(room,'1234'),[]);
 room.meta.round++;for(const e of Object.values(room.game.awards)){e.uid='';e.seq=0;}a.update(room,'1234');room.game.awards.first={uid:'b',seq:5,number:29,row:0};assert.equal(a.update(room,'1234')[0].uid,'b');
});
test('Tepkiler yalnızca yeni zaman damgasıyla bir kez oynatılır',()=>{
 const feed=createReactionFeed();
 assert.deepEqual(feed.update({0:{e:1,t:100}},'1234'),[]);
 assert.deepEqual(feed.update({0:{e:1,t:100},2:{e:3,t:150}},'1234'),[{slot:2,e:3,t:150}]);
 assert.deepEqual(feed.update({0:{e:4,t:300},2:{e:0,t:200}},'1234').map(r=>r.slot),[2,0]);
 assert.deepEqual(feed.update({0:{e:4,t:300},2:{e:0,t:200}},'1234'),[]);
 assert.deepEqual(feed.update({0:{e:2,t:250}},'1234'),[],'Geri alınan yerel yazım yeni tepki sayılmaz.');
 assert.deepEqual(feed.update({0:{e:'x',t:900},1:null},'1234'),[]);
 assert.deepEqual(feed.update({0:{e:2,t:400}},'5678'),[],'Yeni oda ilk okumada eski tepkileri oynatmaz.');
});
