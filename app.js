import {COLORS,COLOR_NAMES,STAGES,STAGE_LABELS,STAGE_POINTS,PACES,REACTIONS,range,makeCard,encodeCard,decodeCard,validateCard,progress,drawnNumbers,markedNumbers,members,canStart,columnRange,CARD_COLUMNS,CARD_SIZE,CARD_ID_INDEX,hasCardNumber,nextStage,remainingFor,numberWord,standings} from './core.js';
import {createAwardFeed,createReactionFeed} from './game-events.js';
import {settings,saveSetting,unlockAudio,sfx,callNumber,voiceSupported,voiceStatus,haptics,keepAwake,wakeSupported,confetti} from './fx.js';

const VERSION='4.0.0';
const $=selector=>document.querySelector(selector);
const app=$('#app'),dock=$('#action-dock'),topbar=$('#topbar'),sheet=$('#sheet');
const params=new URLSearchParams(location.search);
const demo=params.get('demo')==='1';
const ONLINE_SESSION='tombala-room-v5';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n||'').padStart(2,'0');
const initial=name=>escape(String(name||'').trim().charAt(0).toLocaleUpperCase('tr')||'?');
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const svg=(body,extra='')=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
const icons={
 back:svg('<path d="m15 5-7 7 7 7"/>'),
 arrow:svg('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
 settings:svg('<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>'),
 help:svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17h.01" stroke-width="2.6"/>'),
 lock:svg('<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
 share:svg('<path d="M12 15V3.5m-4.5 4L12 3l4.5 4.5"/><path d="M5 12.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5"/>'),
 copy:svg('<rect x="8.5" y="8.5" width="12" height="12" rx="3"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>'),
 shuffle:svg('<path d="M3 7h3.5c4 0 5 10 9 10H21m0 0-3-3m3 3-3 3M3 17h3.5c1.4 0 2.4-1.2 3.2-2.8M21 7h-5.5c-1.4 0-2.4 1.2-3.2 2.8M21 7l-3-3m3 3-3 3"/>'),
 cards:svg('<rect x="3.5" y="6.5" width="13" height="13" rx="2.5"/><path d="M7.5 3.5h9a4 4 0 0 1 4 4v9"/>'),
 edit:svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
 grid:svg('<path d="M5 5h.01M12 5h.01M19 5h.01M5 12h.01M12 12h.01M19 12h.01M5 19h.01M12 19h.01M19 19h.01" stroke-width="3.2"/>'),
 pause:svg('<path d="M8.5 5v14m7-14v14" stroke-width="2.4"/>'),
 play:svg('<path d="M7.5 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/>'),
 smile:svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>'),
 close:svg('<path d="m6 6 12 12M18 6 6 18" stroke-width="2.2"/>'),
 check:svg('<path d="m5 12.5 4.5 4.5L19 7.5" stroke-width="3"/>'),
 bot:svg('<rect x="4.5" y="8" width="15" height="11" rx="4"/><path d="M12 8V4.5M9.5 13h.01M14.5 13h.01" stroke-width="2.4"/><path d="M2.5 13v2m19-2v2"/>'),
 crown:svg('<path d="M4 18 3 7.5l5 4L12 5l4 6.5 5-4L20 18H4Z" fill="currentColor" stroke-width="1.5"/>','class="crown"'),
 plus:svg('<path d="M12 5v14M5 12h14" stroke-width="2.2"/>'),
 sound:svg('<path d="M11 5 6.5 9H3.5v6h3L11 19V5Z"/><path d="M15.5 9a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12"/>'),
 voice:svg('<path d="M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3Z"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
 vibrate:svg('<rect x="7.5" y="3.5" width="9" height="17" rx="2.5"/><path d="M3.5 9v6m17-6v6"/>'),
 sun:svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2M4.5 4.5 6 6m12 12 1.5 1.5M2.5 12h2m15 0h2M4.5 19.5 6 18M18 6l1.5-1.5"/>'),
 book:svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
 tool:svg('<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5Z"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>'),
 chevron:svg('<path d="m9 5 7 7-7 7"/>'),
 trash:svg('<path d="M4.5 7h15M9.5 7V4.5h5V7m-8 0 1 13h9l1-13"/>'),
};
const BRAND_MARK='<svg viewBox="0 0 128 128"><path d="M57 27v51.5C57 89 63 95 73 95h5M40 51h37" fill="none" stroke="#fffaf2" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="98" cy="93" r="9.5" fill="#ffd380"/></svg>';
const REACTION_NAMES=['Alkış','Ateş','Şaşkın','Kahkaha','Eyvah'];

let transport=null,room=null,prevRoom=null,connected=false,busy=false,screenKey='',sheetKind=null,sheetArg=null,lastFocus=null;
let toastTimer,eventTimer,countdownTimer,tickTimer,resultsTimer,ticking=false,trayOpen=false,lastReactionAt=0,resultsHoldUntil=0,statsKey='',ringState={key:'',start:0};
let customCard=null,choices=[];
const awardFeed=createAwardFeed(),reactionFeed=createReactionFeed();
let eventQueue=[],activeEvent=null,freshAwards=new Set();
const markPending=new Set(),tapped=new Set();

// --- Yardımcılar -------------------------------------------------------------
const defaultName=()=>{try{return localStorage.getItem('tombala-name')||'';}catch{return '';}};
function rememberName(name){try{localStorage.setItem('tombala-name',name);}catch{}}
function loadStats(){try{return{rounds:0,tombala:0,cinko:0,...JSON.parse(localStorage.getItem('tombala-stats')||'{}')};}catch{return{rounds:0,tombala:0,cinko:0};}}
function toast(message,error=false){const box=$('#toast');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;box.style.animation='none';void box.offsetWidth;box.style.animation='';clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,error?6500:2800);}
function announce(message){const el=$('#announcer');el.textContent='';setTimeout(()=>el.textContent=message,40);}
// Bölüm yalnızca içeriği değiştiyse yeniden çizilir; böylece animasyonlar ve odak korunur.
function patch(el,html){if(el&&el._html!==html){el.innerHTML=html;el._html=html;}}
function setDock(html){dock._html=null;dock.innerHTML=html;}
const patchDock=html=>patch(dock,html);
const me=()=>transport?.uid();
const self=()=>members(room).find(([,p])=>p.uid===me())?.[1];
const slotOf=uid=>members(room).find(([,p])=>p.uid===uid)?.[0];
const playerByUid=uid=>members(room).find(([,p])=>p.uid===uid)?.[1];
const isHost=()=>room?.meta.hostId===me();
const isSolo=()=>transport?.mode==='solo';
const isOnline=()=>transport?.mode==='online';
const roomKey=()=>room?`${transport.mode}:${transport.code()}:${room.meta.createdAt}:${room.meta.round}`:'';
function avatar(p,extra=''){return `<span class="avatar ${COLORS[p?.color]||'sage'} ${extra}" aria-hidden="true">${initial(p?.name)}</span>`;}
function nearFor(p){
 const stage=nextStage(room.game.awards);if(!stage||room.meta.phase!=='playing')return{stage,need:Infinity};
 return{stage,need:remainingFor(decodeCard(p.card),markedNumbers(p),stage)};
}
const nearLabel=stage=>stage==='tombala'?'Tombalaya':'Çinkoya';
function freshMarks(p){
 const before=prevRoom&&members(prevRoom).find(([,x])=>x.uid===p.uid)?.[1];
 if(!before||prevRoom.meta.round!==room.meta.round)return new Set();
 const old=new Set(markedNumbers(before));return new Set(markedNumbers(p).filter(n=>!old.has(n)));
}

// --- Kart -----------------------------------------------------------------------
function ticket(card,{color=0,marked=[],cardNo=1,interactive=false,compact=false,flat=false,head='',fresh=new Set(),pending=new Set(),completed=[],uid='',label='Tombala kartı'}={}){
 const set=new Set(marked),done=new Set(completed),canMark=interactive&&connected&&room?.meta.phase==='playing';
 const cells=card.map((n,i)=>{
  const row=Math.floor(i/CARD_COLUMNS);
  if(i===CARD_ID_INDEX)return `<span class="cell card-id" aria-label="Kart numarası ${cardNo}, oyun sayısı değil"><small>KART</small><b>${pad(cardNo)}</b></span>`;
  if(!n)return `<span class="cell blank ${done.has(row)?'done':''}" aria-hidden="true"></span>`;
  const hit=set.has(n)||pending.has(n),cls=`cell${hit?' marked':''}${hit&&done.has(row)?' done':''}${fresh.has(n)?' stamp':''}${pending.has(n)?' pending':''}`;
  if(interactive)return `<button type="button" class="${cls}" data-action="mark" data-number="${n}" data-row="${row}" aria-label="${n}${hit?', işaretli':''}" ${hit||!canMark?'disabled':''}>${n}</button>`;
  return `<span class="${cls}" data-row="${row}" aria-label="${n}${hit?', işaretli':''}">${n}</span>`;
 }).join('');
 return `<div class="ticket ${COLORS[color]||'sage'}${compact?' compact':''}${flat?' flat':''}" ${uid?`data-player="${escape(uid)}"`:''}>${head}<div class="ticket-grid" role="group" aria-label="${escape(label)}">${cells}</div></div>`;
}
function miniGrid(card,marked,fresh){
 const set=new Set(marked);
 return `<div class="mini-grid" aria-hidden="true">${card.map((n,i)=>i===CARD_ID_INDEX?'<i class="id"></i>':!n?'<i class="b"></i>':set.has(n)?`<i class="h${fresh.has(n)?' new':''}"></i>`:'<i></i>').join('')}</div>`;
}
const ballHTML=n=>`<div class="ball${n?' drop':' empty'}"><span class="ball-face">${n||'?'}</span></div>`;

// --- Üst çubuk ------------------------------------------------------------------
function renderTopbar(view){
 if(view==='home'){patch(topbar,`<div class="brand" aria-label="tombala"><span class="brand-mark" aria-hidden="true">${BRAND_MARK}</span><span aria-hidden="true">tombala<span class="brand-dot">.</span></span></div><div class="spacer"></div><button class="icon-btn" data-action="help" aria-label="Nasıl oynanır?">${icons.help}</button><button class="icon-btn" data-action="settings" aria-label="Ayarlar">${icons.settings}</button>`);return;}
 const title={lobby:'Lobi',game:`${room.meta.round}. tur`,results:'Tur bitti'}[view];
 const where=isSolo()?'Botlarla oyun':`Oda ${transport.code()}`,live=isSolo()?'':`<i class="conn${connected?'':' off'}" aria-hidden="true"></i>`;
 patch(topbar,`<button class="icon-btn" data-action="leave" aria-label="Masadan ayrıl">${icons.back}</button><div class="topbar-title"><h1>${title}</h1><p>${live}${where}${connected?'':' · bağlanıyor'}</p></div><button class="icon-btn" data-action="settings" aria-label="Ayarlar">${icons.settings}</button>`);
}

// --- Ana ekran ------------------------------------------------------------------
function renderHome(){
 room=null;prevRoom=null;screenKey='home';document.body.dataset.screen='home';
 clearCelebrations();awardFeed.clear();reactionFeed.clear();keepAwake(false);trayOpen=false;resultsHoldUntil=0;clearTimeout(tickTimer);clearTimeout(resultsTimer);
 markPending.clear();tapped.clear();
 renderTopbar('home');
 const name=defaultName(),stats=loadStats();
 app.innerHTML=`<div class="screen home-screen">
  ${demo?'<span class="demo-banner">Önizleme · çevrimiçi oda oluşturmaz</span>':''}
  <section class="hero">
   <div class="hero-art" aria-hidden="true">${[42,7,90].map(n=>`<span class="hero-ball">${ballHTML(n).replace(' drop','')}</span>`).join('')}</div>
   <h1>Şansın bol olsun.</h1>
   <p>Sevdiklerinle aynı masada, nerede olursanız olun.</p>
  </section>
  <div class="panel name-card" data-action="focus-name">
   <span class="avatar coral" id="name-avatar" aria-hidden="true">${initial(name||'?')}</span>
   <span class="name-field"><label for="player-name">Oyuncu adın</label><input id="player-name" name="name" placeholder="Adın veya takma adın" value="${escape(name)}" maxlength="16" autocomplete="nickname" enterkeyhint="done" spellcheck="false"></span>
  </div>
  <p class="inline-error" id="home-error" role="alert"></p>
  ${stats.rounds?`<p class="stats-line">${stats.rounds} tur oynadın · ${stats.tombala} tombala · ${stats.cinko} çinko</p>`:''}
 </div>`;
 setDock(homeDock());
}
const homeDock=()=>`<div class="home-actions"><button class="btn btn-primary" data-action="create">Oda kur ${icons.arrow}</button><button class="btn btn-secondary" data-action="join-open">Odaya katıl</button><button class="btn btn-secondary" data-action="solo">${icons.bot} Botlarla</button></div><p class="dock-caption">${icons.lock} Üyelik yok · anonim katılırsın</p>`;
function readName(errorTarget){
 const input=$('#player-name'),name=(input?.value||defaultName()).trim().slice(0,16);
 if(!name){if(errorTarget)errorTarget.textContent='Masaya oturmak için önce adını yaz.';input?.focus();haptics.wrong();throw Object.assign(new Error(''),{silent:true});}
 rememberName(name);return name;
}

// --- Oda akışı ------------------------------------------------------------------
async function useOnline(){
 if(demo){const {createLocalTransport}=await import('./solo.js');transport=createLocalTransport({mode:'demo'});return;}
 if(transport?.mode!=='online')transport=await import('./firebase.js');
}
async function useSolo(){const {createLocalTransport}=await import('./solo.js');transport=createLocalTransport({mode:'solo'});}
async function enterRoom(){
 screenKey='';
 await transport.watch(onRoom,onConnection,error=>toast(error.message,true));
 transport.watchReactions?.(onReactions);
}
function leaveToHome(message){
 transport?.abandon?.().catch(()=>{});
 if(message)toast(message,true);
 if(sheet.open)closeSheet(true);
 renderHome();
}
function onRoom(next){
 if(!next){leaveToHome('Bu oda kapanmış. Yeni bir masa kurabilirsin.');return;}
 if(room&&(room.meta.round!==next.meta.round||room.meta.createdAt!==next.meta.createdAt)){clearCelebrations();tapped.clear();}
 prevRoom=room;room=next;
 if(!self()){leaveToHome('Masadaki yerin kaldırılmış. Tekrar katılabilirsin.');return;}
 const events=awardFeed.update(room,roomKey());
 for(const e of events){freshAwards.add(e.kind);setTimeout(()=>freshAwards.delete(e.kind),1500);}
 eventQueue.push(...events);
 const live=prevRoom&&prevRoom.meta.round===room.meta.round&&prevRoom.meta.createdAt===room.meta.createdAt;
 if(live&&room.meta.phase==='playing'&&drawnNumbers(room.game).length>drawnNumbers(prevRoom.game).length)onDraw(room.game.lastDraw);
 if(live&&prevRoom.meta.phase==='lobby'&&room.meta.phase==='playing')countdown();
 if(live&&prevRoom.meta.phase==='playing'&&room.meta.phase==='finished'){
  resultsHoldUntil=Date.now()+2600;recordStats();
  clearTimeout(resultsTimer);resultsTimer=setTimeout(()=>{if(room?.meta.phase==='finished')render();},2650);
 }
 render();playNextEvent();scheduleHostTick();
}
function onConnection(value){
 connected=value;
 if(room)render();
}
function render(){
 if(!room)return;
 const phase=room.meta.phase,view=phase==='lobby'?'lobby':phase==='playing'||Date.now()<resultsHoldUntil?'game':'results';
 const key=`${view}:${roomKey()}`,rebuild=key!==screenKey,draw=()=>{
  document.body.dataset.screen=view;
  if(view==='lobby')renderLobby(rebuild);else if(view==='game')renderGame(rebuild);else renderResults(rebuild);
  if(rebuild){app.scrollTop=0;app.focus({preventScroll:true});}
 };
 const animated=rebuild&&screenKey&&screenKey!=='home'&&document.startViewTransition&&!reducedMotion()&&!document.hidden;
 screenKey=key;
 if(animated)document.startViewTransition(draw);else draw();
 if(sheet.open)refreshSheet();
 keepAwake(view==='game'&&phase==='playing');
}

// --- Lobi -----------------------------------------------------------------------
function renderLobby(rebuild){
 if(rebuild||!$('#l-seats')){
  app.innerHTML=`<div class="screen lobby-screen">${demo?'<span class="demo-banner">Önizleme · örnek oyuncular</span>':''}<div id="l-note"></div><section id="l-invite"></section><section id="l-seats"></section><section id="l-card"></section><section id="l-settings"></section><section id="l-scores"></section></div>`;
 }
 renderTopbar('lobby');
 patch($('#l-note'),hostNotice());
 patch($('#l-invite'),inviteHTML());
 patch($('#l-seats'),seatsHTML());
 patch($('#l-card'),lobbyCardHTML());
 patch($('#l-settings'),roomSettingsHTML());
 patch($('#l-scores'),scoresHTML(false));
 patchDock(lobbyDock());
}
function hostNotice(){
 if(isSolo())return '';
 const host=playerByUid(room.meta.hostId);
 if(host?.online||isHost())return connected||isSolo()?'':'<p class="notice"><span>Bağlantı yeniden kuruluyor. İşaretlemek için birkaç saniye bekle.</span></p>';
 return `<div class="notice"><span>Oda sahibinin bağlantısı kesildi.</span><button class="btn" data-action="claim">Devral</button></div>`;
}
function inviteHTML(){
 if(isSolo())return '';
 const code=transport.code();
 return `<div class="panel"><div class="invite"><div class="invite-main"><span class="label">Oda kodu</span><button class="code" data-action="copy" aria-label="Oda kodu ${code}, kopyala">${code.split('').map(n=>`<span>${n}</span>`).join('')}</button></div><button class="icon-btn share" data-action="share" aria-label="Davet bağlantısını paylaş">${icons.share}</button></div><p class="invite-note">Kodu paylaş, sevdiklerin masaya katılsın.</p></div>`;
}
function seatsHTML(){
 const list=members(room),count=list.length,readyCount=list.filter(([,p])=>p.online&&p.readyRound===room.meta.round).length;
 const seat=slot=>{
  const p=room.players?.[slot];
  if(!p)return isSolo()?`<button class="seat empty" data-action="add-bot"><span class="avatar" aria-hidden="true">+</span><span class="seat-name">Bot ekle</span></button>`:`<button class="seat empty" data-action="share"><span class="avatar" aria-hidden="true">+</span><span class="seat-name">Davet et</span></button>`;
  const ready=p.readyRound===room.meta.round&&p.online,own=p.uid===me();
  const status=isSolo()?(own?'Sen':'Bot'):!p.online?'Çevrimdışı':p.uid===room.meta.hostId&&!ready?'Oda sahibi':ready?'Hazır':'Kart seçiyor';
  return `<button class="seat${own?' me':''}${p.online?'':' offline'}" data-action="peek" data-slot="${slot}" aria-label="${escape(p.name)}, ${status}${p.score?`, ${p.score} puan`:''}">${avatar(p).replace('</span>',`${ready&&!isSolo()?`<span class="tick">${icons.check}</span>`:''}${p.score?`<span class="badge">${p.score}</span>`:''}</span>`)}<span class="seat-name">${escape(p.name)}</span><small>${status}</small></button>`;
 };
 return `<div class="section-head"><h2>Masadakiler</h2><span>${isSolo()?`${count} oyuncu`:`${readyCount}/${count} hazır`}</span></div><div class="seats">${range(4).map(seat).join('')}</div>${isHost()&&isOnline()&&list.some(([,p])=>!p.online)?'<button class="text-btn" data-action="prune">Çevrimdışı oyuncuları çıkar</button>':''}`;
}
function lobbyCardHTML(){
 const p=self(),ready=p.readyRound===room.meta.round&&!isSolo(),locked=ready?'disabled':'';
 return `<div class="section-head"><h2>Kartın</h2><span>${ready?'Hazırsın · kart kilitli':`Kart ${pad(p.cardNo)}`}</span></div>
 ${ticket(decodeCard(p.card),{color:p.color,cardNo:p.cardNo,label:'Seçtiğin kart'})}
 <div class="tools"><button class="btn btn-secondary" data-action="shuffle" ${locked}>${icons.shuffle} Yenile</button><button class="btn btn-secondary" data-action="choose" ${locked}>${icons.cards} Seç</button><button class="btn btn-secondary" data-action="custom" ${locked}>${icons.edit} Yaz</button></div>
 <div class="swatches" role="group" aria-label="Kart rengi"><span class="label">Renk</span>${COLORS.map((c,i)=>`<button class="swatch ${c}" data-action="color" data-color="${i}" aria-label="${COLOR_NAMES[i]}" aria-pressed="${p.color===i}" ${locked}></button>`).join('')}</div>`;
}
function roomSettingsHTML(){
 const pace=room.meta.pace??5000,editable=isHost();
 const paceRow=`<div class="setting-row"><span class="label">Çekiliş <span>${pace?'otomatik':editable?'sen çekersin':'oda sahibi çeker'}</span></span><div class="segmented${editable?'':' readonly'}" role="group" aria-label="Çekiliş hızı">${[0,...PACES].map(v=>`<button data-action="pace" data-pace="${v}" aria-pressed="${pace===v}" ${editable?'':'disabled'}>${v?v/1000+' sn':'Elle'}</button>`).join('')}</div></div>`;
 const level=isSolo()?transport.level():'';
 const botRow=isSolo()?`<div class="setting-row"><span class="label">Botlar <span>tepki hızı</span></span><div class="segmented" role="group" aria-label="Bot hızı">${[['kolay','Rahat'],['orta','Orta'],['zor','Çevik']].map(([id,label])=>`<button data-action="bot-level" data-level="${id}" aria-pressed="${level===id}">${label}</button>`).join('')}</div></div>`:'';
 return `<div class="panel">${paceRow}${botRow}</div>`;
}
function roundPoints(uid){return STAGES.reduce((sum,key)=>sum+(room.game.awards[key].uid===uid?STAGE_POINTS[key]:0),0);}
function scoresHTML(withDelta){
 const list=standings(room);
 if(!withDelta&&list.every(s=>!s.score))return '';
 const played=room.meta.round-(room.meta.phase==='finished'?0:1);
 return `<div class="section-head"><h2>Puan durumu</h2><span>${played} tur</span></div><div class="panel scores">${list.map((s,i)=>{const delta=withDelta?roundPoints(s.player.uid):0;return `<div class="score-row${i===0&&s.score?' lead':''}"><span class="rank">${i+1}</span>${avatar(s.player)}<span class="who"><b>${escape(s.player.name)}${s.player.uid===me()?' (sen)':''}</b><small>${withDelta?`${s.hits}/15 işaret`:s.player.bot?'Bot':'Oyuncu'}</small></span><span class="pts">${s.score}<small>puan</small>${delta?`<span class="delta">+${delta}</span>`:''}</span></div>`;}).join('')}</div>`;
}
function lobbyDock(){
 if(isSolo())return `<button class="btn btn-primary full" data-action="start">Başla ${icons.arrow}</button>`;
 const p=self(),list=members(room),count=list.length,ready=p.readyRound===room.meta.round,can=canStart(room);
 const readyCount=list.filter(([,x])=>x.online&&x.readyRound===room.meta.round).length;
 const line=`<div class="dock-line"><i class="dot${can?' ready':''}"></i><span>${count<2?'Başlamak için en az 2 kişi gerekiyor.':can?'Herkes hazır.':`${readyCount}/${count} oyuncu hazır`}</span>${ready?'<button class="text-btn" data-action="ready">Vazgeç</button>':''}</div>`;
 const button=!ready?`<button class="btn btn-primary full" data-action="ready">Kartım tamam, hazırım ${icons.arrow}</button>`:isHost()?`<button class="btn btn-primary full" data-action="start" ${can?'':'disabled'}>${can?`Oyunu başlat ${icons.arrow}`:'Diğer oyuncular bekleniyor'}</button>`:`<button class="btn btn-secondary full" disabled>Hazırsın · oda sahibi başlatacak</button>`;
 return line+button;
}

// --- Oyun -----------------------------------------------------------------------
function renderGame(rebuild){
 if(rebuild||!$('#g-stage')){
  app.innerHTML=`<div class="screen game-screen"><div id="g-note"></div><section class="stage" id="g-stage"><div class="ball-wrap"><div id="g-ring"></div><div id="g-ball"></div></div><div class="stage-info" id="g-info"></div></section><div class="prizes" id="g-prizes"></div><div class="peers" id="g-peers"></div><section class="mine" id="g-mine"></section></div>`;
 }
 renderTopbar('game');
 const drawn=drawnNumbers(room.game),last=drawn.at(-1)||0;
 patch($('#g-note'),hostNotice());
 patch($('#g-ring'),ringHTML());
 patch($('#g-ball'),ballHTML(last));
 patch($('#g-info'),stageInfoHTML(drawn,last));
 patch($('#g-prizes'),prizesHTML());
 patch($('#g-peers'),peersHTML());
 patch($('#g-mine'),mineHTML());
 patchDock(gameDock());
 paintHighlights();
}
function ringHTML(){
 const g=room.game;
 if(room.meta.phase!=='playing'||!g.auto){ringState={key:'',start:0};return '';}
 const key=`${g.updatedAt}:${g.interval}`;
 if(ringState.key!==key){
  // Oda sahibi kendi saatini kullanır; diğer ekranlar güncellemenin geldiği andan sayar.
  const elapsed=isHost()||!isOnline()?Math.min(g.interval,Math.max(0,Date.now()-g.updatedAt)):0;
  ringState={key,start:Date.now()-elapsed};
 }
 const delay=-(Date.now()-ringState.start);
 return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true" data-key="${key}"><circle class="track" cx="60" cy="60" r="55"/><circle class="progress" cx="60" cy="60" r="55" style="animation-duration:${g.interval}ms;animation-delay:${delay}ms;--ring-ms:${g.interval}ms"/></svg>`;
}
function stageInfoHTML(drawn,last){
 const g=room.game,status=room.meta.phase!=='playing'?'Tur tamamlandı':g.auto?`Otomatik · ${g.interval/1000} sn`:isHost()?'Elle çekiliş':'Oda sahibi çekiyor';
 const recent=drawn.slice(-5,-1).reverse();
 return `<div class="stage-word">${last?numberWord(last):'İlk sayı bekleniyor'}</div><div class="stage-meta"><i class="dot${g.auto&&room.meta.phase==='playing'?'':' paused'}"></i><span class="tabular">${drawn.length}/90</span> · ${status}</div><button class="trail" data-action="numbers" aria-label="Çıkan tüm sayılar: ${drawn.length}">${recent.map(n=>`<span>${n}</span>`).join('')}<span class="all">${icons.grid}Tümü</span></button>`;
}
function prizesHTML(){
 const next=nextStage(room.game.awards);
 return STAGES.map(key=>{
  const a=room.game.awards[key],p=a.uid&&playerByUid(a.uid);
  return `<div class="prize${a.uid?' won':''}${key===next&&room.meta.phase==='playing'?' next':''}${a.uid&&freshAwards.has(key)?' fresh':''}"><b>${STAGE_LABELS[key]}<small>+${STAGE_POINTS[key]}</small></b><span>${p?`${avatar(p)}${escape(p.uid===me()?'Sen':p.name)}`:key===next?'Sırada':'—'}</span></div>`;
 }).join('');
}
function peersHTML(){
 return members(room).filter(([,p])=>p.uid!==me()).map(([slot,p])=>{
  const card=decodeCard(p.card),marked=markedNumbers(p),hits=progress(card,marked).hits,{stage,need}=nearFor(p);
  const near=need===1?'<span class="near">1 kaldı</span>':'';
  return `<button class="peer ${COLORS[p.color]}${p.online?'':' offline'}" data-player="${escape(p.uid)}" data-action="peek" data-slot="${slot}" aria-label="${escape(p.name)}: ${hits}/15 işaretli${need===1?`, ${nearLabel(stage).toLocaleLowerCase('tr')} 1 sayı kaldı`:''}${p.online?'':', çevrimdışı'}"><span class="peer-head">${avatar(p)}<span class="peer-name">${escape(p.name)}</span><span class="peer-count">${hits}</span></span>${miniGrid(card,marked,freshMarks(p))}${near}</button>`;
 }).join('');
}
function mineHTML(){
 const p=self(),card=decodeCard(p.card),marked=markedNumbers(p),st=progress(card,marked),{stage,need}=nearFor(p);
 const fresh=new Set([...freshMarks(p)].filter(n=>!tapped.has(n)));
 const head=`<div class="ticket-head">${avatar(p)}<h2>Kartın</h2>${need===1?`<span class="pill accent">${nearLabel(stage)} 1 kaldı</span>`:''}<span class="count">${st.hits}<small>/15</small></span></div>`;
 const hint=room.meta.phase!=='playing'?'':!connected?'Bağlantı bekleniyor…':marked.length?'':'Çıkan sayı kartındaysa ona dokun.';
 return ticket(card,{color:p.color,cardNo:p.cardNo,marked,interactive:true,head,fresh,pending:markPending,completed:st.completed,uid:p.uid,label:'Senin kartın'})+(hint?`<p class="mine-help">${hint}</p>`:'');
}
function gameDock(){
 const g=room.game,drawnCount=drawnNumbers(g).length,playing=room.meta.phase==='playing';
 const tray=trayOpen?`<div class="react-tray" role="group" aria-label="Tepkiler">${REACTIONS.map((e,i)=>`<button data-action="react" data-react="${i}" aria-label="${REACTION_NAMES[i]}">${e}</button>`).join('')}</div>`:'';
 const react=`<button class="round-btn" data-action="tray" aria-label="Tepki gönder" aria-expanded="${trayOpen}">${icons.smile}</button>`;
 if(!playing)return `${tray}<div class="dock-row">${react}<div class="dock-status grow"><i class="dot idle"></i>Tur tamamlandı</div></div>`;
 if(isHost()){
  const empty=drawnCount>=90;
  return `${tray}<div class="dock-row">${react}<button class="round-btn" data-action="toggle-auto" aria-label="${g.auto?'Otomatik çekilişi duraklat':'Otomatik çekilişi başlat'}" ${empty?'disabled':''}>${g.auto?icons.pause:icons.play}</button>${g.auto?`<button class="speed-btn" data-action="speed" aria-label="Çekiliş aralığı ${g.interval/1000} saniye, değiştir">${g.interval/1000} sn</button>`:''}<button class="btn btn-primary" data-action="draw" ${empty?'disabled':''}>${empty?'Torba boş':'Sayı çek'}</button></div>`;
 }
 return `${tray}<div class="dock-row">${react}<div class="dock-status grow"><i class="dot${g.auto?'':' idle'}"></i>${g.auto?`Otomatik çekiliş · ${g.interval/1000} sn`:'Oda sahibi sayıları çekiyor'}</div></div>`;
}
function onDraw(n){
 sfx.draw();callNumber(n);announce(`Çıkan sayı ${n}`);
}
// Kazanan kart ve tamamlanan satır, bildirim süresince tüm ekranlarda parlar.
function paintHighlights(){
 document.querySelectorAll('[data-player]').forEach(el=>{
  const hit=activeEvent?.uid===el.dataset.player;el.classList.toggle('award-flash',hit);
  el.querySelectorAll('.cell[data-row]').forEach(cell=>cell.classList.toggle('award-cell',hit&&(activeEvent.kind==='tombala'||Number(cell.dataset.row)===activeEvent.row)));
 });
}
function clearCelebrations(){clearTimeout(eventTimer);eventQueue=[];activeEvent=null;freshAwards=new Set();$('#celebration').hidden=true;}
function playNextEvent(){
 if(activeEvent||!eventQueue.length)return;
 activeEvent=eventQueue.shift();
 const p=playerByUid(activeEvent.uid),mine=activeEvent.uid===me(),kind=activeEvent.kind,box=$('#celebration');
 box.className=`celebration ${COLORS[p?.color]||'sage'}`;
 box.innerHTML=`${avatar(p)}<div><strong>${STAGE_LABELS[kind]}!</strong><p>${mine?'Tebrikler, bu senin!':`${escape(p?.name||'Oyuncu')} · Kart ${pad(p?.cardNo)}`}</p></div><span class="gain">+${STAGE_POINTS[kind]}</span>`;
 box.hidden=false;box.classList.remove('is-playing');void box.offsetWidth;box.classList.add('is-playing');
 paintHighlights();announce(`${STAGE_LABELS[kind]}: ${p?.name||'Oyuncu'}`);
 if(kind==='tombala'){sfx.tombala();haptics.tombala();confetti({count:mine?190:120});}
 else{sfx.award();haptics.award();if(mine)confetti({count:70,spread:.7});}
 eventTimer=setTimeout(()=>{box.hidden=true;activeEvent=null;paintHighlights();playNextEvent();},3200);
}
function countdown(){
 const box=$('#countdown');let n=3;clearTimeout(countdownTimer);
 const step=()=>{
  if(n>0){box.innerHTML=`<span>${n}</span>`;sfx.tick();n--;countdownTimer=setTimeout(step,720);}
  else{box.innerHTML='<span class="go">Başla!</span>';sfx.go();haptics.award();countdownTimer=setTimeout(()=>box.hidden=true,620);}
 };
 box.hidden=false;step();
}
function recordStats(){
 const key=roomKey();if(statsKey===key)return;statsKey=key;
 const stats=loadStats();stats.rounds++;
 for(const k of STAGES)if(room.game.awards[k].uid===me())stats[k==='tombala'?'tombala':'cinko']++;
 try{localStorage.setItem('tombala-stats',JSON.stringify(stats));}catch{}
}
// Oda sahibinin cihazı otomatik çekilişi zamanında tetikler; yerel masa kendi zamanlayıcısını kullanır.
function scheduleHostTick(){
 clearTimeout(tickTimer);
 if(!room||!isOnline()||!isHost()||room.meta.phase!=='playing'||!room.game.auto)return;
 tickTimer=setTimeout(hostTick,Math.max(0,room.game.updatedAt+room.game.interval-Date.now())+60);
}
async function hostTick(){
 if(ticking)return;ticking=true;
 try{await transport.hostAction('tick');}catch(error){if(!/bağlan/i.test(error.message))toast(error.message,true);}
 finally{ticking=false;}
}
setInterval(()=>{if(room&&isOnline()&&isHost()&&room.meta.phase==='playing'&&room.game.auto&&Date.now()-room.game.updatedAt>room.game.interval+1500)hostTick();},1500);

// --- Sonuç ----------------------------------------------------------------------
function renderResults(rebuild){
 if(rebuild||!$('#r-hero')){
  app.innerHTML=`<div class="screen results-screen"><section class="result-hero" id="r-hero"></section><section id="r-awards"></section><section id="r-scores"></section><p class="result-note">Kartlar lobide yeniden seçilir, puanlar korunur.</p></div>`;
 }
 renderTopbar('results');
 const t=room.game.awards.tombala,w=playerByUid(t.uid),mine=t.uid===me(),drawn=drawnNumbers(room.game).length;
 patch($('#r-hero'),`<div class="winner-wrap">${icons.crown}${avatar(w)}</div><h1>Tombala!</h1><p>${mine?'Şans bu tur seninleydi.':`<b>${escape(w?.name||'Bir oyuncu')}</b> bu turun şanslısı.`}</p><div class="result-chips"><span class="pill">${drawn} sayıda bitti</span>${w?`<span class="pill gold">+${roundPoints(w.uid)} puan</span>`:''}</div>`);
 patch($('#r-awards'),`<div class="section-head"><h2>Ödüller</h2></div><div class="panel award-list">${STAGES.map(key=>{const a=room.game.awards[key],p=playerByUid(a.uid);return `<div class="award-row"><span class="medal${p?'':' empty'}">${key==='tombala'?'T':key==='first'?'1':'2'}</span><span class="what"><b>${STAGE_LABELS[key]}</b><small>${p?`${escape(p.name)}${p.uid===me()?' (sen)':''} · ${a.number} ile`:'Kimse alamadı'}</small></span>${p?`<span class="gain">+${STAGE_POINTS[key]}</span>`:''}</div>`;}).join('')}</div>`);
 patch($('#r-scores'),scoresHTML(true));
 const canReset=isHost();
 patchDock(`${canReset?`<button class="btn btn-primary full" data-action="reset">Tekrar oyna ${icons.arrow}</button>`:'<button class="btn btn-secondary full" disabled>Oda sahibi yeni turu açacak</button>'}<button class="text-btn full" data-action="leave">Şimdilik bu kadar</button>`);
}

// --- Tepkiler -------------------------------------------------------------------
function onReactions(map){
 if(!room)return;
 for(const r of reactionFeed.update(map,`${transport.mode}:${transport.code()}`)){
  const p=room.players?.[r.slot];if(p)floatReaction(p,r.e);
 }
}
function floatReaction(p,index){
 const layer=$('#reaction-layer');if(layer.childElementCount>12)return;
 const el=document.createElement('div');el.className=`float-react ${COLORS[p.color]||'sage'}`;
 el.style.left=`calc(${10+Math.random()*62}% )`;
 el.innerHTML=`<span class="emoji">${REACTIONS[index]||''}</span><span class="who">${escape(p.name)}</span>`;
 layer.append(el);setTimeout(()=>el.remove(),2700);
 sfx.react();
}

// --- Alt sayfalar -----------------------------------------------------------------
const sheetHead=(title,text='')=>`<div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head"><div><h2 id="sheet-title">${title}</h2>${text?`<p>${text}</p>`:''}</div><button class="icon-btn" data-action="close" aria-label="Kapat">${icons.close}</button></div>`;
function openSheet(kind,arg){
 sheetKind=kind;sheetArg=arg;sheet._html=null;
 sheet.innerHTML=sheetHTML(kind,arg);
 if(!sheet.open){lastFocus=document.activeElement;sheet.classList.remove('closing');sheet.showModal();}
 sheet.scrollTop=0;
 const focus=sheet.querySelector('[data-autofocus]');if(focus)setTimeout(()=>focus.focus(),60);
}
function refreshSheet(){
 if(sheetKind==='numbers'||sheetKind==='peek'){
  if(sheetKind==='peek'&&!room?.players?.[sheetArg]){closeSheet();return;}
  patch(sheet,sheetHTML(sheetKind,sheetArg));
 }
 if(sheetKind==='leave'||sheetKind==='settings')return;
 if((sheetKind==='choose'||sheetKind==='custom')&&(room?.meta.phase!=='lobby'||self()?.readyRound===room?.meta.round&&!isSolo()))closeSheet();
}
function closeSheet(immediate=false){
 if(!sheet.open)return;
 const done=()=>{sheet.classList.remove('closing');sheet.style.transform='';sheet.close();sheetKind=null;sheet._html=null;if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});};
 if(immediate||reducedMotion()){done();return;}
 sheet.classList.add('closing');setTimeout(done,200);
}
function sheetHTML(kind,arg){
 if(kind==='help')return `${sheetHead('Bir turda öğrenirsin.','Oda kur, dört haneli kodu sevdiklerinle paylaş ya da botlarla hemen başla.')}
  <ol class="steps"><li><span class="n">1</span><div><b>Sayılar torbadan çıkar</b><span>Oda sahibi sayıları elle ya da 3, 5, 8 saniyede bir otomatik çeker. İstersen sayılar sesli okunur.</span></div></li>
  <li><span class="n">2</span><div><b>Kartına kendin dokun</b><span>Çıkan sayı kartındaysa dokunarak işaretle. İşaretlemediğin sayı bulunmuş sayılmaz; kart numarası oyun sayısı değildir.</span></div></li>
  <li><span class="n">3</span><div><b>Çinko ve tombala</b><span>Bir satırı ilk tamamlayan 1. çinkoyu (+1), iki satırı ilk tamamlayan 2. çinkoyu (+2), 15 sayının tamamını ilk işaretleyen tombalayı (+3) alır. Puanlar turlar boyunca birikir.</span></div></li></ol>
  <div class="sheet-actions"><button class="btn btn-primary" data-action="close">Anladım, başlayalım</button></div>`;
 if(kind==='settings'){
  const toggle=(key,icon,title,text,disabled=false)=>`<button class="list-row" role="switch" aria-checked="${!disabled&&settings[key]}" data-action="toggle-setting" data-key="${key}" ${disabled?'disabled':''}><span class="ico">${icon}</span><span class="txt"><b>${title}</b><small>${text}</small></span><span class="switch" aria-checked="${!disabled&&settings[key]}" aria-hidden="true"></span></button>`;
  const voice=voiceStatus();
  return `${sheetHead('Ayarlar')}
   <p class="list-title">Oyun hissi</p>
   <div class="list">${toggle('sound',icons.sound,'Ses efektleri','Çekiliş, işaret ve ödül sesleri')}${toggle('voice',icons.voice,'Sayıları sesli oku',voice==='unsupported'?'Bu tarayıcı sesli okumayı desteklemiyor':voice==='missing'?'Cihazında Türkçe ses bulunamadı':'Çıkan sayı Türkçe okunur',voice==='unsupported')}${toggle('haptics',icons.vibrate,'Titreşim','İşaretleme ve ödüllerde dokunsal geri bildirim')}${toggle('wake',icons.sun,'Ekranı açık tut',wakeSupported()?'Oyun sürerken ekran kararmaz':'Bu tarayıcı desteklemiyor',!wakeSupported())}</div>
   <p class="list-title">Görünüm</p>
   <div class="segmented" role="group" aria-label="Tema">${[['system','Sistem'],['light','Açık'],['dark','Koyu']].map(([id,label])=>`<button data-action="theme" data-theme="${id}" aria-pressed="${settings.theme===id}">${label}</button>`).join('')}</div>
   <p class="list-title">Yardım</p>
   <div class="list"><button class="list-row" data-action="help"><span class="ico">${icons.book}</span><span class="txt"><b>Nasıl oynanır?</b><small>Kurallar ve puanlar</small></span><span class="chev">${icons.chevron}</span></button><a class="list-row" href="kurulum.html"><span class="ico">${icons.tool}</span><span class="txt"><b>Firebase kurulumu</b><small>Oda sahibi yöneticiler için</small></span><span class="chev">${icons.chevron}</span></a></div>
   <p class="version">tombala. ${VERSION}</p>`;
 }
 if(kind==='join'){
  const code=/^[1-9][0-9]{3}$/.test(arg||'')?arg:'';
  const needName=!defaultName();
  return `${sheetHead('Odaya katıl','Oda sahibinden dört haneli kodu iste.')}
   <form id="join-form" autocomplete="off">
   ${needName?`<div class="panel name-card" style="box-shadow:none;background:var(--surface-2);margin-bottom:12px"><span class="name-field"><label for="join-name">Oyuncu adın</label><input id="join-name" maxlength="16" autocomplete="nickname" placeholder="Adın veya takma adın" required data-autofocus></span></div>`:''}
   <div class="code-entry"><input id="join-code" inputmode="numeric" pattern="[1-9][0-9]{3}" maxlength="4" autocomplete="one-time-code" aria-label="Dört haneli oda kodu" value="${code}" ${needName?'':'data-autofocus'}><div class="code-boxes" aria-hidden="true">${codeBoxes(code)}</div></div>
   <p class="inline-error" id="join-error" role="alert"></p>
   <div class="sheet-actions"><button class="btn btn-primary" type="submit" id="join-submit">Masaya otur ${icons.arrow}</button></div></form>`;
 }
 if(kind==='leave'){
  const playing=room?.meta.phase==='playing';
  return `${sheetHead('Masadan ayrılıyor musun?',isSolo()?'Botlarla oyun bu cihazda kapanır.':playing?'Kartın bu tur boyunca masada kalır; diğer oyuncular devam edebilir.':'Yerin boşalır; kodla yeniden katılabilirsin.')}<div class="sheet-actions"><button class="btn btn-secondary" data-action="close">Masada kal</button><button class="btn btn-primary" data-action="confirm-leave">Ayrıl</button></div>`;
 }
 if(kind==='numbers'){
  const drawn=drawnNumbers(room.game),set=new Set(drawn),last=drawn.at(-1);
  return `${sheetHead(`Çıkan sayılar <span class="muted tabular">${drawn.length}/90</span>`)}
   ${drawn.length?`<div class="recent-row" aria-label="Son çıkanlar">${drawn.slice(-12).reverse().map(n=>`<span>${n}</span>`).join('')}</div>`:'<p class="muted" style="margin-bottom:14px">Henüz sayı çekilmedi.</p>'}
   <div class="number-board" role="img" aria-label="${drawn.length} sayı çıktı">${range(90).map(i=>`<span class="${set.has(i+1)?'drawn':''}${i+1===last?' current':''}">${i+1}</span>`).join('')}</div>`;
 }
 if(kind==='peek'){
  const p=room.players?.[arg];if(!p)return '';
  const card=decodeCard(p.card),marked=room.meta.phase==='lobby'?[]:markedNumbers(p),st=progress(card,marked),{stage,need}=nearFor(p),own=p.uid===me();
  const removable=isSolo()&&p.bot&&room.meta.phase==='lobby'&&members(room).filter(([,x])=>x.bot).length>1;
  return `${sheetHead(escape(own?`${p.name} (sen)`:p.name),p.bot&&isSolo()?'Bot oyuncu':own?'Senin kartın':p.online?'Canlı kart':'Çevrimdışı')}
   ${ticket(card,{color:p.color,cardNo:p.cardNo,marked,completed:st.completed,uid:p.uid,label:`${p.name} kartı`})}
   <div class="peek-stats"><span class="pill">${st.hits}/15 işaret</span><span class="pill">${st.rows} satır</span>${p.score?`<span class="pill gold">${p.score} puan</span>`:''}${need<=2?`<span class="pill accent">${nearLabel(stage)} ${need} kaldı</span>`:''}</div>
   ${removable?`<div class="sheet-actions"><button class="btn btn-secondary" data-action="remove-bot" data-slot="${arg}">${icons.trash} Botu masadan çıkar</button></div>`:''}`;
 }
 if(kind==='choose'){
  const p=self();
  return `${sheetHead('Hangisi içine sindi?','Her kartın şansı eşit. Birine dokun, senin olsun.')}<div class="picker">${choices.map((c,i)=>`<button data-action="pick" data-pick="${i}" aria-label="${i+1}. kartı seç">${ticket(c,{color:p.color,cardNo:p.cardNo,label:`${i+1}. seçenek`})}</button>`).join('')}</div>`;
 }
 if(kind==='custom'){
  const p=self();
  return `${sheetHead('Şansını kendin yaz.','Boş kareler ve kart numarası sabit. Her sütun kendi aralığından sayı alır.')}
   <form id="custom-form" class="${COLORS[p.color]}"><div class="column-labels" aria-hidden="true">${range(CARD_COLUMNS).map(c=>`<span>${columnRange(c).join('–')}</span>`).join('')}</div>
   <div class="custom-grid">${customCard.map((n,i)=>hasCardNumber(i,customCard)?`<input type="number" inputmode="numeric" min="${columnRange(i%CARD_COLUMNS)[0]}" max="${columnRange(i%CARD_COLUMNS)[1]}" value="${n||''}" aria-label="${Math.floor(i/CARD_COLUMNS)+1}. satır, ${i%CARD_COLUMNS+1}. sütun, ${columnRange(i%CARD_COLUMNS).join('–')}" data-cell="${i}">`:i===CARD_ID_INDEX?`<span class="custom-id" aria-label="Kart numarası ${p.cardNo}"><small>KART</small>${pad(p.cardNo)}</span>`:'<span class="custom-empty" aria-hidden="true"></span>').join('')}</div>
   <p id="custom-error" class="inline-error" role="alert" style="margin-top:12px"></p>
   <div class="sheet-actions"><button type="button" class="btn btn-secondary" data-action="clear-custom">Temizle</button><button type="submit" class="btn btn-primary">Kartımı kullan</button></div></form>`;
 }
 return '';
}
const codeBoxes=code=>range(4).map(i=>`<span class="${i===Math.min(code.length,3)?'active':''}">${code[i]||''}</span>`).join('');
// Alt sayfayı aşağı sürükleyerek kapatma.
let drag=null;
sheet.addEventListener('pointerdown',e=>{
 if(!e.target.closest('.sheet-handle,.sheet-head')||e.target.closest('button'))return;
 drag={y:e.clientY,dy:0,id:e.pointerId};sheet.classList.add('dragging');sheet.setPointerCapture(e.pointerId);
});
sheet.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.dy=Math.max(0,e.clientY-drag.y);sheet.style.transform=`translateY(${drag.dy}px)`;});
const endDrag=e=>{if(!drag||e.pointerId!==drag.id)return;const dy=drag.dy;drag=null;sheet.classList.remove('dragging');if(dy>90)closeSheet(true);else{sheet.style.transition='transform .2s';sheet.style.transform='';setTimeout(()=>sheet.style.transition='',220);}};
sheet.addEventListener('pointerup',endDrag);sheet.addEventListener('pointercancel',endDrag);
sheet.addEventListener('click',e=>{if(e.target!==sheet)return;const r=sheet.getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)closeSheet();});
sheet.addEventListener('cancel',e=>{e.preventDefault();closeSheet();});

