// Service Worker: deja la app instalable y utilizable sin conexión.
// El clima en sí ya se guarda en localStorage (ver js/storage.js) — esto cubre
// el shell (HTML/CSS/JS) y cachea íconos/fuentes de paso.
const SHELL_CACHE='clima-shell-v1';
const RUNTIME_CACHE='clima-runtime-v1';
const SHELL_FILES=[
  './','./index.html','./styles.css','./manifest.json','./icon.svg',
  './js/state.js','./js/storage.js','./js/geocode.js','./js/weather.js',
  './js/icons.js','./js/insights.js','./js/charts.js','./js/ui.js',
  './js/theme.js','./js/main.js',
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL_FILES)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==SHELL_CACHE&&k!==RUNTIME_CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);

  if(url.origin===location.origin){
    // Shell propio: mostrar lo cacheado al toque, y actualizar en segundo plano.
    e.respondWith(
      caches.match(e.request).then(cached=>{
        const fresh=fetch(e.request).then(res=>{
          caches.open(SHELL_CACHE).then(c=>c.put(e.request,res.clone()));
          return res;
        }).catch(()=>cached);
        return cached||fresh;
      })
    );
    return;
  }

  if(url.hostname==='api.open-meteo.com'||url.hostname==='geocoding-api.open-meteo.com'){
    // Pronóstico/geocoding: red primero (datos frescos), y si no hay conexión,
    // el último que haya quedado guardado acá.
    e.respondWith(
      fetch(e.request).then(res=>{
        caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,res.clone()));
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  // Íconos (Meteocons) y fuentes: una vez descargados, quedan disponibles offline.
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
      caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,res.clone()));
      return res;
    }))
  );
});
