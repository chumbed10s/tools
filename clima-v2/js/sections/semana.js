// "Semana": pronóstico extendido (15 días), filas amplias con rango térmico visual.
import {activeData} from '../state.js';
import {todayDailyIndex} from '../weather.js';
import {temp,rain,pct,fmtDayName,fmtDayShort} from '../format.js';
import {fa} from '../fa.js';
import {weatherIcon,$} from './common.js';

export const label='Semana';
export const navIcon='week';

export function render(root){
  const data=activeData();
  if(!data){
    root.innerHTML=`<div class="empty-state"><span class="empty-ic">${fa('calendar-days')}</span><p>Elegí una ubicación para ver la semana.</p></div>`;
    return;
  }
  const d=data.daily;
  const di=todayDailyIndex(data);
  const days=d.time.slice(di);
  const his=d.temperature_2m_max.slice(di), los=d.temperature_2m_min.slice(di);
  const gMin=Math.min(...los), gMax=Math.max(...his), gSpan=Math.max(1,gMax-gMin);

  root.innerHTML=`<section class="week-list">
    ${days.map((date,k)=>{
      const i=di+k;
      const hi=his[k],lo=los[k];
      const left=((lo-gMin)/gSpan)*100, width=Math.max(6,((hi-lo)/gSpan)*100);
      const rainSum=d.precipitation_sum[i]||0;
      return `<button class="week-row" data-day="${i}">
        <span class="week-day">
          <span class="week-day-n">${fmtDayName(date,d.time[di])}</span>
          <span class="week-day-d">${fmtDayShort(date)}</span>
        </span>
        <span class="week-ic">${weatherIcon(d.weather_code[i],1,32)}</span>
        <span class="week-rain">${rainSum>=0.2?fa('droplet')+rain(rainSum):''}${rainSum>=0.2&&d.precipitation_probability_max[i]?` <small>${pct(d.precipitation_probability_max[i])}</small>`:''}</span>
        <span class="week-range">
          <span class="week-lo">${temp(lo)}</span>
          <span class="week-bar"><span class="week-bar-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"></span></span>
          <span class="week-hi">${temp(hi)}</span>
        </span>
        <span class="week-chevron">${fa('chevron-right')}</span>
      </button>`;
    }).join('')}
  </section>`;

  $('.week-list',root).addEventListener('click',e=>{
    const b=e.target.closest('[data-day]');if(!b)return;
    window.dispatchEvent(new CustomEvent('open-day-detail',{detail:{dayIdx:+b.dataset.day}}));
  });
}
