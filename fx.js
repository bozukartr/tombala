// Oyun hissi: ses efektleri, Türkçe sayı okuma, titreşim, ekranı açık tutma ve konfeti.
// Tarayıcı desteklemiyorsa her biri sessizce devre dışı kalır.
import {numberWord} from './core.js';

const SETTINGS_KEY='tombala-settings';
const DEFAULTS={sound:true,voice:false,haptics:true,wake:true,theme:'system'};
function load(){
 try{return{...DEFAULTS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch{return{...DEFAULTS};}
}
export const settings=load();
export function saveSetting(key,value){
 settings[key]=value;
 try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}
 if(key==='voice'&&value)speak('Hazırız');
 if(key==='wake')keepAwake(wakeWanted);
}
const reducedMotion=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// --- Ses -----------------------------------------------------------------
let ctx,master;
function audio(){
 if(!settings.sound)return null;
 if(!ctx){
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return null;
  ctx=new Context();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);
 }
 if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 return ctx;
}
// iOS ve Chrome sesi ilk dokunuşla açar.
export function unlockAudio(){if(settings.sound)audio();}
function tone({freq,type='sine',dur=.16,gain=.18,at=0,slide=1,attack=.006}){
 const c=audio();if(!c)return;
 const t=c.currentTime+at,osc=c.createOscillator(),amp=c.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,t);
 if(slide!==1)osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),t+dur);
 amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(gain,t+attack);amp.gain.exponentialRampToValueAtTime(.0001,t+dur);
 osc.connect(amp);amp.connect(master);osc.start(t);osc.stop(t+dur+.03);
}
// Tahta pulun torbadan çıkışı: kısa, filtrelenmiş gürültü.
function knock({at=0,freq=1100,gain=.32,dur=.06}={}){
 const c=audio();if(!c)return;
 const t=c.currentTime+at,length=Math.floor(c.sampleRate*dur),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,3);
 const src=c.createBufferSource(),filter=c.createBiquadFilter(),amp=c.createGain();
 src.buffer=buffer;filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=1.4;amp.gain.value=gain;
 src.connect(filter);filter.connect(amp);amp.connect(master);src.start(t);
}
export const sfx={
 draw(){knock();tone({freq:540,dur:.18,gain:.12,slide:.72,at:.015});},
 mark(){tone({freq:880,type:'triangle',dur:.09,gain:.14,slide:1.45});},
 wrong(){tone({freq:190,type:'square',dur:.12,gain:.035,slide:.8});},
 react(){tone({freq:1180,dur:.08,gain:.07,slide:1.2});},
 tick(){knock({freq:1500,gain:.18,dur:.04});tone({freq:660,dur:.09,gain:.08});},
 go(){tone({freq:784,dur:.12,gain:.12});tone({freq:1175,dur:.22,gain:.12,at:.1});},
 award(){[784,988,1175].forEach((freq,i)=>tone({freq,type:'triangle',dur:.32,gain:.13,at:i*.09}));},
 tombala(){[523,659,784,1047,1319].forEach((freq,i)=>tone({freq,type:'triangle',dur:i===4?.7:.28,gain:.14,at:i*.11}));tone({freq:262,dur:.9,gain:.08,at:.44});},
};

// --- Türkçe sayı okuma ------------------------------------------------------
const speech=()=>globalThis.speechSynthesis;
export const voiceSupported=()=>Boolean(speech()&&globalThis.SpeechSynthesisUtterance);
function turkishVoice(){return speech()?.getVoices().find(v=>/^tr(-|_|$)/i.test(v.lang))||null;}
// Ses listesi bazı tarayıcılarda geç yüklenir; liste boşsa tarayıcının seçimine bırakılır.
export function voiceStatus(){
 if(!voiceSupported())return 'unsupported';
 const voices=speech().getVoices();
 return !voices.length||turkishVoice()?'ready':'missing';
}
export function speak(text){
 if(!settings.voice||!voiceSupported()||!text)return;
 try{
  const utterance=new SpeechSynthesisUtterance(text),voice=turkishVoice();
  utterance.lang='tr-TR';if(voice)utterance.voice=voice;utterance.rate=1.02;
  speech().cancel();speech().speak(utterance);
 }catch{}
}
export const callNumber=n=>speak(numberWord(n));

// --- Titreşim -----------------------------------------------------------------
let iosSwitch;
// iOS titreşim API'si sunmaz; sistem anahtarına dokunmak kısa bir dokunsal geri bildirim verir.
function iosTap(){
 if(!/iP(hone|ad|od)/.test(globalThis.navigator?.userAgent||''))return;
 if(!iosSwitch){
  const label=document.createElement('label'),input=document.createElement('input');
  input.type='checkbox';input.setAttribute('switch','');label.append(input);
  label.style.cssText='position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden';label.setAttribute('aria-hidden','true');
  document.body.append(label);iosSwitch=label;
 }
 iosSwitch.click();
}
export function buzz(pattern,fromTap=false){
 if(!settings.haptics)return;
 try{
  if(globalThis.navigator?.vibrate)navigator.vibrate(pattern);
  else if(fromTap)iosTap();
 }catch{}
}
export const haptics={
 tap:()=>buzz(8,true),
 mark:()=>buzz(14,true),
 wrong:()=>buzz([28,40,28],true),
 award:()=>buzz([20,50,40]),
 tombala:()=>buzz([40,60,40,60,140]),
};

// --- Ekranı açık tutma ----------------------------------------------------------
let lock=null,wakeWanted=false;
export const wakeSupported=()=>Boolean(globalThis.navigator?.wakeLock);
export async function keepAwake(on){
 wakeWanted=on;
 if(!wakeSupported())return;
 try{
  if(on&&settings.wake&&document.visibilityState==='visible'){
   if(!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null;});}
  }else if(lock){const current=lock;lock=null;await current.release();}
 }catch{lock=null;}
}
globalThis.document?.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&wakeWanted)keepAwake(true);});

// --- Konfeti ---------------------------------------------------------------------
export function confetti({count=140,colors=['#ef6a4c','#e9a23b','#3fa37e','#3d8fd6','#f3f2ee'],spread=1}={}){
 if(reducedMotion()||!globalThis.document)return;
 const canvas=document.createElement('canvas'),c=canvas.getContext('2d');if(!c)return;
 const dpr=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight;
 canvas.width=w*dpr;canvas.height=h*dpr;canvas.className='confetti-canvas';canvas.setAttribute('aria-hidden','true');
 c.scale(dpr,dpr);document.body.append(canvas);
 const parts=Array.from({length:count},(_,i)=>{
  const side=i%2?1:-1,angle=(-Math.PI/2)+side*(.25+Math.random()*.55)*spread;
  const speed=8+Math.random()*9;
  return{x:w/2+side*w*.18,y:h*.92,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-3,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.35,s:5+Math.random()*6,color:colors[i%colors.length],round:Math.random()<.3};
 });
 const start=performance.now(),life=2600;
 (function frame(now){
  const t=now-start;c.clearRect(0,0,w,h);
  for(const p of parts){
   p.vy+=.32;p.vx*=.992;p.vy*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
   c.save();c.globalAlpha=Math.max(0,1-Math.max(0,t-life*.6)/(life*.4));c.translate(p.x,p.y);c.rotate(p.r);c.fillStyle=p.color;
   if(p.round){c.beginPath();c.arc(0,0,p.s*.45,0,Math.PI*2);c.fill();}else c.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);
   c.restore();
  }
  if(t<life)requestAnimationFrame(frame);else canvas.remove();
 })(start);
}
