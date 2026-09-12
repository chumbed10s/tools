// Service Worker: deja la app instalable y utilizable sin conexión.
const SHELL_CACHE='clima-shell-v7';
const RUNTIME_CACHE='clima-runtime-v7';

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
  './js/anim.js','./js/toast.js','./js/charts.js','./js/minimap.js','./js/geo-watch.js',
  './js/agro/meteo.js','./js/agro/engine.js',
  './js/sections/common.js','./js/sections/ahora.js','./js/sections/porhora.js',
  './js/sections/semana.js','./js/sections/dia-detalle.js','./js/sections/ubicaciones.js',
  './js/sections/add-location.js','./js/sections/ajustes.js',
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
    // Red primero (así una app en desarrollo activa no queda pegada a una
    // versión vieja del shell); caché como respaldo si no hay conexión.
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(res=>{
      const copy=res.clone();
      caches.open(SHELL_CACHE).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match(e.request)));
    return;
  }

  if(url.hostname.endsWith('open-meteo.com')||url.hostname.includes('bigdatacloud')){
    e.respondWith(fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,copy));
      return res;
    }).catch(()=>caches.match(e.request)));
    return;
  }

  // Tiles de mapa, Font Awesome, Chart.js: caché primero.
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    const copy=res.clone();
    caches.open(RUNTIME_CACHE).then(c=>c.put(e.request,copy));
    return res;
  }).catch(()=>cached)));
});
