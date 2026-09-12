// Resumen del día en lenguaje humano: unas pocas frases armadas a partir del
// pronóstico horario (ventana de lluvia, extremos de temperatura, viento
// fuerte, helada, tormenta, nubosidad, sol/UV) — se muestra en un popup desde
// el hero de "Hoy".
import {icon} from './ui-icons.js';
import {fmtHour,wind as fmtWind} from './format.js';
import {stormRisk} from './sections/common.js';

function windSpeedLevel(v){
  if(v>=35)return'Muy fuerte';
  if(v>=23)return'Fuerte';
  return'';
}

// Encuentra el primer y último índice (dentro de [ds,de)) donde `test(i)` es true.
function findBlock(ds,de,test){
  let first=-1,last=-1;
  for(let i=ds;i<de;i++){
    if(test(i)){if(first<0)first=i;last=i;}
  }
  return first<0?null:{first,last};
}

export function buildDaySummary(h,ds,de,{tonight}={}){
  const items=[];

  // Ventana de lluvia
  const rainBlock=findBlock(ds,de,i=>(h.precipitation_probability[i]??0)>=50||(h.precipitation[i]??0)>0.2);
  if(rainBlock){
    let maxProb=0;for(let i=rainBlock.first;i<=rainBlock.last;i++)maxProb=Math.max(maxProb,h.precipitation_probability[i]||0);
    items.push({icon:'cloud-rain',color:'#6366f1',
      text:`Va a llover entre las ${fmtHour(h.time[rainBlock.first])} y las ${fmtHour(h.time[rainBlock.last])} (probabilidad hasta ${Math.round(maxProb)}%).`});
  }else{
    items.push({icon:'cloud-rain',color:'#6366f1',text:'No se espera lluvia durante el día.'});
  }

  // Extremos de temperatura
  let maxI=ds,minI=ds;
  for(let i=ds;i<de;i++){
    if(h.temperature_2m[i]>h.temperature_2m[maxI])maxI=i;
    if(h.temperature_2m[i]<h.temperature_2m[minI])minI=i;
  }
  items.push({icon:'temperature-half',color:'#f59e0b',
    text:`La máxima va a ser a las ${fmtHour(h.time[maxI])} (${Math.round(h.temperature_2m[maxI])}°) y la mínima a las ${fmtHour(h.time[minI])} (${Math.round(h.temperature_2m[minI])}°).`});

  // Viento fuerte / ráfagas
  const windBlock=findBlock(ds,de,i=>windSpeedLevel(h.wind_speed_10m[i])!=='');
  if(windBlock){
    let maxGust=0;for(let i=windBlock.first;i<=windBlock.last;i++)maxGust=Math.max(maxGust,h.wind_gusts_10m[i]||0);
    items.push({icon:'wind',color:'#0d9488',
      text:`Viento fuerte entre las ${fmtHour(h.time[windBlock.first])} y las ${fmtHour(h.time[windBlock.last])}, con ráfagas de hasta ${fmtWind(maxGust)}.`});
  }else{
    items.push({icon:'wind',color:'#0d9488',text:'Viento tranquilo durante todo el día.'});
  }

  // Riesgo de helada
  if(tonight&&tonight.level!=='sin'){
    const lvl=tonight.level==='fuerte'?'fuerte':'moderado';
    items.push({icon:'snowflake',color:'#0ea5e9',
      text:`Riesgo de helada ${lvl} esta noche/madrugada, con una mínima estimada de ${Math.round(tonight.min)}°.`});
  }else{
    items.push({icon:'snowflake',color:'#0ea5e9',text:'Sin riesgo de helada para esta noche.'});
  }

  // Potencial de tormenta
  let capeMax=0;for(let i=ds;i<de;i++)capeMax=Math.max(capeMax,h.cape?.[i]||0);
  const storm=stormRisk(capeMax);
  if(storm==='Alta'||storm==='Moderada'){
    items.push({icon:'bolt',color:'#ef4444',text:`Hay potencial de tormenta (nivel ${storm.toLowerCase()}) durante el día.`});
  }else{
    items.push({icon:'bolt',color:'#ef4444',text:'Sin riesgo relevante de tormenta hoy.'});
  }

  // Nubosidad mañana vs. tarde
  const morningEnd=Math.min(de,ds+12),afternoonEnd=Math.min(de,ds+20);
  const avgCloud=(a,b)=>{let s=0,n=0;for(let i=a;i<b;i++){s+=h.cloud_cover[i]||0;n++;}return n?s/n:0;};
  const cloudWord=v=>v<20?'despejado':v<70?'parcialmente nublado':'cubierto';
  const morning=avgCloud(ds,morningEnd),afternoon=avgCloud(morningEnd,afternoonEnd);
  items.push({icon:'cloud',color:'#38bdf8',
    text:`Cielo ${cloudWord(morning)} por la mañana y ${cloudWord(afternoon)} por la tarde.`});

  // Sol y UV
  let sunSecs=0;for(let i=ds;i<de;i++)sunSecs+=h.sunshine_duration?.[i]||0;
  const sunHours=(sunSecs/3600);
  let uvMaxI=ds;for(let i=ds;i<de;i++)if((h.uv_index[i]??0)>(h.uv_index[uvMaxI]??0))uvMaxI=i;
  const uvMax=Math.round(h.uv_index[uvMaxI]??0);
  items.push({icon:'sun',color:'#facc15',
    text:uvMax>=6
      ?`Hoy tenés unas ${sunHours.toFixed(1)} horas de sol, con UV más alto (${uvMax}) alrededor de las ${fmtHour(h.time[uvMaxI])} — usá protector solar.`
      :`Hoy tenés unas ${sunHours.toFixed(1)} horas de sol, con UV bajo a moderado durante el día.`});

  return items;
}

let modalEl=null;

function ensureModal(){
  if(modalEl)return modalEl;
  modalEl=document.createElement('div');
  modalEl.className='glossary-modal';
  modalEl.hidden=true;
  modalEl.innerHTML=`
    <div class="glossary-backdrop"></div>
    <div class="glossary-sheet">
      <button class="glossary-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
      <h3 class="glossary-title">Resumen del día</h3>
      <div class="daysummary-list"></div>
    </div>`;
  document.body.appendChild(modalEl);
  const close=()=>{modalEl.hidden=true;};
  modalEl.querySelector('.glossary-backdrop').addEventListener('click',close);
  modalEl.querySelector('.glossary-close').addEventListener('click',close);
  return modalEl;
}

export function openDaySummary(items){
  const el=ensureModal();
  el.querySelector('.daysummary-list').innerHTML=items.map(it=>`
    <div class="daysummary-item">
      <span class="daysummary-ic" style="color:${it.color};background:${it.color}22">${icon(it.icon,{size:15,color:it.color})}</span>
      <p>${it.text}</p>
    </div>`).join('');
  el.hidden=false;
}
