// Sección "Ahora": clima actual + todos los datos agro crudos del momento, en
// la misma pantalla (sin semáforos, sin pestaña aparte).
import {activeData} from '../state.js';
import {nowHourIndex,todayStartIndex,wmoCategory,wmoLabel} from '../weather.js';
import {temp,tempC,wind,pct,cardinal,round,windUnitLabel,rain,fmtHour} from '../format.js';
import {deltaTSeries,inversionSeries,frostByDay,accumulations} from '../agro/meteo.js';
import {countUpAll} from '../anim.js';
import {go} from '../router.js';
import {card,icon,weatherIconSVG,windDial,iconBadge,emptyState,dataGroup,dataRow,dataSheet,dataSheetDay,dayProgressBar,dayStats,hourRow,wireHourRows} from './common.js';
import {buildDaySummary,openDaySummary} from '../daysummary.js';

export const label='Hoy';
export const navIcon='sun';

export function render(el){
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Elegí una ubicación para ver el pronóstico.')}</div>`;return;}
  const h=data.hourly,c=data.current,d=data.daily;
  const nowIdx=nowHourIndex(data);
  const cat=wmoCategory(c.weather_code);
  const di=d.time.findIndex(t=>t===c.time.slice(0,10));

  const dTSeries=deltaTSeries(h);
  const invSeries=inversionSeries(h);
  const frost=frostByDay(data);
  const tonight=frost[di+1]||frost[di];
  const bal=accumulations(data);

  const hero=`
   <div class="hero" data-cat="${cat}" data-reveal>
    <button class="hero-toggle" data-hero-toggle>
      <div class="hero-body">
        <div class="hero-figure">${weatherIconSVG(c.weather_code,{size:88,isDay:!!c.is_day})}</div>
        <div class="hero-read">
          <div class="hero-cond">${wmoLabel(c.weather_code)}</div>
          <div class="hero-minmax">
            <span class="hmm hmm-max">${icon('arrow-up',{size:12})}<em>Máx</em><b>${temp(d.temperature_2m_max[di])}</b></span>
            <span class="hmm hmm-min">${icon('arrow-down',{size:12})}<em>Mín</em><b>${temp(d.temperature_2m_min[di])}</b></span>
          </div>
          <div class="hero-sub">Sensación térmica <b>${temp(c.apparent_temperature)}</b></div>
        </div>
        <div class="hero-temp"><span data-count="${tempC(c.temperature_2m)}" data-suffix="°">0°</span></div>
      </div>
      <div class="hero-meta">
        <div class="hm-item hm-wind">
          <span class="wc2-badge">${windDial(c.wind_direction_10m,30)}</span>
          <div class="hm-wind-txt">
            <span class="wc2-speed"><b>${wind(c.wind_speed_10m,{unit:false})}</b><small>${windUnitLabel()}</small></span>
            <span class="wc2-dir">${cardinal(c.wind_direction_10m)}</span>
          </div>
          <div class="wc2-gust-col">
            <span class="wc2-gust-k">Ráfaga</span>
            <b>${wind(c.wind_gusts_10m)}</b>
          </div>
        </div>
        <div class="hm-item">${iconBadge('droplet','water',30,{pct:c.relative_humidity_2m})}<div><b>${pct(c.relative_humidity_2m)}</b><span class="hm-sub">Humedad</span></div></div>
        <div class="hm-item">${iconBadge('cloud-rain','rain',30,{pct:h.precipitation_probability[nowIdx]})}<div><b>${pct(h.precipitation_probability[nowIdx])}</b><span class="hm-sub">Prob. lluvia</span></div></div>
      </div>
      <div class="hero-more">Ver todos los datos de esta hora ${icon('chevron-down',{size:12,cls:'hero-chev'})}</div>
    </button>
    <div class="hero-detail"><div class="hero-detail-inner">
      ${dataSheet(h,nowIdx,{dTSeries,invSeries,frost:tonight})}
    </div></div>
    <button class="hero-summary-btn" data-hero-summary>${icon('file-lines',{size:13})} Resumen del día</button>
   </div>`;

  const todayStart=todayStartIndex(data);
  const todayEnd0=Math.min(h.time.length,todayStart+24);
  const tiles=card(dataSheetDay(h,todayStart,todayEnd0,{dTSeries,invSeries,frost:tonight}),{title:'Condiciones del día',cls:'card-tiles'});

  const stats=dayStats(d.sunrise[di],d.sunset[di],c.time);
  const balB=v=>v<=-15?{label:'Muy negativo',tone:'warn'}:v<0?{label:'Negativo',tone:'warn'}:v<10?{label:'Equilibrado',tone:''}:{label:'Positivo',tone:'ok'};
  const bal7B=balB(bal.balance7),bal30B=balB(bal.balance30);
  const raw=card(`
    ${dataGroup('Resumen del día',[
      dataRow({iconName:'sun',color:'#fb923c',label:'Amanecer',value:fmtHour(d.sunrise[di]),term:'amanecer'}),
      dataRow({iconName:'moon',color:'#8b5cf6',label:'Atardecer',value:fmtHour(d.sunset[di]),term:'atardecer'}),
      dayProgressBar(d.sunrise[di],d.sunset[di],c.time),
      dataRow({iconName:'sun',color:'#fb923c',label:'Sol transcurrido',value:stats.sunElapsed,term:'solTranscurrido'}),
      dataRow({iconName:'sun',color:'#f59e0b',label:'Sol restante',value:stats.sunRemaining,term:'solRestante'}),
      dataRow({iconName:'clock',color:'#8b5cf6',label:'Día transcurrido',value:`${stats.dayPct}%`,term:'diaTranscurrido'}),
      dataRow({iconName:'clock',color:'#6366f1',label:'Día restante',value:`${stats.dayRemainingPct}%`,term:'diaRestante'}),
    ])}
    ${dataGroup('Balance hídrico',[
      dataRow({iconName:'droplet',color:'#3b82f6',label:'Balance (7 días)',value:`${bal.balance7>=0?'+':''}${round(bal.balance7)} mm`,chip:bal7B.label,chipTone:bal7B.tone,term:'balanceHidrico'}),
      dataRow({iconName:'droplet',color:'#6366f1',label:'Balance (30 días)',value:`${bal.balance30>=0?'+':''}${round(bal.balance30)} mm`,chip:bal30B.label,chipTone:bal30B.tone,term:'balanceHidrico'}),
    ])}`,{title:'Datos agro-meteorológicos',cls:'card-agro'});

  const cols=[...Array(24)].map((_,k)=>nowIdx+k).filter(i=>i<h.time.length&&i<todayEnd0);
  const strip=card(`
    <div class="hr2-list">
      ${cols.map(i=>hourRow(h,i,{isNow:i===nowIdx,dTSeries,invSeries,frost:tonight})).join('')}
    </div>
    <button class="link-row" data-go="porhora">Ver el resto de la semana ${icon('chevron-down',{size:13,cls:'rot-l'})}</button>`,
    {title:'Lo que queda del día',cls:'card-hr2'});

  el.innerHTML=`<div class="wrap wrap-ahora">${hero}${tiles}${raw}${strip}</div>`;
  el._daySummary=buildDaySummary(h,todayStart,todayEnd0,{tonight});
}

export function mount(){
  const view=document.getElementById('view');
  countUpAll(view);
  view.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  wireHourRows(view);

  const heroToggle=view.querySelector('[data-hero-toggle]');
  const hero=view.querySelector('.hero');
  const heroDetail=view.querySelector('.hero-detail');
  heroToggle?.addEventListener('click',()=>{
    const open=hero.classList.toggle('open');
    heroDetail.style.height=open?heroDetail.firstElementChild.scrollHeight+'px':'0px';
  });

  const summaryBtn=view.querySelector('[data-hero-summary]');
  summaryBtn?.addEventListener('click',()=>{
    const ctx=view._daySummary;
    if(ctx)openDaySummary(ctx);
  });
}
