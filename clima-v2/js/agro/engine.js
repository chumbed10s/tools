// Motor de evaluación agronómica: dada una serie horaria y un perfil de tarea,
// puntúa cada hora en verde / amarillo / rojo y arma bloques (ventanas).
import {deltaTSeries,inversionSeries,dewRiskSeries} from './meteo.js';
import {wind as fmtWind,rain as fmtRain,round} from '../format.js';

const RANK={verde:0,amarillo:1,rojo:2};
const worse=(a,b)=>RANK[a]>=RANK[b]?a:b;

// Construye todas las series que las reglas pueden referenciar.
export function buildFields(data){
  const h=data.hourly;
  const dT=deltaTSeries(h);
  const inv=inversionSeries(h);
  const dew=dewRiskSeries(h);
  const n=h.time.length;
  const get=(arr,i)=>arr?arr[i]:null;
  return i=>({
    temp:get(h.temperature_2m,i),
    wind:get(h.wind_speed_10m,i),
    gust:get(h.wind_gusts_10m,i),
    rh:get(h.relative_humidity_2m,i),
    deltaT:dT[i],
    inv:inv[i]?.flag||false,
    invScore:inv[i]?.score||0,
    pprob:get(h.precipitation_probability,i)??0,
    precip:get(h.precipitation,i)??0,
    soilTemp:get(h.soil_temperature_6cm,i)??get(h.soil_temperature_0cm,i),
    soilMoist:get(h.soil_moisture_1_to_3cm,i)??get(h.soil_moisture_0_to_1cm,i),
    dew:dew[i]||false,
    rad:get(h.shortwave_radiation,i)??0,
    cape:get(h.cape,i)??0,
    _n:n,
  });
}

function fmtValue(v,unit){
  if(v==null)return '–';
  if(unit==='wind')return fmtWind(v);
  if(unit==='rain')return fmtRain(v);
  if(unit==='pct')return `${round(v)}%`;
  return `${Math.round(v*100)/100}`;
}

// Evalúa una regla contra un valor → {state, reason?}
function evalRule(rule,val){
  if(rule.type==='flag'){
    return val?{state:rule.severity||'rojo',reason:{label:rule.label,detail:'presente'}}:{state:'verde'};
  }
  if(val==null||Number.isNaN(val))return {state:'verde'}; // sin dato: no penaliza
  const u=rule.unit;
  if(rule.type==='max'){
    if(val<=rule.max)return {state:'verde'};
    if(val<=(rule.hardMax??rule.max))return {state:'amarillo',reason:{label:rule.label,detail:`${fmtValue(val,u)} (máx ${fmtValue(rule.max,u)})`}};
    return {state:'rojo',reason:{label:rule.label,detail:`${fmtValue(val,u)} (máx ${fmtValue(rule.max,u)})`}};
  }
  if(rule.type==='min'){
    if(val>=rule.min)return {state:'verde'};
    if(val>=(rule.softMin??rule.min))return {state:'amarillo',reason:{label:rule.label,detail:`${fmtValue(val,u)} (mín ${fmtValue(rule.min,u)})`}};
    return {state:'rojo',reason:{label:rule.label,detail:`${fmtValue(val,u)} (mín ${fmtValue(rule.min,u)})`}};
  }
  if(rule.type==='range'){
    const {min,max}=rule, sMin=rule.softMin??min, sMax=rule.softMax??max;
    if(val>=min&&val<=max)return {state:'verde'};
    if(val>=sMin&&val<=sMax)return {state:'amarillo',reason:{label:rule.label,detail:`${fmtValue(val,u)} (ideal ${fmtValue(min,u)}–${fmtValue(max,u)})`}};
    return {state:'rojo',reason:{label:rule.label,detail:`${fmtValue(val,u)} (ideal ${fmtValue(min,u)}–${fmtValue(max,u)})`}};
  }
  return {state:'verde'};
}

// Puntúa una hora concreta.
export function scoreHour(fieldsAt,profile,i){
  const f=fieldsAt(i);
  let state='verde';const reasons=[];
  for(const rule of profile.rules){
    const r=evalRule(rule,f[rule.field]);
    state=worse(state,r.state);
    if(r.reason)reasons.push({...r.reason,state:r.state});
  }
  return {i,state,reasons,f};
}

// Evalúa un rango [start, start+count).
export function evaluateRange(data,profile,start,count){
  const fieldsAt=buildFields(data);
  const out=[];
  const end=Math.min(data.hourly.time.length,start+count);
  for(let i=Math.max(0,start);i<end;i++)out.push(scoreHour(fieldsAt,profile,i));
  return out;
}

// Bloques contiguos que no son rojo. quality = 'verde' si todo el bloque es verde.
export function bestBlocks(scored,{minLen=2}={}){
  const blocks=[];let cur=null;
  for(const s of scored){
    if(s.state!=='rojo'){
      if(!cur)cur={from:s.i,to:s.i,allGreen:s.state==='verde'};
      else{cur.to=s.i;cur.allGreen=cur.allGreen&&s.state==='verde';}
    }else if(cur){blocks.push(cur);cur=null;}
  }
  if(cur)blocks.push(cur);
  return blocks
    .filter(b=>b.to-b.from+1>=minLen)
    .map(b=>({...b,len:b.to-b.from+1,quality:b.allGreen?'verde':'amarillo'}));
}

// Resumen por día (dayIdx = índice en data.daily.time).
export function dayRollup(data,profile,dayIdx){
  const date=data.daily.time[dayIdx];
  const start=data.hourly.time.findIndex(t=>t.slice(0,10)===date);
  if(start<0)return {date,greenHours:0,yellowHours:0,blocks:[],best:null};
  const scored=evaluateRange(data,profile,start,24);
  const greenHours=scored.filter(s=>s.state==='verde').length;
  const yellowHours=scored.filter(s=>s.state==='amarillo').length;
  const blocks=bestBlocks(scored,{minLen:2});
  const best=blocks.slice().sort((a,b)=>
    (b.quality==='verde')-(a.quality==='verde') || b.len-a.len)[0]||null;
  return {date,dayIdx,start,scored,greenHours,yellowHours,blocks,best};
}

export function statusLabel(state){
  return state==='verde'?'Favorable':state==='amarillo'?'Con reparos':'No recomendado';
}
