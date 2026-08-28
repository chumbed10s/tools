// Gráficos SVG sin librería, v2: ejes X e Y con labels + unidades, gridlines,
// bandas día/noche, marcador "ahora", dibujado animado y tarjeta de lectura al
// pasar el mouse o tocar. Una sola función `chart()` para líneas/áreas/barras.
import {fmtHourShort,round} from './format.js';

const PAD={l:36,r:10,t:12,b:22};

function niceTicks(min,max,count=4){
  const span=(max-min)||1;
  const step0=span/count;
  const mag=Math.pow(10,Math.floor(Math.log10(step0)));
  const norm=step0/mag;
  const step=(norm>=5?5:norm>=2?2:norm>=1?1:0.5)*mag;
  const start=Math.floor(min/step)*step;
  const ticks=[];
  for(let v=start;v<=max+1e-9;v+=step)ticks.push(Math.round(v*100)/100);
  return ticks;
}

// config:
//  hours: array de ISO strings (eje X)
//  isDay: array 0/1 (para bandas noche)  [opcional]
//  nowRel: índice relativo del "ahora" dentro del rango, o -1
//  series: [{key,label,values,kind:'line'|'area'|'bar'|'dash',color,unit,axis:'left'|'right'}]
//  yUnit / y2Unit: sufijo de las labels de eje
export function chart(cfg){
  const {hours,isDay,series,width=640,height=200,nowRel=-1,yUnit='',y2Unit='',xEvery=3}=cfg;
  const n=hours.length;
  const iw=width-PAD.l-PAD.r, ih=height-PAD.t-PAD.b;
  const stepX=n>1?iw/(n-1):iw;
  const X=i=>PAD.l+i*stepX;

  const leftSeries=series.filter(s=>s.axis!=='right');
  const rightSeries=series.filter(s=>s.axis==='right');
  const domain=arr=>{
    let mn=Infinity,mx=-Infinity;
    arr.forEach(s=>s.values.forEach(v=>{if(v==null||Number.isNaN(v))return;if(v<mn)mn=v;if(v>mx)mx=v;}));
    if(mn===Infinity){mn=0;mx=1;}
    if(mn===mx){mn-=1;mx+=1;}
    return [mn,mx];
  };
  const hasBar=leftSeries.some(s=>s.kind==='bar');
  let [lmin,lmax]=domain(leftSeries);
  if(hasBar){lmin=0;lmax=Math.max(lmax,1);}
  const lticks=niceTicks(lmin,lmax,4);
  lmin=Math.min(lmin,lticks[0]);lmax=Math.max(lmax,lticks[lticks.length-1]);
  const YL=v=>PAD.t+(1-(v-lmin)/((lmax-lmin)||1))*ih;

  let rmin=0,rmax=1,rticks=[];
  if(rightSeries.length){
    [rmin,rmax]=domain(rightSeries);
    rticks=niceTicks(rmin,rmax,4);
    rmin=Math.min(rmin,rticks[0]);rmax=Math.max(rmax,rticks[rticks.length-1]);
  }
  const YR=v=>PAD.t+(1-(v-rmin)/((rmax-rmin)||1))*ih;

  // ── bandas noche ──
  let bands='';
  if(isDay){
    let s=-1;
    for(let i=0;i<=n;i++){
      const night=i<n&&isDay[i]===0;
      if(night&&s<0)s=i;
      if((!night||i===n)&&s>=0){
        const x0=X(Math.max(0,s-0.5)), x1=X(Math.min(n-1,i-0.5));
        bands+=`<rect class="ch-night" x="${x0.toFixed(1)}" y="${PAD.t}" width="${(x1-x0).toFixed(1)}" height="${ih}"/>`;
        s=-1;
      }
    }
  }

  // ── gridlines + labels Y izquierda ──
  let grid='',yl='';
  lticks.forEach(v=>{
    const y=YL(v).toFixed(1);
    grid+=`<line class="ch-grid" x1="${PAD.l}" y1="${y}" x2="${width-PAD.r}" y2="${y}"/>`;
    yl+=`<text class="ch-axis ch-axis-y" x="${PAD.l-6}" y="${y}" text-anchor="end" dominant-baseline="middle">${fmtTick(v)}${yUnit}</text>`;
  });
  let yr='';
  if(rightSeries.length){
    rticks.forEach(v=>{
      yr+=`<text class="ch-axis ch-axis-y2" x="${width-PAD.r+4}" y="${YR(v).toFixed(1)}" text-anchor="start" dominant-baseline="middle">${fmtTick(v)}${y2Unit}</text>`;
    });
  }

  // ── labels X ──
  let xl='';
  for(let i=0;i<n;i++){
    const d=new Date(hours[i]);
    const dayBoundary=d.getHours()===0;
    if(i%xEvery!==0 && !dayBoundary && i!==n-1)continue;
    const label=dayBoundary?`${d.getDate()}/${d.getMonth()+1}`:fmtHourShort(hours[i]);
    xl+=`<text class="ch-axis ${dayBoundary?'ch-axis-day':''}" x="${X(i).toFixed(1)}" y="${height-6}" text-anchor="middle">${label}</text>`;
    if(dayBoundary&&i>0)xl+=`<line class="ch-daysep" x1="${X(i).toFixed(1)}" y1="${PAD.t}" x2="${X(i).toFixed(1)}" y2="${PAD.t+ih}"/>`;
  }

  // ── series ──
  let body='',dots='';
  series.forEach((s,si)=>{
    const Y=s.axis==='right'?YR:YL;
    if(s.kind==='bar'){
      const bw=Math.max(2,stepX*0.55);
      const y0=YL(Math.max(0,lmin));
      s.values.forEach((v,i)=>{
        if(v==null)return;
        const y=YL(v);
        const h=Math.abs(y0-y);
        body+=`<rect class="ch-bar" data-si="${si}" data-i="${i}" x="${(X(i)-bw/2).toFixed(1)}" y="${Math.min(y,y0).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" style="fill:${s.color};--bh:${h.toFixed(1)};--by:${Math.min(y,y0).toFixed(1)}" opacity="${v>0?0.8:0.15}"/>`;
      });
    }else{
      const pts=s.values.map((v,i)=>v==null?null:`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean);
      if(!pts.length)return;
      const dPath='M'+pts.join(' L');
      if(s.kind==='area'){
        body+=`<path d="${dPath} L${X(n-1).toFixed(1)},${(PAD.t+ih).toFixed(1)} L${PAD.l},${(PAD.t+ih).toFixed(1)} Z" style="fill:${s.color};opacity:.13"/>`;
      }
      body+=`<path class="ch-line" data-draw d="${dPath}" fill="none" style="stroke:${s.color}" `
        +`stroke-width="${s.kind==='dash'?2:2.4}" ${s.kind==='dash'?'stroke-dasharray="5,4"':''} `
        +`stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    // dots (ocultos hasta hover)
    s.values.forEach((v,i)=>{
      if(v==null)return;
      const Y2=s.axis==='right'?YR:YL;
      dots+=`<circle class="ch-dot" data-si="${si}" data-i="${i}" data-v="${v}" cx="${X(i).toFixed(1)}" cy="${(s.kind==='bar'?YL(v):Y2(v)).toFixed(1)}" r="3.4" style="fill:${s.color}" opacity="0"/>`;
    });
  });

  // ── marcador ahora ──
  let now='';
  if(nowRel>=0&&nowRel<n){
    const x=X(nowRel).toFixed(1);
    now=`<line class="ch-now" x1="${x}" y1="${PAD.t}" x2="${x}" y2="${PAD.t+ih}"/>`
      +`<text class="ch-now-lbl" x="${x}" y="${PAD.t-2}" text-anchor="middle">ahora</text>`;
  }

  // ── hit strips ──
  let hits='';
  for(let i=0;i<n;i++){
    hits+=`<rect class="ch-hit" data-i="${i}" x="${(X(i)-stepX/2).toFixed(1)}" y="${PAD.t}" width="${stepX.toFixed(1)}" height="${ih}" fill="transparent"/>`;
  }
  const guideX=X(0).toFixed(1);

  return `<div class="chart-wrap">
    <svg viewBox="0 0 ${width} ${height}" class="chart" preserveAspectRatio="none"
      data-n="${n}" data-l="${PAD.l}" data-stepx="${stepX}">
      ${bands}${grid}${xl}${yl}${yr}
      <line class="ch-guide" x1="${guideX}" y1="${PAD.t}" x2="${guideX}" y2="${PAD.t+ih}" opacity="0"/>
      ${body}${now}${dots}${hits}
    </svg>
    <div class="chart-tip" hidden></div>
  </div>`;
}

function fmtTick(v){return Math.abs(v)>=100?String(Math.round(v)):(Math.round(v*10)/10).toString();}

// Conecta interacción: resalta puntos + guía, mueve la tarjeta de lectura y
// llama onMove(indiceAbsoluto, valoresPorSerie, horaISO).
export function wireChart(wrap,{hours,series,startIdx=0,onMove}={}){
  const svg=wrap.querySelector('svg.chart');
  const tip=wrap.querySelector('.chart-tip');
  if(!svg)return;
  const n=+svg.dataset.n, l=+svg.dataset.l, stepX=+svg.dataset.stepx;
  const guide=svg.querySelector('.ch-guide');

  function activate(i,clientX){
    svg.querySelectorAll('.ch-dot').forEach(d=>d.style.opacity=(+d.dataset.i===i)?'1':'0');
    const x=l+i*stepX;
    if(guide){guide.setAttribute('x1',x);guide.setAttribute('x2',x);guide.style.opacity='1';}
    const vals=series.map(s=>s.values[i]);
    if(tip){
      tip.hidden=false;
      const d=new Date(hours[i]);
      tip.innerHTML=`<b>${fmtHourShort(hours[i])}</b>`
        +series.map((s,si)=>vals[si]==null?'':`<span><i style="background:${s.color}"></i>${s.label}: ${fmtNum(vals[si],s)}</span>`).join('');
      const wr=wrap.getBoundingClientRect();
      const px=((clientX!=null?clientX-wr.left:(x/+svg.viewBox.baseVal.width)*wr.width));
      tip.style.left=Math.max(4,Math.min(wr.width-tip.offsetWidth-4,px-tip.offsetWidth/2))+'px';
    }
    onMove?.(startIdx+i,vals,hours[i]);
  }
  function clear(){
    svg.querySelectorAll('.ch-dot').forEach(d=>d.style.opacity='0');
    if(guide)guide.style.opacity='0';
    if(tip)tip.hidden=true;
  }
  svg.querySelectorAll('.ch-hit').forEach(s=>{
    s.addEventListener('pointerenter',e=>activate(+s.dataset.i,e.clientX));
    s.addEventListener('pointerdown',e=>activate(+s.dataset.i,e.clientX));
  });
  svg.addEventListener('pointerleave',clear);
  return {activate,clear};
}

function fmtNum(v,s){
  if(v==null)return '–';
  const r=Math.round(v*10)/10;
  return `${r}${s.unit||''}`;
}
