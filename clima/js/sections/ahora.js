// Sección "Ahora": clima actual inmersivo + estado agro + datos de igual peso.
import {state,activeLocation,activeData,agroOn} from '../state.js';
import {nowHourIndex,wmoCategory,wmoLabel} from '../weather.js';
import {temp,tempC,wind,pct,rain,cardinal,fmtHour,km,round} from '../format.js';
import {deltaT,inversionSeries,frostByDay} from '../agro/meteo.js';
import {getProfile} from '../agro/profiles.js';
import {evaluateRange,statusLabel} from '../agro/engine.js';
import {buildAlerts} from '../alerts.js';
import {sunArcSVG} from '../sun-arc.js';
import {reveal,countUpAll,drawPaths} from '../anim.js';
import {go} from '../router.js';
import {card,semaphore,icon,term,weatherIconSVG,windArrow,windDial,metricTile,iconBadge,miniGauge,emptyState} from './common.js';

export const label='Ahora';
export const navIcon='sun';

export function render(el){
  const loc=activeLocation();
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Elegí una ubicación para ver el pronóstico.')}</div>`;return;}
  const h=data.hourly,c=data.current,d=data.daily;
  const nowIdx=nowHourIndex(data);
  const cat=wmoCategory(c.weather_code);
  const prof=getProfile(state.activeProfileId);

  const scored=evaluateRange(data,prof,nowIdx,18);
  const nowScore=scored[0];
  const dT=deltaT(c.temperature_2m,c.relative_humidity_2m);
  const inv=inversionSeries(h)[nowIdx];
  const frost=frostByDay(data,state.alerts.frostThreshold);
  const di=d.time.findIndex(t=>t===c.time.slice(0,10));
  const tonight=frost[di+1]||frost[di];

  const alerts=buildAlerts(data);
  const alertsHTML=alerts.length?`<div class="alerts">${alerts.map(a=>`
    <div class="alert alert-${a.tone}" data-reveal>
      <span class="alert-ic">${icon(a.iconName,{size:17})}</span>
      <div class="alert-txt">
        <b>${a.title}</b>
        <span>${a.detail}</span>
        ${a.tip?`<span class="alert-tip">${icon('info',{size:11})} ${a.tip}</span>`:''}
      </div>
    </div>`).join('')}</div>`:'';

  // ── hero: sobre el cielo, sin tarjeta ──
  const hero=`
   <div class="hero" data-cat="${cat}" data-reveal>
    <div class="hero-body">
      <div class="hero-figure">${weatherIconSVG(c.weather_code,{size:136,isDay:!!c.is_day})}</div>
      <div class="hero-read">
        <div class="hero-temp"><span data-count="${tempC(c.temperature_2m)}" data-suffix="°">0°</span></div>
        <div class="hero-cond">${wmoLabel(c.weather_code)}</div>
        <div class="hero-minmax">
          <span class="hmm hmm-max">${icon('thermometer-up',{size:13})} <b>${temp(d.temperature_2m_max[di])}</b></span>
          <span class="hmm hmm-min">${icon('thermometer-down',{size:13})} <b>${temp(d.temperature_2m_min[di])}</b></span>
        </div>
        <div class="hero-sub">${term('apparent_temp','Sensación')} ${temp(c.apparent_temperature)}</div>
      </div>
    </div>
   </div>`;

  // ── estado agro (solo en modo agro) ──
  const invTxt=inv?.flag?'Sí':inv?.score>=0.5?'Posible':'No';
  const agro=agroOn()?card(`
    <button class="agro-lead" data-go="campo">
      ${iconBadge(prof.icon,'accent',32)}
      <div class="mtile-body">
        <span class="mtile-k">Aplicación con ${prof.name.toLowerCase()}</span>
        ${semaphore(nowScore?.state||'rojo',statusLabel(nowScore?.state||'rojo'))}
      </div>
      ${icon('chevron-right',{size:16})}
    </button>
    <div class="mtiles">
      ${metricTile({wide:true,iconName:'thermometer',tone:'sun',label:term('delta_t','Delta-T'),value:dT.toFixed(1),
        chip:dT>=2&&dT<=8?'en rango':dT<2?'muy baja':'muy alta',chipTone:dT>=2&&dT<=8?'ok':'warn',
        foot:miniGauge(dT,2,8,0,14,{tone:'sun'})})}
      ${metricTile({iconName:'layers',tone:(inv?.flag?'no':'water'),label:term('inversion','Inversión'),value:invTxt,
        chip:inv?.score!=null?`${Math.round(inv.score*100)}%`:''})}
      ${metricTile({iconName:'thermometer-down',tone:(tonight&&tonight.level==='fuerte'?'no':tonight&&tonight.level!=='sin'?'water':'neutral'),
        label:term('frost','Helada'),value:tonight&&tonight.level!=='sin'?temp(tonight.min):'Sin riesgo',
        chip:tonight&&tonight.level!=='sin'?fmtHour(tonight.minAt):''})}
    </div>`,{cls:'card-agro'}):'';

  // ── condiciones ──
  const uv=round(h.uv_index[nowIdx]??0);
  const trend=pressTrend(h,nowIdx);
  const visKm=(h.visibility[nowIdx]??0)/1000;
  const tiles=card(`<div class="mtiles">
    ${metricTile({wide:true,badgeHTML:windDial(c.wind_direction_10m,34),label:'Viento',
      value:`${wind(c.wind_speed_10m)} <span class="mtile-sub">${cardinal(c.wind_direction_10m)}</span>`,
      chip:`${icon('gust',{size:11})} ${wind(c.wind_gusts_10m,{unit:false})}`,
      chipTone:(c.wind_gusts_10m>=35||c.wind_gusts_10m>=c.wind_speed_10m+14)?'warn':''})}
    ${metricTile({iconName:'droplet',tone:'water',label:'Humedad',value:pct(c.relative_humidity_2m),
      chip:`${term('dew_point','rocío')} ${temp(h.dew_point_2m[nowIdx])}`})}
    ${metricTile({iconName:'uv',tone:'sun',termKey:'uv_index',label:'Índice UV',value:uv,
      chip:uvWord(uv),chipTone:uv>=6?'warn':uv>=3?'':'ok'})}
    ${metricTile({iconName:'gauge',tone:'neutral',termKey:'pressure',label:'Presión',value:round(c.pressure_msl),unit:'hPa',
      chip:trend.label,chipTone:trend.tone})}
    ${metricTile({iconName:'eye',tone:'neutral',termKey:'visibility',label:'Visibilidad',value:visKm.toFixed(visKm<10?1:0),unit:'km',
      chip:visKm<2?'bruma':visKm<6?'reducida':'buena',chipTone:visKm<2?'warn':''})}
    ${metricTile({iconName:'soil',tone:'accent',termKey:'soil_temp',label:'Suelo 6 cm',value:temp(h.soil_temperature_6cm?.[nowIdx]),
      chip:`hum. ${soilPct(h.soil_moisture_1_to_3cm?.[nowIdx])}`})}
  </div>`,{title:'Condiciones',cls:'card-tiles'});

  // ── arco de sol / luna ──
  const arcCard=card(sunArcSVG({
    sunrise:d.sunrise[di],sunset:d.sunset[di],
    nextSunrise:d.sunrise[di+1],prevSunset:di>0?d.sunset[di-1]:null,
    now:new Date(c.time),
  }),{title:'Sol y luna',cls:'card-sun'});

  // ── próximas horas ──
  const strip=card(`
    <div class="hstrip">
      ${[...Array(14)].map((_,k)=>{const i=nowIdx+k;if(i>=h.time.length)return'';
        const w=h.wind_speed_10m[i];
        return `<button class="hstrip-i${k===0?' now':''}" data-hour="${h.time[i]}">
          <span class="hstrip-t">${k===0?'Ahora':fmtHour(h.time[i])}</span>
          ${weatherIconSVG(h.weather_code[i],{size:32,isDay:!!h.is_day[i]})}
          <span class="hstrip-v" data-count="${tempC(h.temperature_2m[i])}" data-suffix="°">0°</span>
          <span class="hstrip-p${h.precipitation_probability[i]>=30?' on':''}">${icon('droplet',{size:9})}${h.precipitation_probability[i]>0?h.precipitation_probability[i]+'%':'—'}</span>
          <span class="hstrip-wind">${windArrow(h.wind_direction_10m[i],14)}<span class="hstrip-ws">${wind(w,{unit:false})}<small>${round(h.wind_gusts_10m[i])}</small></span></span>
        </button>`;}).join('')}
    </div>
    <button class="link-row" data-go="porhora">7 días hora a hora ${icon('chevron-right',{size:14})}</button>`,
    {title:'Próximas horas',cls:'card-strip'});

  el.innerHTML=`<div class="wrap wrap-ahora">
    ${alertsHTML}${hero}${agro}${tiles}${arcCard}${strip}
  </div>`;
}

export function mount(){
  reveal();
  countUpAll();
  const view=document.getElementById('view');
  view.querySelectorAll('.card-sun .sunarc').forEach(w=>drawPaths(w));
  view.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  view.querySelectorAll('.hstrip-i[data-hour]').forEach(b=>b.addEventListener('click',()=>{
    state.jumpHourISO=b.dataset.hour;
    go('porhora');
  }));
}

function uvWord(v){return v>=8?'muy alto':v>=6?'alto':v>=3?'moderado':'bajo';}
function soilPct(v){return v==null?'–':`${Math.round(v*100)}%`;}
function pressTrend(h,i){
  const a=h.pressure_msl?.[i], b=h.pressure_msl?.[i-3];
  if(a==null||b==null)return {label:'hPa',tone:''};
  const d=a-b;
  if(d>=1.2)return {label:'↑ subiendo',tone:'ok'};
  if(d<=-1.2)return {label:'↓ bajando',tone:'warn'};
  return {label:'→ estable',tone:''};
}
