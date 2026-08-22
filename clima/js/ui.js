// Render de toda la interfaz: hero en franja liviana, y cada día del acordeón
// con pestañas (Resumen/Temperatura/Precipitación/Viento/Detalles), cada una
// con su propio gráfico interactivo y detalle por hora.
import {state,activeLocation,DAYS,DAYS_SHORT} from './state.js';
import {wmoCategory,wmoLabel,nowHourIndex} from './weather.js';
import {weatherIconSVG} from './icons.js';
import {buildInsights} from './insights.js';
import {tempChart,precipChart,windChart,wireChartInteraction} from './charts.js';
import {flagEmoji} from './geocode.js';
import {miniMapHTML} from './minimap.js';

const $=id=>document.getElementById(id);
const round=n=>Math.round(n);
const CARDINALS=['N','NE','E','SE','S','SO','O','NO'];
const FA=(name,cls='')=>`<i class="fa-solid fa-${name} ${cls}"></i>`;

// ── Viento: versión completa (cardinal + grados + flecha) y mini (solo velocidad) ─
export function windDirHTML(deg){
  const d=Math.round(deg);
  const idx=Math.round(d/45)%8;
  const toDeg=(d+180)%360;
  return`<span class="wind-dir"><svg class="wd-arrow" viewBox="0 0 24 24" width="13" height="13" style="transform:rotate(${toDeg}deg)"><path fill="currentColor" d="M12 2l6 14h-4v6h-4v-6H6z"/></svg>${CARDINALS[idx]} ${d}°</span>`;
}
function windMini(speed){return`<span class="wind-mini">${FA('wind')}${round(speed)}<small>km/h</small></span>`;}
function minMax(arr,start,end){let min=Infinity,max=-Infinity;for(let i=start;i<end;i++){if(arr[i]<min)min=arr[i];if(arr[i]>max)max=arr[i];}return{min,max};}

let currentData=null,currentNowIdx=0;

export function renderAll(){
  const loc=activeLocation();
  const wx=loc?state.weatherByLocation[loc.id]:null;
  $('location-name').textContent=loc?loc.label:'Elegí una ubicación';
  if(!wx||!wx.data){
    renderEmpty();
    return;
  }
  const data=wx.data;
  const nowIdx=nowHourIndex(data);
  currentData=data;currentNowIdx=nowIdx;
  if(state.expandedDayIdx==null)state.expandedDayIdx=0;
  renderHero(data,nowIdx);
  renderDailyAccordion(data,nowIdx);
  renderOfflineBanner(wx);
  renderLastUpdated(wx);
}

function renderEmpty(){
  $('hero').innerHTML='<div class="hero-empty">Elegí o buscá una ubicación para ver el pronóstico.</div>';
  $('daily-list').innerHTML='';
}

