// "Por hora": franja horaria del día elegido, con gráfico y tira de horas.
import {state,activeData} from '../state.js';
import {nowHourIndex,todayDailyIndex} from '../weather.js';
import {temp,wind,pct,rain,fmtDayName,fmtHourShort,fmtHour} from '../format.js';
import {lineChart,barChart} from '../charts.js';
import {fa} from '../fa.js';
import {weatherIcon,$,$$} from './common.js';

export const label='Por hora';
export const navIcon='hourly';

let dayIdx=0, metric='temp';

export function render(root){
  const data=activeData();
  if(!data){root.innerHTML=emptyMsg();return;}
  const d=data.daily;
  const di=todayDailyIndex(data);
  if(dayIdx<di||dayIdx>=d.time.length)dayIdx=di;

  root.innerHTML=`
  <section class="phora">
    <div class="day-tabs" id="day-tabs">
      ${d.time.slice(di,di+8).map((date,k)=>{
        const i=di+k;
        return `<button class="day-tab${i===dayIdx?' active':''}" data-day="${i}">
          <span class="day-tab-n">${fmtDayName(date,d.time[di])}</span>
          <span class="day-tab-hi">${temp(d.temperature_2m_max[i],{dec:false})}</span>
          <span class="day-tab-lo">${temp(d.temperature_2m_min[i],{dec:false})}</span>
        </button>`;
      }).join('')}
    </div>

    <div class="metric-toggle" id="metric-toggle">
      <button class="mtb${metric==='temp'?' active':''}" data-m="temp">${fa('thermometer')}Temperatura</button>
      <button class="mtb${metric==='precip'?' active':''}" data-m="precip">${fa('cloud-rain')}Precipitación</button>
      <button class="mtb${metric==='wind'?' active':''}" data-m="wind">${fa('wind')}Viento</button>
    </div>

    <div class="chart-card" id="chart-card"></div>
    <div class="hour-strip" id="hour-strip"></div>
  </section>`;

  wire(root);
  renderChart(root);
  renderStrip(root);
}

function wire(root){
  $('#day-tabs',root).addEventListener('click',e=>{
    const b=e.target.closest('[data-day]');if(!b)return;
    dayIdx=+b.dataset.day;
    $$('.day-tab',root).forEach(x=>x.classList.toggle('active',x===b));
    renderChart(root);renderStrip(root);
  });
  $('#metric-toggle',root).addEventListener('click',e=>{
    const b=e.target.closest('[data-m]');if(!b)return;
    metric=b.dataset.m;
    $$('.mtb',root).forEach(x=>x.classList.toggle('active',x===b));
    renderChart(root);
  });
}

function dayRange(data){
  const h=data.hourly, date=data.daily.time[dayIdx];
  const s=h.time.findIndex(t=>t.slice(0,10)===date);
  const e=Math.min(h.time.length,s+24);
  return {s,e};
}

function renderChart(root){
  const data=activeData();const h=data.hourly;
  const {s,e}=dayRange(data);
  const labels=h.time.slice(s,e).map(fmtHourShort);
  const isDay=h.is_day.slice(s,e).map(v=>!!v);
  let svg;
  if(metric==='temp'){
    svg=lineChart({values:h.temperature_2m.slice(s,e),labels,isDay,fillId:'ch-temp'});
  }else if(metric==='precip'){
    svg=barChart({values:h.precipitation.slice(s,e),labels,isDay,max:Math.max(1,...h.precipitation.slice(s,e))});
  }else{
    svg=lineChart({values:h.wind_speed_10m.slice(s,e),labels,isDay,fillId:'ch-wind'});
  }
  $('#chart-card',root).innerHTML=svg;
}

function renderStrip(root){
  const data=activeData();const h=data.hourly;
  const {s,e}=dayRange(data);
  const nowIdx=nowHourIndex(data);
  const cells=[];
  for(let i=s;i<e;i++){
    const isNow=i===nowIdx;
    cells.push(`<div class="hour-cell${isNow?' now':''}" data-i="${i}">
      <span class="hour-t">${isNow?'Ahora':fmtHourShort(h.time[i])}</span>
      <span class="hour-ic">${weatherIcon(h.weather_code[i],h.is_day[i],34)}</span>
      <span class="hour-temp">${temp(h.temperature_2m[i])}</span>
      ${h.precipitation_probability[i]>=15?`<span class="hour-pp">${fa('droplet')}${pct(h.precipitation_probability[i])}</span>`:'<span class="hour-pp muted">–</span>'}
      <span class="hour-wind">${wind(h.wind_speed_10m[i],{dec:false})}</span>
    </div>`);
  }
  $('#hour-strip',root).innerHTML=cells.join('');
  const nowCell=root.querySelector('.hour-cell.now');
  if(nowCell)nowCell.scrollIntoView({inline:'start',block:'nearest'});
}

function emptyMsg(){
  return `<div class="empty-state"><span class="empty-ic">${fa('chart-line')}</span><p>Elegí una ubicación para ver el pronóstico por hora.</p></div>`;
}
