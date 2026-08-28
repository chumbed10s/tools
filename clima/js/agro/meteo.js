// Cálculos agrometeorológicos derivados del pronóstico horario de Open-Meteo.
// Todo en unidades de la API (°C, km/h, mm, %) — el formateo va aparte.

// ── Bulbo húmedo (Stull 2011, válido cerca de 1013 hPa y RH 5–99%) ──
export function wetBulb(T,RH){
  RH=Math.max(1,Math.min(100,RH));
  return T*Math.atan(0.151977*Math.sqrt(RH+8.313659))
    +Math.atan(T+RH)-Math.atan(RH-1.676331)
    +0.00391838*Math.pow(RH,1.5)*Math.atan(0.023101*RH)-4.686035;
}

// Delta-T = depresión de bulbo húmedo. Ventana ideal de aplicación: 2–8.
export function deltaT(T,RH){return T-wetBulb(T,RH);}

// Serie de Delta-T para todo el horario.
export function deltaTSeries(h){
  return h.temperature_2m.map((t,i)=>deltaT(t,h.relative_humidity_2m[i]));
}

// ── Inversión térmica (probable) por hora ──
// Señales: de noche, viento flojo, cielo despejado, y aire cerca de saturación
// o enfriándose. Devuelve {flag, score 0–1} por índice horario.
export function inversionSeries(h){
  const n=h.time.length;
  const out=new Array(n);
  for(let i=0;i<n;i++){
    const isNight=h.is_day[i]===0;
    const wind=h.wind_speed_10m[i]??99;
    const cloud=h.cloud_cover[i]??100;
    const spread=(h.temperature_2m[i]??0)-(h.dew_point_2m[i]??-99); // T - Td
    const cooling=i>0?(h.temperature_2m[i-1]-h.temperature_2m[i]):0;
    let score=0;
    if(isNight)score+=0.35;
    if(wind<6)score+=0.3; else if(wind<9)score+=0.15;
    if(cloud<30)score+=0.2; else if(cloud<55)score+=0.08;
    if(spread<3)score+=0.1;
    if(cooling>0.3)score+=0.05;
    score=Math.min(1,score);
    out[i]={flag:isNight&&score>=0.7,score};
  }
  return out;
}

// ── Helada por día (analiza la noche: 18:00 del día a 09:00 del siguiente) ──
export function frostByDay(data,threshold=3){
  const h=data.hourly,d=data.daily;
  return d.time.map((date,di)=>{
    // ventana nocturna centrada en el amanecer de ese día
    const dayStart=h.time.findIndex(t=>t.slice(0,10)===date);
    if(dayStart<0)return null;
    const from=Math.max(0,dayStart-6);         // ~18:00 del día previo
    const to=Math.min(h.time.length,dayStart+10); // ~10:00
    let min=Infinity,minI=from,soilMin=Infinity,first=-1,last=-1;
    for(let i=from;i<to;i++){
      const t=h.temperature_2m[i];
      if(t<min){min=t;minI=i;}
      const s=h.soil_temperature_0cm?.[i];
      if(s!=null&&s<soilMin)soilMin=s;
      if(t<=threshold){if(first<0)first=i;last=i;}
    }
    if(min===Infinity)return null;
    const level=min<=0?'fuerte':min<=threshold?'riesgo':'sin';
    return {
      date,di,min,minAt:h.time[minI],
      soilMin:soilMin===Infinity?null:soilMin,
      startAt:first>=0?h.time[first]:null,
      endAt:last>=0?h.time[last]:null,
      level,
    };
  });
}

// ── Acumulados usando los past_days del fetch ──
// Devuelve mm de lluvia y balance (lluvia − ET0) para ventanas de N días previos.
export function accumulations(data){
  const h=data.hourly;
  const today=data.current.time.slice(0,10);
  const nowIdx=h.time.findIndex(t=>t.slice(0,10)===today);
  const cut=nowIdx<0?0:nowIdx;
  const sumBack=(arr,hoursBack)=>{
    if(!arr)return 0;
    let s=0;for(let i=Math.max(0,cut-hoursBack);i<cut;i++)s+=arr[i]||0;return s;
  };
  const et0=h.et0_fao_evapotranspiration;
  return {
    rain7:sumBack(h.precipitation,7*24),
    rain30:sumBack(h.precipitation,30*24),
    et7:sumBack(et0,7*24),
    et30:sumBack(et0,30*24),
    balance7:sumBack(h.precipitation,7*24)-sumBack(et0,7*24),
    balance30:sumBack(h.precipitation,30*24)-sumBack(et0,30*24),
  };
}

// Viento efectivo para dron: mezcla 10m con capas altas si hay cortante fuerte.
export function shearSeries(h){
  return h.wind_speed_10m.map((w10,i)=>{
    const w80=h.wind_speed_80m?.[i];
    if(w80==null)return 0;
    return w80-w10;
  });
}

// Rocío en superficie probable (para cosecha): T cerca del punto de rocío y noche/mañana.
export function dewRiskSeries(h){
  return h.time.map((_,i)=>{
    const spread=(h.temperature_2m[i]??99)-(h.dew_point_2m[i]??-99);
    const rh=h.relative_humidity_2m[i]??0;
    return spread<1.5||rh>=95;
  });
}