// --- İşlemler ---------------------------------------------------------------------
// Uzun işlemler düğmeleri kilitler; oyun içi hızlı işlemler yalnızca üst üste binmez.
async function run(task,errorTarget,{lock=true}={}){
 if(busy)return;busy=true;
 const buttons=lock?[...document.querySelectorAll('.app-shell button:not(.cell):not(:disabled),.sheet button:not(:disabled)')]:[];buttons.forEach(b=>b.disabled=true);
 try{await task();}
 catch(e){
  if(e.silent)return;
  haptics.wrong();
  if(errorTarget){errorTarget.textContent=e.message;if(e.setupRequired){errorTarget.append(' ');const link=document.createElement('a');link.href='kurulum.html';link.textContent='Kurulum adımlarını aç →';errorTarget.append(link);}}
  else toast(e.message||'Bir sorun oluştu. Tekrar dene.',true);
 }
 finally{busy=false;buttons.forEach(b=>{if(b.isConnected)b.disabled=false;});if(room)render();}
}
async function tapNumber(button){
 const n=Number(button.dataset.number);
 if(markPending.has(n)||room?.meta.phase!=='playing')return;
 if(!connected){toast('Bağlantı yeniden kuruluyor.',true);return;}
 if(!drawnNumbers(room.game).includes(n)){
  sfx.wrong();haptics.wrong();button.classList.remove('shake');void button.offsetWidth;button.classList.add('shake');
  toast(`${n} henüz torbadan çıkmadı.`);return;
 }
 // Anında damga; kesin sonuç oda transaction'ından gelir.
 markPending.add(n);tapped.add(n);haptics.mark();sfx.mark();
 button.classList.add('marked','stamp','pending');button.disabled=true;$('#g-mine')._html=null;
 try{const ok=await transport.mark(n);if(ok===false)tapped.delete(n);}
 catch(error){tapped.delete(n);toast(error.message,true);}
 finally{markPending.delete(n);if(room)render();}
}
function sendReaction(index){
 trayOpen=false;
 const now=Date.now();if(now-lastReactionAt<900){render();return;}lastReactionAt=now;
 haptics.tap();transport.react?.(index).catch(()=>toast('Tepki gönderilemedi.',true));
 render();
}
async function startRoom(kind){
 const error=$('#home-error');if(error)error.textContent='';
 const name=readName(error);
 const button=dock.querySelector(`[data-action="${kind}"]`);if(button)button.textContent='Masa hazırlanıyor…';
 try{
  if(kind==='solo')await useSolo();else await useOnline();
  await transport.create(name);await enterRoom();
 }catch(e){if(!room)setDock(homeDock());throw e;}
}
async function joinRoom(){
 const error=$('#join-error');error.textContent='';
 const nameInput=$('#join-name');if(nameInput){const name=nameInput.value.trim();if(!name){error.textContent='Önce adını yaz.';nameInput.focus();return;}rememberName(name);}
 const code=$('#join-code').value.trim();
 if(!/^[1-9][0-9]{3}$/.test(code)){error.textContent='Dört haneli oda kodunu kontrol et.';$('#join-code').focus();haptics.wrong();return;}
 await run(async()=>{
  $('#join-submit').textContent='Bağlanıyor…';
  await useOnline();await transport.join(code,defaultName());
  closeSheet(true);await enterRoom();
 },error);
 if($('#join-submit'))$('#join-submit').innerHTML=`Masaya otur ${icons.arrow}`;
}
function openChoices(){choices=range(3).map(makeCard);openSheet('choose');}
function openCustom(){customCard=decodeCard(self().card);openSheet('custom');}
async function share(){
 const url=new URL(location.pathname,location.origin);url.searchParams.set('oda',transport.code());
 if(navigator.share){try{await navigator.share({title:'Tombala masasına katıl',text:`Oda kodumuz: ${transport.code()}`,url:url.href});}catch(e){if(e.name!=='AbortError')throw e;}return;}
 try{await navigator.clipboard.writeText(`Tombala oda kodu: ${transport.code()} — ${url.href}`);toast('Davet bağlantısı kopyalandı.');}catch{toast(`Oda kodun: ${transport.code()}`);}
}
function applyTheme(){
 const theme=settings.theme;
 if(theme==='system')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=theme;
 const dark=theme==='dark'||(theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
 document.querySelectorAll('meta[name=theme-color]').forEach(m=>m.content=dark?'#0f1012':'#f4f3ef');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',applyTheme);

document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');
 if(!button||button.disabled)return;
 const action=button.dataset.action;
 if(trayOpen&&action!=='tray'&&action!=='react'){trayOpen=false;if(room)render();}
 switch(action){
  case 'focus-name':if(e.target.tagName!=='INPUT')$('#player-name')?.focus();return;
  case 'help':openSheet('help');return;
  case 'settings':openSheet('settings');return;
  case 'close':closeSheet();return;
  case 'join-open':{const error=$('#home-error');if(error)error.textContent='';const name=$('#player-name')?.value.trim();if(name)rememberName(name);openSheet('join',params.get('oda'));return;}
  case 'create':run(()=>startRoom('create'),$('#home-error'));return;
  case 'solo':run(()=>startRoom('solo'),$('#home-error'));return;
  case 'leave':openSheet('leave');return;
  case 'choose':openChoices();return;
  case 'custom':openCustom();return;
  case 'numbers':openSheet('numbers');return;
  case 'peek':openSheet('peek',Number(button.dataset.slot));return;
  case 'mark':tapNumber(button);return;
  case 'tray':trayOpen=!trayOpen;haptics.tap();render();return;
  case 'react':sendReaction(Number(button.dataset.react));return;
  case 'toggle-setting':{const key=button.dataset.key;saveSetting(key,!settings[key]);if(key==='sound'&&settings.sound){unlockAudio();sfx.mark();}if(key==='haptics'&&settings.haptics)haptics.mark();sheet._html=null;sheet.innerHTML=sheetHTML('settings');return;}
  case 'theme':saveSetting('theme',button.dataset.theme);applyTheme();sheet.innerHTML=sheetHTML('settings');return;
  case 'clear-custom':sheet.querySelectorAll('[data-cell]').forEach(input=>input.value='');sheet.querySelector('[data-cell]')?.focus();return;
  case 'add-bot':haptics.tap();transport.addBot?.();return;
  case 'remove-bot':transport.removeBot?.(Number(button.dataset.slot));closeSheet();return;
  case 'bot-level':haptics.tap();transport.setLevel?.(button.dataset.level);return;
 }
 const quick=['shuffle','color','ready','pace','toggle-auto','speed','draw','copy','share'].includes(action);
 run(async()=>{
  if(action==='copy'){try{await navigator.clipboard.writeText(transport.code());toast('Oda kodu kopyalandı.');}catch{toast(`Oda kodun: ${transport.code()}`);}return;}
  if(action==='share'){await share();return;}
  if(action==='shuffle'){haptics.tap();await transport.editPlayer({card:encodeCard(makeCard())});return;}
  if(action==='color'){haptics.tap();await transport.editPlayer({color:Number(button.dataset.color)});return;}
  if(action==='ready'){haptics.tap();await transport.editPlayer({readyRound:self().readyRound===room.meta.round?0:room.meta.round});return;}
  if(action==='pace'){haptics.tap();await transport.hostAction('pace',Number(button.dataset.pace));return;}
  if(action==='toggle-auto'){haptics.tap();await transport.hostAction('pace',room.game.auto?0:room.game.interval);return;}
  if(action==='speed'){haptics.tap();await transport.hostAction('pace',PACES[(PACES.indexOf(room.game.interval)+1)%PACES.length]);return;}
  if(action==='draw'){haptics.tap();await transport.hostAction('draw');return;}
  if(action==='start'||action==='reset'||action==='prune'){await transport.hostAction(action);return;}
  if(action==='claim'){await transport.claimHost();return;}
  if(action==='pick'){await transport.editPlayer({card:encodeCard(choices[Number(button.dataset.pick)])});closeSheet();return;}
  if(action==='confirm-leave'){await transport.leave(room);closeSheet(true);transport=isOnline()?transport:null;renderHome();return;}
 },null,{lock:!quick});
});
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('input',e=>{
 if(e.target.id==='player-name'){$('#name-avatar').textContent=e.target.value.trim().charAt(0).toLocaleUpperCase('tr')||'?';$('#home-error').textContent='';}
 if(e.target.id==='join-code'){
  e.target.value=e.target.value.replace(/\D/g,'').replace(/^0+/,'').slice(0,4);
  sheet.querySelector('.code-boxes').innerHTML=codeBoxes(e.target.value);$('#join-error').textContent='';
  if(e.target.value.length===4&&!$('#join-name'))joinRoom();
 }
});
document.addEventListener('submit',e=>{
 e.preventDefault();
 if(e.target.id==='join-form'){joinRoom();return;}
 if(e.target.id==='custom-form'){
  const card=Array(CARD_SIZE).fill(0);sheet.querySelectorAll('[data-cell]').forEach(input=>card[Number(input.dataset.cell)]=input.value===''?0:Number(input.value));
  const message=validateCard(card);if(message){$('#custom-error').textContent=message;haptics.wrong();return;}
  run(async()=>{await transport.editPlayer({card:encodeCard(card)});closeSheet();},$('#custom-error'));
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='player-name'){e.preventDefault();e.target.blur();}});
document.addEventListener('visibilitychange',()=>{
 if(!transport?.setPaused)return;
 transport.setPaused(document.hidden);
 if(!document.hidden&&room?.meta.phase==='playing')toast('Oyun kaldığı yerden sürüyor.');
});

