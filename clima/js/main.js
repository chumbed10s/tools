// Arranque y orquestación: carga de estado, router de 5 secciones, cielo vivo,
// modal de ubicaciones, seguimiento por GPS, alertas y Service Worker.
import {state,activeLocation,activeData,agroOn} from './state.js';
import * as storage from './storage.js';
import {fetchForecast,nowHourIndex,wmoCategory} from './weather.js';
import {searchLocations,reverseGeocode} from './geocode.js';
import {initTheme} from './theme.js';
import {getProfiles} from './agro/profiles.js';
import {initRouter,register,refreshCurrent,go} from './router.js';
import {initTooltips} from './tooltip.js';
import {initBackdrop,setBackdrop,refreshBackdrop} from './backdrop.js';
import {initGeoWatch,checkGeoOnce,syncGeoWatch} from './geo-watch.js';
import {toast} from './toast.js';
import {icon} from './ui-icons.js';
import {flagEmoji} from './geocode.js';
import {miniMapHTML} from './minimap.js';

import * as ahora from './sections/ahora.js';
import * as porhora from './sections/porhora.js';
import * as semana from './sections/semana.js';
import * as campo from './sections/campo.js';
import * as ajustes from './sections/ajustes.js';

const $=id=>document.getElementById(id);
const GPS_ID='gps-current';

// ── Estado inicial ───────────────────────────────────────
state.settings=storage.loadSettings();
state.alerts=storage.loadAlerts();
state.activeProfileId=storage.loadActiveProfileId();
state.profiles=getProfiles();
state.locations=storage.loadLocations();
state.activeLocationId=storage.loadActiveId();
initTheme();

// ── Router + secciones ───────────────────────────────────
register('ahora',ahora);
register('porhora',porhora);
register('semana',semana);
register('campo',campo);
register('ajustes',ajustes);

function buildNav(){
  const nav=$('bottomnav');
  let defs=[['ahora',ahora],['porhora',porhora],['semana',semana],['campo',campo],['ajustes',ajustes]];
  if(!agroOn())defs=defs.filter(([n])=>n!=='campo');
  nav.innerHTML=defs.map(([name,mod])=>`
    <button data-nav="${name}" class="navb">
      ${icon(mod.navIcon,{size:20})}<span>${mod.label}</span>
    </button>`).join('');
  document.documentElement.classList.toggle('no-agro',!agroOn());
}
window.addEventListener('agro-mode-changed',()=>{
  buildNav();
  if(!agroOn()&&state.section==='campo')go('ahora'); else refreshCurrent();
});

// ── Carga de clima ───────────────────────────────────────
async function loadWeather(locationId,{silent=false}={}){
  const loc=state.locations.find(l=>l.id===locationId);
  if(!loc)return;
  if(!silent)showLoading(true);
  try{
    const data=await fetchForecast(loc.lat,loc.lon);
    state.weatherByLocation[locationId]={data,fetchedAt:Date.now(),offline:false};
    storage.saveCache(locationId,data);
  }catch(err){
    const cached=storage.loadCache(locationId);
    if(cached)state.weatherByLocation[locationId]={data:cached.data,fetchedAt:cached.fetchedAt,offline:true};
    else if(!state.weatherByLocation[locationId]){showLoading(false);return;}
  }
  showLoading(false);
  if(locationId===state.activeLocationId){syncHeader();syncBackdrop();refreshCurrent();}
}

async function refreshActive(){
  if(!state.activeLocationId)return;
  const loc=activeLocation();
  showLoading(true);
  if(loc&&loc.isGPS)await checkGeoOnce();
  await loadWeather(state.activeLocationId);
}

async function setActive(locationId){
  state.activeLocationId=locationId;
  state.dayDetailIdx=null;
  storage.saveActiveId(locationId);
  syncHeader();
  const cached=storage.loadCache(locationId);
  if(cached&&!state.weatherByLocation[locationId])
    state.weatherByLocation[locationId]={data:cached.data,fetchedAt:cached.fetchedAt,offline:true};
  syncBackdrop();refreshCurrent();
  syncGeoWatch();
  await loadWeather(locationId,{silent:!!state.weatherByLocation[locationId]});
}

function addLocation(loc){
  if(!state.locations.find(l=>l.id===loc.id))state.locations.push(loc);
  storage.saveLocations(state.locations);
  renderSavedLocations();
  return loc;
}
function removeLocation(id){
  state.locations=state.locations.filter(l=>l.id!==id);
  delete state.weatherByLocation[id];
  storage.saveLocations(state.locations);
  if(state.activeLocationId===id){
    const next=state.locations[0];
    if(next)setActive(next.id);
    else{state.activeLocationId=null;storage.saveActiveId(null);refreshCurrent();}
  }
  renderSavedLocations();
}

