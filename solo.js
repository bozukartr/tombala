// Tek cihazda oynanan masa. Firebase kullanmaz; çekiliş, işaretleme ve ödüller
// çevrimiçi odadaki aynı kurallarla (core.js) bellekte yürür. Botlar insan gibi
// gecikmeyle işaretler; uygulama arka plana geçince oyun duraklatılır.
import {STAGES,newRoom,newPlayer,members,startRound,drawNext,markNumber,resetRound,setPace,decodeCard,cardPatch,makeCard,drawnNumbers,markedNumbers,validateCard,REACTIONS} from './core.js';

export const BOT_LEVELS=[{id:'kolay',label:'Rahat'},{id:'orta',label:'Orta'},{id:'zor',label:'Çevik'}];
// [en kısa, en uzun tepki süresi (ms), dalgınlık olasılığı]
const LEVELS={kolay:[2400,5600,.2],orta:[1300,3600,.1],zor:[650,2100,.04]};
export const BOT_NAMES=['Nine','Dede','Hala','Dayı','Teyze','Kuzen'];
const DEMO_NAMES=['Deniz','Ece','Can'];
const ME='me';

const realClock={now:()=>Date.now(),setTimeout:(fn,ms)=>setTimeout(fn,ms),clearTimeout:id=>clearTimeout(id)};

