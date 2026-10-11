'use strict';
const CACHE='snake-tentations-v3-simple';
const ASSETS=['./','./index.html','./style.css?v=3','./engine.js','./touch.js','./app.js?v=3','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(ASSETS.map(async path=>{
  const response=await fetch(new URL(path,self.registration.scope),{cache:'reload'});
  if(!response.ok||response.redirected)throw new Error('Asset not available for offline use');
  if(path==='./'||path==='./index.html'){
    const html=await response.clone().text();
    if(!html.includes('id="board"'))throw new Error('Unexpected hosting access page');
  }
  await cache.put(new URL(path,self.registration.scope),response);
}))));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('snake-tentations-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Never retain sign-in redirects or pages supplied by the hosting access layer.
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));return;
  }
  const asset=ASSETS.some(path=>new URL(path,self.registration.scope).pathname===url.pathname);
  if(!asset)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
