// Sección "Por hora": pronóstico horario completo, un día a la vez — tabs de
// día arriba (sincronizados con swipe horizontal), y por día un selector de
// métrica para un gráfico liviano de una sola serie + el detalle hora a hora
// completo (mismas filas y tarjetas desplegables que en "Ahora").
import {activeData,state} from '../state.js';
import {nowHourIndex,todayStartIndex} from '../weather.js';
import {temp,fmtDayLong} from '../format.js';
import {deltaTSeries,inversionSeries,frostByDay} from '../agro/meteo.js';
import {mountChart} from '../charts.js';
import {countUpAll} from '../anim.js';
import {icon,weatherIconSVG,wmoLabel,hourRow,wireHourRows,emptyState} from './common.js';
import {wind as fmtWind,rain,cardinal} from '../format.js';

export const label='Por hora';
export const navIcon='clock';
const SPAN_DAYS=15;

function cssVar(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim();}

const nowLinePlugin={
  id:'nowLine',
  afterDraw(chart,args,opts){
    const idx=opts?.index;
    if(idx==null)return;
    const {ctx,chartArea,scales}=chart;
    const x=scales.x.getPixelForValue(idx);
    if(x<chartArea.left||x>chartArea.right)return;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3,3]);
    ctx.lineWidth=1.5;
    ctx.strokeStyle=opts.color||'#fff';
    ctx.moveTo(x,chartArea.top);
    ctx.lineTo(x,chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='600 9px sans-serif';
    ctx.fillStyle=opts.color||'#fff';
    ctx.textAlign='center';
    ctx.fillText('Ahora',x,chartArea.top-2);
    ctx.restore();
  },
};

