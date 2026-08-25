const CACHE='wedding-hub-v3';
const CORE=['./','./index.html','./manifest.json','./cloud.js'];
async function injectCloud(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  const text=await response.text();
  if(text.includes('./cloud.js')) return new Response(text,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  const injected=text.replace('</body>','<script type="module" src="./cloud.js"></script></body>');
  return new Response(injected,{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of CORE){try{const r=await fetch(url,{cache:'no-store'});if(r.ok){const out=url.endsWith('index.html')?await injectCloud(r.clone()):r;await cache.put(url,out)}}catch(e){}}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch('./index.html',{cache:'no-store'}).then(r=>injectCloud(r)).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return r}).catch(()=>cached)));
});