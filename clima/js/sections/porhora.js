// Sección "Por hora": 7 días, y cada día trae SU gráfico de 24 h + el detalle
// hora por hora debajo. Un selector arriba elige qué variable muestran todos
// los gráficos (temperatura / lluvia / viento).
import {state,activeData,agroOn} from '../state.js';
import {nowHourIndex,todayStartIndex,wmoLabel} from '../weather.js';
import {temp,wind,pct,rain,cardinal,fmtHour,fmtDayLong,round} from '../format.js';
import {deltaTSeries} from '../agro/meteo.js';
import {getProfile} from '../agro/profiles.js';
import {evaluateRange} from '../agro/engine.js';
import {chart,wireChart} from '../charts.js';
import {reveal,drawPaths} from '../anim.js';
import {refreshCurrent} from '../router.js';
import {card,icon,term,weatherIconSVG,windArrow,windChip,emptyState} from './common.js';

export const label='Por hora';
export const navIcon='clock';

const DAYS=7;
let chartVar='temp';

function cssColors(){
  const s=getComputedStyle(document.documentElement);
  return {
    c1:s.getPropertyValue('--accent').trim()||'#5d7346',
    c2:s.getPropertyValue('--muted').trim()||'#6d675d',
    cRain:s.getPropertyValue('--rain').trim()||'#3f7cae',
  };
}
function seriesFor(h,a,b){
  const {c1,c2,cRain}=cssColors();
  const sl=arr=>arr.slice(a,b);
  if(chartVar==='temp')return {series:[
    {key:'t',label:'Temp',values:sl(h.temperature_2m),kind:'area',color:c1,unit:'°'},
    {key:'f',label:'Sensación',values:sl(h.apparent_temperature),kind:'dash',color:c2,unit:'°'},
  ],yUnit:'°',y2Unit:''};
  if(chartVar==='precip')return {series:[
    {key:'mm',label:'Lluvia',values:sl(h.precipitation),kind:'bar',color:cRain,unit:' mm'},
    {key:'p',label:'Prob',values:sl(h.precipitation_probability),kind:'line',color:c1,unit:'%',axis:'right'},
  ],yUnit:'',y2Unit:'%'};
  return {series:[
    {key:'w',label:'Viento',values:sl(h.wind_speed_10m),kind:'area',color:c1,unit:''},
    {key:'g',label:'Ráfaga',values:sl(h.wind_gusts_10m),kind:'dash',color:c2,unit:''},
  ],yUnit:'',y2Unit:''};
}

export function render(el){
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Sin datos para esta ubicación.')}</div>`;return;}
  const h=data.hourly;
  const start=todayStartIndex(data);
  const nowIdx=nowHourIndex(data);
  const prof=getProfile(state.activeProfileId);
  const scored=evaluateRange(data,prof,start,DAYS*24);
  const scoreAt=i=>scored[i-start]?.state||'verde';
  const dT=deltaTSeries(h);
  const agro=agroOn();

  const selector=`<div class="sec-title">
    <h2>7 días, hora a hora</h2>
    <div class="seg seg-sm">
      ${[['temp','Temp'],['precip','Lluvia'],['wind','Viento']].map(([k,t])=>
        `<button class="seg-b${chartVar===k?' active':''}" data-cv="${k}">${t}</button>`).join('')}
    </div>
  </div>`;

  let blocks='';
  for(let dday=0;dday<DAYS;dday++){
    const ds=start+dday*24;
    if(ds>=h.time.length)break;
    const de=Math.min(h.time.length,ds+24);
    const dateStr=h.time[ds].slice(0,10);
    let mn=Infinity,mx=-Infinity,psum=0,wmax=0;
    for(let i=ds;i<de;i++){mn=Math.min(mn,h.temperature_2m[i]);mx=Math.max(mx,h.temperature_2m[i]);psum+=h.precipitation[i]||0;wmax=Math.max(wmax,h.wind_speed_10m[i]);}

    const {series,yUnit,y2Unit}=seriesFor(h,ds,de);
    const nowRel=(nowIdx>=ds&&nowIdx<de)?nowIdx-ds:-1;
    const chartHTML=chart({hours:h.time.slice(ds,de),isDay:h.is_day.slice(ds,de),series,nowRel,yUnit,y2Unit,xEvery:3,height:150});

    let rows='';
    for(let i=ds;i<de;i++){
      const isNow=i===nowIdx;
      rows+=`<div class="hr" data-i="${i}">
        <button class="hr-head${agro?'':' hr-head-lite'}">
          <span class="hr-t">${isNow?'Ahora':fmtHour(h.time[i])}</span>
          ${agro?`<span class="hr-sem sem-${scoreAt(i)}"></span>`:''}
          ${weatherIconSVG(h.weather_code[i],{size:32,isDay:!!h.is_day[i]})}
          <span class="hr-temp">${temp(h.temperature_2m[i])}</span>
          <span class="hr-rain">${h.precipitation_probability[i]>0?`${icon('droplet',{size:11})}${pct(h.precipitation_probability[i])}`:''}</span>
          ${windChip(h.wind_speed_10m[i],h.wind_direction_10m[i],h.wind_gusts_10m[i],{compact:true,dialSize:20})}
          ${agro?`<span class="hr-dt">${term('delta_t','ΔT')} ${dT[i].toFixed(1)}</span>`:''}
          ${icon('chevron-down',{size:14,cls:'hr-chev'})}
        </button>
        <div class="hr-body"><div class="hr-inner">${hourDetail(data,i)}</div></div>
      </div>`;
    }

    blocks+=`<section class="pday-block" data-reveal data-dstart="${ds}">
      <header class="day-sticky">
        <span class="day-sticky-name">${fmtDayLong(dateStr)}</span>
        <span class="day-sticky-sum">${temp(mn)}/${temp(mx)} · ${icon('droplet',{size:11})}${rain(psum)} · ${icon('wind',{size:11})}${wind(wmax)}</span>
      </header>
      <div class="pday-chart">
        <div class="chart-reading" data-dayreading>Tocá el gráfico para leer una hora</div>
        ${chartHTML}
      </div>
      <div class="hr-list">${rows}</div>
    </section>`;
  }

  el.innerHTML=`<div class="wrap wrap-porhora">${selector}${blocks}</div>`;
  el._ctx={data,start};
}

