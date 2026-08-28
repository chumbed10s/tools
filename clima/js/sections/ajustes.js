// Sección "Ajustes": unidades, editor de perfiles, alertas, tema y datos.
import {state,activeWeather,agroOn} from '../state.js';
import * as storage from '../storage.js';
import {setTheme} from '../theme.js';
import {refreshBackdrop} from '../backdrop.js';
import {getProfiles,getProfile,saveProfile,resetProfile,createProfile,deleteProfile,DEFAULT_PROFILES} from '../agro/profiles.js';
import {refreshCurrent} from '../router.js';
import {toast} from '../toast.js';
import {fmtClock} from '../format.js';
import {reveal} from '../anim.js';
import {card,icon} from './common.js';

export const label='Ajustes';
export const navIcon='gear';

const APP_VERSION='2.0';
let editingProfileId=null;

export function render(el){
  const s=state.settings, a=state.alerts;
  if(state._ajustesJump==='profiles'){editingProfileId=state.activeProfileId;state._ajustesJump=null;}

  const seg=(key,val,opts)=>`<div class="seg seg-sm">${opts.map(([v,t])=>
    `<button class="seg-b${val===v?' active':''}" data-set="${key}" data-val="${v}">${t}</button>`).join('')}</div>`;

  const agroCard=`<section class="card card-agromode${agroOn()?' on':''}" data-reveal>
    <label class="agromode-row">
      <div>
        <span class="agromode-t">${icon('sprayer',{size:15})} Modo agro</span>
        <span class="agromode-d">Ventanas de aplicación, Delta-T, inversión térmica, riesgo de helada y la sección Campo. Apagado: una app del tiempo común.</span>
      </div>
      <input type="checkbox" class="switch" data-agromode ${agroOn()?'checked':''}>
    </label>
  </section>`;

  const unitsCard=card(`
    <div class="set-row"><span>Temperatura</span>${seg('tempUnit',s.tempUnit,[['c','°C'],['f','°F']])}</div>
    <div class="set-row"><span>Viento</span>${seg('windUnit',s.windUnit,[['kmh','km/h'],['ms','m/s'],['kn','kn'],['mph','mph']])}</div>
    <div class="set-row"><span>Precipitación</span>${seg('rainUnit',s.rainUnit,[['mm','mm'],['in','in']])}</div>
    <div class="set-row"><span>Reloj</span>${seg('clock',s.clock,[['24','24 h'],['12','12 h']])}</div>
  `,{title:'Unidades y formato'});

  const profiles=getProfiles();
  const profListCard=card(`
    <div class="prof-list">${profiles.map(p=>`
      <div class="prof-item${editingProfileId===p.id?' editing':''}">
        <button class="prof-open" data-edit="${p.id}">${icon(p.icon,{size:16})}<b>${p.name}</b>${icon('chevron-down',{size:14})}</button>
        ${editingProfileId===p.id?profileEditor(p):''}
      </div>`).join('')}</div>
    <button class="link-row" data-new-prof>${icon('sliders',{size:13})} Crear perfil nuevo</button>
  `,{title:'Perfiles de tarea'});

  const alertsCard=card(`
    <label class="set-check"><input type="checkbox" data-alert="frost" ${a.frost?'checked':''}><span>Riesgo de helada</span></label>
    <div class="set-row set-sub"><span>Umbral (mínima)</span>
      <input class="num" type="number" data-alert-num="frostThreshold" value="${a.frostThreshold}" min="-5" max="10" step="0.5"> °C</div>
    <label class="set-check"><input type="checkbox" data-alert="window" ${a.window?'checked':''}><span>Ventana de aplicación abierta</span></label>
    <label class="set-check"><input type="checkbox" data-alert="storm" ${a.storm?'checked':''}><span>Posibles tormentas</span></label>
    <div class="set-row set-sub"><span>Umbral CAPE</span>
      <input class="num" type="number" data-alert-num="stormCape" value="${a.stormCape}" min="200" max="4000" step="100"> J/kg</div>
    <button class="link-row" data-notify>${icon('bell',{size:13})} Activar notificaciones del sistema</button>
    <p class="hint">Las notificaciones del sistema requieren instalar la app y solo funcionan en Chrome/Edge. Si no, las alertas se muestran dentro de la app.</p>
  `,{title:'Alertas'});

  const wx=activeWeather();
  const themeCard=card(`
    <div class="set-row"><span>Tema</span>${seg('theme',s.theme,[['system','Auto'],['light','Claro'],['dark','Oscuro']])}</div>
    <label class="set-check"><input type="checkbox" data-toggle="motion" ${s.motion?'checked':''}><span>Animaciones de interfaz</span></label>
    <label class="set-check"><input type="checkbox" data-toggle="backdrop" ${s.backdrop?'checked':''}><span>Cielo animado de fondo</span></label>
    <div class="set-row"><span>Datos</span><span class="muted">${wx?`Open-Meteo · ${fmtClock(wx.fetchedAt)}`:'—'}</span></div>
    <button class="link-row" data-clear-cache>${icon('refresh',{size:13})} Limpiar caché guardada</button>
    <div class="set-row"><span>Versión</span><span class="muted">${APP_VERSION}</span></div>
    <p class="hint">Fuente: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo.com</a> · íconos Meteocons.</p>
  `,{title:'Tema y datos'});

  el.innerHTML=`<div class="wrap wrap-ajustes">
    <div class="sec-title"><h2>Ajustes</h2></div>
    ${agroCard}${unitsCard}${agroOn()?profListCard:''}${alertsCard}${themeCard}
  </div>`;
}

