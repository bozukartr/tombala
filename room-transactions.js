import {newRoom,newPlayer,members,randomInt,markNumber,markedNumbers} from './core.js';
export const ROOM_BASE='tombalaV4';
const expired=room=>!room?.meta||Date.now()-room.meta.createdAt>21600000;
// Aynı kod veya koltuk için yarışan istemciler sunucudan gelen güncel durumu
// yeniden okur. PERMISSION_DENIED gerçek bir doluluk yarışından da gelebilir.
export async function reserveRoom(api,db,uid,name,nextCode=()=>String(1000+randomInt(9000))) {
  for(let attempt=0;attempt<25;attempt++) {
    const code=nextCode(),target=api.ref(db,`${ROOM_BASE}/${code}`);
    try {
      const result=await api.runTransaction(target,old=>old?undefined:newRoom(uid,name),{applyLocally:false});
      if(result.committed)return code;
    }catch(error){
      const existing=await api.get(target);
      if(!existing.exists())throw error;
    }
  }
  throw new Error('Boş oda bulunamadı. Biraz sonra tekrar dene.');
}
export async function reserveSeat(api,db,uid,code,name) {
  if(!/^[1-9][0-9]{3}$/.test(code))throw new Error('Dört haneli oda kodunu kontrol et.');
  const target=api.ref(db,`${ROOM_BASE}/${code}`);
  let room=(await api.get(target)).val();
  if(expired(room))throw new Error('Bu oda bulunamadı veya süresi doldu. Yeni bir oda kurabilirsin.');
  if(members(room).some(([,p])=>p.uid===uid))return code;
  if(room.meta.phase!=='lobby')throw new Error('Bu masada oyun başlamış. Bir sonraki turda katılabilirsin.');
  const player=newPlayer(uid,name,members(room).length);
  for(let slot=0;slot<4;slot++) {
    if(room.players?.[slot])continue;
    try {
      const result=await api.runTransaction(api.ref(db,`${ROOM_BASE}/${code}/players/${slot}`),old=>old?undefined:{...player,color:slot,cardNo:slot+1},{applyLocally:false});
      if(result.committed)return code;
    }catch(error){
      room=(await api.get(target)).val();
      if(members(room).some(([,p])=>p.uid===uid))return code;
      if(room?.meta?.phase!=='lobby')throw new Error('Bu masada oyun başlamış. Bir sonraki turda katılabilirsin.');
      if(!room.players?.[slot])throw error;
    }
  }
  throw new Error('Masa dolu. Bu odada en fazla 4 kişi oynayabilir.');
}

export async function commitMark(api,db,uid,code,number){
 const result=await api.runTransaction(api.ref(db,`${ROOM_BASE}/${code}`),room=>{
  if(!room)return room;
  const p=members(room).find(([,p])=>p.uid===uid)?.[1];
  if(!p||room.meta.phase!=='playing'||markedNumbers(p).includes(number))return;
  return markNumber(room,uid,number);
 },{applyLocally:false});
 return result.committed;
}
