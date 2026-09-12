// Gráfico SVG liviano, sin librería: línea (temp) o barras (precip/viento) con
// eje de horas y franjas día/noche de fondo. Pensado para leerse ancho.
export function lineChart({values,labels,isDay,w=640,h=180,pad={t:16,r:10,b:22,l:10},fmt=v=>Math.round(v),unit='',fillId}){
  const n=values.length;
  const vMin=Math.min(...values), vMax=Math.max(...values);
  const span=Math.max(1,vMax-vMin);
  const x=i=>pad.l+(i/(n-1))*(w-pad.l-pad.r);
  const y=v=>pad.t+(1-(v-vMin)/span)*(h-pad.t-pad.b);
  const pts=values.map((v,i)=>[x(i),y(v)]);
  const path=pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=`M${pts[0][0].toFixed(1)} ${(h-pad.b).toFixed(1)} `+pts.map(p=>`L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')+` L${pts[n-1][0].toFixed(1)} ${(h-pad.b).toFixed(1)} Z`;
  const night=nightBands(isDay,x,w,h,pad);
  const gid=fillId||'lc-fill';
  const step=Math.max(1,Math.round(n/8));
  const ticks=values.map((_,i)=>i).filter(i=>i%step===0);
  return `<svg viewBox="0 0 ${w} ${h}" class="chart-svg" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/>
      <stop offset="1" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient></defs>
    ${night}
    <path d="${area}" fill="url(#${gid})" stroke="none"/>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
    ${ticks.map(i=>`<text x="${x(i).toFixed(1)}" y="${h-6}" class="chart-tick">${labels[i]}</text>`).join('')}
    ${pts.map((p,i)=>ticks.includes(i)?`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="var(--accent)"/>`:'').join('')}
  </svg>`;
}

export function barChart({values,labels,isDay,w=640,h=140,pad={t:10,r:10,b:22,l:10},max}){
  const n=values.length;
  const vMax=max||Math.max(1,...values);
  const bw=(w-pad.l-pad.r)/n;
  const x=i=>pad.l+i*bw;
  const y=v=>pad.t+(1-(v/vMax))*(h-pad.t-pad.b);
  const night=nightBands(isDay,i=>pad.l+(i/(n-1))*(w-pad.l-pad.r),w,h,pad);
  const step=Math.max(1,Math.round(n/8));
  return `<svg viewBox="0 0 ${w} ${h}" class="chart-svg" preserveAspectRatio="none">
    ${night}
    ${values.map((v,i)=>v>0?`<rect x="${(x(i)+bw*0.18).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw*0.64).toFixed(1)}" height="${(h-pad.b-y(v)).toFixed(1)}" rx="2" fill="var(--accent)" fill-opacity=".75"/>`:'').join('')}
    ${values.map((_,i)=>i%step===0?`<text x="${(x(i)+bw/2).toFixed(1)}" y="${h-6}" class="chart-tick">${labels[i]}</text>`:'').join('')}
  </svg>`;
}

function nightBands(isDay,x,w,h,pad){
  if(!isDay)return '';
  let bands=[],start=null;
  for(let i=0;i<isDay.length;i++){
    const night=!isDay[i];
    if(night&&start==null)start=i;
    if(!night&&start!=null){bands.push([start,i-1]);start=null;}
  }
  if(start!=null)bands.push([start,isDay.length-1]);
  return bands.map(([a,b])=>{
    const x0=x(a),x1=x(Math.min(isDay.length-1,b+1));
    return `<rect x="${x0.toFixed(1)}" y="${pad.t}" width="${(x1-x0).toFixed(1)}" height="${(h-pad.t-pad.b).toFixed(1)}" fill="var(--ink)" fill-opacity=".035"/>`;
  }).join('');
}
