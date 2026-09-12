// Conversión y formato de valores según state.settings (unidades, reloj).
import {state,DAYS,DAYS_SHORT,MONTHS} from './state.js';

const S=()=>state.settings;
export const round=n=>Math.round(n);
const n1=n=>Math.round(n*10)/10;

// ── Temperatura ──
export function tempC(c){return S().tempUnit==='f'?c*9/5+32:c;}
export function temp(c,{unit=true,dec=false}={}){
  if(c==null||Number.isNaN(c))return '–';
  const v=tempC(c);
  const num=dec?n1(v):Math.round(v);
  return unit?`${num}°`:`${num}`;
}
export function tempUnitLabel(){return S().tempUnit==='f'?'°F':'°C';}

// ── Viento (entra en km/h desde la API) ──
const WIND_FACTOR={kmh:1,ms:1/3.6,kn:0.539957,mph:0.621371};
export function windVal(kmh){return kmh*WIND_FACTOR[S().windUnit];}
export function wind(kmh,{unit=true,dec=false}={}){
  if(kmh==null||Number.isNaN(kmh))return '–';
  const v=windVal(kmh);
  const num=dec?n1(v):Math.round(v);
  return unit?`${num} ${windUnitLabel()}`:`${num}`;
}
export function windUnitLabel(){return {kmh:'km/h',ms:'m/s',kn:'kn',mph:'mph'}[S().windUnit];}

// ── Precipitación (entra en mm) ──
export function rainVal(mm){return S().rainUnit==='in'?mm/25.4:mm;}
export function rain(mm,{unit=true}={}){
  if(mm==null||Number.isNaN(mm))return '–';
  const v=rainVal(mm);
  const num=S().rainUnit==='in'?n1(v*10)/10:n1(v);
  return unit?`${num} ${rainUnitLabel()}`:`${num}`;
}
export function rainUnitLabel(){return S().rainUnit==='in'?'in':'mm';}

// ── Hora / fecha ──
export function fmtHour(iso){
  const t=iso instanceof Date?iso:new Date(iso);
  let h=t.getHours();const m=t.getMinutes();
  if(S().clock==='12'){
    const ap=h<12?'am':'pm';let hh=h%12;if(hh===0)hh=12;
    return m?`${hh}:${String(m).padStart(2,'0')} ${ap}`:`${hh} ${ap}`;
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
export function fmtHourShort(iso){
  const t=iso instanceof Date?iso:new Date(iso);
  const h=t.getHours();
  if(S().clock==='12'){const ap=h<12?'a':'p';let hh=h%12;if(hh===0)hh=12;return `${hh}${ap}`;}
  return `${h}h`;
}
export function fmtDayLong(dateStr){
  const d=new Date(dateStr+'T12:00');
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
export function fmtDayName(dateStr,todayStr){
  if(dateStr===todayStr)return 'Hoy';
  const d=new Date(dateStr+'T12:00');
  return DAYS_SHORT[d.getDay()];
}
export function fmtDayShort(dateStr){
  const d=new Date(dateStr+'T12:00');
  return `${d.getDate()}/${d.getMonth()+1}`;
}
export function fmtClock(ts){
  const t=new Date(ts);
  return `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
}

// ── Genéricos ──
export const CARDINALS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
export function cardinal(deg){return CARDINALS[Math.round(((deg%360)/22.5))%16];}
export function pct(v){return v==null?'–':`${Math.round(v)}%`;}
export function hours(sec){return `${n1(sec/3600)} h`;}
export function km(m){return `${n1(m/1000)} km`;}
