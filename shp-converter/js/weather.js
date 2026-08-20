// Pronóstico de viento (Open-Meteo/ECMWF): mapeo de íconos FA por código WMO
// y el carrusel de horas (tarjeta activa al centro, con todo el detalle).
import {state,DAYS} from './state.js';
import {setStatus} from './ui.js';
import {updateMapForHour} from './drift.js';
import {renderZonesList} from './zones.js';

// Íconos de una sola figura → un solo color tiene sentido (sol amarillo, lluvia azul...).
const FA_ICON={
  clear:'fa-sun',overcast:'fa-cloud',fog:'fa-smog',drizzle:'fa-cloud-rain',
  rain:'fa-cloud-showers-heavy',showers:'fa-cloud-showers-heavy',snow:'fa-snowflake'
};
const ICON_COLOR={
  clear:'#fbbf24',overcast:'#94a3b8',fog:'#7d8996',drizzle:'#60a5fa',
  rain:'#3b82f6',showers:'#3b82f6',snow:'#bae6fd'
};

function wmoCategory(c){
  if(c===0)return'clear';if(c===1)return'mostly';if(c===2)return'partly';
  if(c===3)return'overcast';if(c<=48)return'fog';if(c<=57)return'drizzle';
  if(c<=67)return'rain';if(c<=77)return'snow';if(c<=86)return'showers';
  return'storm';
}
function wmoLabel(c){
  const L={0:'Despejado',1:'May. despejado',2:'Parcialm. nublado',3:'Nublado',
    45:'Niebla',48:'Niebla helada',51:'Llovizna leve',53:'Llovizna',55:'Llovizna',
    56:'Llovizna helada',57:'Llovizna helada',61:'Lluvia leve',63:'Lluvia',
    65:'Lluvia fuerte',66:'Lluvia helada',67:'Lluvia helada',71:'Nevada leve',
    73:'Nevada',75:'Nevada fuerte',77:'Granizo fino',80:'Chubascos',
    81:'Chubascos',82:'Chubascos fuertes',85:'Nieve y chubascos',86:'Nieve y chubascos',
    95:'Tormenta',96:'Tormenta granizo',99:'Tormenta granizo'};
  return L[c]||'Variable';
}
// Nublado+sol y tormenta son condiciones "compuestas" — un solo ícono de FA de un solo
// color las pinta mal (la nube entera queda amarilla). Se arman apilando dos íconos,
// cada uno con su propio color, en vez de forzar todo a un color general.
export function wxIconHTML(code){
  const cat=wmoCategory(code);
  if(cat==='mostly'||cat==='partly'){
    const sunSz=cat==='mostly'?'0.88em':'0.6em';
    const cloudSz=cat==='mostly'?'0.6em':'0.85em';
    return`<span class="wxi-stack"><i class="fa-solid fa-sun wxi-back" style="color:#fbbf24;font-size:${sunSz}"></i><i class="fa-solid fa-cloud wxi-front" style="color:#94a3b8;font-size:${cloudSz}"></i></span>`;
  }
  if(cat==='storm'){
    return`<span class="wxi-stack"><i class="fa-solid fa-cloud wxi-back" style="color:#64748b;font-size:0.95em"></i><i class="fa-solid fa-bolt wxi-front" style="color:#facc15;font-size:0.55em"></i></span>`;
  }
  return`<i class="fa-solid ${FA_ICON[cat]||'fa-cloud'}" style="color:${ICON_COLOR[cat]||'#94a3b8'}"></i>`;
}
export function wxStatus(speed,gust){
  if(speed>=24||gust>=32)return'wx-r';
  if(speed>=15||gust>=22)return'wx-y';
  return'wx-g';
}
export function wxColor(st){return st==='wx-r'?'#f87171':st==='wx-y'?'#facc15':'#4ade80';}