function profileEditor(p){
  const isDefault=DEFAULT_PROFILES.some(d=>d.id===p.id);
  return `<div class="prof-editor">
    ${p.rules.map((r,idx)=>`<div class="rule-row" data-rule="${idx}">
      <span class="rule-k">${r.label}</span>
      <span class="rule-inputs">
        ${'min'in r||r.type==='range'?`<label>mín<input type="number" data-rf="min" value="${r.min??''}" step="0.5"></label>`:''}
        ${'max'in r||r.type==='range'?`<label>máx<input type="number" data-rf="max" value="${r.max??''}" step="0.5"></label>`:''}
        ${r.type==='max'?`<label>tope<input type="number" data-rf="hardMax" value="${r.hardMax??''}" step="0.5"></label>`:''}
        ${r.type==='min'?`<label>flojo<input type="number" data-rf="softMin" value="${r.softMin??''}" step="0.5"></label>`:''}
        ${r.type==='flag'?`<span class="muted">penaliza (${r.severity})</span>`:''}
      </span>
    </div>`).join('')}
    <div class="prof-actions">
      ${isDefault?`<button data-reset-prof="${p.id}">Restaurar valores</button>`:`<button class="danger" data-del-prof="${p.id}">Eliminar</button>`}
    </div>
  </div>`;
}

export function mount(){
  const view=document.getElementById('view');
  reveal();

  view.querySelectorAll('[data-set]').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.set,v=b.dataset.val;
    state.settings[k]=v;
    storage.saveSettings(state.settings);
    if(k==='theme')setTheme(v);
    render(view);mount();
    window.dispatchEvent(new CustomEvent('settings-changed'));
  }));

  view.querySelectorAll('[data-toggle]').forEach(c=>c.addEventListener('change',()=>{
    state.settings[c.dataset.toggle]=c.checked;
    storage.saveSettings(state.settings);
    if(c.dataset.toggle==='backdrop')refreshBackdrop();
    window.dispatchEvent(new CustomEvent('settings-changed'));
  }));

  view.querySelector('[data-agromode]')?.addEventListener('change',e=>{
    state.settings.agroMode=e.target.checked;
    storage.saveSettings(state.settings);
    window.dispatchEvent(new CustomEvent('agro-mode-changed'));
    toast(e.target.checked?'Modo agro activado':'Modo agro desactivado',{iconName:e.target.checked?'sprayer':'cloud',tone:'ok'});
    render(view);mount();
  });

  view.querySelectorAll('[data-alert]').forEach(c=>c.addEventListener('change',()=>{
    state.alerts[c.dataset.alert]=c.checked;storage.saveAlerts(state.alerts);
  }));
  view.querySelectorAll('[data-alert-num]').forEach(inp=>inp.addEventListener('change',()=>{
    state.alerts[inp.dataset.alertNum]=+inp.value;storage.saveAlerts(state.alerts);
  }));

  view.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{
    editingProfileId=editingProfileId===b.dataset.edit?null:b.dataset.edit;
    render(view);mount();
  }));
  view.querySelectorAll('[data-new-prof]').forEach(b=>b.addEventListener('click',()=>{
    const name=prompt('Nombre del perfil');if(!name)return;
    const p=createProfile(name);editingProfileId=p.id;render(view);mount();
  }));
  view.querySelectorAll('.rule-row input[data-rf]').forEach(inp=>inp.addEventListener('change',()=>{
    const p=getProfile(editingProfileId);
    const idx=+inp.closest('[data-rule]').dataset.rule;
    const v=inp.value===''?undefined:+inp.value;
    p.rules[idx][inp.dataset.rf]=v;
    saveProfile(p);
    toast('Perfil actualizado',{iconName:'check',tone:'ok',duration:1800});
  }));
  view.querySelectorAll('[data-reset-prof]').forEach(b=>b.addEventListener('click',()=>{
    resetProfile(b.dataset.resetProf);render(view);mount();
    toast('Perfil restaurado',{iconName:'refresh'});
  }));
  view.querySelectorAll('[data-del-prof]').forEach(b=>b.addEventListener('click',()=>{
    deleteProfile(b.dataset.delProf);
    if(state.activeProfileId===b.dataset.delProf)state.activeProfileId='dron';
    editingProfileId=null;render(view);mount();
  }));

  view.querySelector('[data-clear-cache]')?.addEventListener('click',()=>{
    storage.clearCache();toast('Caché limpiada',{iconName:'check',tone:'ok'});
  });
  view.querySelector('[data-notify]')?.addEventListener('click',async()=>{
    window.dispatchEvent(new CustomEvent('request-notifications'));
  });
}
