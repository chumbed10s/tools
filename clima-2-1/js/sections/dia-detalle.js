// Página "Detalle de día" — desglose hora a hora de un día de la Semana, con
// reproducción: avanza desde las 00:00 animando valores y marcando la tendencia
// (flecha arriba/abajo) contra la hora anterior.
import {activeData} from '../state.js';
import {wmoLabel,wmoCategory} from '../weather.js';
import {temp,wind,pct,rain,fmtHour,fmtDayLong} from '../format.js';
import {deltaTSeries,inversionSeries,frostByDay} from '../agro/meteo.js';
import {mountChart} from '../charts.js';
import {trendArrow} from '../anim.js';
import {closeOverlay} from '../router.js';
import {card,icon,weatherIconSVG,metricTile,emptyState} from './common.js';

let ctx=null;
let chartInst=null;
let playTimer=null;
let playHour=0;

export function render(el,{dayIdx}={}){
  const data=activeData();
  if(!data||dayIdx==null){el.innerHTML=`<div class="wrap">${emptyState('Día no disponible.')}</div>`;return;}
  const h=data.hourly,d=data.daily;
  const date=d.time[dayIdx];
  const start=h.time.findIndex(t=>t.slice(0,10)===date);
  const count=Math.min(h.time.length,start+24)-start;
  const dT=deltaTSeries(h).slice(start,start+count);
  const inv=inversionSeries(h).slice(start,start+count);
  const frost=frostByDay(data)[dayIdx];

  const stats=[
    metricTile({iconName:'arrow-up',tone:'sun',label:'Máxima',value:temp(d.temperature_2m_max[dayIdx])}),
    metricTile({iconName:'arrow-down',tone:'water',label:'Mínima',value:temp(d.temperature_2m_min[dayIdx])}),
    metricTile({iconName:'wind',tone:'neutral',label:'Viento máx',value:wind(d.wind_speed_10m_max[dayIdx]||0,{unit:false}),unit:'km/h'}),
    metricTile({iconName:'droplet',tone:'water',label:'Lluvia total',value:rain(d.precipitation_sum[dayIdx]||0)}),
    metricTile({iconName:'snowflake',tone:'water',label:'Helada',value:frost&&frost.level!=='sin'?temp(frost.min):'Sin riesgo'}),
  ].join('');

  el.innerHTML=`<div class="wrap wrap-dia">
    <button class="back-row" id="dia-back">${icon('chevron-down',{size:14,cls:'rot-r'})} Semana</button>
    <div class="dia-hero" data-cat="${wmoCategory(d.weather_code[dayIdx])}" data-reveal>
      ${weatherIconSVG(d.weather_code[dayIdx],{size:88,isDay:true})}
      <div><h2>${fmtDayLong(date)}</h2><p>${wmoLabel(d.weather_code[dayIdx])}</p></div>
    </div>
    ${card(`<div class="mtiles">${stats}</div>`,{title:'Resumen del día',cls:'card-tiles'})}
    ${card(`<div class="chart-box" data-chart="dia"></div>`,{title:'Temperatura y viento',cls:'card-chart'})}
    ${card(`
      <div class="play-controls">
        <button class="play-btn" id="play-btn">${icon('play',{size:16})}</button>
        <input type="range" id="play-scrub" min="0" max="${count-1}" value="0" step="1">
        <span class="play-hour" id="play-hourlbl">${fmtHour(h.time[start])}</span>
      </div>
      <div class="play-readout" id="play-readout"></div>
    `,{title:'Reproducir el día',cls:'card-play'})}
  </div>`;

  ctx={h,start,count,dT,inv,dayIdx};
  playHour=0;
}

export function mount(){
  const view=document.getElementById('overlay-content');
  document.getElementById('dia-back')?.addEventListener('click',closeOverlay);
  if(!ctx)return;
  const {h,start,count,dT,inv}=ctx;
  const labels=h.time.slice(start,start+count).map(t=>fmtHour(t));
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#3b82f6';

  const box=view.querySelector('[data-chart="dia"]');
  mountChart(box,{
    type:'line',
    data:{labels,datasets:[
      {label:'Temp °',data:h.temperature_2m.slice(start,start+count),borderColor:accent,backgroundColor:accent+'33',fill:true,tension:.3,pointRadius:3,yAxisID:'y'},
      {label:'Viento km/h',data:h.wind_speed_10m.slice(start,start+count),borderColor:'#94a3b8',fill:false,tension:.3,pointRadius:0,yAxisID:'y1'},
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:10,font:{size:10}}}},
      scales:{
        x:{grid:{color:'rgba(127,127,127,.15)'},ticks:{maxTicksLimit:8,font:{size:10}}},
        y:{grid:{color:'rgba(127,127,127,.15)'},ticks:{font:{size:10}}},
        y1:{position:'right',grid:{display:false},ticks:{font:{size:10}}},
      },
    },
  }).then(inst=>{chartInst=inst;});

  renderReadout(0,null);

  const btn=view.querySelector('#play-btn');
  const scrub=view.querySelector('#play-scrub');
  btn.addEventListener('click',()=>togglePlay(view));
  scrub.addEventListener('input',()=>{stopPlay(view);setHour(view,+scrub.value);});
}

function togglePlay(view){
  if(playTimer)stopPlay(view);
  else startPlay(view);
}
function startPlay(view){
  const btn=view.querySelector('#play-btn');
  btn.innerHTML=icon('pause',{size:16});
  if(playHour>=ctx.count-1)playHour=0;
  playTimer=setInterval(()=>{
    playHour++;
    if(playHour>=ctx.count){stopPlay(view);return;}
    setHour(view,playHour);
  },800);
}
function stopPlay(view){
  clearInterval(playTimer);playTimer=null;
  const btn=view.querySelector('#play-btn');
  if(btn)btn.innerHTML=icon('play',{size:16});
}
function setHour(view,idx){
  playHour=idx;
  view.querySelector('#play-scrub').value=idx;
  view.querySelector('#play-hourlbl').textContent=fmtHour(ctx.h.time[ctx.start+idx]);
  renderReadout(idx,idx>0?idx-1:null);
  if(chartInst){
    const r0=chartInst.data.datasets[0].pointRadius=Array(ctx.count).fill(0).map((_,i)=>i===idx?6:3);
    chartInst.data.datasets[1].pointRadius=Array(ctx.count).fill(0).map((_,i)=>i===idx?5:0);
    chartInst.update('none');
  }
}

function renderReadout(idx,prevIdx){
  const view=document.getElementById('overlay-content');
  const el=view?.querySelector('#play-readout');
  if(!el)return;
  const {h,start,dT,inv}=ctx;
  const i=start+idx, pi=prevIdx!=null?start+prevIdx:null;
  const rows=[
    ['Temp',h.temperature_2m[i],pi!=null?h.temperature_2m[pi]:null,v=>temp(v)],
    ['Viento',h.wind_speed_10m[i],pi!=null?h.wind_speed_10m[pi]:null,v=>wind(v)],
    ['Humedad',h.relative_humidity_2m[i],pi!=null?h.relative_humidity_2m[pi]:null,v=>pct(v)],
    ['Delta-T',dT[idx],prevIdx!=null?dT[prevIdx]:null,v=>v.toFixed(1)],
    ['Inversión',Math.round((inv[idx]?.score||0)*100),prevIdx!=null?Math.round((inv[prevIdx]?.score||0)*100):null,v=>v+'%'],
  ];
  el.innerHTML=rows.map(([k,v,pv,fmt])=>
    `<div class="ro-row"><span>${k}</span><b>${fmt(v)}${trendArrow(v,pv)}</b></div>`).join('');
}
