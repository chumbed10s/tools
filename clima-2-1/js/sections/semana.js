// Sección "Resumen": vista de los próximos días con barras de rango de
// temperatura (min/máx relativo a la semana), balance hídrico proyectado,
// rachas de helada/calor, e historial de 30 días. Tocar un día abre "Por
// hora" directamente en ese día.
import {activeData, state} from '../state.js';
import {todayDailyIndex} from '../weather.js';
import {temp,wind,rain,pct,round,fmtDayName,fmtDayShort} from '../format.js';
import {frostByDay} from '../agro/meteo.js';
import {go} from '../router.js';
import {icon,weatherIconSVG,windDial,emptyState} from './common.js';

export const label='Resumen';
export const navIcon='calendar-days';

export function render(el){
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Sin datos para esta ubicación.')}</div>`;return;}
  const d=data.daily;
  const di=todayDailyIndex(data);
  const N=d.time.length;
  const frost=frostByDay(data);
  const today=data.current.time.slice(0,10);

  let weekMin=Infinity,weekMax=-Infinity;
  for(let i=di;i<N;i++){
    weekMin=Math.min(weekMin,d.temperature_2m_min[i]);
    weekMax=Math.max(weekMax,d.temperature_2m_max[i]);
  }
  const span=(weekMax-weekMin)||1;

  let rows='';
  for(let i=di;i<N;i++){
    const fr=frost[i];
    const far=i>di+7;
    if(i===di+8)rows+=`<div class="week-sep">${icon('triangle-exclamation',{size:13})}
      <span>El pronóstico a más de 7 días es tendencia, no dato firme.</span></div>`;
    const left=(d.temperature_2m_min[i]-weekMin)/span*100;
    const width=Math.max(6,(d.temperature_2m_max[i]-d.temperature_2m_min[i])/span*100);
    rows+=`<button class="week-row${far?' far':''}" data-date="${d.time[i]}" data-reveal>
      <div class="wr-left">
        <span class="wr-day"><b>${fmtDayName(d.time[i],today)}</b><small>${fmtDayShort(d.time[i])}</small></span>
        ${fr&&fr.level!=='sin'?`<span class="wr-tag wr-tag-frost">${icon('snowflake',{size:10})}${temp(fr.min)}</span>`:''}
      </div>
      ${weatherIconSVG(d.weather_code[i],{size:30,isDay:true})}
      <span class="wr-min">${temp(d.temperature_2m_min[i],{unit:false})}°</span>
      <div class="rsum-bar"><span class="rsum-bar-fill" style="left:${left}%;width:${width}%"></span></div>
      <span class="wr-max">${temp(d.temperature_2m_max[i])}</span>
      <span class="wr-rain">${d.precipitation_probability_max[i]>=15?`${icon('droplet',{size:11})}${pct(d.precipitation_probability_max[i])}`:''}</span>
      <span class="wr-wind">${windDial(d.wind_direction_10m_dominant[i]??0,16)}${wind(d.wind_speed_10m_max[i]||0,{unit:false})}</span>
      ${icon('chevron-down',{size:13,cls:'rot-l'})}
    </button>`;
  }

  el.innerHTML=`<div class="wrap wrap-semana">
    <div class="sec-title"><h2>Próximos ${N-di} días</h2></div>
    <div class="week-list">${rows}</div>
    ${streaksView(data,di,frost)}
    ${waterOutlookView(d,di)}
    ${historyView(data)}
  </div>`;
}

// Racha de heladas o de calor: días consecutivos desde hoy con riesgo/extremo.
function streaksView(data,di,frost){
  const d=data.daily;
  const N=d.time.length;
  let frostStreak=0;
  for(let i=di;i<N&&frost[i]&&frost[i].level!=='sin';i++)frostStreak++;
  let heatStreak=0;
  for(let i=di;i<N&&(d.temperature_2m_max[i]??0)>=35;i++)heatStreak++;

  const cards=[];
  if(frostStreak>=2){
    const last=d.time[di+frostStreak-1];
    cards.push(`<div class="streak-card streak-frost">
      ${icon('snowflake',{size:16})}
      <p><b>Racha de heladas:</b> ${frostStreak} noches seguidas con riesgo, desde hoy hasta ${fmtDayShort(last)}.</p>
    </div>`);
  }
  if(heatStreak>=2){
    const last=d.time[di+heatStreak-1];
    cards.push(`<div class="streak-card streak-heat">
      ${icon('sun',{size:16})}
      <p><b>Racha de calor:</b> ${heatStreak} días seguidos con máximas de 35° o más, hasta ${fmtDayShort(last)}.</p>
    </div>`);
  }
  return cards.length?`<div class="streak-list">${cards.join('')}</div>`:'';
}

// Balance hídrico proyectado: lluvia esperada vs. ET0 para los próximos 7 días.
function waterOutlookView(d,di){
  const end=Math.min(d.time.length,di+7);
  let rainSum=0,et0Sum=0;
  for(let i=di;i<end;i++){
    rainSum+=d.precipitation_sum?.[i]||0;
    et0Sum+=d.et0_fao_evapotranspiration?.[i]||0;
  }
  const bal=rainSum-et0Sum;
  const phrase=bal<=-15?'Se espera que el suelo se siga secando con fuerza.':
    bal<0?'Se espera que el suelo se siga secando.':
    bal<10?'Balance parejo, sin déficit marcado a la vista.':
    'Se espera sobra de agua respecto al consumo.';
  return `<section class="card" data-reveal>
    <div class="card-h"><span>Balance hídrico proyectado (próximos 7 días)</span></div>
    <div class="hist-kpis">
      <div class="hist-kpi"><b>${rain(rainSum)}</b><small>lluvia esperada</small></div>
      <div class="hist-kpi"><b>${rain(et0Sum)}</b><small>ET0 esperada</small></div>
      <div class="hist-kpi"><b class="${bal>=0?'pos':'neg'}">${bal>=0?'+':''}${round(bal)} mm</b><small>balance</small></div>
    </div>
    <p class="wb-outlook-phrase">${phrase}</p>
  </section>`;
}

function historyView(data){
  const h=data.hourly;
  const today=data.current.time.slice(0,10);
  const nowI=h.time.findIndex(t=>t.slice(0,10)===today);
  if(nowI<7*24)return '';
  const b0=Math.max(0,nowI-30*24);
  let rainT=0,et0T=0;
  const dMin={};
  for(let i=b0;i<nowI;i++){
    rainT+=h.precipitation[i]||0;
    et0T+=h.et0_fao_evapotranspiration?.[i]||0;
    const k=h.time[i].slice(0,10),t=h.temperature_2m[i];
    if(t!=null)dMin[k]=Math.min(dMin[k]??99,t);
  }
  const frostDays=Object.values(dMin).filter(v=>v<=3).length;
  const bal=rainT-et0T;
  return `<section class="card wrap-hist" data-reveal>
    <div class="card-h"><span>Últimos 30 días</span></div>
    <div class="hist-kpis">
      <div class="hist-kpi"><b>${rain(rainT)}</b><small>lluvia acumulada</small></div>
      <div class="hist-kpi"><b class="${bal>=0?'pos':'neg'}">${bal>=0?'+':''}${round(bal)} mm</b><small>balance lluvia − ET0</small></div>
      <div class="hist-kpi"><b>${frostDays}</b><small>días con helada (≤3°)</small></div>
    </div>
  </section>`;
}

export function mount(){
  const view=document.getElementById('view');
  view.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{
    state.pendingPorHoraDate=b.dataset.date;
    go('porhora');
  }));
}
