// Modal "Agregar ubicación": buscar por nombre o usar el GPS.
import {state} from '../state.js';
import * as storage from '../storage.js';
import {searchLocations,reverseGeocode,flagEmoji} from '../geocode.js';
import {closeOverlay} from '../router.js';
import {icon} from './common.js';
import {toast} from '../toast.js';

const GPS_ID='gps-current';
let debounceT=null;

export function render(el){
  el.innerHTML=`<div class="modal-card">
    <div class="modal-top"><span class="modal-title">Agregar ubicación</span>
      <button class="modal-close" id="modal-close">${icon('xmark',{size:16})}</button>
    </div>
    <div class="modal-body">
      <div class="loc-options">
        <button class="loc-option" id="live-btn">
          <span class="loc-option-ic">${icon('location-crosshairs',{size:16})}</span>
          <span class="loc-option-body">
            <b>Ubicación en tiempo real</b>
            <small>Sigue tu posición todo el tiempo. Si te movés a otro lugar, el clima se actualiza solo.</small>
          </span>
        </button>
        <button class="loc-option" id="snapshot-btn">
          <span class="loc-option-ic">${icon('location-dot',{size:16})}</span>
          <span class="loc-option-body">
            <b>Guardar dónde estoy ahora</b>
            <small>Guarda tu posición actual como un lugar fijo, igual que si lo buscaras por nombre. No se mueve después.</small>
          </span>
        </button>
      </div>
      <input class="search-input" id="loc-search" placeholder="Buscar ciudad…" autocomplete="off">
      <div id="search-results" class="search-results"></div>
    </div>
  </div>`;
}

export function mount(){
  const root=document.getElementById('overlay-content');
  root.querySelector('#modal-close')?.addEventListener('click',closeOverlay);
  root.querySelector('#loc-search')?.addEventListener('input',e=>{
    clearTimeout(debounceT);
    const q=e.target.value;
    debounceT=setTimeout(()=>doSearch(q),300);
  });
  root.querySelector('#live-btn')?.addEventListener('click',useLiveGPS);
  root.querySelector('#snapshot-btn')?.addEventListener('click',useSnapshotGPS);
}

async function doSearch(q){
  const out=document.getElementById('search-results');
  if(!out)return;
  if(q.trim().length<2){out.innerHTML='';return;}
  out.innerHTML=`<div class="chart-status"><div class="spinner spinner-sm"></div></div>`;
  try{
    const results=await searchLocations(q);
    out.innerHTML=results.map(r=>`<button class="search-item" data-add='${JSON.stringify(r).replace(/'/g,'&#39;')}'>
      <span>${flagEmoji(r.countryCode)}</span>
      <span><b>${r.label}</b><small>${[r.admin1,r.country].filter(Boolean).join(', ')}</small></span>
    </button>`).join('')||'<p class="hint">Sin resultados.</p>';
    out.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{
      addLocation(JSON.parse(b.dataset.add));
    }));
  }catch(_){
    out.innerHTML='<p class="hint">No se pudo buscar. Revisá tu conexión.</p>';
  }
}

async function useLiveGPS(){
  if(!navigator.geolocation){toast('Este navegador no soporta GPS',{tone:'warn'});return;}
  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=+pos.coords.latitude.toFixed(4), lon=+pos.coords.longitude.toFixed(4);
    let meta={label:'Mi ubicación',admin1:'',country:'',countryCode:''};
    try{meta=await reverseGeocode(lat,lon);}catch(_){/* usa el fallback */}
    addLocation({id:GPS_ID,lat,lon,isGPS:true,...meta});
  },()=>toast('No se pudo acceder al GPS',{tone:'warn'}),{timeout:8000});
}

async function useSnapshotGPS(){
  if(!navigator.geolocation){toast('Este navegador no soporta GPS',{tone:'warn'});return;}
  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=+pos.coords.latitude.toFixed(4), lon=+pos.coords.longitude.toFixed(4);
    let meta={label:'Ubicación guardada',admin1:'',country:'',countryCode:''};
    try{meta=await reverseGeocode(lat,lon);}catch(_){/* usa el fallback */}
    addLocation({id:`here-${Date.now()}`,lat,lon,isGPS:false,...meta});
  },()=>toast('No se pudo acceder al GPS',{tone:'warn'}),{timeout:8000});
}

function addLocation(loc){
  const exists=state.locations.some(l=>l.id===loc.id);
  if(!exists)state.locations.push(loc);
  else Object.assign(state.locations.find(l=>l.id===loc.id),loc);
  storage.saveLocations(state.locations);
  if(!state.activeLocationId){
    state.activeLocationId=loc.id;
    storage.saveActiveId(loc.id);
  }
  window.dispatchEvent(new CustomEvent('active-location-changed'));
  closeOverlay();
  toast(`${loc.label} agregada`,{iconName:'check',tone:'ok'});
}
