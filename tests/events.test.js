import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAwardFeed} from '../game-events.js';import{newRoom}from'../core.js';
test('Her ekran yeni çinkoları aynı sırada bir kez görür; ilk yükleme eski ödülleri oynatmaz',()=>{
 const room=newRoom('a','A'),a=createAwardFeed(),b=createAwardFeed();a.update(room,'1234');b.update(room,'1234');room.game.awards.first={uid:'a',seq:5,number:24,row:0};
 assert.deepEqual(a.update(room,'1234'),b.update(room,'1234'));assert.deepEqual(a.update(room,'1234'),[]);
 room.game.awards.second={uid:'b',seq:14,number:45,row:2};room.game.awards.tombala={uid:'a',seq:27,number:85,row:1};assert.deepEqual(a.update(room,'1234').map(e=>e.kind),['second','tombala']);
 assert.deepEqual(createAwardFeed().update(room,'1234'),[]);
 room.meta.round++;for(const e of Object.values(room.game.awards)){e.uid='';e.seq=0;}a.update(room,'1234');room.game.awards.first={uid:'b',seq:5,number:29,row:0};assert.equal(a.update(room,'1234')[0].uid,'b');
});
