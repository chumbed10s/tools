// Página "Ajustes" (se abre desde el ícono de engranaje del header, no es un
// tab): unidades, tema, acento de color y datos.
import {state,ACCENTS} from '../state.js';
import * as storage from '../storage.js';
import {setTheme,setAccent} from '../theme.js';
import {closeOverlay,refreshCurrent} from '../router.js';
import {toast} from '../toast.js';
import {card,icon} from './common.js';

const APP_VERSION='2.1';
const OLD_VERSION_URL='../clima/';
const REDIRECT_KEY='clima_redirect_to_21';

export function render(el){
  const s=state.settings;
  const seg=(key,val,opts)=>`<div class="seg seg-sm">${opts.map(([v,t])=>
    `<button class="seg-b${val===v?' active':''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div>`;

  const accentSwatches=`<div class="accent-row">${Object.entries(ACCENTS).map(([k,hex])=>
    `<button class="swatch${s.accent===k?' active':''}" data-accent="${k}" style="--sw:${hex}" title="${k}"></button>`).join('')}</div>`;

  el.innerHTML=`<div class="modal-card page-card">
    <div class="modal-top"><span class="modal-title">Ajustes</span>
      <button class="modal-close" id="ajustes-close">${icon('xmark',{size:16})}</button>
    </div>
    <div class="modal-body">
      ${card(`
        <div class="set-row"><span>Temperatura</span>${seg('tempUnit',s.tempUnit,[['c','°C'],['f','°F']])}</div>
        <div class="set-row"><span>Viento</span>${seg('windUnit',s.windUnit,[['kmh','km/h'],['ms','m/s'],['kn','kn'],['mph','mph']])}</div>
        <div class="set-row"><span>Precipitación</span>${seg('rainUnit',s.rainUnit,[['mm','mm'],['in','in']])}</div>
        <div class="set-row"><span>Reloj</span>${seg('clock',s.clock,[['24','24 h'],['12','12 h']])}</div>
      `,{title:'Unidades y formato'})}
      ${card(`
        <div class="set-row"><span>Tema</span>${seg('theme',s.theme,[['system','Auto'],['light','Claro'],['dark','Oscuro']])}</div>
        <div class="set-row"><span>Acento</span></div>
        ${accentSwatches}
        <label class="set-check"><input type="checkbox" id="motion-toggle" ${s.motion?'checked':''}><span>Animaciones de interfaz</span></label>
      `,{title:'Apariencia'})}
      ${card(`
        <button class="link-row" id="clear-cache">${icon('arrows-rotate',{size:13})} Limpiar caché guardada</button>
        <button class="link-row" id="old-version">${icon('clock-rotate-left',{size:13})} Volver a la versión anterior</button>
        <div class="set-row"><span>Versión</span><span class="muted">${APP_VERSION}</span></div>
        <p class="hint">Fuente: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo.com</a> · íconos Meteocons.</p>
      `,{title:'Datos'})}
    </div>
  </div>`;
}

export function mount(){
  const root=document.getElementById('overlay-content');
  root.querySelector('#ajustes-close')?.addEventListener('click',closeOverlay);

  root.querySelectorAll('[data-set]').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.set,v=b.dataset.val;
    state.settings[k]=v;
    storage.saveSettings(state.settings);
    if(k==='theme')setTheme(v);
    refreshCurrent();
  }));

  root.querySelectorAll('[data-accent]').forEach(b=>b.addEventListener('click',()=>{
    setAccent(b.dataset.accent);
    refreshCurrent();
  }));

  root.querySelector('#motion-toggle')?.addEventListener('change',e=>{
    state.settings.motion=e.target.checked;
    storage.saveSettings(state.settings);
  });

  root.querySelector('#clear-cache')?.addEventListener('click',()=>{
    storage.clearCache();
    toast('Caché limpiada',{iconName:'check',tone:'ok'});
  });

  root.querySelector('#old-version')?.addEventListener('click',()=>{
    localStorage.removeItem(REDIRECT_KEY);
    location.href=OLD_VERSION_URL;
  });
}
