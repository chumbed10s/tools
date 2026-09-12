// Piezas de UI compartidas entre secciones.
import {icon} from '../ui-icons.js';
import {weatherIconSVG} from '../icons.js';
import {wmoLabel} from '../weather.js';
import {wind as fmtWind,cardinal,round,temp,tempC,pct,rain} from '../format.js';
import {GLOSSARY,openGlossary} from '../glossary.js';

export {icon,weatherIconSVG,wmoLabel};

export function card(bodyHTML,{title,cls='',reveal=true}={}){
  const head=title?`<div class="card-h"><span>${title}</span></div>`:'';
  return `<section class="card ${cls}" ${reveal?'data-reveal':''}>${head}${bodyHTML}</section>`;
}

export function iconBadge(name,tone='neutral',size=30,{pct=null}={}){
  if(pct!=null){
    return `<span class="ibadge-ring ib-${tone}" style="--ib-sz:${size}px;--p:${Math.max(0,Math.min(100,pct))}">
      <span class="ibadge-ring-inner">${icon(name,{size:Math.round(size*0.5)})}</span>
    </span>`;
  }
  return `<span class="ibadge ib-${tone}" style="--ib-sz:${size}px">${icon(name,{size:Math.round(size*0.54)})}</span>`;
}

export function metricTile({iconName,badgeHTML,tone='neutral',label,value,unit='',chip='',chipTone='',foot='',wide=false,ringPct=null}){
  const badge=badgeHTML||iconBadge(iconName,tone,wide?34:30,{pct:ringPct});
  return `<div class="mtile${wide?' mtile-wide':''}" data-reveal>
    ${badge}
    <div class="mtile-body">
      <span class="mtile-k">${label}</span>
      <span class="mtile-v">${value}${unit?`<i class="mtile-u">${unit}</i>`:''}</span>
    </div>
    ${chip?`<span class="mtile-chip${chipTone?` mc-${chipTone}`:''}">${chip}</span>`:''}
    ${foot?`<div class="mtile-foot">${foot}</div>`:''}
  </div>`;
}

// Mini-medidor lineal: escala [min,max], banda de referencia [lo,hi] rotulada, pin en `val`.
export function miniGauge(val,lo,hi,min,max,{tone='accent',unit='',idealLabel='referencia'}={}){
  const span=(max-min)||1;
  const clamp=v=>Math.max(0,Math.min(100,v));
  const pos=clamp((val-min)/span*100);
  const l=clamp((lo-min)/span*100), r=clamp((hi-min)/span*100);
  const ok=val>=lo&&val<=hi;
  const near=pos>75;
  return `<span class="mgauge">
    <span class="mg-track">
      <span class="mg-ideal mg-${tone}" style="left:${l}%;width:${Math.max(3,r-l)}%"></span>
      <span class="mg-pin${ok?' ok':''}" style="left:${pos}%"></span>
      <span class="mg-pinlbl${near?' left':''}" style="left:${pos}%">${round(val)}${unit}</span>
    </span>
    <span class="mg-scale">
      <span>${round(min)}${unit}</span>
      <span class="mg-idlbl mg-${tone}">${idealLabel} ${round(lo)}–${round(hi)}${unit}</span>
      <span>${round(max)}${unit}</span>
    </span>
  </span>`;
}

// Fila liviana de "hoja de datos": ícono chico de color + label + valor + badge,
// separadas por un divisor — usada en el desplegable de hourRow. Tocar la fila
// muestra un mini-tooltip (toast) con la definición corta de `term` y un botón
// "Ver más" que abre el glosario detallado (con ejemplo y, para algunos, diagrama).
export function dataRow({iconName,color='#9d9da8',label,value,chip='',chipTone='',term='',time=''}){
  const g=term?GLOSSARY[term]:null;
  return `<div class="hsheet-row"${g?` data-term="${term}" data-icon="${iconName}" data-color="${color}" data-time="${escAttr(time)}" title="${escAttr(g.short)}"`:''}>
    ${icon(iconName,{size:12,cls:'hsheet-ic',color})}
    <span class="hsheet-k">${label}</span>
    <span class="hsheet-v">${value}</span>
    ${chip?`<span class="hsheet-chip${chipTone?` mc-${chipTone}`:''}">${chip}</span>`:''}
  </div>`;
}

export function dataGroup(title,rows){
  return `<div class="hsheet-group">
    <div class="hsheet-group-title">${title}</div>
    <div class="hsheet">${rows.join('')}</div>
  </div>`;
}

// Barra de progreso del día: noche (violeta) → día (amarillo, entre amanecer y
// atardecer) → noche, con un marcador de sol/luna en la hora actual.
export function dayProgressBar(sunriseISO,sunsetISO,nowISO){
  const toFrac=iso=>{const d=new Date(iso);return Math.max(0,Math.min(1,(d.getHours()*60+d.getMinutes())/1440));};
  const sr=toFrac(sunriseISO),ss=toFrac(sunsetISO),now=toFrac(nowISO);
  const isDay=now>=sr&&now<=ss;
  return `<div class="hsheet-full"><div class="dayarc">
    <div class="dayarc-track">
      <span class="dayarc-seg dayarc-night" style="width:${(sr*100).toFixed(2)}%"></span>
      <span class="dayarc-seg dayarc-day" style="width:${((ss-sr)*100).toFixed(2)}%"></span>
      <span class="dayarc-seg dayarc-night" style="width:${((1-ss)*100).toFixed(2)}%"></span>
      <span class="dayarc-now" style="left:${(now*100).toFixed(2)}%">${icon(isDay?'sun':'moon',{size:10})}</span>
    </div>
  </div></div>`;
}

