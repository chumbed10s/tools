// Sección "Ubicaciones": lista de guardadas con alias editable, nombre real,
// minimapa y distancia a donde estás. Reemplaza a "Campo" en el nav.
import {state} from '../state.js';
import * as storage from '../storage.js';
import {haversineKm} from '../geocode.js';
import {miniMapHTML} from '../minimap.js';
import {refreshCurrent,openModal} from '../router.js';
import {icon,emptyState} from './common.js';

export const label='Ubicaciones';
export const navIcon='location-dot';

export function render(el){
  const fix=state.geo.lastFix;
  const cards=state.locations.map(loc=>{
    const dist=fix?haversineKm(fix,loc):null;
    const isActive=loc.id===state.activeLocationId;
    return `<div class="loc-card${isActive?' active':''}" data-reveal>
      <button class="loc-card-main" data-select="${loc.id}">
        ${miniMapHTML(loc.lat,loc.lon,{reqWidth:340,reqHeight:96,className:'minimap loc-minimap'})}
        <div class="loc-card-body">
          <input class="loc-alias" data-alias="${loc.id}" value="${(loc.alias||'').replace(/"/g,'&quot;')}" placeholder="${loc.label}">
          <span class="loc-real">${loc.label}${loc.admin1?`, ${loc.admin1}`:''}${loc.isGPS?`<span class="loc-live-tag">${icon('bolt',{size:9})} En vivo</span>`:''}</span>
          <span class="loc-dist">${dist!=null?`${Math.round(dist)} km de vos`:loc.isGPS?'Tu ubicación':'—'}</span>
        </div>
        ${isActive?`<span class="loc-badge">${icon('check',{size:12})}</span>`:''}
      </button>
      ${!loc.isGPS?`<button class="loc-del" data-del="${loc.id}">${icon('trash',{size:14})}</button>`:''}
    </div>`;
  }).join('');

  el.innerHTML=`<div class="wrap wrap-ubicaciones">
    <div class="sec-title"><h2>Ubicaciones</h2>
      <button class="add-loc-btn" id="add-loc">${icon('plus',{size:14})} Agregar</button>
    </div>
    ${state.locations.length?`<div class="loc-list">${cards}</div>`:emptyState('Todavía no agregaste ninguna ubicación.')}
  </div>`;
}

export function mount(){
  const view=document.getElementById('view');
  view.querySelector('#add-loc')?.addEventListener('click',()=>openModal('add-location'));

  view.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',e=>{
    if(e.target.closest('.loc-alias'))return;
    state.activeLocationId=b.dataset.select;
    storage.saveActiveId(state.activeLocationId);
    window.dispatchEvent(new CustomEvent('active-location-changed'));
  }));

  view.querySelectorAll('[data-alias]').forEach(inp=>{
    inp.addEventListener('click',e=>e.stopPropagation());
    inp.addEventListener('change',()=>{
      const loc=state.locations.find(l=>l.id===inp.dataset.alias);
      if(!loc)return;
      loc.alias=inp.value.trim();
      storage.saveLocations(state.locations);
      refreshCurrent();
    });
  });

  view.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const id=b.dataset.del;
    state.locations=state.locations.filter(l=>l.id!==id);
    storage.saveLocations(state.locations);
    if(state.activeLocationId===id){
      state.activeLocationId=state.locations[0]?.id||null;
      storage.saveActiveId(state.activeLocationId);
      window.dispatchEvent(new CustomEvent('active-location-changed'));
    }
    refreshCurrent();
  }));
}