function metrics(){
  const accent=cssVar('--accent')||'#3b82f6';
  const muted=cssVar('--muted')||'#9d9da8';
  const line=(label,arr,color,extra={})=>({
    label,data:arr,borderColor:color,backgroundColor:color+'26',
    fill:true,tension:.35,pointRadius:2,pointHoverRadius:4,pointBackgroundColor:color,...extra,
  });
  return {
    temp:{
      label:'Temperatura',unit:'°C',
      build:(h,ds,de)=>[
        line('Temperatura',h.temperature_2m.slice(ds,de),accent),
        line('Sensación térmica',h.apparent_temperature.slice(ds,de),accent,
          {backgroundColor:'transparent',fill:false,borderDash:[5,4],pointRadius:0,borderWidth:1.5}),
      ],
    },
    rain:{
      label:'Precipitación',unit:'mm · %',
      build:(h,ds,de)=>[
        {type:'bar',label:'Lluvia (mm)',data:h.precipitation.slice(ds,de),
          backgroundColor:'#6366f180',borderRadius:4,barPercentage:.5,yAxisID:'y',order:2},
        {type:'line',label:'Prob. lluvia (%)',data:h.precipitation_probability.slice(ds,de),
          borderColor:'#6366f1',backgroundColor:'transparent',fill:false,tension:.35,
          pointRadius:2,pointBackgroundColor:'#6366f1',yAxisID:'y1',order:1},
      ],
      dualAxis:{y:'mm',y1:'%'},
    },
    wind:{
      label:'Viento',unit:'km/h',
      heights:['10','80','120','180'],
      build:(h,ds,de,opts)=>{
        const hk=opts?.windHeight||'10';
        const spd=h[`wind_speed_${hk}m`].slice(ds,de);
        const dirs=h[`wind_direction_${hk}m`]?.slice(ds,de)||[];
        const out=[
          {label:'__dirbg',data:spd,pointStyle:'circle',pointRadius:10,pointHoverRadius:11,
            backgroundColor:'#0d948833',pointBackgroundColor:'#0d948833',borderWidth:0,showLine:false},
          line(`Viento (${hk} m)`,spd,'#0d9488',{
            pointStyle:'triangle',pointRadius:6,pointHoverRadius:7,
            pointRotation:dirs.map(d=>(Math.round(d)+180)%360),
          }),
        ];
        if(hk==='10')out.push(line('Ráfagas',h.wind_gusts_10m.slice(ds,de),'#0d9488',
          {backgroundColor:'transparent',fill:false,borderDash:[5,4],pointRadius:0,borderWidth:1.5}));
        return out;
      },
      tooltipLabel:(h,ds,de,opts)=>{
        const hk=opts?.windHeight||'10';
        const dirs=h[`wind_direction_${hk}m`]?.slice(ds,de)||[];
        return ctx=>ctx.dataset.label.startsWith('Viento')
          ?`${ctx.dataset.label}: ${ctx.formattedValue} km/h (${cardinal(dirs[ctx.dataIndex])})`
          :`${ctx.dataset.label}: ${ctx.formattedValue} km/h`;
      },
    },
    hum:{label:'Humedad',unit:'%',build:(h,ds,de)=>[line('Humedad',h.relative_humidity_2m.slice(ds,de),'#3b82f6')]},
    dew:{
      label:'Punto de rocío',unit:'°C',
      build:(h,ds,de)=>[
        line('Temperatura',h.temperature_2m.slice(ds,de),accent,
          {backgroundColor:'transparent',fill:false,borderDash:[5,4],pointRadius:0,borderWidth:1.5}),
        line('Punto de rocío',h.dew_point_2m.slice(ds,de),'#3b82f6'),
      ],
    },
    cloud:{label:'Nubosidad',unit:'%',build:(h,ds,de)=>[line('Nubosidad',h.cloud_cover.slice(ds,de),muted)]},
    press:{label:'Presión',unit:'hPa',build:(h,ds,de)=>[line('Presión',h.pressure_msl.slice(ds,de),muted)]},
    deltat:{
      label:'Delta-T',unit:'°C',
      build:(h,ds,de)=>{
        const dt=deltaTSeries(h).slice(ds,de);
        const n=dt.length;
        return [
          {label:'__band-lo',data:Array(n).fill(2),borderWidth:0,pointRadius:0,fill:false},
          {label:'__band-hi',data:Array(n).fill(8),borderWidth:0,pointRadius:0,fill:'-1',backgroundColor:'#22c55e1f'},
          line('Delta-T',dt,'#f59e0b',{
            pointBackgroundColor:dt.map(v=>v<2||v>8?'#ef4444':'#f59e0b'),
            segment:{borderColor:ctx=>(ctx.p0.parsed.y<2||ctx.p0.parsed.y>8||ctx.p1.parsed.y<2||ctx.p1.parsed.y>8)?'#ef4444':'#f59e0b'},
          }),
        ];
      },
    },
    inv:{label:'Inversión',unit:'%',build:(h,ds,de)=>[line('Inversión',inversionSeries(h).slice(ds,de).map(s=>Math.round((s?.score||0)*100)),'#0ea5e9')]},
    solar:{label:'Radiación solar',unit:'W/m²',build:(h,ds,de)=>[line('Radiación',h.shortwave_radiation.slice(ds,de),'#f59e0b')]},
  };
}

