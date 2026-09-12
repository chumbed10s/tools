// "Campo": datos agronómicos crudos por hora para la tarea elegida — sin
// agrupar en "ventanas", sólo el semáforo y los valores de cada hora.
import {state,activeData} from '../state.js';
import {nowHourIndex} from '../weather.js';
import {temp,wind,pct,rain,fmtHourShort} from '../format.js';
import {getProfiles,getProfile} from '../agro/profiles.js';
import {buildFields,scoreHour,statusLabel} from '../agro/engine.js';
import {accumulations,frostByDay} from '../agro/meteo.js';
import {saveActiveProfileId} from '../storage.js';
import {fa} from '../fa.js';
import {statTile,profileTabsHTML,semDot,$,$$} from './common.js';

export const label='Campo';
export const navIcon='field';

export function render(root){
  const data=activeData();
  if(!data){
    root.innerHTML=`<div class="empty-state"><span class="empty-ic">${fa('tractor')}</span><p>Elegí una ubicación para ver los datos de campo.</p></div>`;
    return;
  }
  const profiles=getProfiles();
  const prof=getProfile(state.activeProfileId);
  const nowIdx=nowHourIndex(data);
  const fieldsAt=buildFields(data);
  const now=scoreHour(fieldsAt,prof,nowIdx);
  const acc=accumulations(data);
  const frostNights=frostByDay(data,state.alerts.frostThreshold).slice(0,7).filter(f=>f&&f.level!=='sin').length;

  const hoursCount=Math.min(36,data.hourly.time.length-nowIdx);
  const rows=[];
  for(let k=0;k<hoursCount;k++){
    const i=nowIdx+k;
    const sc=scoreHour(fieldsAt,prof,i);
    const f=sc.f;
    rows.push({i,sc,f});
  }

  root.innerHTML=`<section class="campo">
    ${profileTabsHTML(profiles,prof.id)}
    <p class="campo-blurb">${prof.blurb||''}</p>

    <div class="campo-now tone-${now.state==='verde'?'ok':now.state==='amarillo'?'warn':'bad'}">
      <div class="campo-now-top">
        ${semDot(now.state)}
        <span class="campo-now-label">${statusLabel(now.state)} ahora para ${prof.name.toLowerCase()}</span>
      </div>
      ${now.reasons.length?`<ul class="campo-reasons">${now.reasons.map(r=>`<li class="tone-${r.state==='rojo'?'bad':'warn'}">${r.label}: ${r.detail}</li>`).join('')}</ul>`
        :'<p class="campo-reasons-ok">Todas las variables dentro de rango.</p>'}
    </div>

    <div class="stat-grid">
      ${statTile('cloud-rain','Lluvia 7 días',rain(acc.rain7))}
      ${statTile('cloud-rain','Lluvia 30 días',rain(acc.rain30))}
      ${statTile('et0','Balance 7 días',rain(acc.balance7),{tone:acc.balance7<0?'warn':'ok'})}
      ${statTile('thermometer-down','Noches con helada (7d)',frostNights,{tone:frostNights?'warn':'ok'})}
    </div>

    <h3 class="campo-hours-title">Próximas ${hoursCount} horas</h3>
    <div class="campo-table" id="campo-table">
      <div class="campo-table-head">
        <span></span><span>Hora</span><span>${fa('wind')}Viento</span><span>${fa('gust')}Ráfaga</span>
        <span>${fa('droplet')}Hum.</span><span>${fa('et0')}ΔT</span><span>${fa('layers')}Inv.</span>
        <span>${fa('cloud-rain')}Lluvia</span>
      </div>
      ${rows.map(({i,sc,f})=>`
        <div class="campo-row${i===nowIdx?' now':''}">
          <span>${semDot(sc.state)}</span>
          <span>${i===nowIdx?'Ahora':fmtHourShort(data.hourly.time[i])}</span>
          <span>${wind(f.wind,{dec:false})}</span>
          <span>${wind(f.gust,{dec:false})}</span>
          <span>${pct(f.rh)}</span>
          <span>${f.deltaT.toFixed(1)}</span>
          <span>${f.inv?fa('check'):'–'}</span>
          <span>${f.precip>0?rain(f.precip):'–'}</span>
        </div>`).join('')}
    </div>
  </section>`;

  $('.profile-tabs',root).addEventListener('click',e=>{
    const b=e.target.closest('[data-profile]');if(!b)return;
    state.activeProfileId=b.dataset.profile;
    saveActiveProfileId(state.activeProfileId);
    render(root);
  });
}