// ── GPS ──────────────────────────────────────────────────
function getPosition(){
  return new Promise((res,rej)=>{
    if(!navigator.geolocation)return rej(new Error('sin geolocalización'));
    navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000,maximumAge:120000});
  });
}
async function useGPS(){
  showLoading(true);
  try{
    const pos=await getPosition();
    const lat=+pos.coords.latitude.toFixed(4),lon=+pos.coords.longitude.toFixed(4);
    let loc=state.locations.find(l=>l.id===GPS_ID);
    if(!loc){loc={id:GPS_ID,label:'Mi ubicación',admin1:'',country:'',countryCode:'',lat,lon,isGPS:true};state.locations.unshift(loc);}
    else{loc.lat=lat;loc.lon=lon;}
    try{Object.assign(loc,await reverseGeocode(lat,lon));}catch(_){}
    storage.saveLocations(state.locations);
    closeLocationModal();
    await setActive(GPS_ID);
  }catch(_){
    showLoading(false);
    toast('No se pudo obtener tu ubicación. Revisá los permisos.',{iconName:'alert',tone:'storm'});
  }
}

// ── Header ───────────────────────────────────────────────
function syncHeader(){
  const loc=activeLocation();
  $('location-name').textContent=loc?loc.label:'Elegí ubicación';
  const pill=$('gps-pill');
  pill.hidden=!(loc&&loc.isGPS);
  pill.classList.toggle('live',!!state.geo.watching);
}
function showLoading(on){
  $('loading-overlay').hidden=!on;
  $('refresh-btn')?.classList.toggle('spinning',on);
}
function syncBackdrop(){
  const data=activeData();
  if(!data)return;
  const i=nowHourIndex(data),h=data.hourly,d=data.daily;
  const di=d.time.findIndex(t=>t===data.current.time.slice(0,10));
  setBackdrop({
    category:wmoCategory(data.current.weather_code),
    isDay:data.current.is_day,
    hour:new Date(data.current.time).getHours()+new Date(data.current.time).getMinutes()/60,
    sunrise:d.sunrise[di>=0?di:0],sunset:d.sunset[di>=0?di:0],
    precipMm:data.current.precipitation||h.precipitation[i]||0,
    cape:h.cape?.[i]||0,cloudCover:data.current.cloud_cover??h.cloud_cover[i]??20,
  });
}

