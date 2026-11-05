import {COLORS,COLOR_NAMES,range,makeCard,encodeCard,decodeCard,validateCard,progress,drawnNumbers,members,canStart,newRoom,newPlayer,startRound,drawNext,resetRound,columnRange,CARD_COLUMNS,CARD_SIZE,hasCardNumber} from './core.js';
const $=s=>document.querySelector(s), app=$('#app'), dock=$('#action-dock');
function setScreen(name){document.body.dataset.screen=name;dock.innerHTML='';}
function setDock(html){dock.innerHTML=html;}
const params=new URLSearchParams(location.search);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>',copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>'};
let transport,room=null,tab='create',busy=false,lastDraw=0,lastPhase='',sound=false,audioContext,toastTimer,customCard,choices=[],lastFocus;
const demo=params.get('demo')==='1';
const previewCard=[1,0,22,0,45,0,60,0,84,0,0,14,0,37,0,52,0,70,0,90,8,0,29,0,49,0,69,0,88,0];
const defaultName=()=>localStorage.getItem('tombala-name')||'';
function toast(message,error=false){const box=$('#toast');box.textContent=message;box.classList.toggle('error',error);box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,error?8500:3500);}
function showDialog(id){lastFocus=document.activeElement;$(id).showModal();}
function closeDialog(dialog){dialog.close();if(lastFocus?.isConnected)lastFocus.focus();else app.focus({preventScroll:true});}
function ticket(card,{color=1,drawn=[],mini=false,label='TOMBALA KARTI'}={}) {
  const latest=drawn.at(-1),set=new Set(drawn);
  return `<div class="ticket ${COLORS[color]||'sage'}"><div class="ticket-top"><span>${label}</span><span>15 sayı · 3 satır</span></div><div class="ticket-grid" aria-label="Tombala kartı">${card.map(n=>`<span class="cell ${!n?'empty':''} ${set.has(n)?'marked':''} ${n===latest?'latest':''}" ${n?`aria-label="${n}${set.has(n)?', çıktı':''}"`:'aria-hidden="true"'}>${n||''}</span>`).join('')}</div><div class="ticket-bottom"><span>ŞANSIN BOL OLSUN</span><span>${mini?'BİRLİKTE GÜZEL':'tombala.'}</span></div></div>`;
}
function renderHome(){
  room=null;lastPhase='';setScreen('home');
  const suggestedCode=params.get('oda')||'';
  app.innerHTML=`<div class="screen home-screen">
    ${demo?'<div class="demo-banner">Önizleme · Çevrimiçi oda oluşturmaz</div>':''}
    <section class="home-scene">
      <span class="tag">AİLECE · 2–4 KİŞİ</span>
      <div class="home-art" aria-hidden="true"><div class="home-orbit"></div><span class="ball token-a">27</span><span class="ball token-b">63</span><div class="home-ticket">${ticket(previewCard,{color:1,drawn:[14,45,60],mini:true})}</div><span class="art-star">✦</span></div>
      <h1>Şansın bol olsun.</h1><p>Sevdiklerinle bir tur tombala.</p>
    </section>
    <section class="home-controls">
      <div class="tabbar" role="tablist" aria-label="Oda işlemi"><button id="create-tab" role="tab" aria-selected="${tab==='create'}" class="${tab==='create'?'active':''}" data-action="tab" data-tab="create">Oda kur</button><button id="join-tab" role="tab" aria-selected="${tab==='join'}" class="${tab==='join'?'active':''}" data-action="tab" data-tab="join">Odaya katıl</button></div>
      <form id="room-form" role="tabpanel" aria-labelledby="${tab==='create'?'create':'join'}-tab">
        <label for="player-name" class="field-label">OYUNCU ADIN</label><div class="name-row"><span class="avatar" id="name-avatar">${escape(defaultName().charAt(0).toLocaleUpperCase('tr')||'S')}</span><input id="player-name" name="name" class="field" placeholder="Adın veya takma adın" value="${escape(defaultName())}" maxlength="16" autocomplete="nickname" enterkeyhint="${tab==='join'?'next':'go'}" required></div>
        ${tab==='join'?`<div class="join-code"><label for="room-input" class="field-label">4 HANELİ ODA KODU</label><input id="room-input" name="code" class="field code-field" type="text" inputmode="numeric" pattern="[1-9][0-9]{3}" maxlength="4" placeholder="0000" value="${escape(/^[1-9][0-9]{3}$/.test(suggestedCode)?suggestedCode:'')}" autocomplete="off" enterkeyhint="go" required></div>`:''}
        <p class="inline-error" id="home-error" role="alert"></p>
      </form>
    </section>
  </div>`;
  setDock(`<button type="submit" form="room-form" class="button primary full" id="room-submit">${tab==='create'?'Oda kur':'Odaya katıl'} ${icons.arrow}</button><p class="dock-caption">${icons.lock} Üyelik yok. Anonim olarak katılırsın.</p>`);
}
const self=()=>members(room).find(([,p])=>p.uid===transport.uid())?.[1];
const isHost=()=>room?.meta.hostId===transport.uid();
const roomHeader=(title)=>`<div class="room-toolbar"><button class="icon-button" data-action="leave" aria-label="Masadan ayrıl">‹</button><h1>${title}</h1><button class="room-pill" data-action="copy" aria-label="Oda kodunu kopyala"><span>ODA</span> ${transport.code()} ${icons.copy}</button></div>`;
function hostNotice(){const host=members(room).find(([,p])=>p.uid===room.meta.hostId)?.[1];if(!host?.online&&!isHost())return `<div class="reclaim"><span>Oda sahibinin bağlantısı kesildi.</span><button class="button secondary" data-action="claim">Devral</button></div>`;return '';}
function avatar(p){return `<span class="avatar" style="--avatar-bg:${['#f5ded3','#deeadc','#f5e9c6','#dbeaf1'][p.color]||'#eee'};--avatar-ink:${['#b35c44','#527b61','#a67d28','#527b94'][p.color]||'#888'}">${escape(p.name.charAt(0).toLocaleUpperCase('tr'))}</span>`;}
function playerList(game=false){const drawn=drawnNumbers(room.game);return `<div class="player-list">${range(4).map(slot=>{
 const p=room.players?.[slot];
 if(!p)return game?'':`<div class="player empty-player"><div class="avatar-ring"><span class="avatar">+</span></div><div class="player-name">Boş yer</div><small>Davet et</small></div>`;
 const ready=p.readyRound===room.meta.round,status=progress(decodeCard(p.card),drawn);
 return `<div class="player ${p.uid===transport.uid()?'is-me':''} ${!p.online?'is-offline':''}"><div class="avatar-ring ${game?'with-progress':''}" style="--progress:${status.hits/15*100}%">${avatar(p)}${!game?`<span class="ready-dot ${ready&&p.online?'ready':''}" aria-label="${p.online?(ready?'Hazır':'Kart seçiyor'):'Çevrimdışı'}">${ready&&p.online?'✓':''}</span>`:''}</div><div class="player-name" title="${escape(p.name)}">${escape(p.name)}${p.uid===transport.uid()?'<span class="you-dot"></span>':''}</div><small>${!p.online?'Çevrimdışı':game?`${status.hits}/15`:ready?'Hazır':p.uid===room.meta.hostId?'Oda sahibi':'Kart seçiyor'}</small></div>`;
 }).join('')}</div>`;}
