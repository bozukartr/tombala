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