// ── Modal de ubicaciones ─────────────────────────────────
function openLocationModal(){
  renderSavedLocations();
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
function renderSavedLocations(){
  const list=$('saved-list');
  if(!state.locations.length){list.innerHTML='<div class="empty-hint">Sin ubicaciones guardadas.</div>';return;}
  list.innerHTML=state.locations.map(loc=>`
    <div class="loc-row${loc.isGPS?' loc-row-gps':''}${loc.id===state.activeLocationId?' active':''}" data-id="${loc.id}">
      <button class="loc-select">
        <span class="loc-name">${loc.isGPS?icon('crosshairs',{size:13}):flagEmoji(loc.countryCode)} ${loc.label}</span>
        <span class="loc-sub">${[loc.admin1,loc.country].filter(Boolean).join(', ')}</span>
      </button>
      ${loc.isGPS?'':`<button class="loc-remove" title="Quitar">${icon('x',{size:13})}</button>`}
      ${loc.isGPS?miniMapHTML(loc.lat,loc.lon,{className:'minimap minimap-wide'}):''}
    </div>`).join('');
}
function renderSearchResults(results,onPick){
  const el=$('search-results');
  el.innerHTML=results.map((r,i)=>`
    <button class="search-result" data-i="${i}">
      <span class="loc-name">${flagEmoji(r.countryCode)} ${r.label}</span>
      <span class="loc-sub">${[r.admin1,r.country].filter(Boolean).join(', ')}</span>
    </button>`).join('');
  el.querySelectorAll('.search-result').forEach(b=>b.addEventListener('click',()=>onPick(results[+b.dataset.i])));
}

// ── Wiring ───────────────────────────────────────────────
buildNav();
initBackdrop($('backdrop'));
initTooltips();
initRouter({view:$('view'),nav:$('bottomnav')});

$('location-btn').addEventListener('click',openLocationModal);
window.addEventListener('open-locations',openLocationModal);
$('location-close').addEventListener('click',closeLocationModal);
$('location-modal').addEventListener('click',e=>{if(e.target.id==='location-modal')closeLocationModal();});
$('gps-btn').addEventListener('click',useGPS);
$('refresh-btn').addEventListener('click',refreshActive);
$('saved-list').addEventListener('click',e=>{
  const row=e.target.closest('.loc-row');if(!row)return;
  const id=row.dataset.id;
  if(e.target.closest('.loc-remove')){removeLocation(id);return;}
  if(e.target.closest('.loc-select')){closeLocationModal();setActive(id);}
});

let searchTimer=null;
$('location-search').addEventListener('input',e=>{
  clearTimeout(searchTimer);
  const q=e.target.value;
  searchTimer=setTimeout(async()=>{
    if(q.trim().length<2){$('search-results').innerHTML='';return;}
    try{
      const results=await searchLocations(q);
      renderSearchResults(results,async r=>{addLocation(r);closeLocationModal();await setActive(r.id);});
    }catch(_){}
  },350);
});

function pushNotifyConfig(){
  const loc=activeLocation();
  navigator.serviceWorker?.controller?.postMessage({type:'notify-config',payload:{
    location:loc?{lat:loc.lat,lon:loc.lon,label:loc.label}:null,
    frost:state.alerts.frost,frostThreshold:state.alerts.frostThreshold,
  }});
}

window.addEventListener('settings-changed',()=>{refreshCurrent();syncHeader();});
window.addEventListener('geo-watch-change',syncHeader);
window.addEventListener('request-notifications',requestNotifications);

initGeoWatch({onMoved:async()=>{syncHeader();await loadWeather(state.activeLocationId);}});

// ── Pull to refresh ──────────────────────────────────────
initPullToRefresh($('view'),refreshActive);

// ── Notificaciones (progresivo, sin backend) ─────────────
async function requestNotifications(){
  if(!('Notification'in window)){toast('Este navegador no soporta notificaciones',{iconName:'alert'});return;}
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){toast('Permiso de notificaciones denegado',{iconName:'alert'});return;}
  state.alerts.notifyLocationId=state.activeLocationId;
  storage.saveAlerts(state.alerts);
  pushNotifyConfig();
  try{
    const reg=await navigator.serviceWorker.ready;
    if('periodicSync'in reg){
      const st=await navigator.permissions.query({name:'periodic-background-sync'});
      if(st.state==='granted'){
        await reg.periodicSync.register('clima-check',{minInterval:12*60*60*1000});
        toast('Notificaciones activadas',{iconName:'check',tone:'ok'});
        return;
      }
    }
    toast('Aviso guardado. Para notificaciones en segundo plano, instalá la app en Chrome/Edge.',{iconName:'bell',duration:6000});
  }catch(_){
    toast('Aviso guardado (solo con la app abierta en este navegador).',{iconName:'bell',duration:6000});
  }
}

// ── Boot ─────────────────────────────────────────────────
(async function boot(){
  if(state.locations.length){
    state.locations.forEach(loc=>{
      const c=storage.loadCache(loc.id);
      if(c)state.weatherByLocation[loc.id]={data:c.data,fetchedAt:c.fetchedAt,offline:true};
    });
    if(!state.activeLocationId||!state.locations.find(l=>l.id===state.activeLocationId))
      state.activeLocationId=state.locations[0].id;
    syncHeader();syncBackdrop();refreshCurrent();syncGeoWatch();
    await loadWeather(state.activeLocationId,{silent:true});
    checkGeoOnce();
  }else{
    syncHeader();refreshCurrent();
    openLocationModal();
  }
})();

if('serviceWorker'in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

// ── helpers ──────────────────────────────────────────────
function initPullToRefresh(scroller,onRefresh){
  let startY=0,pulling=false,ind=null;
  scroller.addEventListener('touchstart',e=>{
    if(scroller.scrollTop<=0){startY=e.touches[0].clientY;pulling=true;}
  },{passive:true});
  scroller.addEventListener('touchmove',e=>{
    if(!pulling)return;
    const dy=e.touches[0].clientY-startY;
    if(dy>0&&scroller.scrollTop<=0){
      if(!ind){ind=document.createElement('div');ind.className='ptr';ind.innerHTML=icon('refresh',{size:18});document.getElementById('app').appendChild(ind);}
      ind.style.transform=`translateX(-50%) translateY(${Math.min(dy*0.4,64)}px) rotate(${dy}deg)`;
      ind.style.opacity=Math.min(1,dy/80);
    }
  },{passive:true});
  scroller.addEventListener('touchend',e=>{
    if(!pulling){return;}
    pulling=false;
    const dy=e.changedTouches[0].clientY-startY;
    if(ind){
      if(dy>80){ind.classList.add('spin');onRefresh().finally(()=>{ind?.remove();ind=null;});}
      else{ind.remove();ind=null;}
    }
  });
}
