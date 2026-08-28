// Sección "Semana": lista rica de los 15 días (toggle a heatmap). Cualquier día
// abre la vista de detalle profunda, idéntica para todos.
import {state,activeData,agroOn} from '../state.js';
import {todayDailyIndex,wmoLabel} from '../weather.js';
import {temp,tempC,wind,rain,pct,cardinal,fmtDayName,fmtDayShort,round} from '../format.js';
import {frostByDay} from '../agro/meteo.js';
import {getProfile} from '../agro/profiles.js';
import {dayRollup} from '../agro/engine.js';
import {reveal} from '../anim.js';
import {refreshCurrent} from '../router.js';
import {renderDayDetail,mountDayDetail} from './dia-detalle.js';
import {card,icon,term,weatherIconSVG,windChip,windDial,semaphore,emptyState} from './common.js';

export const label='Semana';
export const navIcon='calendar';

export function render(el){
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Sin datos para esta ubicación.')}</div>`;return;}

  if(state.dayDetailIdx!=null){
    renderDayDetail(el,state.dayDetailIdx);
    return;
  }

  const d=data.daily;
  const di=todayDailyIndex(data);
  const N=d.time.length;
  const frost=frostByDay(data,state.alerts.frostThreshold);
  const prof=getProfile(state.activeProfileId);

  const agro=agroOn();
  const tmin=Math.min(...d.temperature_2m_min),tmax=Math.max(...d.temperature_2m_max);
  const span=(tmax-tmin)||1;
  const wkGust=Math.max(1,...d.wind_gusts_10m_max.slice(di));
  const nowTemp=data.current.temperature_2m;

  const toggle=`<div class="seg">
    <button class="seg-b${state.weekView==='list'?' active':''}" data-wv="list">${icon('list',{size:14})}Lista</button>
    <button class="seg-b${state.weekView==='heatmap'?' active':''}" data-wv="heatmap">${icon('grid',{size:14})}Heatmap</button>
  </div>`;

  let bodyHTML;
  if(state.weekView==='heatmap'){
    bodyHTML=heatmap(data,di,prof,frost);
  }else{
    let rows='';
    for(let i=di;i<N;i++){
      const lo=d.temperature_2m_min[i],hi=d.temperature_2m_max[i];
      const tl=((lo-tmin)/span*100).toFixed(1),tw=(((hi-lo)/span)*100).toFixed(1);
      const isToday=i===di;
      const nowPos=((nowTemp-tmin)/span*100).toFixed(1);
      const spd=d.wind_speed_10m_max[i]||0, gst=d.wind_gusts_10m_max[i]||0;
      const wFill=(spd/wkGust*100).toFixed(1), wGust=(gst/wkGust*100).toFixed(1);
      const gustHi=gst>=45;
      const roll=dayRollup(data,prof,i);
      const fr=frost[i];
      const far=i>di+7;
      if(i===di+8)rows+=`<div class="week-sep">${icon('alert',{size:13})}
        <span><b>Precisión orientativa</b> de acá en adelante · el pronóstico a más de 7 días es tendencia, no dato firme.</span></div>`;
      const tags=`${d.precipitation_probability_max[i]>=15?`<span class="wr-tag wr-tag-rain">${icon('droplet',{size:9})}${pct(d.precipitation_probability_max[i])}</span>`:''}`
        +`${agro&&roll.greenHours?`<span class="wr-tag sem-verde" title="${roll.greenHours} h favorables">${icon(prof.icon,{size:10})}${roll.greenHours}h</span>`:''}`
        +`${fr&&fr.level!=='sin'?`<span class="wr-tag sem-frost">${icon('thermometer-down',{size:10})}${temp(fr.min)}</span>`:''}`;
      const dayCol=`<div class="wr-left">
          <span class="wr-day"><b>${fmtDayName(d.time[i],data.current.time.slice(0,10))}</b><small>${fmtDayShort(d.time[i])}</small></span>
          <div class="wr-tags">${tags}</div>
        </div>`;

      rows+=`<button class="week-row${far?' far':''}" data-day="${i}" data-reveal>
        ${dayCol}
        ${weatherIconSVG(d.weather_code[i],{size:34,isDay:true})}
        <div class="wr-bars">
          <div class="wr-sl">
            <span class="wr-sl-cap">${icon('thermometer',{size:13})}</span>
            <span class="wr-sl-end">${temp(tmin,{unit:false})}°</span>
            <span class="wr-sl-track">
              <span class="wr-sl-fill wr-fill-temp" style="left:${tl}%;width:${tw}%">
                <span class="wr-sl-vlo">${temp(lo)}</span><span class="wr-sl-vhi">${temp(hi)}</span>
              </span>
              ${isToday&&nowTemp>=tmin&&nowTemp<=tmax?`<span class="wr-sl-now" style="left:${nowPos}%"><i></i><em>ahora ${temp(nowTemp)}</em></span>`:''}
            </span>
            <span class="wr-sl-end">${temp(tmax,{unit:false})}°</span>
          </div>
          <div class="wr-sl wr-sl-wind">
            <span class="wr-sl-cap">${windDial(d.wind_direction_10m_dominant[i]??0,16)}<b>${wind(spd,{unit:false})}</b></span>
            <span class="wr-sl-end">0</span>
            <span class="wr-sl-track">
              <span class="wr-sl-fill wr-fill-wind" style="width:${wFill}%"></span>
              <span class="wr-sl-gust${gustHi?' hi':''}" style="left:${wGust}%"><i></i><em class="${gustHi?'hi':''}">ráf ${round(gst)}</em></span>
            </span>
            <span class="wr-sl-end">${round(wkGust)}</span>
          </div>
        </div>
        ${icon('chevron-right',{size:14,cls:'wr-chev'})}
      </button>`;
    }
    bodyHTML=`<div class="week-list">${rows}</div>`;
  }

  el.innerHTML=`<div class="wrap wrap-semana">
    <div class="sec-title"><h2>Próximos ${N-di} días</h2>${toggle}</div>
    ${bodyHTML}
  </div>`;
}

