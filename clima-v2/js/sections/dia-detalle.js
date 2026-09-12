// Contenido del panel de detalle de un día (abierto desde Semana).
import {activeData} from '../state.js';
import {temp,wind,fmtDayLong,fmtHourShort} from '../format.js';
import {dayDigest} from '../digest.js';
import {lineChart} from '../charts.js';
import {digestList,weatherIcon} from './common.js';

export function renderDayDetail(dayIdx){
  const data=activeData();
  if(!data)return '';
  const d=data.daily,h=data.hourly;
  const date=d.time[dayIdx];
  const s=h.time.findIndex(t=>t.slice(0,10)===date);
  const e=Math.min(h.time.length,s+24);
  const labels=h.time.slice(s,e).map(fmtHourShort);
  const isDay=h.is_day.slice(s,e).map(v=>!!v);
  const chart=lineChart({values:h.temperature_2m.slice(s,e),labels,isDay,fillId:'ch-day'});
  const items=dayDigest(data,dayIdx);

  return `
    <div class="dd-head">
      <span class="dd-ic">${weatherIcon(d.weather_code[dayIdx],1,56)}</span>
      <div>
        <div class="dd-date">${fmtDayLong(date)}</div>
        <div class="dd-range">${temp(d.temperature_2m_min[dayIdx])} · ${temp(d.temperature_2m_max[dayIdx])}</div>
      </div>
    </div>
    <div class="chart-card">${chart}</div>
    ${digestList(items)}
  `;
}
