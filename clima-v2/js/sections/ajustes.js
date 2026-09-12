// "Ajustes": unidades, tema, modo agro, alertas y datos.
import {state} from '../state.js';
import * as storage from '../storage.js';
import {resetProfiles} from '../agro/profiles.js';
import {setTheme} from '../theme.js';
import {toast} from '../toast.js';
import {fa} from '../fa.js';
import {$,$$} from './common.js';

export const label='Ajustes';
export const navIcon='settings';

function seg(name,options,active){
  return `<div class="seg" data-seg="${name}">${options.map(([v,l])=>
    `<button class="seg-b${v===active?' active':''}" data-v="${v}">${l}</button>`).join('')}</div>`;
}
function row(iconName,title,control,sub){
  return `<div class="settings-row">
    <div class="settings-row-h"><span class="settings-ic">${fa(iconName)}</span>
      <div><div class="settings-t">${title}</div>${sub?`<div class="settings-sub">${sub}</div>`:''}</div>
    </div>
    <div class="settings-c">${control}</div>
  </div>`;
}
function toggle(name,on){
  return `<button class="toggle${on?' on':''}" data-toggle="${name}" role="switch" aria-checked="${on}"><span></span></button>`;
}

export function render(root){
  const s=state.settings, a=state.alerts;
  root.innerHTML=`<section class="settings">

    <h3 class="settings-h">Unidades</h3>
    <div class="settings-group">
      ${row('thermometer','Temperatura',seg('tempUnit',[['c','°C'],['f','°F']],s.tempUnit))}
      ${row('wind','Viento',seg('windUnit',[['kmh','km/h'],['ms','m/s'],['kn','nudos'],['mph','mph']],s.windUnit))}
      ${row('droplet','Lluvia',seg('rainUnit',[['mm','mm'],['in','in']],s.rainUnit))}
      ${row('clock','Reloj',seg('clock',[['24','24 h'],['12','12 h']],s.clock))}
    </div>

    <h3 class="settings-h">Apariencia</h3>
    <div class="settings-group">
      ${row('sun','Tema',seg('theme',[['system','Auto'],['light','Claro'],['dark','Oscuro']],s.theme))}
    </div>

    <h3 class="settings-h">Modo agro</h3>
    <div class="settings-group">
      ${row('seed','Datos de campo',toggle('agroMode',s.agroMode),'Delta-T, inversión térmica, heladas y semáforo por hora en la pestaña Campo.')}
      ${s.agroMode?row('reset','Restablecer perfiles de tarea',`<button class="btn-ghost" id="reset-profiles">Restablecer</button>`,'Vuelve dron / fumigadora / siembra / cosecha a sus umbrales por defecto.'):''}
    </div>

    <h3 class="settings-h">Alertas</h3>
    <div class="settings-group">
      ${row('thermometer-down','Aviso de helada',toggle('frost',a.frost),`Umbral: ${a.frostThreshold}°C`)}
      ${row('cloud-bolt','Aviso de tormenta',toggle('storm',a.storm),`CAPE ≥ ${a.stormCape} J/kg`)}
    </div>

    <h3 class="settings-h">Datos</h3>
    <div class="settings-group">
      ${row('trash','Borrar caché sin conexión',`<button class="btn-ghost" id="clear-cache">Borrar</button>`,'No afecta tus ubicaciones guardadas.')}
    </div>
  </section>`;

  $$('.seg',root).forEach(segEl=>{
    segEl.addEventListener('click',e=>{
      const b=e.target.closest('[data-v]');if(!b)return;
      const name=segEl.dataset.seg, v=b.dataset.v;
      if(name==='theme'){setTheme(v);}
      else{s[name]=v;storage.saveSettings(s);}
      $$('.seg-b',segEl).forEach(x=>x.classList.toggle('active',x===b));
      window.dispatchEvent(new CustomEvent('settings-changed'));
    });
  });

  $$('[data-toggle]',root).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const name=btn.dataset.toggle;
      const on=!btn.classList.contains('on');
      btn.classList.toggle('on',on);
      btn.setAttribute('aria-checked',on);
      if(name==='agroMode'){s.agroMode=on;storage.saveSettings(s);window.dispatchEvent(new CustomEvent('agro-mode-changed'));render(root);return;}
      a[name]=on;storage.saveAlerts(a);
      window.dispatchEvent(new CustomEvent('settings-changed'));
    });
  });

  $('#reset-profiles',root)?.addEventListener('click',()=>{
    resetProfiles();
    toast('Perfiles restablecidos',{iconName:'check',tone:'ok'});
  });
  $('#clear-cache',root)?.addEventListener('click',()=>{
    storage.clearCache();
    toast('Caché borrada',{iconName:'check',tone:'ok'});
  });
}