function heatmap(data,di,prof,frost){
  const d=data.daily;
  const days=[];for(let i=di;i<d.time.length;i++)days.push(i);
  const tmax=d.temperature_2m_max, tmin=d.temperature_2m_min;
  const rng=(arr)=>{const v=days.map(i=>arr[i]).filter(x=>x!=null);return [Math.min(...v),Math.max(...v)];};
  const [maxLo,maxHi]=rng(tmax),[minLo,minHi]=rng(tmin);
  const pMax=Math.max(1,...days.map(i=>d.precipitation_sum[i]||0));
  const wMax=Math.max(1,...days.map(i=>d.wind_speed_10m_max[i]||0));
  const gMax=Math.max(1,...days.map(i=>d.wind_gusts_10m_max[i]||0));
  const uMax=Math.max(1,...days.map(i=>d.uv_index_max[i]||0));

  const rollCache=days.map(i=>dayRollup(data,prof,i));

  const cell=(i,v,frac,cls='')=>`<td class="hm-c ${cls}" data-day="${i}" style="--f:${frac.toFixed(2)}"><span>${v}</span></td>`;
  const rowsDef=[
    ['Máx',i=>cell(i,temp(tmax[i]),norm(tmax[i],maxLo,maxHi),'hm-warm')],
    ['Mín',i=>cell(i,temp(tmin[i]),norm(tmin[i],minLo,minHi),'hm-cool')],
    ['Lluvia',i=>cell(i,rain(d.precipitation_sum[i]||0,{unit:false}),(d.precipitation_sum[i]||0)/pMax,'hm-rain')],
    ['Viento',i=>cell(i,wind(d.wind_speed_10m_max[i],{unit:false}),(d.wind_speed_10m_max[i]||0)/wMax,'hm-wind')],
    ['Ráfaga',i=>cell(i,wind(d.wind_gusts_10m_max[i],{unit:false}),(d.wind_gusts_10m_max[i]||0)/gMax,'hm-wind')],
    ['UV',i=>cell(i,round(d.uv_index_max[i]||0),(d.uv_index_max[i]||0)/uMax,'hm-uv')],
    ...(agroOn()?[[`${prof.name}`,i=>{const r=rollCache[days.indexOf(i)];return cell(i,`${r.greenHours}h`,Math.min(1,r.greenHours/10),'hm-go');}]]:[]),
    ['Helada',i=>{const f=frost[i];const on=f&&f.level!=='sin';return cell(i,on?temp(f.min):'·',on?1:0,'hm-frost');}],
  ];
  const head=`<tr><th></th>${days.map(i=>`<th>${fmtDayName(d.time[i],data.current.time.slice(0,10))}<small>${fmtDayShort(d.time[i])}</small></th>`).join('')}</tr>`;
  const body=rowsDef.map(([name,fn])=>`<tr><th class="hm-rowh">${name}</th>${days.map(i=>fn(i)).join('')}</tr>`).join('');
  return `<div class="hm-scroll"><table class="heatmap" data-reveal>${head}${body}</table></div>
    <p class="hint">Tocá una celda para abrir ese día.</p>`;
}
const norm=(v,a,b)=>b>a?Math.max(0,Math.min(1,(v-a)/(b-a))):0.5;

export function mount(){
  reveal();
  const view=document.getElementById('view');
  if(state.dayDetailIdx!=null){
    mountDayDetail(()=>{state.dayDetailIdx=null;refreshCurrent();});
    return;
  }
  view.querySelectorAll('[data-wv]').forEach(b=>b.addEventListener('click',()=>{
    state.weekView=b.dataset.wv;refreshCurrent();
  }));
  view.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{
    state.dayDetailIdx=+b.dataset.day;refreshCurrent();
    view.scrollTo({top:0});
  }));
}