// ── Tarjeta principal ────────────────────────────────────
function heroClass(cat,isDay){return`cond-${cat}${isDay?'-day':'-night'}`;}
function fmtTime(iso){const t=new Date(iso);return String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');}

function renderHero(data,nowIdx){
  const c=data.current,h=data.hourly,d=data.daily;
  const isDay=!!c.is_day;
  const cat=wmoCategory(c.weather_code);
  const hero=$('hero');
  hero.className='hero '+heroClass(cat,isDay);

  const insights=buildInsights(h,nowIdx,Math.min(h.time.length,nowIdx+18),{nowIdx});
  const insightsHtml=insights.length
    ?`<div class="hero-insights">${insights.map(it=>`<div class="hero-insight">${FA(it.fa)}${it.text}</div>`).join('')}</div>`
    :'';

  const stripItems=[
    [FA('droplet'),round(c.relative_humidity_2m)+'%'],
    [FA('wind'),round(c.wind_speed_10m)+' km/h'],
    [FA('gauge-high'),'ráf. '+round(c.wind_gusts_10m)+' km/h'],
    [FA('sun'),'UV '+round(h.uv_index[nowIdx]??0)],
    [FA('gauge'),round(c.pressure_msl)+' hPa'],
    [FA('water'),round(h.dew_point_2m[nowIdx]??0)+'° rocío'],
    [FA('eye'),((h.visibility[nowIdx]??0)/1000).toFixed(1)+' km'],
    [FA('sun-plant-wilt'),fmtTime(d.sunrise[0])],
    [FA('cloud-sun'),fmtTime(d.sunset[0])],
  ];

  hero.innerHTML=`
    <div class="hero-top">
      <div class="hero-icon">${weatherIconSVG(c.weather_code,{size:88,isDay})}</div>
      <div class="hero-main">
        <div class="hero-temp">${round(c.temperature_2m)}°</div>
        <div class="hero-cond">${wmoLabel(c.weather_code)}</div>
        <div class="hero-sub">Sensación ${round(c.apparent_temperature)}° · Máx ${round(d.temperature_2m_max[0])}° Mín ${round(d.temperature_2m_min[0])}°</div>
      </div>
    </div>
    ${insightsHtml}
    <div class="hero-strip">${stripItems.map(([ico,val])=>`<span class="hs-item">${ico}${val}</span>`).join('')}</div>
  `;
}

// ── Fila de día (colapsada) — ahora con barra de viento además de temp ───
function dayHourRange(dayIdx,totalHours){
  const start=dayIdx*24;
  return[start,Math.min(totalHours,start+24)];
}

function renderDailyAccordion(data,nowIdx){
  const h=data.hourly,d=data.daily;
  const list=$('daily-list');
  const tGlobal={min:Math.min(...d.temperature_2m_min),max:Math.max(...d.temperature_2m_max)};
  const wGlobal=minMax(h.wind_speed_10m,0,h.time.length);
  const tRange=(tGlobal.max-tGlobal.min)||1,wRange=(wGlobal.max-wGlobal.min)||1;

  list.innerHTML=d.time.map((date,i)=>{
    const dt=new Date(date+'T12:00');
    const dayName=i===0?'Hoy':DAYS_SHORT[dt.getDay()];
    const[start,end]=dayHourRange(i,h.time.length);
    const lo=d.temperature_2m_min[i],hi=d.temperature_2m_max[i];
    const wDay=minMax(h.wind_speed_10m,start,end);
    const tLeft=((lo-tGlobal.min)/tRange*100).toFixed(1),tWidth=(((hi-lo)/tRange)*100).toFixed(1);
    const wLeft=((wDay.min-wGlobal.min)/wRange*100).toFixed(1),wWidth=(((wDay.max-wDay.min)/wRange)*100).toFixed(1);
    const open=i===state.expandedDayIdx;
    return`<div class="day-acc${open?' open':''}" data-idx="${i}">
      <button class="day-row-header" data-idx="${i}">
        <span class="dr-day">${dayName}<span class="dr-date">${dt.getDate()}/${dt.getMonth()+1}</span></span>
        ${weatherIconSVG(d.weather_code[i],{size:28,isDay:true})}
        <span class="dr-precip">${d.precipitation_probability_max[i]>0?FA('droplet')+d.precipitation_probability_max[i]+'%':''}</span>
        <span class="dr-metric">
          <span class="dr-metric-vals"><span class="dr-lo">${round(lo)}°</span><span class="dr-hi">${round(hi)}°</span></span>
          <span class="dr-bar"><span class="dr-bar-fill dr-bar-temp" style="left:${tLeft}%;width:${tWidth}%"></span></span>
        </span>
        <span class="dr-metric">
          <span class="dr-metric-vals"><span class="dr-lo">${round(wDay.min)}</span><span class="dr-hi">${round(wDay.max)}<small>km/h</small></span></span>
          <span class="dr-bar"><span class="dr-bar-fill dr-bar-wind" style="left:${wLeft}%;width:${wWidth}%"></span></span>
        </span>
        <svg class="dr-chevron" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>
      <div class="day-acc-body"><div class="day-acc-inner"${open?` data-rendered="1"`:''}>${open?dayDetailHTML(data,i,nowIdx):''}</div></div>
    </div>`;
  }).join('');

  const openEl=list.querySelector('.day-acc.open');
  if(openEl){
    wireDayInteractions(openEl,data,+openEl.dataset.idx,nowIdx);
    const body=openEl.querySelector('.day-acc-body');
    body.style.height=body.firstElementChild.scrollHeight+'px';
  }
}

// ── Contenido de un día: pestañas Resumen/Temperatura/Precipitación/Viento/Detalles ─
function hourDetailCard(h,idx,isNow,rows){
  const dt=new Date(h.time[idx]);
  const label=isNow?'Ahora':(dt.getHours()+'h');
  return`<div class="hd-card${isNow?' now':''}">
    <span class="hd-time">${label}</span>
    ${rows.map(([k,v])=>`<div class="hd-row"><span class="hd-k">${k}</span><span class="hd-v">${v}</span></div>`).join('')}
  </div>`;
}

function dayDetailHTML(data,dayIdx,nowIdx){
  const h=data.hourly,d=data.daily;
  const[start,end]=dayHourRange(dayIdx,h.time.length);
  const count=end-start;
  const hoursIdx=[...Array(count)].map((_,i)=>start+i);
  const windMM=minMax(h.wind_speed_10m,start,end),gustMM=minMax(h.wind_gusts_10m,start,end);

  const insights=buildInsights(h,start,end,{nowIdx});
  const insightsHtml=insights.length
    ?`<div class="day-insights">${insights.map(it=>`<div class="insight-chip">${FA(it.fa)}${it.text}</div>`).join('')}</div>`
    :'';

  // ── Resumen ──
  const resumenHours=hoursIdx.map(i=>{
    const dt=new Date(h.time[i]);
    const label=i===nowIdx?'Ahora':(dt.getHours()+'h');
    return`<div class="hour-card${i===nowIdx?' now':''}">
      <span class="hc-time">${label}</span>
      ${weatherIconSVG(h.weather_code[i],{size:30,isDay:!!h.is_day[i]})}
      <span class="hc-temp">${round(h.temperature_2m[i])}°</span>
      <span class="hc-precip">${h.precipitation_probability[i]>0?h.precipitation_probability[i]+'%':'—'}</span>
    </div>`;
  }).join('');
  const resumenHtml=`
    ${insightsHtml}
    <div class="day-badges">
      <span class="wind-badge">${FA('wind')}${round(windMM.min)}–${round(windMM.max)} km/h</span>
      <span class="wind-badge">${FA('gauge-high')}ráf. ${round(gustMM.min)}–${round(gustMM.max)} km/h</span>
      <span class="wind-badge">${FA('sun-plant-wilt')}${fmtTime(d.sunrise[dayIdx])}</span>
      <span class="wind-badge">${FA('cloud-sun')}${fmtTime(d.sunset[dayIdx])}</span>
    </div>
    <div class="day-hours-scroll">${resumenHours}</div>
  `;

  // ── Temperatura ──
  const tempCards=hoursIdx.map(i=>hourDetailCard(h,i,i===nowIdx,[
    ['Temp',round(h.temperature_2m[i])+'°'],
    ['Sensación',round(h.apparent_temperature[i])+'°'],
    ['Humedad',round(h.relative_humidity_2m[i])+'%'],
    ['Rocío',round(h.dew_point_2m[i])+'°'],
  ])).join('');
  const tempHtml=`
    <div class="chart-legend"><span><i class="leg-dot leg-a"></i>Temperatura</span><span><i class="leg-dot leg-b leg-dash"></i>Sensación térmica</span></div>
    <div class="chart-reading" data-reading="temp">Tocá o pasá el mouse por el gráfico</div>
    <div class="chart-holder" data-holder="temp">${tempChart(h,start,count)}</div>
    <div class="hd-scroll">${tempCards}</div>
  `;

  // ── Precipitación ──
  const precipCards=hoursIdx.map(i=>hourDetailCard(h,i,i===nowIdx,[
    ['Probabilidad',h.precipitation_probability[i]+'%'],
    ['Cantidad',h.precipitation[i].toFixed(1)+' mm'],
    ['Condición',wmoLabel(h.weather_code[i])],
  ])).join('');
  const precipHtml=`
    <div class="chart-legend"><span><i class="leg-dot leg-bar"></i>Milímetros</span><span><i class="leg-dot leg-b"></i>Probabilidad</span></div>
    <div class="chart-reading" data-reading="precip">Tocá o pasá el mouse por el gráfico</div>
    <div class="chart-holder" data-holder="precip">${precipChart(h,start,count)}</div>
    <div class="hd-scroll">${precipCards}</div>
  `;

  // ── Viento ──
  const windCards=hoursIdx.map(i=>hourDetailCard(h,i,i===nowIdx,[
    ['Velocidad',round(h.wind_speed_10m[i])+' km/h'],
    ['Ráfagas',round(h.wind_gusts_10m[i])+' km/h'],
    ['Dirección',windDirHTML(h.wind_direction_10m[i])],
  ])).join('');
  const windHtml=`
    <div class="chart-legend"><span><i class="leg-dot leg-a"></i>Velocidad</span><span><i class="leg-dot leg-b leg-dash"></i>Ráfagas</span></div>
    <div class="chart-reading" data-reading="wind">Tocá o pasá el mouse por el gráfico</div>
    <div class="chart-holder" data-holder="wind">${windChart(h,start,count)}</div>
    <div class="hd-scroll">${windCards}</div>
  `;

  // ── Detalles ──
  const dayStats=[
    ['Amanecer',fmtTime(d.sunrise[dayIdx])],
    ['Atardecer',fmtTime(d.sunset[dayIdx])],
    ['Horas de luz',(d.daylight_duration[dayIdx]/3600).toFixed(1)+' h'],
    ['UV máximo',round(d.uv_index_max[dayIdx])],
    ['Sensación máx/mín',round(d.apparent_temperature_max[dayIdx])+'° / '+round(d.apparent_temperature_min[dayIdx])+'°'],
    ['Horas de lluvia',round(d.precipitation_hours[dayIdx])+' h'],
  ];
  const detailCards=hoursIdx.map(i=>hourDetailCard(h,i,i===nowIdx,[
    ['UV',round(h.uv_index[i])],
    ['Humedad',round(h.relative_humidity_2m[i])+'%'],
    ['Presión',round(h.pressure_msl[i])+' hPa'],
    ['Visibilidad',(h.visibility[i]/1000).toFixed(1)+' km'],
  ])).join('');
  const detailsHtml=`
    <div class="day-stats-grid">${dayStats.map(([k,v])=>`<div class="day-stat"><span class="ds-k">${k}</span><span class="ds-v">${v}</span></div>`).join('')}</div>
    <div class="hd-scroll">${detailCards}</div>
  `;

  return`
    <div class="day-tabs">
      <button class="day-tab active" data-tab="resumen">${FA('list')}Resumen</button>
      <button class="day-tab" data-tab="temp">${FA('temperature-half')}Temperatura</button>
      <button class="day-tab" data-tab="precip">${FA('cloud-rain')}Precipitación</button>
      <button class="day-tab" data-tab="wind">${FA('wind')}Viento</button>
      <button class="day-tab" data-tab="details">${FA('circle-info')}Detalles</button>
    </div>
    <div class="day-tab-panel active" data-panel="resumen">${resumenHtml}</div>
    <div class="day-tab-panel" data-panel="temp">${tempHtml}</div>
    <div class="day-tab-panel" data-panel="precip">${precipHtml}</div>
    <div class="day-tab-panel" data-panel="wind">${windHtml}</div>
    <div class="day-tab-panel" data-panel="details">${detailsHtml}</div>
  `;
}

function fmtHourLabel(h,idx){const dt=new Date(h.time[idx]);return String(dt.getHours()).padStart(2,'0')+':00';}

function wireDayInteractions(dayEl,data,dayIdx,nowIdx){
  const h=data.hourly;
  const readingTemp=dayEl.querySelector('[data-holder="temp"]')?.closest('.day-tab-panel');
  if(readingTemp){
    wireChartInteraction(readingTemp.querySelector('[data-holder="temp"]'),(idx,vals)=>{
      readingTemp.querySelector('[data-reading="temp"]').innerHTML=`${fmtHourLabel(h,idx)} · ${round(vals[0])}° · sensación ${round(vals[1])}°`;
    });
  }
  const readingPrecip=dayEl.querySelector('[data-holder="precip"]')?.closest('.day-tab-panel');
  if(readingPrecip){
    wireChartInteraction(readingPrecip.querySelector('[data-holder="precip"]'),(idx,vals)=>{
      readingPrecip.querySelector('[data-reading="precip"]').innerHTML=`${fmtHourLabel(h,idx)} · ${vals[0].toFixed(1)} mm · ${round(vals[1])}% prob.`;
    });
  }
  const readingWind=dayEl.querySelector('[data-holder="wind"]')?.closest('.day-tab-panel');
  if(readingWind){
    wireChartInteraction(readingWind.querySelector('[data-holder="wind"]'),(idx,vals)=>{
      readingWind.querySelector('[data-reading="wind"]').innerHTML=`${fmtHourLabel(h,idx)} · ${round(vals[0])} km/h · ráf. ${round(vals[1])} km/h · ${windDirHTML(h.wind_direction_10m[idx])}`;
    });
  }
}

function toggleDay(dayIdx){
  if(!currentData)return;
  state.expandedDayIdx=state.expandedDayIdx===dayIdx?-1:dayIdx;
  document.querySelectorAll('.day-acc').forEach(el=>{
    const idx=+el.dataset.idx;
    const open=idx===state.expandedDayIdx;
    el.classList.toggle('open',open);
    const body=el.querySelector('.day-acc-body');
    if(open){
      const inner=el.querySelector('.day-acc-inner');
      if(!inner.dataset.rendered){
        inner.innerHTML=dayDetailHTML(currentData,idx,currentNowIdx);
        inner.dataset.rendered='1';
      }
      wireDayInteractions(el,currentData,idx,currentNowIdx);
      body.style.height=inner.scrollHeight+'px';
    }else{
      body.style.height='0px';
    }
  });
}

function switchDayTab(dayEl,tabName){
  dayEl.querySelectorAll('.day-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tabName));
  dayEl.querySelectorAll('.day-tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===tabName));
  const body=dayEl.querySelector('.day-acc-body'),inner=dayEl.querySelector('.day-acc-inner');
  body.style.height=inner.scrollHeight+'px';
}

export function initAccordion(){
  $('daily-list').addEventListener('click',e=>{
    const tabBtn=e.target.closest('.day-tab');
    if(tabBtn){switchDayTab(tabBtn.closest('.day-acc'),tabBtn.dataset.tab);return;}
    const headerBtn=e.target.closest('.day-row-header');
    if(headerBtn){toggleDay(+headerBtn.dataset.idx);return;}
  });
}

// ── Estado de red / última actualización ─────────────────
function renderOfflineBanner(wx){
  const banner=$('offline-banner');
  if(wx.offline){
    const t=new Date(wx.fetchedAt);
    banner.hidden=false;
    banner.textContent=`Sin conexión · mostrando datos de las ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
  }else{
    banner.hidden=true;
  }
}
function renderLastUpdated(wx){
  const t=new Date(wx.fetchedAt);
  $('last-updated').textContent=`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
}

// ── Selector de ubicación (modal — sin cambios de patrón) ─
export function renderSavedLocations(){
  const list=$('saved-list');
  if(!state.locations.length){list.innerHTML='<div class="empty-hint">Sin ubicaciones guardadas todavía.</div>';return;}
  list.innerHTML=state.locations.map(loc=>`
    <div class="loc-row${loc.isGPS?' loc-row-gps':''}${loc.id===state.activeLocationId?' active':''}" data-id="${loc.id}">
      <button class="loc-select">
        <span class="loc-name">${loc.isGPS?FA('location-crosshairs'):flagEmoji(loc.countryCode)} ${loc.label}</span>
        <span class="loc-sub">${[loc.admin1,loc.country].filter(Boolean).join(', ')}</span>
      </button>
      ${loc.isGPS?'':`<button class="loc-remove" title="Quitar">${FA('xmark')}</button>`}
      ${loc.isGPS?miniMapHTML(loc.lat,loc.lon,{className:'minimap minimap-wide'}):''}
    </div>`).join('');
}
export function renderSearchResults(results,onPick){
  const el=$('search-results');
  if(!results.length){el.innerHTML='';return;}
  el.innerHTML=results.map((r,i)=>`
    <button class="search-result" data-i="${i}">
      <span class="loc-name">${flagEmoji(r.countryCode)} ${r.label}</span>
      <span class="loc-sub">${[r.admin1,r.country].filter(Boolean).join(', ')}</span>
    </button>`).join('');
  el.querySelectorAll('.search-result').forEach(btn=>{
    btn.addEventListener('click',()=>onPick(results[+btn.dataset.i]));
  });
}

export function showLoading(show){
  $('loading-overlay').hidden=!show;
  const btn=$('refresh-btn');
  if(btn)btn.classList.toggle('spinning',show);
}
