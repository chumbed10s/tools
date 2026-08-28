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

  const toggle=`<div class="seg seg-sm">
    <button class="seg-b${state.weekView==='list'?' active':''}" data-wv="list">${icon('list',{size:13})}Lista</button>
    <button class="seg-b${state.weekView==='heatmap'?' active':''}" data-wv="heatmap">${icon('grid',{size:13})}Heatmap</button>
    <button class="seg-b${state.weekView==='hist'?' active':''}" data-wv="hist">${icon('clock',{size:13})}Historial</button>
  </div>`;

  let bodyHTML;
  if(state.weekView==='hist'){
    bodyHTML=`<section class="card wrap-hist" data-reveal>${historyView(data)}</section>`;
  }else if(state.weekView==='heatmap'){
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

// ── Historial: agregados de los últimos ~28 días (usa el past_days del fetch) ──
function historyView(data){
  const h=data.hourly;
  const today=data.current.time.slice(0,10);
  const nowI=h.time.findIndex(t=>t.slice(0,10)===today);
  if(nowI<7*24) return `<p class="hint">Todavía no hay suficiente historial en esta ubicación.</p>`;

  const weeks=[];
  for(let w=0;w<4;w++){
    const b0=nowI-(w+1)*7*24, b1=nowI-w*7*24;
    if(b0<0)break;
    let rainT=0,et0T=0,wMax=0,gMax=0;
    const dMin={},dMax={};
    for(let i=b0;i<b1;i++){
      rainT+=h.precipitation[i]||0;
      et0T+=h.et0_fao_evapotranspiration?.[i]||0;
      wMax=Math.max(wMax,h.wind_speed_10m[i]||0);
      gMax=Math.max(gMax,h.wind_gusts_10m[i]||0);
      const k=h.time[i].slice(0,10), t=h.temperature_2m[i];
      if(t!=null){dMin[k]=Math.min(dMin[k]??99,t);dMax[k]=Math.max(dMax[k]??-99,t);}
    }
    const frostD=Object.values(dMin).filter(v=>v<=3).length;
    const hotD=Object.values(dMax).filter(v=>v>=30).length;
    weeks.push({from:h.time[b0].slice(0,10),to:h.time[b1-1].slice(0,10),rainT,bal:rainT-et0T,
      wMax,gMax,frostD,hotD,tLo:Math.min(...Object.values(dMin)),tHi:Math.max(...Object.values(dMax))});
  }
  const mRain=weeks.reduce((s,w)=>s+w.rainT,0);
  const mBal=weeks.reduce((s,w)=>s+w.bal,0);
  const md=s=>{const x=new Date(s+'T12:00');return `${x.getDate()}/${x.getMonth()+1}`;};

  return `
    <div class="hist-kpis">
      <div class="hist-kpi"><b>${rain(mRain)}</b><small>lluvia · 28 días</small></div>
      <div class="hist-kpi"><b class="${mBal>=0?'pos':'neg'}">${mBal>=0?'+':''}${round(mBal)} mm</b><small>${term('et0','balance')} lluvia − ET0</small></div>
      <div class="hist-kpi"><b>${weeks.reduce((s,w)=>s+w.frostD,0)}</b><small>días con helada (≤3°)</small></div>
    </div>
    <div class="hist-weeks">
      ${weeks.map((w,idx)=>`<div class="hist-w">
        <div class="hist-w-h"><b>${idx===0?'Últimos 7 días':`Hace ${idx+1} semanas`}</b><span>${md(w.from)}–${md(w.to)}</span></div>
        <div class="day-tags">
          <span class="dtag dtag-rain">${icon('cloud-rain',{size:11})}${rain(w.rainT)}</span>
          <span class="dtag ${w.bal>=0?'dtag-hum':'dtag-uv'}">${icon('et0',{size:11})}${w.bal>=0?'+':''}${round(w.bal)}</span>
          <span class="dtag dtag-wind">${icon('wind',{size:11})}${wind(w.wMax)}${w.gMax>w.wMax+8?` · r${round(w.gMax)}`:''}</span>
          <span class="dtag dtag-temp">${icon('thermometer',{size:11})}${temp(w.tLo,{unit:false})}–${temp(w.tHi)}</span>
          ${w.frostD?`<span class="dtag dtag-frost">${icon('thermometer-down',{size:11})}${w.frostD}</span>`:''}
          ${w.hotD?`<span class="dtag dtag-hot">${icon('sun',{size:11})}${w.hotD}×+30°</span>`:''}
        </div>
      </div>`).join('')}
    </div>
    <p class="hint">Agregados de los últimos 28 días — historial de Open-Meteo, sin detalle hora a hora.</p>`;
}

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