// --- Başlangıç ------------------------------------------------------------------
applyTheme();
const updateHeight=()=>{if(!window.visualViewport||window.visualViewport.scale===1)document.documentElement.style.setProperty('--app-height',`${Math.round(window.visualViewport?.height||window.innerHeight)}px`);};
window.visualViewport?.addEventListener('resize',updateHeight);updateHeight();
renderHome();
const scene=params.get('scene');
if(demo&&['lobby','game','results'].includes(scene)){
 run(async()=>{await useOnline();await transport.create(defaultName()||'Burak');await transport.prepare(scene);await enterRoom();});
}else if(!demo&&sessionStorage.getItem(ONLINE_SESSION)){
 run(async()=>{
  await useOnline();
  try{await transport.join(sessionStorage.getItem(ONLINE_SESSION),defaultName()||'Misafir');}
  catch(error){sessionStorage.removeItem(ONLINE_SESSION);throw error;}
  await enterRoom();
 });
}else if(/^[1-9][0-9]{3}$/.test(params.get('oda')||'')){openSheet('join',params.get('oda'));}
else if(params.get('mod')==='bot'&&defaultName()){run(()=>startRoom('solo'),$('#home-error'));}
if('serviceWorker' in navigator&&location.protocol==='https:'&&!demo)navigator.serviceWorker.register('sw.js').catch(()=>{});