export function render(el){
  const data=activeData();
  if(!data){el.innerHTML=`<div class="wrap">${emptyState('Sin datos para esta ubicación.')}</div>`;return;}
  const h=data.hourly;
  const start=todayStartIndex(data);
  const nowIdx=nowHourIndex(data);
  const dTSeries=deltaTSeries(h);
  const invSeries=inversionSeries(h);
  const frost=frostByDay(data);
  const M=metrics();

  let initialDay=0;
  let tabs='',pages='';
  for(let dday=0;dday<SPAN_DAYS;dday++){
    const ds=start+dday*24;
    if(ds>=h.time.length)break;
    const de=Math.min(h.time.length,ds+24);
    const dateStr=h.time[ds].slice(0,10);
    if(state.pendingPorHoraDate&&dateStr===state.pendingPorHoraDate)initialDay=dday;
    const dt=new Date(dateStr+'T00:00:00');
    let mn=Infinity,mx=-Infinity,repCode=h.weather_code[ds],repIsDay=1,maxProb=0,rainSum=0,maxGust=0;
    for(let i=ds;i<de;i++){
      mn=Math.min(mn,h.temperature_2m[i]);mx=Math.max(mx,h.temperature_2m[i]);
      maxProb=Math.max(maxProb,h.precipitation_probability[i]||0);
      rainSum+=h.precipitation[i]||0;
      maxGust=Math.max(maxGust,h.wind_gusts_10m[i]||0);
      if(h.is_day[i])repCode=h.weather_code[i];
    }
    const rs=dday===0?Math.max(ds,nowIdx):ds;
    const tonight=frost[dday+1]||frost[dday];
    const rows=[...Array(de-rs)].map((_,k)=>hourRow(h,rs+k,{isNow:rs+k===nowIdx,dTSeries,invSeries,frost:tonight})).join('');

    tabs+=`<button class="pday-tab${dday===0?' active':''}" data-tab="${dday}">
      <span class="pday-tab-day">${dday===0?'Hoy':dt.toLocaleDateString('es-AR',{weekday:'short'})} ${dt.getDate()}</span>
      ${weatherIconSVG(repCode,{size:26,isDay:!!repIsDay})}
      <span class="pday-tab-minmax"><b>${temp(mx,{unit:false})}°</b><em>${temp(mn,{unit:false})}°</em></span>
    </button>`;

    const mpills=Object.entries(M).map(([key,m],i)=>
      `<button class="pmetric-tab${i===0?' active':''}" data-metric="${key}">${m.label}</button>`).join('');

    const waltPills=M.wind.heights.map((hk,i)=>
      `<button class="walt-tab${i===0?' active':''}" data-height="${hk}">${hk} m</button>`).join('');

    pages+=`<div class="pday-page" data-page="${dday}" data-ds="${ds}" data-de="${de}" data-metric="temp" data-wind-height="10">
      <div class="pday-page-head">
        ${weatherIconSVG(repCode,{size:28,isDay:!!repIsDay})}
        <span class="pday-page-name">${fmtDayLong(dateStr)}</span>
        <span class="pday-page-minmax">${temp(mn,{unit:false})}° / ${temp(mx)}</span>
      </div>
      <div class="pday-page-summary">
        <span>${wmoLabel(repCode)}</span>
        <span>${icon('cloud-rain',{size:11})} ${Math.round(maxProb)}% · ${rain(rainSum)}</span>
        <span>${icon('wind',{size:11})} ráf ${fmtWind(maxGust)}</span>
      </div>
      <div class="pmetric-tabs">${mpills}</div>
      <div class="walt-tabs">${waltPills}</div>
      <div class="chart-box" data-chart></div>
      <div class="hr2-list">${rows}</div>
    </div>`;
  }

  el.innerHTML=`<div class="wrap wrap-porhora">
    <div class="sec-title"><h2>Hora a hora</h2></div>
    <div class="pday-tabs">${tabs}</div>
    <div class="pday-pager">${pages}</div>
  </div>`;
  el._ctx={h,nowIdx,initialDay};
  state.pendingPorHoraDate=null;
}

