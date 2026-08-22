// Frases cortas generadas a partir de un rango de horas — se usan tanto para
// "ahora" (hero) como para cada día del acordeón, cada uno con su propio rango.
function fmtHour(iso){
  const d=new Date(iso);
  return String(d.getHours()).padStart(2,'0')+':00';
}

function rainInsight(hourly,startIdx,endIdx,nowIdx){
  let onset=-1;
  for(let i=startIdx;i<endIdx;i++){
    if(hourly.precipitation_probability[i]>=50||hourly.precipitation[i]>=0.3){onset=i;break;}
  }
  if(onset===-1)return null;
  let total=0,last=onset;
  for(let i=onset;i<endIdx;i++){
    if(hourly.precipitation_probability[i]<30&&hourly.precipitation[i]<0.1&&i>onset)break;
    total+=hourly.precipitation[i]||0;
    last=i;
  }
  const mm=total>=0.1?` (${total.toFixed(1)}mm)`:'';
  const alreadyRaining=onset===nowIdx;
  return alreadyRaining
    ?{fa:'cloud-rain',text:`Está lloviendo ahora${mm} — seguiría hasta las ${fmtHour(hourly.time[last])}`}
    :{fa:'cloud-rain',text:`Lluvia${mm} entre las ${fmtHour(hourly.time[onset])} y las ${fmtHour(hourly.time[last])}`};
}

function windInsight(hourly,startIdx,endIdx){
  let maxGust=0,maxIdx=startIdx;
  for(let i=startIdx;i<endIdx;i++){
    if(hourly.wind_gusts_10m[i]>maxGust){maxGust=hourly.wind_gusts_10m[i];maxIdx=i;}
  }
  if(maxGust<45)return null;
  return{fa:'wind',text:`Ráfagas de hasta ${Math.round(maxGust)} km/h cerca de las ${fmtHour(hourly.time[maxIdx])}`};
}

function uvInsight(hourly,startIdx,endIdx){
  let maxUV=0;
  for(let i=startIdx;i<endIdx;i++)if(hourly.uv_index[i]>maxUV)maxUV=hourly.uv_index[i];
  if(maxUV<7)return null;
  return{fa:'sun',text:`UV alto (${Math.round(maxUV)}) — protección solar recomendada al mediodía`};
}

function tempSwingInsight(hourly,startIdx,endIdx){
  let min=Infinity,max=-Infinity,minI=startIdx,maxI=startIdx;
  for(let i=startIdx;i<endIdx;i++){
    if(hourly.temperature_2m[i]<min){min=hourly.temperature_2m[i];minI=i;}
    if(hourly.temperature_2m[i]>max){max=hourly.temperature_2m[i];maxI=i;}
  }
  if(max-min<8)return null;
  return maxI<minI
    ?{fa:'temperature-arrow-down',text:`Baja de ${Math.round(max)}° a ${Math.round(min)}° hacia las ${fmtHour(hourly.time[minI])}`}
    :{fa:'temperature-arrow-up',text:`Sube de ${Math.round(min)}° a ${Math.round(max)}° hacia las ${fmtHour(hourly.time[maxI])}`};
}

// startIdx/endIdx: rango de índices en hourly.* a analizar (ej. un día = [i*24,i*24+24)).
// nowIdx: índice de "ahora", solo para distinguir "está lloviendo" de "va a llover".
export function buildInsights(hourly,startIdx,endIdx,{nowIdx=-1}={}){
  const s=Math.max(0,startIdx),e=Math.min(hourly.time.length,endIdx);
  if(e<=s)return[];
  const candidates=[rainInsight(hourly,s,e,nowIdx),windInsight(hourly,s,e),uvInsight(hourly,s,e),tempSwingInsight(hourly,s,e)]
    .filter(Boolean);
  return candidates.slice(0,3);
}
