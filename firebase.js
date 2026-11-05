import {members,canStart,startRound,drawNext,resetRound} from './core.js';
import {firebaseConfig} from './firebase-config.js';
const SDK='https://www.gstatic.com/firebasejs/12.4.0/';
import {ROOM_BASE as BASE,reserveRoom,reserveSeat} from './room-transactions.js';
let api,db,auth,user,initPromise,unsubscribe,stopPresence,presence,roomCode;
const roomRef=()=>api.ref(db,`${BASE}/${roomCode}`);
function friendly(error) {
  const code=String(error?.code||error?.message||'');
  if(/permission|PERMISSION_DENIED/i.test(code)) return new Error('Oda erişimi reddedildi. Firebase için yeni database.rules.json kurallarının yayımlanması gerekiyor.');
  if(/operation-not-allowed|admin-restricted/i.test(code)) return new Error('Firebase projesinde anonim girişin etkinleştirilmesi gerekiyor.');
  if(/network|unavailable|timeout/i.test(code)) return new Error('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.');
  return error;
}
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
  sessionStorage.setItem('tombala-room',roomCode);return roomCode;
}
export async function join(next,name) {
  await connect();
  roomCode=await reserveSeat(api,db,user.uid,next,name).catch(e=>{throw friendly(e)});
  sessionStorage.setItem('tombala-room',roomCode);return roomCode;
}
export async function watch(onRoom,onConnection,onError) {
  unsubscribe?.();stopPresence?.();
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
export async function editPlayer(changes) {
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
    if(action==='auto'){if(room.meta.phase!=='playing')return;room.game.auto=!!value;room.game.updatedAt=Date.now();return room;}
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
  unsubscribe?.();stopPresence?.();unsubscribe=null;stopPresence=null;
  await api.onDisconnect(presence).cancel();presence=null;roomCode=null;sessionStorage.removeItem('tombala-room');
}

export async function abandon() {
  unsubscribe?.();stopPresence?.();unsubscribe=null;stopPresence=null;
  if(presence){await api.onDisconnect(presence).cancel().catch(()=>{});presence=null;}
  roomCode=null;sessionStorage.removeItem('tombala-room');
}