function renderLobby(){
 const me=self(),ready=me.readyRound===room.meta.round,count=members(room).length,readyCount=members(room).filter(([,p])=>p.online&&p.readyRound===room.meta.round).length;
 setScreen('lobby');
 app.innerHTML=`<div class="screen lobby-screen">${demo?'<div class="demo-banner">Önizleme · Örnek oyuncular</div>':''}${roomHeader('Oyun lobisi')}${hostNotice()}
  <section class="invite-card"><div class="invite-top"><span class="eyebrow">ODA KODUN</span><span class="tag">${count}/4 KİŞİ</span></div><div class="invite-row"><button class="code-digits" data-action="copy" aria-label="Oda kodu ${transport.code()}, kopyala">${transport.code().split('').map(n=>`<span>${n}</span>`).join('')}</button><button class="icon-button share-button" data-action="share" aria-label="Odayı paylaş"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 16V3m-5 5 5-5 5 5M5 12v8h14v-8"/></svg></button></div><p>Kodu paylaş, sevdiklerin masaya katılsın.</p></section>
  <section class="players-section"><div class="section-heading"><h2>Masadakiler</h2><span>${readyCount}/${count} hazır</span></div>${playerList()}${isHost()&&members(room).some(([,p])=>!p.online)?'<button class="text-button" data-action="prune">Çevrimdışı oyuncuları kaldır</button>':''}</section>
  <section class="card-choice"><div class="section-heading"><h2>Şans kartın</h2><span>3 satır · 10 sütun</span></div>${ticket(decodeCard(me.card),{color:me.color})}<div class="card-actions"><button class="button secondary" data-action="shuffle" ${ready?'disabled':''}><span aria-hidden="true">↻</span> Yeni kart</button><button class="button secondary" data-action="choose" ${ready?'disabled':''}>Kart seç</button><button class="button secondary" data-action="custom" ${ready?'disabled':''}>＋ Kendin yap</button></div><div class="color-options" aria-label="Kart rengi"><span>Rengini seç</span>${COLORS.map((c,i)=>`<button class="color-dot ${me.color===i?'selected':''}" style="--swatch:var(--${c})" data-action="color" data-color="${i}" aria-label="${COLOR_NAMES[i]}" aria-pressed="${me.color===i}" ${ready?'disabled':''}></button>`).join('')}</div></section>
 </div>`;
 let action=!ready?`<button class="button primary full" data-action="ready">Kartım tamam, hazırım ${icons.arrow}</button>`:isHost()?`<button class="button primary full" data-action="start" ${!canStart(room)?'disabled':''}>${canStart(room)?'Oyunu başlat':'Diğer oyuncular bekleniyor'} ${icons.arrow}</button>`:'<button class="button primary full" disabled>✓ Hazırsın · Oda sahibi bekleniyor</button>';
 setDock(`<div class="dock-status"><span class="status-dot ${canStart(room)?'ready':''}"></span><span>${count<2?'Başlamak için en az 2 kişi gerekiyor.':canStart(room)?'Herkes hazır. Şans sizinle olsun!':`${readyCount}/${count} oyuncu hazır`}</span>${ready?'<button class="text-button" data-action="ready">Vazgeç</button>':''}</div>${action}`);
}
function awardText(awards,key,label){const a=awards[key];if(!a)return '';const names=members(room).filter(([,p])=>a.uids.includes(p.uid)).map(([,p])=>escape(p.name));return `<div class="award-note"><b>${label}</b> · ${names.join(', ')} <span class="muted">(${a.at}. sayı)</span></div>`;}
function renderGame(){
 const me=self(),drawn=drawnNumbers(room.game),latest=drawn.at(-1),status=progress(decodeCard(me.card),drawn),awards=JSON.parse(room.game.awards||'{}');
 setScreen('game');
 app.innerHTML=`<div class="screen game-screen">${roomHeader('Tombala masası')}${hostNotice()}${playerList(true)}
 <section class="draw-stage"><div class="stage-label"><span class="live-dot"></span> ${latest?'SON ÇIKAN SAYI':'İLK SAYI HEYECANI'}</div><div class="draw-center"><div class="draw-counter"><strong>${90-drawn.length}</strong><span>TORBADA</span></div><div class="ball main-ball" aria-live="polite" aria-label="${latest?'Son çıkan sayı '+latest:'İlk sayı bekleniyor'}">${latest||'?'}</div><button class="draw-counter" data-action="numbers" aria-label="Çıkan ${drawn.length} sayıyı görüntüle"><strong>${drawn.length}</strong><span>ÇIKTI ↗</span></button></div><div class="recent-balls" aria-label="Son çıkan sayılar">${drawn.length?drawn.slice(-5).map((n,i,a)=>`<span class="${i===a.length-1?'current':''}">${n}</span>`).join(''):'<span class="waiting-label">Torba hazır. Şimdi sıra şansta.</span>'}</div></section>
 <section class="game-ticket"><div class="section-heading"><h2>Senin kartın</h2><span class="hit-count">${status.hits}<span>/15</span></span></div>${ticket(decodeCard(me.card),{color:me.color,drawn})}<div class="milestones">${[[1,'1. Çinko'],[2,'2. Çinko'],[3,'Tombala']].map(([n,label])=>`<div class="milestone ${status.rows>=n?'won':''}"><span>${status.rows>=n?'✓':n===3?'✦':n}</span><small>${label}</small></div>`).join('')}</div></section>
 <div class="award-list">${awardText(awards,'first','1. Çinko')}${awardText(awards,'second','2. Çinko')}</div><button class="history-button" data-action="numbers">Çıkan tüm sayılar <span>${drawn.length}/90 &nbsp; ›</span></button>
 </div>`;
 setDock(isHost()?`<div class="auto-control"><span>5 saniyede bir otomatik çek</span><button class="toggle" role="switch" aria-label="Otomatik sayı çekme" aria-checked="${room.game.auto}" data-action="auto"></button></div><button class="button primary full" data-action="draw">Sayı çek ${icons.arrow}</button>`:`<div class="spectator-status"><span class="live-dot"></span>${room.game.auto?'Sayılar otomatik çekiliyor':'Oda sahibi sayı çekiyor'}</div><p class="dock-caption">Kartındaki sayılar otomatik işaretlenir.</p>`);
}
function renderResults(){
 const awards=JSON.parse(room.game.awards),drawn=drawnNumbers(room.game),winners=awards.tombala?.uids||[],myWin=winners.includes(transport.uid());
 const sorted=members(room).sort((a,b)=>progress(decodeCard(b[1].card),drawn).hits-progress(decodeCard(a[1].card),drawn).hits),winnerNames=sorted.filter(([,p])=>winners.includes(p.uid)).map(([,p])=>escape(p.name)).join(' ve ');
 setScreen('results');
 app.innerHTML=`<div class="screen results-screen">${roomHeader('Tur tamamlandı')}${hostNotice()}<div class="result-celebration"><span class="confetti c1">✦</span><span class="confetti c2">✦</span><span class="confetti c3">•</span><div class="trophy" aria-hidden="true">✦</div><span class="eyebrow">GÜZEL BİR TUR DAHA</span><h1>Tombala!</h1><p>${myWin?'Şans bu tur seninleydi.':`<strong>${winnerNames}</strong> ${winners.length>1?'bu turun kazananları.':'bu turun şanslısı.'}`}</p><span class="result-stat">${drawn.length} SAYIDA TAMAMLANDI</span></div>
 <section class="score-list">${sorted.map(([,p],i)=>{const status=progress(decodeCard(p.card),drawn);return `<div class="score-row ${winners.includes(p.uid)?'winner':''}"><span class="score-rank">${winners.includes(p.uid)?'✦':i+1}</span>${avatar(p)}<div class="player-info"><div class="player-name">${escape(p.name)}${p.uid===transport.uid()?' (sen)':''}</div><small>${winners.includes(p.uid)?'Tombala!':`${status.rows} tamamlanan satır`}</small></div><strong>${status.hits}<span>/15</span></strong></div>`}).join('')}</section><p class="result-note">Kartları yeniden seçelim.<br>Muhabbet kaldığı yerden devam etsin.</p></div>`;
 setDock(`<button class="button primary full" data-action="reset" ${!isHost()?'disabled':''}>${isHost()?'Tekrar oyna':'Oda sahibi bekleniyor'} ${isHost()?icons.arrow:''}</button><button class="text-button full" data-action="leave">Şimdilik bu kadar</button>`);
}
function openNumbers(open=true){
 const drawn=drawnNumbers(room.game),latest=drawn.at(-1);
 $('#numbers-dialog').innerHTML=`<div class="sheet-handle"></div><div class="dialog-head"><div><span class="eyebrow">TORBADAN ÇIKANLAR</span><h2>Tüm sayılar <span class="muted">${drawn.length}/90</span></h2></div><button class="icon-button" data-close aria-label="Kapat">×</button></div><div class="number-board" aria-label="Çıkan tüm sayılar">${range(90).map(i=>`<span class="${drawn.includes(i+1)?'drawn':''} ${i+1===latest?'current':''}" aria-label="${i+1}${drawn.includes(i+1)?', çıktı':''}">${i+1}</span>`).join('')}</div><p class="small muted">İşaretli sayılar torbadan çıktı.</p>`;
 if(open)showDialog('#numbers-dialog');
}
function renderRoom(next){if(!next){transport.abandon?.().catch(()=>{});toast('Bu oda kapanmış. Yeni bir masa kurabilirsin.',true);renderHome();return;}room=next;
 if(!self()){transport.abandon?.().catch(()=>{});toast('Masadaki yerin kaldırılmış. Tekrar katılabilirsin.',true);renderHome();return;}
 const drawn=drawnNumbers(room.game);
 if(drawn.length>lastDraw&&lastPhase==='playing')playTone();
 lastDraw=drawn.length;
 const phaseChanged=lastPhase!==room.meta.phase;lastPhase=room.meta.phase;
 if(room.meta.phase==='lobby')renderLobby();else if(room.meta.phase==='playing')renderGame();else renderResults();
 if($('#numbers-dialog').open)openNumbers(false);
 if(phaseChanged){app.focus({preventScroll:true});app.scrollTop=0;}
}
function playTone(){if(!sound)return;try{audioContext??=new AudioContext();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=lastPhase==='finished'?660:520;gain.gain.setValueAtTime(.05,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.2);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.2);}catch{}}
function connection(connected){const el=$('#connection');el.classList.toggle('offline',!connected);el.querySelector('span').textContent=connected?'Masaya bağlısın':'Yeniden bağlanıyor';}
async function run(task,errorTarget){if(busy)return;busy=true;const buttons=[...document.querySelectorAll('.app-shell button:not(:disabled)')];buttons.forEach(b=>b.disabled=true);try{await task();}catch(e){if(errorTarget){errorTarget.textContent=e.message;}else toast(e.message||'Bir sorun oluştu. Tekrar dene.',true);}finally{busy=false;buttons.forEach(b=>{if(b.isConnected)b.disabled=false;});}}
async function initTransport(){if(transport)return;if(demo){transport=demoTransport();return;}transport=await import('./firebase.js');}
function getName(){const name=$('#player-name').value.trim();if(!name)throw new Error('Masaya katılmak için bir ad yaz.');localStorage.setItem('tombala-name',name);return name;}
app.addEventListener('submit',e=>{if(e.target.id!=='room-form')return;e.preventDefault();const error=$('#home-error');error.textContent='';run(async()=>{const name=getName();$('#room-submit').textContent='Masan hazırlanıyor…';await initTransport();if(tab==='create')await transport.create(name);else await transport.join($('#room-input').value.trim(),name);await transport.watch(renderRoom,connection,e=>toast(e.message,true));},error).finally(()=>{if($('#room-submit'))$('#room-submit').innerHTML=`${tab==='create'?'Oda kur':'Odaya katıl'} ${icons.arrow}`;});});
app.addEventListener('input',e=>{if(e.target.id==='player-name')$('#name-avatar').textContent=e.target.value.charAt(0).toLocaleUpperCase('tr')||'S';if(e.target.id==='room-input')e.target.value=e.target.value.replace(/\D/g,'');});
$('.app-shell').addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action;
 if(action==='tab'){localStorage.setItem('tombala-name',$('#player-name').value);tab=button.dataset.tab;renderHome();return;}
 if(action==='leave'){showDialog('#leave-dialog');return;}
 if(action==='choose'){openChoices();return;}
 if(action==='custom'){openCustom();return;}
 if(action==='numbers'){openNumbers();return;}
 run(async()=>{
  if(action==='copy'){try{await navigator.clipboard.writeText(transport.code());toast('Oda kodu kopyalandı. Sevdiklerinle paylaş!');}catch{toast(`Oda kodun: ${transport.code()}`);}return;}
  if(action==='share'){const url=new URL(location.pathname,location.origin);url.searchParams.set('oda',transport.code());if(navigator.share){try{await navigator.share({title:'Tombala masasına katıl',text:`Oda kodumuz: ${transport.code()}`,url:url.href});}catch(e){if(e.name!=='AbortError')throw e;}}else{try{await navigator.clipboard.writeText(`Tombala oda kodu: ${transport.code()} — ${url.href}`);toast('Davet bağlantısı kopyalandı.');}catch{toast(`Oda kodun: ${transport.code()}`);}}return;}
  if(action==='shuffle')await transport.editPlayer({card:encodeCard(makeCard())});
  if(action==='color')await transport.editPlayer({color:Number(button.dataset.color)});
  if(action==='ready')await transport.editPlayer({readyRound:self().readyRound===room.meta.round?0:room.meta.round});
  if(action==='start'||action==='draw'||action==='reset'||action==='prune')await transport.hostAction(action);
  if(action==='auto')await transport.hostAction('auto',!room.game.auto);
  if(action==='claim')await transport.claimHost();
 });
});
$('#confirm-leave').addEventListener('click',()=>run(async()=>{await transport.leave(room);closeDialog($('#leave-dialog'));$('#connection').classList.remove('offline');$('#connection span').textContent='Birlikte güzel';renderHome();}));
$('#help-button').addEventListener('click',()=>showDialog('#help-dialog'));
$('#sound-button').addEventListener('click',()=>{sound=!sound;$('#sound-button').setAttribute('aria-pressed',String(sound));$('#sound-button').setAttribute('aria-label',sound?'Sesi kapat':'Sesi aç');$('#sound-button').innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>${sound?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;if(sound)playTone();});
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close)closeDialog(close.closest('dialog'));});
function openChoices(){choices=range(3).map(makeCard);$('#card-dialog').innerHTML=`<div class="dialog-head"><span class="eyebrow">ŞANSINA BİR KART SEÇ</span><button class="icon-button" data-close aria-label="Kapat">×</button></div><h2>Hangisi içine sindi?</h2><p>Her kartın şansı eşit. Birine dokun, senin olsun.</p><div class="card-picker-options">${choices.map((c,i)=>`<button class="card-picker-option" data-pick="${i}" aria-label="${i+1}. kartı seç">${ticket(c,{color:self().color,label:`KART 0${i+1}`})}</button>`).join('')}</div>`;showDialog('#card-dialog');}
function openCustom(){
 customCard=decodeCard(self().card);
 $('#card-dialog').innerHTML=`<div class="sheet-handle"></div><div class="dialog-head"><div><span class="eyebrow">KENDİ KARTINI YAP</span><h2>Şansını kendin yaz.</h2></div><button class="icon-button" data-close aria-label="Kapat">×</button></div><p>Boş kareler sabit. Sayıları sütun aralıklarına göre seç; aynı sütundaki üst sayı daha küçük olsun.</p><div class="column-labels">${range(CARD_COLUMNS).map(c=>`<span>${c===9?'90':columnRange(c).join('–')}</span>`).join('')}</div><form id="custom-form"><div class="custom-grid">${customCard.map((n,i)=>hasCardNumber(i)?`<input type="number" inputmode="numeric" min="${columnRange(i%CARD_COLUMNS)[0]}" max="${columnRange(i%CARD_COLUMNS)[1]}" value="${n||''}" ${i%CARD_COLUMNS===9?'readonly':''} aria-label="${Math.floor(i/CARD_COLUMNS)+1}. satır ${i%CARD_COLUMNS+1}. sütun" data-cell="${i}">`:'<span class="custom-empty" aria-hidden="true"></span>').join('')}</div><p id="custom-error" class="inline-error" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" data-clear>Temizle</button><button type="submit" class="button primary">Kartımı kullan ${icons.arrow}</button></div></form>`;
 showDialog('#card-dialog');
}
$('#card-dialog').addEventListener('click',e=>{const pick=e.target.closest('[data-pick]');if(pick)run(async()=>{await transport.editPlayer({card:encodeCard(choices[Number(pick.dataset.pick)])});closeDialog($('#card-dialog'));});if(e.target.closest('[data-clear]'))$('#card-dialog').querySelectorAll('input:not([readonly])').forEach(i=>i.value='');});
$('#card-dialog').addEventListener('submit',e=>{if(e.target.id!=='custom-form')return;e.preventDefault();const card=Array(CARD_SIZE).fill(0);$('#card-dialog').querySelectorAll('[data-cell]').forEach(i=>card[Number(i.dataset.cell)]=i.value===''?0:Number(i.value));const message=validateCard(card);if(message){$('#custom-error').textContent=message;return;}run(async()=>{await transport.editPlayer({card:encodeCard(card)});closeDialog($('#card-dialog'));},$('#custom-error'));});
let ticking=false;setInterval(async()=>{if(ticking||!room||!isHost()||room.meta.phase!=='playing'||!room.game.auto)return;ticking=true;try{await transport.hostAction('tick');}catch(e){toast(e.message,true);}finally{ticking=false;}},1000);
function demoTransport(){let state,current='2468',onRoom;const emit=()=>onRoom?.(structuredClone(state));return {uid:()=> 'demo-me',code:()=>current,connect:async()=> 'demo-me',create:async name=>{state=newRoom('demo-me',name);state.players[1]=newPlayer('demo-2','Deniz',1);state.players[2]=newPlayer('demo-3','Ece',2);state.players[1].readyRound=1;state.players[2].readyRound=1;return current;},join:async function(code,name){return this.create(name);},watch:async(fn,connected)=>{onRoom=fn;connected(true);emit();},editPlayer:async changes=>{Object.assign(state.players[0],changes);emit();},hostAction:async(action,value)=>{if(action==='start')startRound(state);if(action==='draw'||(action==='tick'&&state.game.auto&&Date.now()-state.game.updatedAt>=5000))drawNext(state);if(action==='auto'){state.game.auto=value;state.game.updatedAt=Date.now();}if(action==='reset'){resetRound(state);state.players[1].readyRound=state.meta.round;state.players[2].readyRound=state.meta.round;}emit();},claimHost:async()=>{},leave:async()=>{onRoom=null;state=null;}};}
if(/^[1-9][0-9]{3}$/.test(params.get('oda')||''))tab='join';
renderHome();
const updateHeight=()=>{if(!window.visualViewport||window.visualViewport.scale===1)document.documentElement.style.setProperty('--app-height',`${Math.round(window.visualViewport?.height||window.innerHeight)}px`);};
window.visualViewport?.addEventListener('resize',updateHeight);updateHeight();
if(demo&&['lobby','game','results'].includes(params.get('scene'))){run(async()=>{await initTransport();await transport.create(defaultName()||'Burak');const scene=params.get('scene');if(scene!=='lobby'){await transport.editPlayer({readyRound:1});await transport.hostAction('start');}if(scene==='game')for(let i=0;i<18;i++)await transport.hostAction('draw');if(scene==='results')for(let i=0;i<90;i++)await transport.hostAction('draw');await transport.watch(renderRoom,connection,e=>toast(e.message,true));});}
if(!demo&&sessionStorage.getItem('tombala-room-v3')){run(async()=>{await initTransport();try{await transport.join(sessionStorage.getItem('tombala-room-v3'),defaultName()||'Misafir');}catch(error){sessionStorage.removeItem('tombala-room-v3');throw error;}await transport.watch(renderRoom,connection,e=>toast(e.message,true));}).catch(()=>{});}