function escAttr(s){return s.replace(/"/g,'&quot;');}

function fmtHM(mins){
  const h=Math.floor(mins/60),m=Math.round(mins%60);
  return h>0?`${h}h ${m}m`:`${m}m`;
}

// Estadísticas del día: horas de sol transcurridas/restantes y % del día (24h) transcurrido.
export function dayStats(sunriseISO,sunsetISO,nowISO){
  const toMin=iso=>{const d=new Date(iso);return d.getHours()*60+d.getMinutes();};
  const sr=toMin(sunriseISO),ss=toMin(sunsetISO),now=toMin(nowISO);
  const sunElapsed=Math.max(0,Math.min(now,ss)-sr);
  const sunRemaining=Math.max(0,ss-Math.max(now,sr));
  const dayPct=Math.round(now/1440*100);
  return {
    sunElapsed:fmtHM(Math.max(0,sunElapsed)),
    sunRemaining:fmtHM(Math.max(0,sunRemaining)),
    dayPct,
    dayRemainingPct:100-dayPct,
  };
}

// Clasificación cualitativa (bajo/medio/alto, etc.) para el badge de cada dato.
function lvl(v,breaks,labels,tones=[]){
  if(v==null||Number.isNaN(v))return{label:'',tone:''};
  let i=0;
  while(i<breaks.length&&v>=breaks[i])i++;
  return {label:labels[i]||'',tone:tones[i]||''};
}

export function sectionTitle(text,extraHTML=''){
  return `<div class="sec-title"><h2>${text}</h2>${extraHTML}</div>`;
}

export function emptyState(text){
  return `<div class="empty">${icon('circle-info',{size:28})}<p>${text}</p></div>`;
}

export function windArrow(deg,size=14){
  const to=(Math.round(deg)+180)%360;
  return `<svg class="wd-arrow" viewBox="0 0 24 24" width="${size}" height="${size}" style="transform:rotate(${to}deg)"><path fill="currentColor" d="M12 2.5 19 20l-7-4-7 4z"/></svg>`;
}
export function windDial(deg,size=22){
  return `<span class="wind-dial" style="--wd-sz:${size}px">${windArrow(deg,Math.round(size*0.62))}</span>`;
}
export function windChip(speedKmh,deg,gustKmh,{compact=false,dialSize=22}={}){
  const strong=gustKmh!=null && (gustKmh>=35 || gustKmh>=(speedKmh??0)+14);
  const gust=gustKmh!=null
    ? `<span class="wc-gust${strong?' hi':''}">${icon('wind',{size:11})}${fmtWind(gustKmh,{unit:false})}</span>` : '';
  return `<span class="windchip${compact?' wc-compact':''}">
    ${windDial(deg,dialSize)}
    <span class="wc-main"><b class="wc-spd">${fmtWind(speedKmh,{unit:!compact})}</b><span class="wc-dir">${cardinal(deg)}</span></span>
    ${gust}
  </span>`;
}

export function pressTrend(h,i){
  const a=h.pressure_msl?.[i], b=h.pressure_msl?.[i-3];
  if(a==null||b==null)return {label:'',tone:''};
  const d=a-b;
  if(d>=1.2)return {label:'↑ subiendo',tone:'ok'};
  if(d<=-1.2)return {label:'↓ bajando',tone:'warn'};
  return {label:'→ estable',tone:''};
}

// Fila de hora compartida (Ahora y Por hora): básicos a la vista, todo el resto
// en un desplegable con tarjetas iguales a las de "Ahora".
function windSpeedBadge(v){return lvl(v,[8,15,23,35],['Muy suave','Suave','Moderado','Fuerte','Muy fuerte'],['','','','warn','warn']);}
function soilMoistBadge(v){return lvl(v,[20,40],['Seco','Óptimo','Saturado'],['warn','ok','warn']);}
function radBadge(w){if(w==null)return{label:'',tone:''};if(w<=1)return{label:'Nula',tone:''};if(w<200)return{label:'Baja',tone:''};if(w<600)return{label:'Media',tone:''};return{label:'Alta',tone:''};}
function liBadge(v){if(v==null)return{label:'',tone:''};if(v<=-6)return{label:'Muy inestable',tone:'warn'};if(v<=-2)return{label:'Inestable',tone:'warn'};if(v<2)return{label:'Neutra',tone:''};return{label:'Estable',tone:'ok'};}
function cinBadge(v){if(v==null)return{label:'',tone:''};const a=Math.abs(v);if(a<50)return{label:'Débil',tone:''};if(a<200)return{label:'Moderada',tone:''};return{label:'Fuerte',tone:''};}
function blhBadge(v){if(v==null)return{label:'',tone:''};if(v<300)return{label:'Baja',tone:'warn'};if(v<1000)return{label:'Media',tone:''};return{label:'Alta',tone:'ok'};}
function sunBadge(mins){if(mins<=0)return{label:'Sin sol',tone:''};if(mins>=55)return{label:'Pleno',tone:'ok'};return{label:'Parcial',tone:''};}

// Hoja de datos completa para una hora (todos los grupos: Aire, Viento,
// Precipitación, Atmósfera, Cielo y radiación, Suelo) — usada tanto en el
// desplegable de cada hourRow como en la tarjeta "Condiciones" de Ahora, para
// que ambas vistas muestren exactamente los mismos datos con el mismo glosario.
export function dataSheet(h,i,{dTSeries,invSeries,frost}={}){
  const gustHi=h.wind_gusts_10m[i]>=(h.wind_speed_10m[i]??0)+14;
  const visKm=(h.visibility?.[i]??0)/1000;
  const humPct=h.relative_humidity_2m[i];
  const invP=Math.round((invSeries?.[i]?.score||0)*100);
  const cloudP=round(h.cloud_cover[i]??0);
  const soilMP=h.soil_moisture_1_to_3cm?.[i]!=null?Math.round(h.soil_moisture_1_to_3cm[i]*100):null;
  const soilMP2=h.soil_moisture_3_to_9cm?.[i]!=null?Math.round(h.soil_moisture_3_to_9cm[i]*100):null;
  const soilMP3=h.soil_moisture_9_to_27cm?.[i]!=null?Math.round(h.soil_moisture_9_to_27cm[i]*100):null;
  const pt=pressTrend(h,i);
  const dT=dTSeries[i];
  const dTBadge=dT<2?{label:'Bajo',tone:'warn'}:dT>8?{label:'Alto',tone:'warn'}:{label:'Ideal',tone:'ok'};
  const humB=lvl(humPct,[30,70],['Seca','Normal','Húmeda'],['warn','','']);
  const dewB=lvl(h.dew_point_2m[i],[10,18],['Seco','Confortable','Bochornoso'],['','','warn']);
  const vpd=h.vapour_pressure_deficit?.[i];
  const vpdB=lvl(vpd,[0.4,1.2],['Bajo','Moderado','Alto'],['','','warn']);
  const windB=windSpeedBadge(h.wind_speed_10m[i]);
  const gustB=gustHi?{label:'Fuerte',tone:'warn'}:{label:'Normal',tone:''};
  const rainProbB=lvl(h.precipitation_probability[i],[20,60],['Baja','Media','Alta'],['','','warn']);
  const mm=h.precipitation[i]??0;
  const rainMmB=mm<=0?{label:'Sin lluvia',tone:''}:mm<1?{label:'Llovizna',tone:''}:mm<5?{label:'Moderada',tone:''}:{label:'Intensa',tone:'warn'};
  const invB=lvl(invP,[30,60],['Baja','Media','Alta'],['','','warn']);
  const stormLabel=h.cape?.[i]!=null?stormRisk(h.cape[i]):'';
  const stormTone=stormLabel==='Alta'?'warn':stormLabel==='Moderada'?'warn':'';
  const uvB=lvl(h.uv_index[i]??0,[3,6,8],['Bajo','Moderado','Alto','Muy alto'],['','','warn','warn']);
  const cloudB=lvl(cloudP,[20,70],['Despejado','Parcial','Cubierto'],['','','']);
  const visB=lvl(visKm,[2,8],['Mala','Regular','Buena'],['warn','','ok']);
  const soilT=h.soil_temperature_6cm?.[i];
  const soilTB=soilT!=null&&soilT<0?{label:'Riesgo helada',tone:'warn'}:{label:'',tone:''};
  const soilT18=h.soil_temperature_18cm?.[i];
  const soilT54=h.soil_temperature_54cm?.[i];
  const soilMP4=h.soil_moisture_27_to_81cm?.[i]!=null?Math.round(h.soil_moisture_27_to_81cm[i]*100):null;
  const li=h.lifted_index?.[i];
  const cin=h.convective_inhibition?.[i];
  const blh=h.boundary_layer_height?.[i];
  const sunMin=h.sunshine_duration?.[i]!=null?Math.round(h.sunshine_duration[i]/60):null;
  const timeLabel=fmtRowTime(h.time[i]);
  const dr=o=>dataRow({...o,time:timeLabel});
  return `${dataGroup('Aire',[
      dr({iconName:'droplet',color:'#3b82f6',label:'Humedad',value:pct(humPct),chip:humB.label,chipTone:humB.tone,term:'humedad'}),
      dr({iconName:'droplet',color:'#6366f1',label:'Punto de rocío',value:temp(h.dew_point_2m[i]),chip:dewB.label,chipTone:dewB.tone,term:'puntoRocio'}),
      dr({iconName:'temperature-half',color:'#f59e0b',label:'Delta-T',value:dT.toFixed(1),chip:dTBadge.label,chipTone:dTBadge.tone,term:'deltaT'}),
      vpd!=null?dr({iconName:'droplet',color:'#22c55e',label:'Déficit vapor',value:`${vpd.toFixed(2)} kPa`,chip:vpdB.label,chipTone:vpdB.tone,term:'deficitVapor'}):'',
    ].filter(Boolean))}
    ${dataGroup('Viento',[
      dr({iconName:'wind',color:'#0d9488',label:'Viento (10 m)',value:`${fmtWind(h.wind_speed_10m[i])} ${cardinal(h.wind_direction_10m[i])}`,chip:windB.label,chipTone:windB.tone,term:'viento'}),
      dr({iconName:'wind',color:'#f97316',label:'Ráfagas',value:fmtWind(h.wind_gusts_10m[i]),chip:gustB.label,chipTone:gustB.tone,term:'rafagas'}),
      h.wind_speed_80m?.[i]!=null?dr({iconName:'wind',color:'#0d9488',label:'Viento (80 m)',value:`${fmtWind(h.wind_speed_80m[i])} ${cardinal(h.wind_direction_80m?.[i]??0)}`,chip:windSpeedBadge(h.wind_speed_80m[i]).label,chipTone:windSpeedBadge(h.wind_speed_80m[i]).tone,term:'viento'}):'',
      h.temperature_80m?.[i]!=null?dr({iconName:'temperature-half',color:'#0d9488',label:'Temp. (80 m)',value:temp(h.temperature_80m[i]),term:'viento'}):'',
      h.wind_speed_120m?.[i]!=null?dr({iconName:'wind',color:'#0d9488',label:'Viento (120 m)',value:`${fmtWind(h.wind_speed_120m[i])} ${cardinal(h.wind_direction_120m?.[i]??0)}`,chip:windSpeedBadge(h.wind_speed_120m[i]).label,chipTone:windSpeedBadge(h.wind_speed_120m[i]).tone,term:'viento'}):'',
      h.temperature_120m?.[i]!=null?dr({iconName:'temperature-half',color:'#0d9488',label:'Temp. (120 m)',value:temp(h.temperature_120m[i]),term:'viento'}):'',
      h.wind_speed_180m?.[i]!=null?dr({iconName:'wind',color:'#0d9488',label:'Viento (180 m)',value:`${fmtWind(h.wind_speed_180m[i])} ${cardinal(h.wind_direction_180m?.[i]??0)}`,chip:windSpeedBadge(h.wind_speed_180m[i]).label,chipTone:windSpeedBadge(h.wind_speed_180m[i]).tone,term:'viento'}):'',
      h.temperature_180m?.[i]!=null?dr({iconName:'temperature-half',color:'#0d9488',label:'Temp. (180 m)',value:temp(h.temperature_180m[i]),term:'viento'}):'',
    ].filter(Boolean))}
    ${dataGroup('Precipitación',[
      dr({iconName:'cloud-rain',color:'#6366f1',label:'Prob. lluvia',value:pct(h.precipitation_probability[i]),chip:rainProbB.label,chipTone:rainProbB.tone,term:'probLluvia'}),
      dr({iconName:'cloud-rain',color:'#818cf8',label:'Precipitación',value:rain(mm),chip:rainMmB.label,chipTone:rainMmB.tone,term:'precipitacion'}),
    ])}
    ${dataGroup('Atmósfera',[
      dr({iconName:'gauge',color:'#8b5cf6',label:'Presión',value:`${round(h.pressure_msl[i])} hPa`,chip:pt.label,chipTone:pt.tone,term:'presion'}),
      dr({iconName:'layer-group',color:'#0ea5e9',label:'Inversión',value:`${invP}%`,chip:invB.label,chipTone:invB.tone,term:'inversion'}),
      frost?dr({iconName:'snowflake',color:'#0ea5e9',label:'Riesgo de helada',
        value:frost.level!=='sin'?temp(frost.min):'Sin riesgo',
        chip:frost.level==='fuerte'?'Fuerte':frost.level==='riesgo'?'Riesgo':'',
        chipTone:frost.level==='fuerte'||frost.level==='riesgo'?'warn':'',term:'helada'}):'',
      stormLabel?dr({iconName:'bolt',color:'#ef4444',label:'Pot. tormenta',value:stormLabel,chip:stormTone?'⚡':'',chipTone:stormTone,term:'potTormenta'}):'',
      li!=null?dr({iconName:'chart-line',color:'#ef4444',label:'Índice levantam.',value:li.toFixed(1),chip:liBadge(li).label,chipTone:liBadge(li).tone,term:'liftedIndex'}):'',
      cin!=null?dr({iconName:'shield-halved',color:'#f97316',label:'Inhib. convectiva',value:`${round(cin)} J/kg`,chip:cinBadge(cin).label,chipTone:cinBadge(cin).tone,term:'cin'}):'',
      blh!=null?dr({iconName:'layer-group',color:'#8b5cf6',label:'Capa límite',value:`${round(blh)} m`,chip:blhBadge(blh).label,chipTone:blhBadge(blh).tone,term:'capaLimite'}):'',
    ].filter(Boolean))}
    ${dataGroup('Cielo y radiación',[
      dr({iconName:'sun',color:'#fb923c',label:'UV',value:round(h.uv_index[i]??0),chip:uvB.label,chipTone:uvB.tone,term:'uv'}),
      dr({iconName:'cloud',color:'#38bdf8',label:'Nubosidad',value:`${cloudP}%`,chip:cloudB.label,chipTone:cloudB.tone,term:'nubosidad'}),
      dr({iconName:'eye',color:'#10b981',label:'Visibilidad',value:`${visKm.toFixed(visKm<10?1:0)} km`,chip:visB.label,chipTone:visB.tone,term:'visibilidad'}),
      h.direct_radiation?.[i]!=null?dr({iconName:'sun',color:'#facc15',label:'Radiación directa',value:`${round(h.direct_radiation[i])} W/m²`,chip:radBadge(h.direct_radiation[i]).label,chipTone:radBadge(h.direct_radiation[i]).tone,term:'radDirecta'}):'',
      h.diffuse_radiation?.[i]!=null?dr({iconName:'cloud',color:'#facc15',label:'Radiación difusa',value:`${round(h.diffuse_radiation[i])} W/m²`,chip:radBadge(h.diffuse_radiation[i]).label,chipTone:radBadge(h.diffuse_radiation[i]).tone,term:'radDifusa'}):'',
      sunMin!=null?dr({iconName:'sun',color:'#facc15',label:'Duración de sol',value:`${sunMin} min`,chip:sunBadge(sunMin).label,chipTone:sunBadge(sunMin).tone,term:'sunshine'}):'',
    ].filter(Boolean))}
    ${dataGroup('Suelo',[
      dr({iconName:'temperature-half',color:'#b45309',label:'Suelo (6 cm)',value:temp(soilT),chip:soilTB.label,chipTone:soilTB.tone,term:'sueloTemp'}),
      soilT18!=null?dr({iconName:'temperature-half',color:'#b45309',label:'Suelo (18 cm)',value:temp(soilT18),term:'sueloTemp'}):'',
      soilT54!=null?dr({iconName:'temperature-half',color:'#b45309',label:'Suelo (54 cm)',value:temp(soilT54),term:'sueloTemp'}):'',
      soilMP!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (0–3 cm)',value:`${soilMP}%`,chip:soilMoistBadge(soilMP).label,chipTone:soilMoistBadge(soilMP).tone,term:'sueloHumedad'}):'',
      soilMP2!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (3–9 cm)',value:`${soilMP2}%`,chip:soilMoistBadge(soilMP2).label,chipTone:soilMoistBadge(soilMP2).tone,term:'sueloHumedad'}):'',
      soilMP3!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (9–27 cm)',value:`${soilMP3}%`,chip:soilMoistBadge(soilMP3).label,chipTone:soilMoistBadge(soilMP3).tone,term:'sueloHumedad'}):'',
      soilMP4!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (27–81 cm)',value:`${soilMP4}%`,chip:soilMoistBadge(soilMP4).label,chipTone:soilMoistBadge(soilMP4).tone,term:'sueloHumedad'}):'',
    ].filter(Boolean))}`;
}

function fmtRowTime(iso){
  const dt=new Date(iso);
  const hh=String(dt.getHours()).padStart(2,'0');
  return`${hh}:00`;
}

function avgOf(arr,ds,de,filterFn){
  if(!arr)return null;
  let s=0,n=0;
  for(let i=ds;i<de;i++){
    const v=arr[i];
    if(v==null)continue;
    if(filterFn&&!filterFn(i))continue;
    s+=v;n++;
  }
  return n?s/n:null;
}
function maxOf(arr,ds,de){
  if(!arr)return null;
  let m=-Infinity,any=false;
  for(let i=ds;i<de;i++){const v=arr[i];if(v!=null){any=true;if(v>m)m=v;}}
  return any?m:null;
}
function minOf(arr,ds,de){
  if(!arr)return null;
  let m=Infinity,any=false;
  for(let i=ds;i<de;i++){const v=arr[i];if(v!=null){any=true;if(v<m)m=v;}}
  return any?m:null;
}
function sumOf(arr,ds,de){
  if(!arr)return 0;
  let s=0;for(let i=ds;i<de;i++)s+=arr[i]||0;
  return s;
}
function vectorAvgDir(speedArr,dirArr,ds,de){
  let x=0,y=0;
  for(let i=ds;i<de;i++){
    const s=speedArr?.[i]||0,d=dirArr?.[i];
    if(d==null)continue;
    const rad=d*Math.PI/180;
    x+=Math.cos(rad)*s;y+=Math.sin(rad)*s;
  }
  if(x===0&&y===0)return 0;
  return(Math.atan2(y,x)*180/Math.PI+360)%360;
}

// Versión "resumen del día" de dataSheet: en vez de leer un índice puntual,
// agrega cada dato entre [ds,de) — promedio para lo continuo (humedad, viento),
// máximo para lo que importa como pico (UV, ráfagas, prob. lluvia), suma para
// lo acumulable (lluvia, sol) — mismos grupos, badges y glosario que la hora a hora.
export function dataSheetDay(h,ds,de,{dTSeries,invSeries,frost}={}){
  const isDay=i=>!!h.is_day[i];
  const humPct=avgOf(h.relative_humidity_2m,ds,de);
  const dew=avgOf(h.dew_point_2m,ds,de);
  let dTs=0,dTn=0;for(let i=ds;i<de;i++){if(dTSeries[i]!=null){dTs+=dTSeries[i];dTn++;}}
  const dT=dTn?dTs/dTn:0;
  const dTBadge=dT<2?{label:'Bajo',tone:'warn'}:dT>8?{label:'Alto',tone:'warn'}:{label:'Ideal',tone:'ok'};
  const humB=lvl(humPct,[30,70],['Seca','Normal','Húmeda'],['warn','','']);
  const dewB=lvl(dew,[10,18],['Seco','Confortable','Bochornoso'],['','','warn']);
  const vpd=avgOf(h.vapour_pressure_deficit,ds,de);
  const vpdB=lvl(vpd,[0.4,1.2],['Bajo','Moderado','Alto'],['','','warn']);

  const windSpd=avgOf(h.wind_speed_10m,ds,de);
  const windDir=vectorAvgDir(h.wind_speed_10m,h.wind_direction_10m,ds,de);
  const windB=windSpeedBadge(windSpd);
  const gustMax=maxOf(h.wind_gusts_10m,ds,de);
  const gustB=(gustMax!=null&&windSpd!=null&&gustMax>=windSpd+14)?{label:'Fuerte',tone:'warn'}:{label:'Normal',tone:''};
  const w80=avgOf(h.wind_speed_80m,ds,de),d80=vectorAvgDir(h.wind_speed_80m,h.wind_direction_80m,ds,de);
  const w120=avgOf(h.wind_speed_120m,ds,de),d120=vectorAvgDir(h.wind_speed_120m,h.wind_direction_120m,ds,de);
  const w180=avgOf(h.wind_speed_180m,ds,de),d180=vectorAvgDir(h.wind_speed_180m,h.wind_direction_180m,ds,de);
  const t80=avgOf(h.temperature_80m,ds,de),t120=avgOf(h.temperature_120m,ds,de),t180=avgOf(h.temperature_180m,ds,de);

  const rainProbMax=maxOf(h.precipitation_probability,ds,de)??0;
  const rainProbB=lvl(rainProbMax,[20,60],['Baja','Media','Alta'],['','','warn']);
  const mm=sumOf(h.precipitation,ds,de);
  const rainMmB=mm<=0?{label:'Sin lluvia',tone:''}:mm<1?{label:'Llovizna',tone:''}:mm<5?{label:'Moderada',tone:''}:{label:'Intensa',tone:'warn'};

  const pressAvg=avgOf(h.pressure_msl,ds,de);
  const invMax=Math.round((maxOf((invSeries||[]).map(s=>s?.score||0),ds,de)||0)*100);
  const invB=lvl(invMax,[30,60],['Baja','Media','Alta'],['','','warn']);
  const capeMax=maxOf(h.cape,ds,de);
  const stormLabel=capeMax!=null?stormRisk(capeMax):'';
  const stormTone=stormLabel==='Alta'||stormLabel==='Moderada'?'warn':'';
  const li=minOf(h.lifted_index,ds,de);
  const cin=avgOf(h.convective_inhibition,ds,de);
  const blh=avgOf(h.boundary_layer_height,ds,de);

  const uvMax=maxOf(h.uv_index,ds,de)??0;
  const uvB=lvl(uvMax,[3,6,8],['Bajo','Moderado','Alto','Muy alto'],['','','warn','warn']);
  const cloudAvg=Math.round(avgOf(h.cloud_cover,ds,de)??0);
  const cloudB=lvl(cloudAvg,[20,70],['Despejado','Parcial','Cubierto'],['','','']);
  const visMinKm=(minOf(h.visibility,ds,de)??0)/1000;
  const visB=lvl(visMinKm,[2,8],['Mala','Regular','Buena'],['warn','','ok']);
  const directAvg=avgOf(h.direct_radiation,ds,de,isDay);
  const diffuseAvg=avgOf(h.diffuse_radiation,ds,de,isDay);
  const sunTotalMin=Math.round(sumOf(h.sunshine_duration,ds,de)/60);

  const soilT=avgOf(h.soil_temperature_6cm,ds,de);
  const soilTB=soilT!=null&&soilT<0?{label:'Riesgo helada',tone:'warn'}:{label:'',tone:''};
  const soilT18=avgOf(h.soil_temperature_18cm,ds,de);
  const soilT54=avgOf(h.soil_temperature_54cm,ds,de);
  const soilMP=avgOf(h.soil_moisture_1_to_3cm,ds,de)!=null?Math.round(avgOf(h.soil_moisture_1_to_3cm,ds,de)*100):null;
  const soilMP2=avgOf(h.soil_moisture_3_to_9cm,ds,de)!=null?Math.round(avgOf(h.soil_moisture_3_to_9cm,ds,de)*100):null;
  const soilMP3=avgOf(h.soil_moisture_9_to_27cm,ds,de)!=null?Math.round(avgOf(h.soil_moisture_9_to_27cm,ds,de)*100):null;
  const soilMP4=avgOf(h.soil_moisture_27_to_81cm,ds,de)!=null?Math.round(avgOf(h.soil_moisture_27_to_81cm,ds,de)*100):null;

  const T='Hoy en promedio';
  const dr=o=>dataRow({...o,time:T});
  return `${dataGroup('Aire',[
      dr({iconName:'droplet',color:'#3b82f6',label:'Humedad',value:pct(humPct),chip:humB.label,chipTone:humB.tone,term:'humedad'}),
      dr({iconName:'droplet',color:'#6366f1',label:'Punto de rocío',value:temp(dew),chip:dewB.label,chipTone:dewB.tone,term:'puntoRocio'}),
      dr({iconName:'temperature-half',color:'#f59e0b',label:'Delta-T',value:dT.toFixed(1),chip:dTBadge.label,chipTone:dTBadge.tone,term:'deltaT'}),
      vpd!=null?dr({iconName:'droplet',color:'#22c55e',label:'Déficit vapor',value:`${vpd.toFixed(2)} kPa`,chip:vpdB.label,chipTone:vpdB.tone,term:'deficitVapor'}):'',
    ].filter(Boolean))}
    ${dataGroup('Viento',[
      dr({iconName:'wind',color:'#0d9488',label:'Viento (10 m)',value:`${fmtWind(windSpd??0)} ${cardinal(windDir)}`,chip:windB.label,chipTone:windB.tone,term:'viento'}),
      dr({iconName:'wind',color:'#f97316',label:'Ráfagas máx.',value:fmtWind(gustMax??0),chip:gustB.label,chipTone:gustB.tone,term:'rafagas'}),
      w80!=null?dr({iconName:'wind',color:'#0d9488',label:'Viento (80 m)',value:`${fmtWind(w80)} ${cardinal(d80)}`,chip:windSpeedBadge(w80).label,chipTone:windSpeedBadge(w80).tone,term:'viento'}):'',
      t80!=null?dr({iconName:'temperature-half',color:'#0d9488',label:'Temp. (80 m)',value:temp(t80),term:'viento'}):'',
      w120!=null?dr({iconName:'wind',color:'#0d9488',label:'Viento (120 m)',value:`${fmtWind(w120)} ${cardinal(d120)}`,chip:windSpeedBadge(w120).label,chipTone:windSpeedBadge(w120).tone,term:'viento'}):'',
      t120!=null?dr({iconName:'temperature-half',color:'#0d9488',label:'Temp. (120 m)',value:temp(t120),term:'viento'}):'',
      w180!=null?dr({iconName:'wind',color:'#0d9488',label:'Viento (180 m)',value:`${fmtWind(w180)} ${cardinal(d180)}`,chip:windSpeedBadge(w180).label,chipTone:windSpeedBadge(w180).tone,term:'viento'}):'',
      t180!=null?dr({iconName:'temperature-half',color:'#0d9488',label:'Temp. (180 m)',value:temp(t180),term:'viento'}):'',
    ].filter(Boolean))}
    ${dataGroup('Precipitación',[
      dr({iconName:'cloud-rain',color:'#6366f1',label:'Prob. lluvia máx.',value:pct(rainProbMax),chip:rainProbB.label,chipTone:rainProbB.tone,term:'probLluvia'}),
      dr({iconName:'cloud-rain',color:'#818cf8',label:'Precipitación total',value:rain(mm),chip:rainMmB.label,chipTone:rainMmB.tone,term:'precipitacion'}),
    ])}
    ${dataGroup('Atmósfera',[
      pressAvg!=null?dr({iconName:'gauge',color:'#8b5cf6',label:'Presión',value:`${round(pressAvg)} hPa`,term:'presion'}):'',
      dr({iconName:'layer-group',color:'#0ea5e9',label:'Inversión (pico)',value:`${invMax}%`,chip:invB.label,chipTone:invB.tone,term:'inversion'}),
      frost?dr({iconName:'snowflake',color:'#0ea5e9',label:'Riesgo de helada',
        value:frost.level!=='sin'?temp(frost.min):'Sin riesgo',
        chip:frost.level==='fuerte'?'Fuerte':frost.level==='riesgo'?'Riesgo':'',
        chipTone:frost.level==='fuerte'||frost.level==='riesgo'?'warn':'',term:'helada'}):'',
      stormLabel?dr({iconName:'bolt',color:'#ef4444',label:'Pot. tormenta (pico)',value:stormLabel,chip:stormTone?'⚡':'',chipTone:stormTone,term:'potTormenta'}):'',
      li!=null?dr({iconName:'chart-line',color:'#ef4444',label:'Índice levantam.',value:li.toFixed(1),chip:liBadge(li).label,chipTone:liBadge(li).tone,term:'liftedIndex'}):'',
      cin!=null?dr({iconName:'shield-halved',color:'#f97316',label:'Inhib. convectiva',value:`${round(cin)} J/kg`,chip:cinBadge(cin).label,chipTone:cinBadge(cin).tone,term:'cin'}):'',
      blh!=null?dr({iconName:'layer-group',color:'#8b5cf6',label:'Capa límite',value:`${round(blh)} m`,chip:blhBadge(blh).label,chipTone:blhBadge(blh).tone,term:'capaLimite'}):'',
    ].filter(Boolean))}
    ${dataGroup('Cielo y radiación',[
      dr({iconName:'sun',color:'#fb923c',label:'UV máx.',value:round(uvMax),chip:uvB.label,chipTone:uvB.tone,term:'uv'}),
      dr({iconName:'cloud',color:'#38bdf8',label:'Nubosidad',value:`${cloudAvg}%`,chip:cloudB.label,chipTone:cloudB.tone,term:'nubosidad'}),
      dr({iconName:'eye',color:'#10b981',label:'Visibilidad mín.',value:`${visMinKm.toFixed(visMinKm<10?1:0)} km`,chip:visB.label,chipTone:visB.tone,term:'visibilidad'}),
      directAvg!=null?dr({iconName:'sun',color:'#facc15',label:'Radiación directa',value:`${round(directAvg)} W/m²`,chip:radBadge(directAvg).label,chipTone:radBadge(directAvg).tone,term:'radDirecta'}):'',
      diffuseAvg!=null?dr({iconName:'cloud',color:'#facc15',label:'Radiación difusa',value:`${round(diffuseAvg)} W/m²`,chip:radBadge(diffuseAvg).label,chipTone:radBadge(diffuseAvg).tone,term:'radDifusa'}):'',
      dr({iconName:'sun',color:'#facc15',label:'Duración de sol',value:`${Math.floor(sunTotalMin/60)}h ${sunTotalMin%60}m`,term:'sunshine'}),
    ].filter(Boolean))}
    ${dataGroup('Suelo',[
      soilT!=null?dr({iconName:'temperature-half',color:'#b45309',label:'Suelo (6 cm)',value:temp(soilT),chip:soilTB.label,chipTone:soilTB.tone,term:'sueloTemp'}):'',
      soilT18!=null?dr({iconName:'temperature-half',color:'#b45309',label:'Suelo (18 cm)',value:temp(soilT18),term:'sueloTemp'}):'',
      soilT54!=null?dr({iconName:'temperature-half',color:'#b45309',label:'Suelo (54 cm)',value:temp(soilT54),term:'sueloTemp'}):'',
      soilMP!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (0–3 cm)',value:`${soilMP}%`,chip:soilMoistBadge(soilMP).label,chipTone:soilMoistBadge(soilMP).tone,term:'sueloHumedad'}):'',
      soilMP2!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (3–9 cm)',value:`${soilMP2}%`,chip:soilMoistBadge(soilMP2).label,chipTone:soilMoistBadge(soilMP2).tone,term:'sueloHumedad'}):'',
      soilMP3!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (9–27 cm)',value:`${soilMP3}%`,chip:soilMoistBadge(soilMP3).label,chipTone:soilMoistBadge(soilMP3).tone,term:'sueloHumedad'}):'',
      soilMP4!=null?dr({iconName:'droplet',color:'#14b8a6',label:'Humedad suelo (27–81 cm)',value:`${soilMP4}%`,chip:soilMoistBadge(soilMP4).label,chipTone:soilMoistBadge(soilMP4).tone,term:'sueloHumedad'}):'',
    ].filter(Boolean))}`;
}

export function hourRow(h,i,{isNow=false,label=null,dTSeries,invSeries,frost}={}){
  const rainHi=h.precipitation_probability[i]>=50;
  const gustHi=h.wind_gusts_10m[i]>=(h.wind_speed_10m[i]??0)+14;
  return `<div class="hr2-row${isNow?' now':''}">
    <button class="hr2-main" data-toggle data-hr="${i}">
      <span class="hr2-hour">${label!=null?label:(isNow?'Ahora':fmtHourShort(h.time[i]))}</span>
      ${weatherIconSVG(h.weather_code[i],{size:32,isDay:!!h.is_day[i]})}
      <span class="hr2-temp" data-count="${tempC(h.temperature_2m[i])}" data-suffix="°">0°</span>
      <span class="hr2-mid-txt">
        <span class="hr2-cond">${wmoLabel(h.weather_code[i])}</span>
        <span class="hr2-feel">Sensación ${temp(h.apparent_temperature[i])}</span>
      </span>
      <span class="hr2-right">
        ${h.precipitation_probability[i]>0?`<span class="rpill">
          <span class="rpill-badge" style="--p:${h.precipitation_probability[i]}">
            <span class="rpill-badge-inner">${icon('cloud-rain',{size:12})}</span>
          </span>
          <span class="rpill-mid">
            <span class="rpill-prob${rainHi?' hi':''}">${pct(h.precipitation_probability[i])}</span>
            <span class="rpill-mm">${rain(h.precipitation[i]??0)}</span>
          </span>
        </span>`:''}
        <span class="wpill">
          <span class="wpill-badge">${windDial(h.wind_direction_10m[i],22)}</span>
          <span class="wpill-mid">
            <span class="wpill-speed">${fmtWind(h.wind_speed_10m[i])}</span>
            <span class="wpill-gust${gustHi?' hi':''}">ráf ${fmtWind(h.wind_gusts_10m[i])}</span>
          </span>
          <span class="wpill-dir">${cardinal(h.wind_direction_10m[i])}</span>
        </span>
      </span>
      ${icon('chevron-down',{size:12,cls:'hr2-chev'})}
    </button>
    <div class="hr2-detail"><div class="hr2-detail-inner">
      ${dataSheet(h,i,{dTSeries,invSeries,frost})}
    </div></div>
  </div>`;
}

export function wireHourRows(container){
  container.querySelectorAll('.hr2-main').forEach(btn=>btn.addEventListener('click',()=>{
    const row=btn.closest('.hr2-row'), detail=row.querySelector('.hr2-detail');
    const open=row.classList.toggle('open');
    detail.style.height=open?detail.firstElementChild.scrollHeight+'px':'0px';
  }));
  container.querySelectorAll('.hsheet-row[data-term]').forEach(row=>{
    if(row._wired)return;
    row._wired=true;
    row.addEventListener('click',()=>{
      const term=row.dataset.term;
      const g=GLOSSARY[term];
      if(!g)return;
      const value=row.querySelector('.hsheet-v')?.textContent||'';
      const chipEl=row.querySelector('.hsheet-chip');
      const chipLabel=chipEl?.textContent||'';
      const chipTone=chipEl?.className.match(/mc-(\w+)/)?.[1]||'';
      const ctx={value,chipLabel,chipTone,iconName:row.dataset.icon,color:row.dataset.color,time:row.dataset.time};
      openGlossary(term,ctx);
    });
  });
}

function fmtHourShort(iso){return new Date(iso).getHours()+'h';}

export function stormRisk(cape){
  if(cape>=2500)return'Alta';
  if(cape>=1000)return'Moderada';
  if(cape>=300)return'Baja';
  return'Mínima';
}
