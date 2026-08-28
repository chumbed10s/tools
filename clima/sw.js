// Service Worker: deja la app instalable y utilizable sin conexión. Con todo el
// shell + íconos + fuentes en el mismo origen, el offline es confiable.
const SHELL_CACHE='clima-shell-v6';
const RUNTIME_CACHE='clima-runtime-v6';

const WX=['clear-day','clear-night','partly-cloudy-day','partly-cloudy-night','overcast-day',
  'overcast-night','fog-day','fog-night','drizzle','sleet','rain','extreme-day-rain',
  'extreme-night-rain','snow','partly-cloudy-day-rain','partly-cloudy-night-rain',
  'partly-cloudy-day-snow','partly-cloudy-night-snow','thunderstorms-day-rain','thunderstorms-night-rain']
  .map(n=>`./assets/weather/${n}.svg`);

const SHELL_FILES=[
  './','./index.html','./styles.css','./manifest.json','./icon.svg',
  './assets/fonts/inter-latin.woff2','./assets/fonts/inter-latin-ext.woff2',
  ...WX,
  './js/main.js','./js/state.js','./js/storage.js','./js/format.js','./js/weather.js',
  './js/geocode.js','./js/icons.js','./js/ui-icons.js','./js/theme.js','./js/router.js',
  './js/anim.js','./js/toast.js','./js/glossary.js','./js/tooltip.js','./js/charts.js',
  './js/backdrop.js','./js/minimap.js','./js/sun-arc.js','./js/alerts.js','./js/digest.js','./js/geo-watch.js',
  './js/agro/meteo.js','./js/agro/profiles.js','./js/agro/engine.js',
  './js/sections/common.js','./js/sections/ahora.js','./js/sections/porhora.js',
  './js/sections/semana.js','./js/sections/dia-detalle.js','./js/sections/campo.js','./js/sections/ajustes.js',
];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(SHELL_FILES).catch(()=>{})));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==SHELL_CACHE&&k!==RUNTIME_CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);

  if(url.origin===location.origin){
    // Shell propio + assets: caché primero, refresco en segundo plano.
    e.respondWith(caches.match(e.request).then(cached=>{
      const fresh=fetch(e.request).then(res=>{
        const copy=res.clone();
        caches.open(SHELL_CACHE).then(c=>c.put(e.request,copy));
        return res;
      }).catch(()=>cached);
      return cached||fresh;
    }));
    return;
  }

  if(url.hostname.endsWith('open-meteo.com')||url.hostname.includes('bigdatacloud')){
    // Datos: red primero, respaldo cacheado.
    e.respondWith(fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match(e.request)));
    return;
  }

  // Tiles de mapa y otros: caché primero.
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    const copy=res.clone();
    caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,copy));
    return res;
  }).catch(()=>cached)));
});

// ── Periodic Background Sync (Chromium + PWA instalada): revisa el pronóstico y
// dispara notificaciones locales de helada / ventana. Sin backend.
self.addEventListener('periodicsync',e=>{
  if(e.tag==='clima-check')e.waitUntil(checkAndNotify());
});

async function checkAndNotify(){
  try{
    // La app escribe su config de notificación en este endpoint sintético (Cache API),
    // porque el SW no tiene acceso a localStorage.
    const cache=await caches.open(RUNTIME_CACHE);
    const res=await cache.match('/__notify-config');
    if(!res)return;
    const cfg=await res.json();
    const loc=cfg.location;
    if(!loc)return;
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}`
      +`&daily=temperature_2m_min,weather_code&timezone=auto&forecast_days=2`;
    const data=await (await fetch(url)).json();
    const minTonight=Math.min(...(data.daily?.temperature_2m_min||[99]));
    if(cfg.frost!==false && minTonight<=(cfg.frostThreshold??3)){
      await self.registration.showNotification('Riesgo de helada',{
        body:`Mínima prevista ${Math.round(minTonight)}° para ${loc.label}.`,
        icon:'./icon.svg',tag:'clima-frost',
      });
    }
  }catch(_){/* silencioso */}
}

// La app manda su config vía postMessage; la guardamos para el próximo periodicsync.
self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='notify-config'){
    e.waitUntil(caches.open(RUNTIME_CACHE).then(c=>
      c.put('/__notify-config',new Response(JSON.stringify(e.data.payload),{headers:{'Content-Type':'application/json'}}))));
  }
});
