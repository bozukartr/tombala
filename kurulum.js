import {ROOM_BASE} from './room-transactions.js';
const $=selector=>document.querySelector(selector);
let rulesText='',checking=false,returnedFromPanel=false;

async function loadRules(){
  const button=$('#copy-rules'),status=$('#copy-status');
  try{
    const response=await fetch('database.rules.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Kurallar dosyası yüklenemedi.');
    const text=await response.text(),parsed=JSON.parse(text);
    if(!parsed.rules?.[ROOM_BASE])throw new Error('Kurallar dosyası bu oyun sürümüyle eşleşmiyor.');
    rulesText=text;$('#rules-text').value=text;button.disabled=false;button.textContent='Kuralları kopyala';
    status.textContent='Bu sayfa her açıldığında güncel dosya yüklenir.';
  }catch(error){
    button.textContent='Kurallar yüklenemedi';status.className='setup-status error';
    status.textContent=error.message+' Sayfayı yenileyebilir veya aşağıdaki dosya bağlantısını açabilirsin.';
  }
}
$('#copy-rules').addEventListener('click',async()=>{
  if(!rulesText)return;
  const status=$('#copy-status');
  try{
    await navigator.clipboard.writeText(rulesText);
    $('#copy-badge').classList.add('done');$('#copy-badge').textContent='✓';
    $('#copy-rules').textContent='✓ Kurallar kopyalandı';status.className='setup-status success';
    status.textContent='Şimdi 2. adımdan Firebase panelini aç ve metni Kurallar alanına yapıştır.';
  }catch{
    $('#rules-details').open=true;const field=$('#rules-text');field.focus();field.select();
    status.className='setup-status';status.textContent='Tarayıcı otomatik kopyalamaya izin vermedi. Açılan metnin tamamını seçip kopyala.';
  }
});
$('#select-rules').addEventListener('click',()=>{const field=$('#rules-text');field.focus();field.select();});
$('#open-firebase').addEventListener('click',()=>returnedFromPanel=true);

async function checkConnection(){
  if(checking)return;
  checking=true;const button=$('#test-connection'),status=$('#connection-status');
  button.disabled=true;button.textContent='Kontrol ediliyor…';status.className='setup-status';
  status.textContent='Firebase bağlantısı kuruluyor. Bu işlem oda oluşturmaz.';
  let timeout;
  try{
    if(!navigator.onLine)throw new Error('İnternet bağlantını kontrol edip tekrar dene.');
    await Promise.race([
      import('./firebase.js').then(module=>module.verifyRoomReadAccess()),
      new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Bağlantı zaman aşımına uğradı. İnternetini kontrol edip tekrar dene.')),12000);})
    ]);
    $('#test-badge').textContent='✓';$('#test-badge').classList.add('done');
    status.className='setup-status success';status.textContent='Anonim giriş ve oda okuma izni hazır. Oyuna dönüp yeni bir oda kurmayı dene.';
  }catch(error){
    $('#test-badge').textContent='3';$('#test-badge').classList.remove('done');status.className='setup-status error';
    status.textContent=error.setupRequired?'Yeni odalara erişim hâlâ reddediliyor. Firebase panelinde güncel kuralları yayımlayıp tekrar dene.':error.message||'Bağlantı kontrol edilemedi. Tekrar dene.';
  }finally{
    clearTimeout(timeout);checking=false;button.disabled=false;button.textContent='Bağlantıyı tekrar kontrol et';
  }
}
$('#test-connection').addEventListener('click',checkConnection);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&returnedFromPanel){returnedFromPanel=false;checkConnection();}});
loadRules();
