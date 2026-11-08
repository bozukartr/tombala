// Her bağlı ekran aynı ödül sırasını okur. İlk yüklemede eski ödüller oynatılmaz.
export function createAwardFeed(){
 let key=null,seen=new Set();
 return{
  clear(){key=null;seen=new Set();},
  update(room,code=''){
   const nextKey=`${code}:${room.meta.createdAt}:${room.meta.round}`;
   const events=Object.entries(room.game.awards).filter(([,a])=>a.uid).map(([kind,a])=>({kind,...a})).sort((a,b)=>a.seq-b.seq);
   if(key!==nextKey){key=nextKey;seen=new Set(events.map(e=>e.seq));return[];}
   const fresh=events.filter(e=>!seen.has(e.seq));fresh.forEach(e=>seen.add(e.seq));return fresh;
  }
 };
}
// Tepkiler koltuk başına son zaman damgasıyla izlenir. İlk okumada eski tepkiler oynatılmaz.
export function createReactionFeed(){
 let key=null,last={};
 const valid=map=>Object.entries(map||{}).filter(([,r])=>r&&Number.isInteger(r.e)&&typeof r.t==='number');
 return{
  clear(){key=null;last={};},
  update(map,code=''){
   const entries=valid(map);
   if(key!==code){key=code;last=Object.fromEntries(entries.map(([slot,r])=>[slot,r.t]));return[];}
   const fresh=entries.filter(([slot,r])=>r.t>(last[slot]??-Infinity)).map(([slot,r])=>({slot:Number(slot),e:r.e,t:r.t}));
   for(const r of fresh)last[r.slot]=r.t;
   return fresh.sort((a,b)=>a.t-b.t);
  }
 };
}
