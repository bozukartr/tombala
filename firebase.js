import {randomInt,decodeCard,validateCard,cardPatch,members,canStart,startRound,drawNext,resetRound,setPace} from './core.js';
import {firebaseConfig} from './firebase-config.js';
import {ROOM_BASE as BASE,REACTION_BASE,reserveRoom,reserveSeat,commitMark,sendReaction} from './room-transactions.js';
const SDK='https://www.gstatic.com/firebasejs/12.4.0/';
const SESSION_KEY='tombala-room-v5';
let api,db,auth,user,initPromise,unsubscribe,stopPresence,stopReactions,presence,roomCode;
const roomRef=()=>api.ref(db,`${BASE}/${roomCode}`);
function friendly(error) {
  const code=String(error?.code||error?.message||'');
  if(/permission|PERMISSION_DENIED/i.test(code)) return Object.assign(new Error('Oda bağlantısı henüz hazır değil.'),{setupRequired:true});
  if(/operation-not-allowed|admin-restricted/i.test(code)) return new Error('Firebase projesinde anonim girişin etkinleştirilmesi gerekiyor.');
  if(/network|unavailable|timeout/i.test(code)) return new Error('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.');
  return error;
}
export const mode='online';
export const savedRoom=()=>sessionStorage.getItem(SESSION_KEY);
export async function connect() {
  if(!initPromise) initPromise=(async()=>{
    const [a,b,c]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-database.js')]);
    api={...a,...b,...c};const app=api.initializeApp(firebaseConfig);
    auth=api.getAuth(app);db=api.getDatabase(app);
    await auth.authStateReady();
    user=auth.currentUser || (await api.signInAnonymously(auth)).user;
    return user.uid;
  })().catch(error=>{initPromise=null;throw friendly(error)});
  return initPromise;
}
export const uid=()=>user?.uid;
export const code=()=>roomCode;
export async function create(name) {
  await connect();
  roomCode=await reserveRoom(api,db,user.uid,name).catch(e=>{throw friendly(e)});
  sessionStorage.setItem(SESSION_KEY,roomCode);return roomCode;
}
export async function join(next,name) {
  await connect();
  roomCode=await reserveSeat(api,db,user.uid,next,name).catch(e=>{throw friendly(e)});
  sessionStorage.setItem(SESSION_KEY,roomCode);return roomCode;
}
function stopWatching(){
  unsubscribe?.();stopPresence?.();stopReactions?.();
  unsubscribe=null;stopPresence=null;stopReactions=null;
}
export async function watch(onRoom,onConnection,onError) {
  stopWatching();
  const snapshot=await api.get(roomRef());
  const slot=members(snapshot.val()).find(([,p])=>p.uid===user.uid)?.[0];
  if(slot===undefined)throw new Error('Bu masada yerin bulunamadı.');
  presence=api.ref(db,`${BASE}/${roomCode}/players/${slot}/online`);
  stopPresence=api.onValue(api.ref(db,'.info/connected'),async snap=>{
    const connected=snap.val()===true;onConnection(connected);
    if(connected){try{await api.onDisconnect(presence).set(false);await api.set(presence,true);}catch(e){onError(friendly(e));}}
  });
  unsubscribe=api.onValue(roomRef(),snap=>onRoom(snap.val()),e=>onError(friendly(e)));
}
// Tepkiler ayrı yolda dinlenir; okunamazsa oyun etkilenmez.
export function watchReactions(onReactions) {
  stopReactions?.();
  stopReactions=api.onValue(api.ref(db,`${REACTION_BASE}/${roomCode}`),snap=>onReactions(snap.val()),()=>{});
}
async function mySlot(){
  const room=(await api.get(roomRef())).val();
  return members(room).find(([,p])=>p.uid===user.uid)?.[0];
}
export async function react(index) {
  const slot=await mySlot();
  if(slot===undefined)throw new Error('Masadaki yerin bulunamadı.');
  await sendReaction(api,db,roomCode,slot,index).catch(e=>{throw friendly(e)});
}
export async function editPlayer(changes) {
  if(changes.card!==undefined){const card=decodeCard(changes.card),error=validateCard(card);if(error)throw new Error(error);changes={...changes,...cardPatch(card)};}
  const snapshot=await api.get(roomRef());const room=snapshot.val();
  const slot=members(room).find(([,p])=>p.uid===user.uid)?.[0];
  if(slot===undefined)throw new Error('Masadaki yerin bulunamadı.');
  if(room.meta.phase!=='lobby')throw new Error('Kartlar yalnızca lobide değiştirilebilir.');
  await api.update(api.ref(db,`${BASE}/${roomCode}/players/${slot}`),changes).catch(e=>{throw friendly(e)});
}
export async function hostAction(action,value) {
  const result=await api.runTransaction(roomRef(),room=>{
    if(!room||room.meta.hostId!==user.uid)return;
    if(action==='prune'){if(room.meta.phase!=='lobby')return;for(const [slot,p] of members(room)){if(!p.online&&p.uid!==user.uid)delete room.players[slot];}return room;}
    if(action==='start'){if(!canStart(room))return;return startRound(room);}
    if(action==='draw'){if(room.meta.phase!=='playing')return;return drawNext(room);}
    if(action==='tick'){
      if(room.meta.phase!=='playing'||!room.game.auto||Date.now()-room.game.updatedAt<room.game.interval)return;
      return drawNext(room);
    }
    if(action==='pace'){if(room.meta.phase==='finished')return;return setPace(room,value);}
    if(action==='reset'){if(room.meta.phase!=='finished')return;return resetRound(room);}
  },{applyLocally:false}).catch(e=>{throw friendly(e)});
  if(!result.committed&&action!=='tick')throw new Error('İşlem tamamlanamadı. Masanın güncel durumunu kontrol et.');
}
export async function claimHost() {
  await api.runTransaction(api.ref(db,`${BASE}/${roomCode}/meta`),meta=>{
    if(!meta)return;return {...meta,hostId:user.uid};
  },{applyLocally:false}).catch(e=>{throw friendly(e)});
}
export async function leave(room) {
  // Önce hazır bilgisi geri alınır; host aynı anda oyunu başlatırsa kural silmeyi reddeder.
  const slot=members(room).find(([,p])=>p.uid===user.uid)?.[0];
  if(slot!==undefined){
    const playerRef=api.ref(db,`${BASE}/${roomCode}/players/${slot}`);
    const current=(await api.get(roomRef())).val();
    if(current?.meta.phase==='lobby') {
      // Oda sahibi değişecekse önce çevrimdışı olur; diğer oyuncu devralır.
      await api.update(playerRef,{online:false,readyRound:0});
      await api.remove(playerRef).catch(()=>{});
    }else await api.set(presence,false);
  }
  stopWatching();
  if(presence)await api.onDisconnect(presence).cancel();
  presence=null;roomCode=null;sessionStorage.removeItem(SESSION_KEY);
}

export async function abandon() {
  stopWatching();
  if(presence){await api.onDisconnect(presence).cancel().catch(()=>{});presence=null;}
  roomCode=null;sessionStorage.removeItem(SESSION_KEY);
}

// Salt okuma kontrolü: oda oluşturmaz ve oyuncu bilgilerini almaz.
export async function verifyRoomReadAccess(){
  await connect();
  const probeCode=String(1000+randomInt(9000));
  await api.get(api.ref(db,`${BASE}/${probeCode}/meta/phase`)).catch(error=>{throw friendly(error)});
}

export async function mark(number){
 return commitMark(api,db,user.uid,roomCode,number).catch(error=>{throw friendly(error)});
}
