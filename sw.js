// Ağ öncelikli önbellek: çevrimiçiyken her zaman güncel dosyalar gelir, bağlantı yoksa son
// başarılı kopya açılır. Böylece botlarla oyun çevrimdışı da başlar. Firebase isteklerine dokunulmaz.
const CACHE='tombala-4.1.0';
const SHELL=['./','index.html','styles.css','app.js','core.js','game-events.js','fx.js','solo.js','room-transactions.js','firebase.js','firebase-config.js','icon.svg','manifest.webmanifest','icons/icon-192.png','icons/icon-180.png'];
const FONT_HOSTS=['fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(FONT_HOSTS.includes(url.hostname)){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const cached=await cache.match(request);
   const network=fetch(request).then(response=>{if(response.ok||response.type==='opaque')cache.put(request,response.clone());return response;}).catch(()=>cached);
   return cached||network;
  }));
  return;
 }
 if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
  return response;
 }).catch(async()=>{
  const cached=await caches.match(request,{ignoreSearch:request.mode==='navigate'});
  if(cached)return cached;
  if(request.mode==='navigate')return caches.match('index.html');
  return Response.error();
 }));
});