// ── Descarga de pronóstico para una capa ───────────────────
export async function openWxForLayer(id){
  const lyr=state.layers.find(l=>l.id===id);if(!lyr)return;
  try{
    const b=lyr.mapLyr.getBounds();
    const lat=+((b.getNorth()+b.getSouth())/2).toFixed(4);
    const lon=+((b.getEast()+b.getWest())/2).toFixed(4);
    setStatus('loading',`Descargando ECMWF para ${lyr.name}…`);
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&wind_speed_unit=kmh&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=16`;
    const res=await fetch(url);if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    state.wxActive={layerId:id,data,lat,lon,name:lyr.name};
    document.getElementById('wx-side-name').textContent=lyr.name;
    document.getElementById('wx-side-empty').style.display='none';
    document.getElementById('wx-side-active').style.display='block';
    document.getElementById('drift-slider').value=state.driftKm;
    document.getElementById('drift-val').textContent=state.driftKm+' km';
    renderWxBar(data);
    document.getElementById('weather-bar').classList.add('open');
    document.querySelectorAll('.btn-sm.active').forEach(b=>b.classList.remove('active'));
    document.getElementById('btn-wx-'+id)?.classList.add('active');
    setStatus('success',`Clima · ${data.hourly.time.length}h · ECMWF IFS`);
  }catch(err){setStatus('error',err.message);}
}

// ── Carrusel: tarjeta central grande con detalle, vecinas chicas ──
function renderWxBar(data){
  const h=data.hourly,d=data.daily;
  // Instante actual "corrido" -3h y formateado como si fuera UTC = hora de pared de
  // Buenos Aires (el mismo truco que ya usaba nowStr, ahora también para el día de hoy —
  // antes esto último usaba la fecha UTC sin corregir, y entre las 21:00 y medianoche
  // en Argentina eso ya es "mañana" en UTC, corriendo la etiqueta "HOY" un día).
  const argNow=new Date(Date.now()-3*3600000);
  const nowStr=argNow.toISOString().slice(0,13);
  const todayStr=argNow.toISOString().slice(0,10);
  let nowIdx=h.time.findIndex(t=>t>=nowStr);
  if(nowIdx<0)nowIdx=0;
  state.wxNowIdx=nowIdx;

  const tabsEl=document.getElementById('wx-tabs-scroll');
  tabsEl.innerHTML=d.time.map((date,di)=>{
    const dt=new Date(date+'T12:00');
    const dayName=DAYS[dt.getDay()];
    const dayDate=`${dt.getDate()}/${dt.getMonth()+1}`;
    const code=d.weather_code[di];
    const maxW=Math.round(d.wind_speed_10m_max[di]);
    const maxG=Math.round(d.wind_gusts_10m_max[di]);
    const dir=Math.round(d.wind_direction_10m_dominant[di]);
    const tmax=Math.round(d.temperature_2m_max[di]);
    const tmin=Math.round(d.temperature_2m_min[di]);
    const st=wxStatus(maxW,maxG);
    const isToday=date===todayStr;
    return`<div class="wx-tab${isToday?' active':''} ${st==='wx-r'?'bad':st==='wx-y'?'warn':''}" onclick="jumpToDay(${di*24})" title="${wmoLabel(code)} · ${tmin}–${tmax}° · máx ${maxW} km/h">
      <div class="wx-tab-top">
        <span class="wx-tab-day">${isToday?'HOY':dayName}</span>
        <span class="wx-tab-date">${dayDate}</span>
      </div>
      <div class="wx-tab-icon">${wxIconHTML(code)}</div>
      <span class="wx-tab-temps"><b>${tmax}°</b> ${tmin}°</span>
      <div class="wx-tab-wind-row ${st}">
        <i class="fa-solid fa-arrow-up wx-tab-dir" style="transform:rotate(${(dir+180)%360}deg)"></i>
        <span class="wx-tab-wind">${maxW} <small>km/h</small></span>
      </div>
    </div>`;
  }).join('');

  const scrollEl=document.getElementById('wx-scroll');
  scrollEl.innerHTML=h.time.slice(nowIdx).map((t,ri)=>{
    const i=nowIdx+ri;
    const hour=t.slice(11,13);
    const speed=Math.round(h.wind_speed_10m[i]);
    const gust=Math.round(h.wind_gusts_10m[i]);
    const dir=Math.round(h.wind_direction_10m[i]);
    const temp=Math.round(h.temperature_2m[i]);
    const hum=Math.round(h.relative_humidity_2m[i]);
    const code=h.weather_code[i];
    const st=wxStatus(speed,gust);
    const isNow=ri===0;
    const dt=new Date(t);
    const label=isNow?'Ahora':`${DAYS[dt.getDay()]} ${hour}:00`;
    return`<div class="wx-card ${st}${isNow?' now-card':''}" data-idx="${i}" onclick="selectHour(${i})">
      <div class="wxc-time">${label}</div>
      <div class="wxc-icon">${wxIconHTML(code)}</div>
      <div class="wxc-cond">${wmoLabel(code)}</div>
      <div class="wxc-wind-row">
        <i class="fa-solid fa-arrow-up wxc-dir" style="transform:rotate(${(dir+180)%360}deg)"></i>
        <span class="wxc-spd">${speed}</span><span class="wxc-unit">km/h</span>
      </div>
      <div class="wxc-sub">ráf. ${gust} km/h</div>
      <div class="wxc-meta"><i class="fa-solid fa-temperature-half"></i>${temp}°C <i class="fa-solid fa-droplet"></i>${hum}%</div>
    </div>`;
  }).join('');

  selectHour(nowIdx);
}

export function selectHour(idx){
  if(!state.wxActive.data)return;
  state.activeHourIdx=idx;
  document.querySelectorAll('#wx-scroll .wx-card').forEach(el=>{
    const isActive=+el.dataset.idx===idx;
    el.classList.toggle('wx-card-active',isActive);
    if(isActive)el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  });
  document.querySelectorAll('.wx-tab').forEach((t,i)=>t.classList.toggle('active',i===Math.floor(idx/24)));
  updateMapForHour(idx);
}

export function stepHour(delta){
  if(!state.wxActive.data)return;
  const nowIdx=state.wxNowIdx||0;
  const max=state.wxActive.data.hourly.time.length-1;
  const target=Math.max(nowIdx,Math.min(max,state.activeHourIdx+delta));
  selectHour(target);
}

export function toggleDayTabs(){
  document.getElementById('wx-tabs-row').classList.toggle('expanded');
}

export function jumpToDay(hourIdx){
  const nowIdx=state.wxNowIdx||0;
  selectHour(Math.max(hourIdx,nowIdx));
}

export function closeWx(){
  document.getElementById('weather-bar').classList.remove('open');
  document.getElementById('wx-side-empty').style.display='block';
  document.getElementById('wx-side-active').style.display='none';
  document.querySelectorAll('.btn-sm.active').forEach(b=>b.classList.remove('active'));
  if(state.wxMarkerLayer){state.wxMarkerLayer.remove();state.wxMarkerLayer=null;}
  state.driftLayers.forEach(l=>l.remove());
  state.driftLayers=[];
  state.wxActive={layerId:null,data:null,lat:null,lon:null,name:''};
  state.sensitiveZones.forEach(z=>{if(z.warnMarker){z.warnMarker.remove();z.warnMarker=null;}z.atRisk=false;});
  renderZonesList();
}

export async function refreshWx(){if(!state.wxActive.data)return;await openWxForLayer(state.wxActive.layerId);}
