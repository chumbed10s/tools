import {state,SECTIONS,activeLocation,activeWeather,locationDisplayName,REFRESH_MS} from './state.js';
import * as storage from './storage.js';
import {fetchForecast} from './weather.js';
import {haversineKm} from './geocode.js';
import {initTheme} from './theme.js';
import {initRouter,go,openPage,closeOverlay,refreshCurrent} from './router.js';
import {initGeoWatch,checkGeoOnce,syncGeoWatch} from './geo-watch.js';
import {icon} from './ui-icons.js';
import {toast} from './toast.js';

import * as ahora from './sections/ahora.js';
import * as porhora from './sections/porhora.js';
import * as semana from './sections/semana.js';
import * as ubicaciones from './sections/ubicaciones.js';
import * as ajustes from './sections/ajustes.js';
import * as diaDetalle from './sections/dia-detalle.js';
import * as addLocation from './sections/add-location.js';

const SECTION_MODULES={ahora,porhora,semana,ubicaciones};
const PAGE_MODULES={'ajustes':ajustes,'dia-detalle':diaDetalle};
const MODAL_MODULES={'add-location':addLocation};

const view=document.getElementById('view');
const overlayRoot=document.getElementById('overlay');
const overlayContent=document.getElementById('overlay-content');
const bottomnav=document.getElementById('bottomnav');
const progressBar=document.getElementById('progress-bar');
const loadingOverlay=document.getElementById('loading-overlay');

let refreshTimer=null;

function boot(){
  state.settings=storage.loadSettings();
  state.locations=storage.loadLocations();
  state.activeLocationId=storage.loadActiveId()||state.locations[0]?.id||null;
  state.lastUpdated=storage.loadLastUpdated();

  const active=activeLocation();
  if(active){
    const cached=storage.loadCache(active.id);
    if(cached)state.weatherByLocation[active.id]={data:cached.data,fetchedAt:cached.fetchedAt,offline:true};
  }

  initTheme();
  buildNav();
  renderHeader();
  initRouter({onSection:renderSection,onOverlay:renderOverlay,onAny:()=>{buildNav();renderHeader();}});

  refreshActive();
  initGeoWatch({onMoved:refreshActive});
  checkGeoOnce();

  document.getElementById('refresh-btn')?.addEventListener('click',()=>refreshActive({manual:true}));
  document.getElementById('settings-btn')?.addEventListener('click',()=>openPage('ajustes'));
  document.getElementById('location-hdr-btn')?.addEventListener('click',()=>go('ubicaciones'));

  window.addEventListener('active-location-changed',()=>{
    syncGeoWatch();
    refreshActive();
    renderHeader();
  });

  armRefreshTimer();
  document.addEventListener('visibilitychange',armRefreshTimer);
  setInterval(updateLastUpdatedText,60*1000);

  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

  overlayRoot.addEventListener('click',e=>{
    if(e.target===overlayRoot&&overlayRoot.classList.contains('overlay-modal'))closeOverlay();
  });
}

function buildNav(){
  bottomnav.innerHTML=SECTIONS.map(name=>{
    const mod=SECTION_MODULES[name];
    const active=state.section===name&&!state.overlay;
    return `<button class="nav-b${active?' active':''}" data-nav="${name}">
      <span class="nav-b-ic">${icon(mod.navIcon,{size:17})}</span><span>${mod.label}</span>
    </button>`;
  }).join('');
  bottomnav.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.nav)));
}

function renderHeader(){
  const loc=activeLocation();
  const alias=document.getElementById('loc-alias');
  const real=document.getElementById('loc-real');
  const dist=document.getElementById('loc-dist');
  const gpsLive=document.getElementById('gps-live');
  if(!loc){alias.textContent='Sin ubicación';real.textContent='';dist.textContent='';gpsLive.hidden=true;updateLastUpdatedText();return;}
  alias.textContent=locationDisplayName(loc);
  real.textContent=loc.label+(loc.admin1?`, ${loc.admin1}`:'');
  const fix=state.geo.lastFix;
  dist.textContent=fix&&!loc.isGPS?`${Math.round(haversineKm(fix,loc))} km de vos`:'';
  gpsLive.hidden=!loc.isGPS;
  updateLastUpdatedText();
}

function updateLastUpdatedText(){
  const el=document.getElementById('last-updated');
  if(el){
    if(!state.lastUpdated){el.hidden=true;}
    else{
      const mins=Math.max(0,Math.round((Date.now()-state.lastUpdated)/60000));
      el.textContent=mins<1?'recién':`${mins}m`;
      el.title=mins<1?'Actualizado recién':mins===1?'Actualizado hace 1 min':`Actualizado hace ${mins} min`;
      el.hidden=false;
    }
  }
  const gt=document.getElementById('gps-live-time');
  if(gt){
    const fix=state.geo.lastFix;
    if(!fix)gt.textContent='GPS: buscando…';
    else{
      const mins=Math.max(0,Math.round((Date.now()-fix.at)/60000));
      gt.textContent=mins<1?'GPS actualizado recién':mins===1?'GPS hace 1 min':`GPS hace ${mins} min`;
    }
  }
}

function renderSection(name){
  overlayRoot.hidden=true;
  const mod=SECTION_MODULES[name]||SECTION_MODULES.ahora;
  mod.render(view);
  mod.mount?.();
  view.scrollTo({top:0});
}

function renderOverlay(overlay){
  const mod=(overlay.type==='page'?PAGE_MODULES:MODAL_MODULES)[overlay.name];
  if(!mod){closeOverlay();return;}
  overlayRoot.hidden=false;
  overlayRoot.className='overlay '+(overlay.type==='page'?'overlay-page':'overlay-modal');
  mod.render(overlayContent,overlay.payload);
  mod.mount?.(overlay.payload);
}

async function refreshActive({manual=false}={}){
  const loc=activeLocation();
  if(!loc)return;
  const hasData=!!state.weatherByLocation[loc.id]?.data;
  if(hasData)progressBar.hidden=false; else loadingOverlay.hidden=false;
  if(manual)document.getElementById('refresh-btn')?.classList.add('spinning');
  try{
    const data=await fetchForecast(loc.lat,loc.lon);
    state.weatherByLocation[loc.id]={data,fetchedAt:Date.now(),offline:false};
    storage.saveCache(loc.id,data);
    state.lastUpdated=Date.now();
    storage.saveLastUpdated(state.lastUpdated);
    refreshCurrent();
    renderHeader();
  }catch(_){
    if(manual)toast('No se pudo actualizar. Revisá tu conexión.',{tone:'warn'});
  }finally{
    progressBar.hidden=true;
    loadingOverlay.hidden=true;
    document.getElementById('refresh-btn')?.classList.remove('spinning');
  }
}

function armRefreshTimer(){
  clearInterval(refreshTimer);
  // El intervalo sigue corriendo aunque la app esté minimizada — el sistema
  // operativo puede pausar el timer igual si la suspende del todo, así que
  // al volver a primer plano nos aseguramos de refrescar si ya pasó la hora.
  if(document.visibilityState==='visible'&&state.lastUpdated&&Date.now()-state.lastUpdated>=REFRESH_MS){
    refreshActive();
  }
  refreshTimer=setInterval(refreshActive,REFRESH_MS);
}

boot();
