// Arranque: carga ubicaciones guardadas, geolocalización, wiring de toda la UI,
// registro del Service Worker.
import {state,activeLocation} from './state.js';
import * as storage from './storage.js';
import {fetchForecast} from './weather.js';
import {searchLocations,reverseGeocode} from './geocode.js';
import {initTheme,toggleTheme} from './theme.js';
import * as ui from './ui.js';

const $=id=>document.getElementById(id);
const GPS_ID='gps-current';

// ── Estado inicial ───────────────────────────────────────
initTheme();
state.locations=storage.loadLocations();
state.activeLocationId=storage.loadActiveId();

// ── Carga de clima para una ubicación (con caché offline) ─
async function loadWeather(locationId,{silent=false}={}){
  const loc=state.locations.find(l=>l.id===locationId);
  if(!loc)return;
  if(!silent)ui.showLoading(true);
  try{
    const data=await fetchForecast(loc.lat,loc.lon);
    state.weatherByLocation[locationId]={data,fetchedAt:Date.now(),offline:false};
    storage.saveCache(locationId,data);
  }catch(err){
    const cached=storage.loadCache(locationId);
    if(cached){
      state.weatherByLocation[locationId]={data:cached.data,fetchedAt:cached.fetchedAt,offline:true};
    }else if(!state.weatherByLocation[locationId]){
      ui.showLoading(false);
      return;
    }
  }
  ui.showLoading(false);
  if(locationId===state.activeLocationId)ui.renderAll();
}

async function refreshActive(){
  if(!state.activeLocationId)return;
  const loc=activeLocation();
  if(loc&&loc.isGPS){
    try{
      const pos=await getPosition();
      loc.lat=+pos.coords.latitude.toFixed(4);
      loc.lon=+pos.coords.longitude.toFixed(4);
      try{Object.assign(loc,await reverseGeocode(loc.lat,loc.lon));}catch(_){/* sin nombre nuevo: se conserva el anterior */}
      storage.saveLocations(state.locations);
      ui.renderSavedLocations();
    }catch(_){/* seguimos con las últimas coordenadas conocidas */}
  }
  await loadWeather(state.activeLocationId);
}

function getPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('sin geolocalización'));return;}
    navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:8000,maximumAge:300000});
  });
}

async function setActive(locationId){
  state.activeLocationId=locationId;
  state.expandedDayIdx=0;
  storage.saveActiveId(locationId);
  ui.renderAll();
  const cached=storage.loadCache(locationId);
  if(cached&&!state.weatherByLocation[locationId]){
    state.weatherByLocation[locationId]={data:cached.data,fetchedAt:cached.fetchedAt,offline:true};
    ui.renderAll();
  }
  await loadWeather(locationId,{silent:!!state.weatherByLocation[locationId]});
}

function addLocation(loc){
  const exists=state.locations.find(l=>l.id===loc.id);
  if(!exists)state.locations.push(loc);
  storage.saveLocations(state.locations);
  ui.renderSavedLocations();
  return loc;
}
function removeLocation(id){
  state.locations=state.locations.filter(l=>l.id!==id);
  delete state.weatherByLocation[id];
  storage.saveLocations(state.locations);
  if(state.activeLocationId===id){
    const next=state.locations[0];
    if(next)setActive(next.id);else{state.activeLocationId=null;storage.saveActiveId(null);ui.renderAll();}
  }
  ui.renderSavedLocations();
}

// ── Ubicación por GPS ─────────────────────────────────────
async function useGPS(){
  ui.showLoading(true);
  try{
    const pos=await getPosition();
    const lat=+pos.coords.latitude.toFixed(4),lon=+pos.coords.longitude.toFixed(4);
    let loc=state.locations.find(l=>l.id===GPS_ID);
    if(!loc){
      loc={id:GPS_ID,label:'Mi ubicación',admin1:'',country:'',countryCode:'',lat,lon,isGPS:true};
      state.locations.unshift(loc);
    }else{loc.lat=lat;loc.lon=lon;}
    try{Object.assign(loc,await reverseGeocode(lat,lon));}catch(_){/* sin nombre: queda "Mi ubicación" */}
    storage.saveLocations(state.locations);
    closeLocationModal();
    await setActive(GPS_ID);
  }catch(err){
    ui.showLoading(false);
    alert('No se pudo obtener tu ubicación. Revisá los permisos del navegador.');
  }
}

// ── Modal de ubicaciones ──────────────────────────────────
function openLocationModal(){
  ui.renderSavedLocations();
  $('search-results').innerHTML='';
  $('location-search').value='';
  $('location-modal').hidden=false;
  requestAnimationFrame(()=>$('location-modal').classList.add('visible'));
  setTimeout(()=>$('location-search').focus(),80);
}
function closeLocationModal(){
  $('location-modal').classList.remove('visible');
  setTimeout(()=>{$('location-modal').hidden=true;},200);
}

let searchTimer=null;
$('location-search').addEventListener('input',e=>{
  clearTimeout(searchTimer);
  const q=e.target.value;
  searchTimer=setTimeout(async()=>{
    if(q.trim().length<2){$('search-results').innerHTML='';return;}
    try{
      const results=await searchLocations(q);
      ui.renderSearchResults(results,async r=>{
        addLocation(r);
        closeLocationModal();
        await setActive(r.id);
      });
    }catch(_){/* sin conexión: buscar no anda, guardadas siguen disponibles */}
  },350);
});

$('location-btn').addEventListener('click',openLocationModal);
$('location-close').addEventListener('click',closeLocationModal);
$('location-modal').addEventListener('click',e=>{if(e.target.id==='location-modal')closeLocationModal();});
$('gps-btn').addEventListener('click',useGPS);
$('saved-list').addEventListener('click',e=>{
  const row=e.target.closest('.loc-row');if(!row)return;
  const id=row.dataset.id;
  if(e.target.closest('.loc-remove')){removeLocation(id);return;}
  if(e.target.closest('.loc-select')){closeLocationModal();setActive(id);}
});

$('theme-toggle').addEventListener('click',toggleTheme);
$('refresh-btn').addEventListener('click',refreshActive);
ui.initAccordion();

// ── Arranque ───────────────────────────────────────────────
(async function boot(){
  if(state.locations.length){
    // Repoblar caché en memoria para que haya algo que mostrar mientras llega el fetch nuevo
    state.locations.forEach(loc=>{
      const cached=storage.loadCache(loc.id);
      if(cached)state.weatherByLocation[loc.id]={data:cached.data,fetchedAt:cached.fetchedAt,offline:true};
    });
    if(!state.activeLocationId||!state.locations.find(l=>l.id===state.activeLocationId)){
      state.activeLocationId=state.locations[0].id;
    }
    ui.renderAll();
    await loadWeather(state.activeLocationId,{silent:true});
  }else{
    ui.renderAll();
    openLocationModal();
  }
})();

if('serviceWorker'in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js').catch(()=>{/* no crítico */});
  });
}