function hourDetail(data,i){
  const h=data.hourly;
  const rows=[
    ['Sensación',temp(h.apparent_temperature[i]),'apparent_temp'],
    ['Humedad',pct(h.relative_humidity_2m[i])],
    ['Punto de rocío',temp(h.dew_point_2m[i]),'dew_point'],
    ['Viento',`${wind(h.wind_speed_10m[i])} ${cardinal(h.wind_direction_10m[i])}`],
    ['Ráfaga',wind(h.wind_gusts_10m[i]),'gust'],
    ['Lluvia',`${rain(h.precipitation[i])} · ${pct(h.precipitation_probability[i])}`,'precip_prob'],
    ['Presión',`${round(h.pressure_msl[i])} hPa`,'pressure'],
    ['Nubosidad',pct(h.cloud_cover[i])],
    ['UV',round(h.uv_index[i]??0),'uv_index'],
    ['Suelo 6 cm',temp(h.soil_temperature_6cm?.[i]),'soil_temp'],
    ['Humedad suelo',h.soil_moisture_1_to_3cm?.[i]!=null?`${Math.round(h.soil_moisture_1_to_3cm[i]*100)}%`:'–','soil_moisture'],
    ['CAPE',`${round(h.cape?.[i]??0)} J/kg`,'cape'],
  ];
  return `<div class="hd-grid">${rows.map(([k,v,tk])=>
    `<div class="hd-cell"><span class="hd-k">${tk?term(tk,k):k}</span><span class="hd-v">${v}</span></div>`).join('')}
    <div class="hd-cell hd-cond"><span class="hd-k">Condición</span><span class="hd-v">${wmoLabel(h.weather_code[i])}</span></div>
  </div>`;
}

export function mount(){
  reveal();
  const view=document.getElementById('view');
  const ctx=view?._ctx;
  if(!ctx)return;
  const h=ctx.data.hourly;

  view.querySelectorAll('[data-cv]').forEach(b=>b.addEventListener('click',()=>{
    chartVar=b.dataset.cv; refreshCurrent();
  }));

  view.querySelectorAll('.pday-block').forEach(block=>{
    const ds=+block.dataset.dstart;
    const de=Math.min(h.time.length,ds+24);
    const wrap=block.querySelector('.chart-wrap');
    const reading=block.querySelector('[data-dayreading]');
    if(wrap){
      drawPaths(wrap);
      const {series}=seriesFor(h,ds,de);
      wireChart(wrap,{hours:h.time.slice(ds,de),series,startIdx:ds,onMove:(idx,vals,iso)=>{
        reading.textContent=`${fmtHour(iso)} · `+
          series.map((s,k)=>vals[k]==null?'':`${s.label} ${Math.round(vals[k]*10)/10}${s.unit||''}`).filter(Boolean).join(' · ');
      }});
    }
    block.querySelectorAll('.hr-head').forEach(btn=>btn.addEventListener('click',()=>{
      const hr=btn.closest('.hr'), body=hr.querySelector('.hr-body');
      const open=hr.classList.toggle('open');
      body.style.height=open?body.firstElementChild.scrollHeight+'px':'0px';
    }));
  });

  if(state.jumpHourISO){
    const idx=h.time.indexOf(state.jumpHourISO);
    state.jumpHourISO=null;
    if(idx>=0)openHour(view,idx,true);
  }
}

function openHour(view,idx,pulse){
  const hr=view.querySelector(`.hr[data-i="${idx}"]`);
  if(!hr)return;
  const body=hr.querySelector('.hr-body');
  if(!hr.classList.contains('open')){
    hr.classList.add('open');
    body.style.height=body.firstElementChild.scrollHeight+'px';
  }
  requestAnimationFrame(()=>{
    hr.scrollIntoView({block:'center',behavior:'smooth'});
    if(pulse){hr.classList.add('pulse');setTimeout(()=>hr.classList.remove('pulse'),1600);}
  });
}