export function createLocalTransport({mode='solo',clock=realClock,random=Math.random,bots:botCount=3}={}){
 let state=null,onRoom=null,onReactions=null,level='orta',paused=false,frozen=false,drawTimer=null,reactionClock=0;
 const markTimers=new Map(),extraTimers=new Set(),reactions={};
 const emit=()=>onRoom?.(state?structuredClone(state):null);
 const me=()=>members(state).find(([,p])=>p.uid===ME)?.[1];
 const bots=()=>members(state).filter(([,p])=>p.bot);
 const pick=list=>list[Math.floor(random()*list.length)%list.length];
 function later(fn,ms){const id=clock.setTimeout(()=>{extraTimers.delete(id);fn();},ms);extraTimers.add(id);}
 function clearTimers(){
  clock.clearTimeout(drawTimer);drawTimer=null;
  for(const id of markTimers.values())clock.clearTimeout(id);markTimers.clear();
  for(const id of extraTimers)clock.clearTimeout(id);extraTimers.clear();
 }
 function react(slot,index){
  if(!state||!Number.isInteger(index)||index<0||index>=REACTIONS.length)return;
  reactionClock=Math.max(clock.now(),reactionClock+1);
  reactions[slot]={e:index,t:reactionClock};
  onReactions?.(structuredClone(reactions));
 }
 function botName(){
  const used=new Set(members(state).map(([,p])=>p.name.toLocaleLowerCase('tr')));
  const pool=(mode==='demo'?DEMO_NAMES:BOT_NAMES).filter(name=>!used.has(name.toLocaleLowerCase('tr')));
  return pool.length?pick(pool):'Bot';
 }
 function addBotAt(slot){
  const p=newPlayer('bot-'+slot+'-'+state.meta.round,botName(),slot);
  Object.assign(p,{bot:true,readyRound:state.meta.round});
  state.players[slot]=p;
 }
 function botDelay(){
  const [min,max,doze]=LEVELS[level]||LEVELS.orta;
  let delay=min+random()*(max-min);
  if(random()<doze)delay+=3500+random()*5500;
  return Math.round(delay);
 }
 // Çıkmış ama işaretlenmemiş her bot sayısı için tek bir zamanlayıcı kurulur.
 function scheduleBots(){
  if(frozen||paused||state?.meta.phase!=='playing')return;
  const drawn=new Set(drawnNumbers(state.game));
  for(const [,p] of bots()){
   const marked=new Set(markedNumbers(p));
   for(const n of decodeCard(p.card)){
    const key=p.uid+':'+n;
    if(!n||!drawn.has(n)||marked.has(n)||markTimers.has(key))continue;
    markTimers.set(key,clock.setTimeout(()=>{markTimers.delete(key);botMark(p.uid,n);},botDelay()));
   }
  }
 }
 function scheduleDraw(){
  clock.clearTimeout(drawTimer);drawTimer=null;
  if(frozen||paused||state?.meta.phase!=='playing'||!state.game.auto)return;
  const wait=Math.max(0,state.game.updatedAt+state.game.interval-clock.now());
  drawTimer=clock.setTimeout(()=>{drawTimer=null;draw();},wait);
 }
 function draw(){
  if(state?.meta.phase!=='playing')return;
  drawNext(state,clock.now());emit();scheduleBots();scheduleDraw();
 }
 const claimed=()=>Object.fromEntries(STAGES.map(key=>[key,state.game.awards[key].uid]));
 function afterMark(before){
  if(state.meta.phase!=='playing')clearTimers();
  emit();
  for(const key of STAGES)if(!before[key]&&state.game.awards[key].uid)cheer(state.game.awards[key].uid,key);
 }
 function botMark(uid,n){
  if(paused||state?.meta.phase!=='playing')return;
  const before=claimed();
  try{markNumber(state,uid,n);}catch{return;}
  afterMark(before);
 }
 // Botlar ödüllere kısa tepkiler verir; masada canlılık hissi oluşturur.
 function cheer(winner,kind){
  if(frozen)return;
  const own=bots().find(([,p])=>p.uid===winner),fans=bots().filter(([,p])=>p.uid!==winner);
  if(own&&random()<.7)later(()=>react(Number(own[0]),kind==='tombala'?1:pick([1,3])),400+random()*900);
  if(fans.length&&random()<.8){const [slot]=pick(fans);later(()=>react(Number(slot),winner===ME?0:pick([0,2])),700+random()*1400);}
 }
 function freshBots(){
  for(const [slot,p] of bots())Object.assign(state.players[slot],cardPatch(makeCard()),{readyRound:state.meta.round,online:true,uid:p.uid});
 }
 return{
  mode,
  uid:()=>ME,
  code:()=>mode==='demo'?'2468':'',
  savedRoom:()=>null,
  connect:async()=>ME,
  level:()=>level,
  async create(name){
   clearTimers();paused=false;frozen=false;
   state=newRoom(ME,name);
   const count=mode==='demo'?3:Math.min(3,Math.max(1,botCount));
   for(let slot=1;slot<=count;slot++)addBotAt(slot);
   return this.code();
  },
  async join(code,name){return this.create(name);},
  async watch(fn,onConnection){onRoom=fn;onConnection?.(true);emit();scheduleBots();scheduleDraw();},
  watchReactions(fn){onReactions=fn;fn(structuredClone(reactions));},
  async editPlayer(changes){
   if(!state)return;
   if(state.meta.phase!=='lobby')throw new Error('Kartlar yalnızca lobide değiştirilebilir.');
   if(changes.card!==undefined){const card=decodeCard(changes.card),error=validateCard(card);if(error)throw new Error(error);changes={...changes,...cardPatch(card)};}
   Object.assign(me(),changes);emit();
  },
  async hostAction(action,value){
   if(!state)return;
   if(action==='start'){
    if(mode==='solo')me().readyRound=state.meta.round;
    startRound(state,clock.now());emit();scheduleDraw();return;
   }
   if(action==='draw'){draw();return;}
   if(action==='pace'){setPace(state,value,clock.now());emit();scheduleDraw();return;}
   if(action==='reset'){clearTimers();resetRound(state);freshBots();emit();return;}
  },
  async mark(n){
   if(state?.meta.phase!=='playing')throw new Error('Tur henüz başlamadı veya tamamlandı.');
   const before=claimed();markNumber(state,ME,n);afterMark(before);return true;
  },
  async react(index){const slot=members(state).find(([,p])=>p.uid===ME)?.[0];if(slot!==undefined)react(Number(slot),index);},
  addBot(){
   if(state?.meta.phase!=='lobby')return;
   const slot=[1,2,3].find(s=>!state.players[s]);if(slot===undefined)return;
   addBotAt(slot);emit();
  },
  removeBot(slot){
   if(state?.meta.phase!=='lobby'||!state.players[slot]?.bot||bots().length<=1)return;
   delete state.players[slot];emit();
  },
  setLevel(id){if(LEVELS[id]){level=id;emit();}},
  // Uygulama görünmez olduğunda çekiliş ve bot zamanlayıcıları durur.
  setPaused(flag){
   if(paused===flag)return;
   paused=flag;
   if(flag){clearTimers();return;}
   if(state?.meta.phase==='playing'&&state.game.auto){state.game.updatedAt=clock.now();emit();}
   scheduleBots();scheduleDraw();
  },
  isPaused:()=>paused,
  async claimHost(){},
  async leave(){clearTimers();state=null;onRoom=null;onReactions=null;},
  async abandon(){clearTimers();state=null;onRoom=null;onReactions=null;},
  // Önizleme sahneleri için sabit kartlar, çekiliş ve işaretler. Botlar dondurulur.
  async prepare(scene){
   frozen=true;clearTimers();
   const cards=[[1,0,24,0,43,0,62,70,0,0,14,0,33,0,54,0,75,85,4,0,29,0,45,0,69,0,81],[3,0,22,0,45,0,60,72,0,0,18,0,38,0,51,0,78,81,7,0,29,0,48,0,66,0,86],[8,10,0,36,0,50,0,71,0,0,15,26,0,40,0,60,0,83,2,0,21,39,0,56,0,74,0],[6,11,0,35,0,50,0,72,0,0,15,27,0,44,0,63,0,82,8,0,28,37,0,59,0,77,0]];
   members(state).forEach(([slot,p],i)=>{Object.assign(p,cardPatch(cards[i]),{readyRound:state.meta.round});state.players[slot].name=i?DEMO_NAMES[i-1]:p.name;});
   if(scene==='lobby')return;
   const uids=members(state).map(([,p])=>p.uid);
   const play=(drawn,marks)=>{
    startRound(state,clock.now());state.game.auto=false;state.meta.pace=0;
    state.game.drawn=','+drawn.join(',')+',';state.game.lastDraw=drawn.at(-1);
    for(const [i,n] of marks)markNumber(state,uids[i],n);
   };
   if(scene==='game'){
    play([1,3,22,24,43,45,60,62,14,33,8,50,36,11,35,18,29,66,70],[[1,3],[0,1],[1,22],[0,24],[2,8],[1,45],[0,43],[3,11],[2,36],[1,60],[0,62],[3,35],[2,50],[0,14],[3,50],[1,18],[0,29],[3,8],[1,29],[2,60],[1,66]]);
    return;
   }
   // Önceki iki turun puanları; bu turda Deniz 1. çinkoyu, oyuncu 2. çinko ve tombalayı alır.
   state.meta.round=3;
   members(state).forEach(([,p],i)=>{p.score=[0,2,3,1][i];p.readyRound=3;});
   play([1,3,24,90,22,8,43,45,11,62,36,52,60,35,72,70,50,14,7,33,54,75,85,15,66,4,29,69,18,81],[[0,1],[1,3],[0,24],[1,22],[2,8],[0,43],[1,45],[3,11],[0,62],[2,36],[1,60],[3,35],[1,72],[0,70],[2,50],[0,14],[0,33],[3,50],[0,54],[0,75],[0,85],[2,15],[0,4],[0,29],[0,45],[0,69],[0,81]]);
  },
 };
}
