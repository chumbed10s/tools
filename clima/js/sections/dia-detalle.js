// Vista profunda de un día — compartida, se abre desde "Semana".
import {state,activeData,agroOn} from '../state.js';
import {nowHourIndex,todayDailyIndex,wmoLabel,wmoCategory} from '../weather.js';
import {temp,wind,pct,rain,cardinal,fmtHour,fmtDayLong,hours as fmtHours,round} from '../format.js';
import {deltaTSeries,inversionSeries,frostByDay} from '../agro/meteo.js';
import {getProfiles,getProfile} from '../agro/profiles.js';
import {dayRollup} from '../agro/engine.js';
import {dayDigest} from '../digest.js';
import {chart,wireChart} from '../charts.js';
import {reveal,drawPaths,countUpAll} from '../anim.js';
import {card,icon,term,weatherIconSVG,windArrow,windDial,metricTile,semaphore} from './common.js';

let ctx=null;

export function renderDayDetail(el,dayIdx){
  const data=activeData();
  const h=data.hourly,d=data.daily;
  const date=d.time[dayIdx];
  const start=h.time.findIndex(t=>t.slice(0,10)===date);
  const count=Math.min(h.time.length,start+24)-start;
  const nowIdx=nowHourIndex(data);
  const nowRel=(nowIdx>=start&&nowIdx<start+count)?nowIdx-start:-1;
  const isFuture=(dayIdx-todayDailyIndex(data))>7;

  const cs=getComputedStyle(document.documentElement);
  const c1=cs.getPropertyValue('--accent').trim(),c2=cs.getPropertyValue('--muted').trim(),cRain=cs.getPropertyValue('--rain').trim();
  const slice=a=>a.slice(start,start+count);
  const hoursArr=slice(h.time), isDayArr=slice(h.is_day);
  const dT=deltaTSeries(h);

  const mkChart=(series,opts={})=>chart({hours:hoursArr,isDay:isDayArr,series,nowRel,height:170,xEvery:3,...opts});

  const tempCard=card(`
    <div class="mini-legend"><span><i style="background:${c1}"></i>Temp</span><span><i style="background:${c2}"></i>${term('apparent_temp','Sensación')}</span></div>
    <div class="chart-reading" data-r="t">Tocá o pasá el mouse por el gráfico</div>
    ${mkChart([
      {key:'t',label:'Temp',values:slice(h.temperature_2m),kind:'area',color:c1,unit:'°'},
      {key:'f',label:'Sensación',values:slice(h.apparent_temperature),kind:'dash',color:c2,unit:'°'},
    ],{yUnit:'°'})}`,{title:'Temperatura',cls:'card-chart',termKey:null});

  const precipCard=card(`
    <div class="mini-legend"><span><i style="background:${cRain}"></i>mm</span><span><i style="background:${c1}"></i>${term('precip_prob','Prob.')}</span></div>
    <div class="chart-reading" data-r="p">Tocá o pasá el mouse por el gráfico</div>
    ${mkChart([
      {key:'mm',label:'Lluvia',values:slice(h.precipitation),kind:'bar',color:cRain,unit:' mm'},
      {key:'pp',label:'Prob',values:slice(h.precipitation_probability),kind:'line',color:c1,unit:'%',axis:'right'},
    ],{y2Unit:'%'})}`,{title:'Precipitación',cls:'card-chart'});

  const windCard=card(`
    <div class="mini-legend"><span><i style="background:${c1}"></i>Viento</span><span><i style="background:${c2}"></i>${term('gust','Ráfaga')}</span></div>
    <div class="chart-reading" data-r="w">Tocá o pasá el mouse por el gráfico</div>
    ${mkChart([
      {key:'w',label:'Viento',values:slice(h.wind_speed_10m),dirs:slice(h.wind_direction_10m),kind:'area',color:c1,unit:''},
      {key:'g',label:'Ráfaga',values:slice(h.wind_gusts_10m),kind:'dash',color:c2,unit:''},
    ])}`,{title:'Viento',cls:'card-chart'});

  const deltaCard=card(`
    <div class="chart-reading" data-r="d">Tocá o pasá el mouse por el gráfico</div>
    ${mkChart([{key:'dt',label:'Delta-T',values:dT.slice(start,start+count),kind:'line',color:c1,unit:''}])}
    <p class="hint">Franja ideal de aplicación: 2 a 8.</p>`,{title:'Delta-T',cls:'card-chart',termKey:'delta_t'});

  // ── estadísticas del día ──
  const M=(o)=>metricTile(o);
  const stats=[
    M({iconName:'thermometer-up',tone:'sun',label:'Máxima',value:temp(d.temperature_2m_max[dayIdx])}),
    M({iconName:'thermometer-down',tone:'water',label:'Mínima',value:temp(d.temperature_2m_min[dayIdx])}),
    M({badgeHTML:windDial(d.wind_direction_10m_dominant[dayIdx]??0,30),label:'Viento máx',
      value:wind(d.wind_speed_10m_max[dayIdx]??0,{unit:false}),unit:'km/h',
      chip:`${cardinal(d.wind_direction_10m_dominant[dayIdx]??0)} · ${icon('gust',{size:10})}${wind(d.wind_gusts_10m_max[dayIdx]??0,{unit:false})}`}),
    M({iconName:'cloud-rain',tone:'water',label:'Lluvia total',value:rain(d.precipitation_sum[dayIdx]??0),
      chip:`${round(d.precipitation_hours[dayIdx]??0)} h`}),
    M({iconName:'uv',tone:'sun',termKey:'uv_index',label:'UV máx',value:round(d.uv_index_max[dayIdx]??0)}),
    M({iconName:'et0',tone:'neutral',termKey:'et0',label:'ET0',value:rain(d.et0_fao_evapotranspiration?.[dayIdx]??0)}),
    M({iconName:'sunrise',tone:'sun',label:'Amanecer',value:fmtHour(d.sunrise[dayIdx])}),
    M({iconName:'sunset',tone:'sun',label:'Atardecer',value:fmtHour(d.sunset[dayIdx])}),
    M({iconName:'sun',tone:'sun',label:'Sol efectivo',value:fmtHours(d.sunshine_duration?.[dayIdx]??0),
      chip:`luz ${fmtHours(d.daylight_duration[dayIdx])}`}),
  ];
  const statsCard=card(`<div class="mtiles">${stats.join('')}</div>`,{title:'Resumen del día',cls:'card-tiles'});

  const dg=dayDigest(data,dayIdx);
  const digestCard=dg.length?card(`<ul class="digest">${dg.map(it=>`
    <li class="dg${it.tone?` dg-${it.tone}`:''}"><span class="dg-ic">${icon(it.iconName,{size:14})}</span><span>${it.text}</span></li>`).join('')}</ul>`,
    {title:'En pocas palabras',cls:'card-digest'}):'';

  // ── agro por perfil ──
  const frost=frostByDay(data,state.alerts.frostThreshold)[dayIdx];
  const invHours=inversionSeries(h).slice(start,start+count).filter(x=>x.flag).length;
  const agroRows=getProfiles().map(p=>{
    const r=dayRollup(data,p,dayIdx);
    const blocks=r.blocks.map(b=>`${fmtHour(h.time[b.from])}–${fmtHour(h.time[b.to])}`).join(' · ')||'sin ventana';
    return `<div class="agro-day-row">
      <span class="agro-day-name">${icon(p.icon,{size:14})}${p.name}</span>
      <span class="agro-day-hours">${r.greenHours} h buenas</span>
      <span class="agro-day-blocks">${blocks}</span>
    </div>`;
  }).join('');
  const agroCard=agroOn()?card(`
    <div class="agro-day-head">
      ${frost&&frost.level!=='sin'?`<span class="pill pill-frost">${icon('thermometer-down',{size:12})}Helada ${temp(frost.min)}</span>`:''}
      ${invHours?`<span class="pill">${icon('layers',{size:12})}${term('inversion','Inversión')} ${invHours} h</span>`:''}
    </div>
    ${agroRows}`,{title:'Ventanas por tarea',cls:'card-agro'}):'';

  el.innerHTML=`<div class="wrap wrap-dia">
    <button class="back-row" id="dia-back">${icon('chevron-left',{size:16})} Semana</button>
    <div class="dia-hero" data-cat="${wmoCategory(d.weather_code[dayIdx])}" data-reveal>
      ${weatherIconSVG(d.weather_code[dayIdx],{size:96,isDay:true})}
      <div>
        <h2>${fmtDayLong(date)}</h2>
        <p>${wmoLabel(d.weather_code[dayIdx])} · ${temp(d.temperature_2m_min[dayIdx])} / ${temp(d.temperature_2m_max[dayIdx])}</p>
        ${isFuture?'<p class="hint">Precisión orientativa — está a más de 7 días.</p>':''}
      </div>
    </div>
    ${digestCard}${statsCard}${agroCard}${tempCard}${precipCard}${windCard}${agroOn()?deltaCard:''}
  </div>`;

  ctx={hoursArr,start,slices:{
    t:[slice(h.temperature_2m),slice(h.apparent_temperature)],
    p:[slice(h.precipitation),slice(h.precipitation_probability)],
    w:[slice(h.wind_speed_10m),slice(h.wind_gusts_10m)],
    d:[dT.slice(start,start+count)],
  }};
}

export function mountDayDetail(onBack){
  reveal();countUpAll();
  document.getElementById('dia-back')?.addEventListener('click',onBack);
  const view=document.getElementById('view');
  view.querySelectorAll('.card-chart').forEach((cardEl,k)=>{
    const wrap=cardEl.querySelector('.chart-wrap');if(!wrap)return;
    drawPaths(wrap);
    const reading=cardEl.querySelector('.chart-reading');
    const key=['t','p','w','d'][k];
    const arrs=ctx.slices[key];
    wireChart(wrap,{hours:ctx.hoursArr,series:arrs.map(a=>({values:a,label:'',unit:''})),startIdx:ctx.start,
      onMove:(idx,vals,iso)=>{
        reading.textContent=`${fmtHour(iso)} · `+vals.map(v=>v==null?'':Math.round(v*10)/10).filter(x=>x!=='').join(' / ');
      }});
  });
}
