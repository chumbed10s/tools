// Sección "Campo": sub-pestañas por perfil de tarea. Para el perfil activo:
// estado ahora, tira horaria con semáforo, mejores bloques por día, panel de
// variables del perfil, y tarjetas agronómicas generales.
import {state,activeData} from '../state.js';
import {nowHourIndex,todayStartIndex,todayDailyIndex} from '../weather.js';
import {temp,wind,pct,rain,fmtHour,fmtDayName,round} from '../format.js';
import {getProfiles,getProfile} from '../agro/profiles.js';
import {evaluateRange,bestBlocks,dayRollup,statusLabel,buildFields,scoreHour} from '../agro/engine.js';
import {accumulations,frostByDay,deltaT,inversionSeries} from '../agro/meteo.js';
import * as storage from '../storage.js';
import {reveal} from '../anim.js';
import {refreshCurrent,go} from '../router.js';
import {card,icon,term,semaphore,emptyState,weatherIconSVG,windArrow} from './common.js';

export const label='Campo';
export const navIcon='sprayer';

const HRS=60; // horas de la tira

export function render(el){
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Sin datos para esta ubicación.')}</div>`;return;}
  const profiles=getProfiles();
  const prof=getProfile(state.activeProfileId);
  const h=data.hourly;
  const nowIdx=nowHourIndex(data);

  const tabs=`<div class="subtabs">${profiles.map(p=>
    `<button class="subtab${p.id===prof.id?' active':''}" data-prof="${p.id}">${icon(p.icon,{size:15})}${p.name}</button>`).join('')}</div>`;

  // ── estado ahora ──
  const fieldsAt=buildFields(data);
  const now=scoreHour(fieldsAt,prof,nowIdx);
  const reasons=now.reasons.length
    ? `<ul class="reasons">${now.reasons.map(r=>`<li class="r-${r.state}">${icon(r.state==='rojo'?'x':'alert',{size:13})} ${r.label}: ${r.detail}</li>`).join('')}</ul>`
    : `<p class="reasons-ok">${icon('check',{size:13})} Todas las variables en rango.</p>`;
  const statusCard=card(`
    <div class="cf-status">
      <div class="cf-status-lead">
        <span class="cf-prof">${icon(prof.icon,{size:20})}${prof.name}</span>
        ${semaphore(now.state,statusLabel(now.state))}
      </div>
      <p class="cf-blurb">${prof.blurb||''}</p>
      ${reasons}
    </div>`,{cls:'card-agro'});

  // ── tira horaria con semáforo ──
  const scored=evaluateRange(data,prof,nowIdx,HRS);
  const blocks=bestBlocks(scored,{minLen:2});
  const blockOf=i=>{const bi=blocks.findIndex(b=>i>=b.from&&i<=b.to);return bi<0?null:{...blocks[bi],start:i===blocks[bi].from,end:i===blocks[bi].to};};
  let lastDay=null;
  const stripCells=scored.map(s=>{
    const i=s.i, dt=new Date(h.time[i]), hr=dt.getHours();
    const dayKey=dt.toISOString().slice(0,10);
    const bk=blockOf(i);
    let sep='';
    if(dayKey!==lastDay){lastDay=dayKey;sep=`<div class="cf-daysep">${i===nowIdx?'Hoy':fmtDayName(dayKey,data.current.time.slice(0,10))}</div>`;}
    return sep+`<div class="cf-h sem-bg-${s.state}${bk?' cf-h-block':''}${bk&&bk.start?' blk-start':''}${bk&&bk.end?' blk-end':''}${i===nowIdx?' now':''}">
      <span class="cf-h-t">${i===nowIdx?'ahora':hr+'h'}</span>
      <span class="cf-h-sem sem-${s.state}"></span>
      <span class="cf-h-temp">${temp(h.temperature_2m[i])}</span>
      <span class="cf-h-wind">${windArrow(h.wind_direction_10m[i],12)}<b>${wind(h.wind_speed_10m[i],{unit:false})}</b></span>
      <span class="cf-h-g${h.wind_gusts_10m[i]>=25?' hi':''}">ráf ${round(h.wind_gusts_10m[i])}</span>
    </div>`;
  }).join('');
  const stripCard=card(`
    <div class="cf-legend">${semaphore('verde','Favorable')}${semaphore('amarillo','Con reparos')}${semaphore('rojo','No aplicar')}</div>
    <div class="cf-strip">${stripCells}</div>
    <p class="hint">Los bloques marcados en verde son las mejores franjas seguidas.</p>
  `,{title:`Próximas ${HRS} h`,cls:'card-strip'});

  // ── mejores bloques por día ──
  const di=todayDailyIndex(data);
  let dayRows='';
  for(let k=0;k<7;k++){
    const di2=di+k;if(di2>=data.daily.time.length)break;
    const r=dayRollup(data,prof,di2);
    const txt=r.blocks.length
      ? r.blocks.map(b=>`<span class="cf-block cf-block-${b.quality}">${fmtHour(h.time[b.from])}–${fmtHour(h.time[b.to])}</span>`).join('')
      : '<span class="cf-none">sin ventana</span>';
    dayRows+=`<div class="cf-day">
      <span class="cf-day-name">${fmtDayName(data.daily.time[di2],data.current.time.slice(0,10))}</span>
      <span class="cf-day-blocks">${txt}</span>
    </div>`;
  }
  const daysCard=card(dayRows,{title:'Ventanas por día',cls:'card-tiles'});

  // ── panel de variables del perfil ──
  const f=fieldsAt(nowIdx);
  const varRows=prof.rules.map(rule=>{
    const val=f[rule.field];
    const r=scoreHour(fieldsAt,{rules:[rule]},nowIdx);
    return `<div class="cf-var">
      <span class="cf-var-k">${rule.label}</span>
      <span class="cf-var-v">${fmtField(rule.field,val)}</span>
      <span class="cf-var-lim">${limitText(rule)}</span>
      <span class="cf-var-sem sem-${r.state}"></span>
    </div>`;
  }).join('');
  const varsCard=card(`${varRows}
    <button class="link-row" data-go-ajustes>Editar umbrales de ${prof.name} ${icon('sliders',{size:13})}</button>`,
    {title:'Variables del perfil',cls:'card-tiles'});

  // ── agronómicas generales ──
  const acc=accumulations(data);
  const frost=frostByDay(data,state.alerts.frostThreshold);
  const frostWeek=frost.slice(di,di+7).filter(x=>x&&x.level!=='sin');
  const genCard=card(`<div class="tiles">
    <div class="tile"><span class="tile-ic">${icon('cloud-rain',{size:18})}</span><span class="tile-k">Lluvia 7 d</span><span class="tile-v">${rain(acc.rain7)}</span><span class="tile-sub">30 d: ${rain(acc.rain30)}</span></div>
    <div class="tile"><span class="tile-ic">${icon('et0',{size:18})}</span><span class="tile-k">${term('et0','Balance ET0')} 7 d</span><span class="tile-v">${acc.balance7>=0?'+':''}${rain(acc.balance7,{unit:false})} mm</span><span class="tile-sub">lluvia − ET0</span></div>
    <div class="tile"><span class="tile-ic">${icon('soil',{size:18})}</span><span class="tile-k">${term('soil_moisture','Humedad suelo')}</span><span class="tile-v">${f.soilMoist!=null?Math.round(f.soilMoist*100)+'%':'–'}</span><span class="tile-sub">${term('soil_temp','suelo')} ${temp(f.soilTemp)}</span></div>
    <div class="tile"><span class="tile-ic">${icon('thermometer-down',{size:18})}</span><span class="tile-k">${term('frost','Heladas 7 d')}</span><span class="tile-v">${frostWeek.length||'0'}</span><span class="tile-sub">${frostWeek.length?`próx. ${fmtDayName(frostWeek[0].date,data.current.time.slice(0,10))}`:'sin riesgo'}</span></div>
  </div>`,{title:'Estado agronómico',cls:'card-tiles'});

  el.innerHTML=`<div class="wrap wrap-campo">
    ${tabs}${statusCard}${stripCard}${daysCard}${varsCard}${genCard}
  </div>`;
}

export function mount(){
  reveal();
  const view=document.getElementById('view');
  view.querySelectorAll('[data-prof]').forEach(b=>b.addEventListener('click',()=>{
    state.activeProfileId=b.dataset.prof;
    storage.saveActiveProfileId(b.dataset.prof);
    refreshCurrent();
  }));
  view.querySelector('[data-go-ajustes]')?.addEventListener('click',()=>{
    state._ajustesJump='profiles';go('ajustes');
  });
}

function fmtField(key,v){
  if(v==null)return '–';
  if(key==='wind'||key==='gust')return wind(v);
  if(key==='rh'||key==='pprob')return pct(v);
  if(key==='precip')return rain(v);
  if(key==='deltaT')return v.toFixed(1);
  if(key==='soilTemp')return temp(v);
  if(key==='soilMoist')return Math.round(v*100)+'%';
  if(key==='rad')return round(v)+' W/m²';
  if(key==='inv'||key==='dew')return v?'sí':'no';
  return round(v);
}
function limitText(r){
  if(r.type==='range')return `ideal ${r.min}–${r.max}`;
  if(r.type==='max')return `máx ${r.max}`;
  if(r.type==='min')return `mín ${r.min}`;
  if(r.type==='flag')return 'no debe estar';
  return '';
}
