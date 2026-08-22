// Gráficos SVG interactivos, sin librería — temperatura (real + sensación),
// precipitación (mm en barra + probabilidad en línea) y viento (velocidad +
// ráfaga punteada). Cada uno lleva "hit-strips" invisibles por hora: al pasar
// el mouse o tocar, `wireChartInteraction` avisa qué hora quedó activa y con
// qué valores, para que quien llama actualice su propio texto de lectura.

function axisLabels(hourly,startIdx,count,stepX,height){
  return[...Array(count)].map((_,i)=>{
    if(i%4!==0&&i!==count-1)return'';
    const hour=new Date(hourly.time[startIdx+i]).getHours();
    return`<text x="${(i*stepX).toFixed(1)}" y="${height-4}" class="chart-axis" text-anchor="middle">${hour}h</text>`;
  }).join('');
}
function hitStrips(count,stepX,height){
  return[...Array(count)].map((_,i)=>`<rect class="chart-hit" data-i="${i}" x="${(i*stepX-stepX/2).toFixed(1)}" y="0" width="${stepX.toFixed(1)}" height="${height}" fill="transparent"/>`).join('');
}

export function tempChart(hourly,startIdx,count,{width=640,height=170}={}){
  const temps=hourly.temperature_2m.slice(startIdx,startIdx+count);
  const feels=hourly.apparent_temperature.slice(startIdx,startIdx+count);
  const all=[...temps,...feels];
  const min=Math.min(...all),max=Math.max(...all),range=(max-min)||1;
  const padTop=16,padBottom=20;
  const stepX=count>1?width/(count-1):width;
  const y=v=>padTop+(1-(v-min)/range)*(height-padTop-padBottom);
  const pathOf=vals=>vals.map((v,i)=>(i===0?'M':'L')+(i*stepX).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  const pathTemp=pathOf(temps),pathFeels=pathOf(feels);
  const areaTemp=`${pathTemp} L${((count-1)*stepX).toFixed(1)},${height-padBottom} L0,${height-padBottom} Z`;
  const dots=(vals,cls,color)=>vals.map((v,i)=>`<circle class="chart-dot ${cls}" data-i="${i}" data-v="${v.toFixed(1)}" cx="${(i*stepX).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" style="fill:${color}" opacity="0"/>`).join('');
  return`<svg viewBox="0 0 ${width} ${height}" class="chart chart-interactive" data-count="${count}" data-start="${startIdx}">
    <path d="${areaTemp}" style="fill:var(--accent-fade)"/>
    <path d="${pathFeels}" fill="none" style="stroke:var(--muted)" stroke-width="2" stroke-dasharray="5,4" stroke-linecap="round"/>
    <path d="${pathTemp}" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${axisLabels(hourly,startIdx,count,stepX,height)}
    ${hitStrips(count,stepX,height)}
    <line class="chart-guide" x1="0" y1="0" x2="0" y2="${height-padBottom}" opacity="0"/>
    ${dots(temps,'dot-a','var(--accent)')}
    ${dots(feels,'dot-b','var(--muted)')}
  </svg>`;
}

export function precipChart(hourly,startIdx,count,{width=640,height=170}={}){
  const mm=hourly.precipitation.slice(startIdx,startIdx+count);
  const prob=hourly.precipitation_probability.slice(startIdx,startIdx+count);
  const maxMm=Math.max(1,...mm);
  const padTop=16,padBottom=20;
  const stepX=count>1?width/(count-1):width;
  const barW=stepX*0.55;
  const yMm=v=>padTop+(1-(v/maxMm))*(height-padTop-padBottom);
  const yProb=v=>padTop+(1-(v/100))*(height-padTop-padBottom);
  const bars=mm.map((v,i)=>{
    const y0=yMm(v);
    return`<rect data-i="${i}" data-v="${v.toFixed(1)}" x="${(i*stepX-barW/2).toFixed(1)}" y="${y0.toFixed(1)}" width="${barW.toFixed(1)}" height="${(height-padBottom-y0).toFixed(1)}" rx="2.5" style="fill:var(--rain)" opacity="${v>0?0.75:0.18}"/>`;
  }).join('');
  const pathProb=prob.map((v,i)=>(i===0?'M':'L')+(i*stepX).toFixed(1)+','+yProb(v).toFixed(1)).join(' ');
  const dotsProb=prob.map((v,i)=>`<circle class="chart-dot dot-b" data-i="${i}" data-v="${v}" cx="${(i*stepX).toFixed(1)}" cy="${yProb(v).toFixed(1)}" r="3.5" style="fill:var(--accent)" opacity="0"/>`).join('');
  return`<svg viewBox="0 0 ${width} ${height}" class="chart chart-interactive" data-count="${count}" data-start="${startIdx}">
    ${bars}
    <path d="${pathProb}" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
    ${axisLabels(hourly,startIdx,count,stepX,height)}
    ${hitStrips(count,stepX,height)}
    <line class="chart-guide" x1="0" y1="0" x2="0" y2="${height-padBottom}" opacity="0"/>
    ${dotsProb}
  </svg>`;
}

export function windChart(hourly,startIdx,count,{width=640,height=170}={}){
  const speed=hourly.wind_speed_10m.slice(startIdx,startIdx+count);
  const gust=hourly.wind_gusts_10m.slice(startIdx,startIdx+count);
  const all=[...speed,...gust];
  const min=0,max=Math.max(1,...all),range=max-min||1;
  const padTop=16,padBottom=20;
  const stepX=count>1?width/(count-1):width;
  const y=v=>padTop+(1-(v-min)/range)*(height-padTop-padBottom);
  const pathOf=vals=>vals.map((v,i)=>(i===0?'M':'L')+(i*stepX).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  const areaSpeed=`${pathOf(speed)} L${((count-1)*stepX).toFixed(1)},${height-padBottom} L0,${height-padBottom} Z`;
  const dots=(vals,cls,color)=>vals.map((v,i)=>`<circle class="chart-dot ${cls}" data-i="${i}" data-v="${v.toFixed(1)}" cx="${(i*stepX).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" style="fill:${color}" opacity="0"/>`).join('');
  return`<svg viewBox="0 0 ${width} ${height}" class="chart chart-interactive" data-count="${count}" data-start="${startIdx}">
    <path d="${areaSpeed}" style="fill:var(--accent-fade)"/>
    <path d="${pathOf(gust)}" fill="none" style="stroke:var(--muted)" stroke-width="2" stroke-dasharray="5,4" stroke-linecap="round"/>
    <path d="${pathOf(speed)}" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${axisLabels(hourly,startIdx,count,stepX,height)}
    ${hitStrips(count,stepX,height)}
    <line class="chart-guide" x1="0" y1="0" x2="0" y2="${height-padBottom}" opacity="0"/>
    ${dots(speed,'dot-a','var(--accent)')}
    ${dots(gust,'dot-b','var(--muted)')}
  </svg>`;
}

// Conecta los hit-strips de un gráfico ya insertado en el DOM: al pasar el
// mouse/tocar una hora, resalta sus puntos + la línea guía, y llama a
// onMove(índiceAbsoluto, [valores...]) para que quien pidió el gráfico arme
// su propio texto de lectura (sabe qué representa cada serie).
export function wireChartInteraction(container,onMove){
  const svg=container.querySelector('svg.chart-interactive');
  if(!svg)return;
  const width=+svg.getAttribute('viewBox').split(' ')[2];
  const count=+svg.dataset.count,startIdx=+svg.dataset.start;
  const stepX=count>1?width/(count-1):width;
  const guide=svg.querySelector('.chart-guide');
  function activate(i){
    svg.querySelectorAll('.chart-dot').forEach(d=>{d.style.opacity=(+d.dataset.i===i)?'1':'0';});
    if(guide){guide.setAttribute('x1',i*stepX);guide.setAttribute('x2',i*stepX);guide.style.opacity='1';}
    const vals=[...svg.querySelectorAll(`[data-i="${i}"][data-v]`)].map(d=>+d.dataset.v);
    onMove(startIdx+i,vals);
  }
  svg.querySelectorAll('.chart-hit').forEach(s=>{
    s.addEventListener('pointerenter',()=>activate(+s.dataset.i));
    s.addEventListener('click',()=>activate(+s.dataset.i));
  });
  activate(0);
}