export function mount(){
  const view=document.getElementById('view');
  const ctx=view._ctx;
  if(!ctx)return;
  const {h,nowIdx,initialDay=0}=ctx;
  const M=metrics();
  wireHourRows(view);
  countUpAll(view);

  const tabsBar=view.querySelector('.pday-tabs');
  const pager=view.querySelector('.pday-pager');
  const tabBtns=[...view.querySelectorAll('.pday-tab')];
  const pages=[...view.querySelectorAll('.pday-page')];
  if(!pager||!pages.length)return;

  function enableWheelScroll(el){
    if(!el)return;
    el.addEventListener('wheel',e=>{
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
      e.preventDefault();
      el.scrollLeft+=e.deltaY;
    },{passive:false});
  }
  enableWheelScroll(tabsBar);
  view.querySelectorAll('.pmetric-tabs').forEach(enableWheelScroll);
  view.querySelectorAll('.walt-tabs').forEach(enableWheelScroll);

  function mountPageChart(page){
    const key=page.dataset.metric;
    const m=M[key];
    const ds=+page.dataset.ds, de=+page.dataset.de;
    const box=page.querySelector('[data-chart]');
    const labels=h.time.slice(ds,de).map(t=>new Date(t).getHours()+'h');
    const opts={windHeight:page.dataset.windHeight};
    const datasets=m.build(h,ds,de,opts);
    const muted=cssVar('--muted'), border=cssVar('--border');

    const scales={
      x:{grid:{display:false},ticks:{maxTicksLimit:6,font:{size:10},color:muted}},
    };
    if(m.dualAxis){
      scales.y={position:'left',grid:{color:border},ticks:{font:{size:10},color:muted,callback:v=>v+' '+m.dualAxis.y}};
      scales.y1={position:'right',grid:{display:false},ticks:{font:{size:10},color:muted,callback:v=>v+m.dualAxis.y1},min:0,max:100};
    }else{
      scales.y={grid:{color:border},ticks:{font:{size:10},color:muted,callback:v=>v+(m.unit==='°C'?'°':'')}};
    }

    const nowInRange=(nowIdx>=ds&&nowIdx<de)?nowIdx-ds:null;

    mountChart(box,{
      type:'line',
      data:{labels,datasets},
      plugins:[nowLinePlugin],
      options:{
        responsive:true,maintainAspectRatio:false,
        layout:{padding:{top:12}},
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{
            display:datasets.filter(d=>!d.label.startsWith('__')).length>1,
            position:'top',align:'end',
            labels:{boxWidth:10,boxHeight:2,font:{size:10},color:muted,filter:i=>!i.text.startsWith('__')},
          },
          tooltip:{
            filter:item=>!item.dataset.label.startsWith('__'),
            callbacks:m.tooltipLabel?{label:m.tooltipLabel(h,ds,de,opts)}:undefined,
          },
          title:{display:true,text:`${m.label} (${m.unit})`,align:'start',font:{size:11,weight:600},color:muted,padding:{bottom:8}},
          nowLine:{index:nowInRange,color:cssVar('--ink')},
        },
        scales,
      },
    });
  }

  let resizeObs=null;
  function watchPageHeight(page){
    if(resizeObs)resizeObs.disconnect();
    pager.style.height=page.scrollHeight+'px';
    resizeObs=new ResizeObserver(()=>{pager.style.height=page.scrollHeight+'px';});
    resizeObs.observe(page);
  }

  function selectDay(idx,{scroll=true}={}){
    tabBtns.forEach((b,i)=>b.classList.toggle('active',i===idx));
    const page=pages[idx];
    if(!page)return;
    if(scroll){
      pager.scrollTo({left:page.offsetLeft,behavior:'smooth'});
      tabBtns[idx]?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    }
    if(!page._mounted){page._mounted=true;mountPageChart(page);}
    watchPageHeight(page);
  }

  tabBtns.forEach((b,i)=>b.addEventListener('click',()=>selectDay(i)));

  let scrollTimer=null;
  pager.addEventListener('scroll',()=>{
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
      const idx=Math.round(pager.scrollLeft/pager.clientWidth);
      selectDay(idx,{scroll:false});
    },80);
  });

  pages.forEach(page=>{
    page.querySelectorAll('.pmetric-tab[data-metric]').forEach(btn=>btn.addEventListener('click',()=>{
      page.querySelectorAll('.pmetric-tab[data-metric]').forEach(b2=>b2.classList.toggle('active',b2===btn));
      page.dataset.metric=btn.dataset.metric;
      mountPageChart(page);
    }));
    page.querySelectorAll('.walt-tab[data-height]').forEach(btn=>btn.addEventListener('click',()=>{
      page.querySelectorAll('.walt-tab[data-height]').forEach(b2=>b2.classList.toggle('active',b2===btn));
      page.dataset.windHeight=btn.dataset.height;
      mountPageChart(page);
    }));
  });

  selectDay(initialDay,{scroll:initialDay>0});
}
