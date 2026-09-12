// Recorrido del sol y la luna en un círculo completo: mitad de arriba = día
// (amanecer→mediodía→atardecer), mitad de abajo = noche (atardecer→medianoche
// →amanecer). El cuerpo actual (sol o luna) se dibuja bien marcado en su
// posición, con el tramo ya recorrido resaltado.
import {fmtHour} from './format.js';

export function sunArcSVG({sunrise,sunset,nextSunrise,prevSunset,now=new Date()}={}){
  const sr=new Date(sunrise), ss=new Date(sunset);
  const nsr=nextSunrise?new Date(nextSunrise):new Date(ss.getTime()+10*3600e3);
  const psr=prevSunset?new Date(prevSunset):new Date(sr.getTime()-14*3600e3);

  const W=300,H=228,cx=W/2,cy=H/2+4,rx=128,ry=90;
  const dayPt=t=>[cx-rx*Math.cos(Math.PI*t), cy-ry*Math.sin(Math.PI*t)];
  const nightPt=n=>[cx+rx*Math.cos(Math.PI*n), cy+ry*Math.sin(Math.PI*n)];
  const arc=(p1,p2)=>`M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${rx} ${ry} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;

  const isDay = now>=sr && now<=ss;
  const isPreDawn = now<sr;
  let bodyPt, bodyIsSun, doneArc, caption;

  if(isDay){
    const t=Math.max(0,Math.min(1,(now-sr)/(ss-sr)));
    bodyPt=dayPt(t); bodyIsSun=true;
    doneArc=arc(dayPt(0),bodyPt);
    caption=`Quedan ${((ss-now)/3.6e6).toFixed(1)} h de luz`;
  }else{
    const from = isPreDawn ? psr : ss;
    const to   = isPreDawn ? sr  : nsr;
    const n=Math.max(0,Math.min(1,(now-from)/(to-from)));
    bodyPt=nightPt(n); bodyIsSun=false;
    doneArc=arc(nightPt(0),bodyPt);
    caption = isPreDawn ? `Amanece en ${((sr-now)/3.6e6).toFixed(1)} h`
                        : `Noche · amanece ${fmtHour(nsr)}`;
  }

  const [lx,ly]=dayPt(0), [rxp,ryp]=dayPt(1);
  const [bx,by]=bodyPt;
  // relleno del semicírculo del "lado" activo, para leer de un vistazo si es día o noche
  const halfFill = bodyIsSun
    ? `M${lx.toFixed(1)} ${ly.toFixed(1)} A${rx} ${ry} 0 0 1 ${rxp.toFixed(1)} ${ryp.toFixed(1)} Z`
    : `M${rxp.toFixed(1)} ${ryp.toFixed(1)} A${rx} ${ry} 0 0 1 ${lx.toFixed(1)} ${ly.toFixed(1)} Z`;

  return `<div class="sunarc">
    <svg viewBox="0 0 ${W} ${H}" class="sunarc-svg" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="sa-glow"><stop offset="0" stop-color="var(--glowc)" stop-opacity=".9"/><stop offset=".6" stop-color="var(--glowc)" stop-opacity=".25"/><stop offset="1" stop-color="var(--glowc)" stop-opacity="0"/></radialGradient>
      </defs>
      <path class="sunarc-half ${bodyIsSun?'h-day':'h-night'}" d="${halfFill}"/>
      <path class="sunarc-track sunarc-track-day" d="${arc(dayPt(0),dayPt(1))}"/>
      <path class="sunarc-track sunarc-track-night" d="${arc(nightPt(0),nightPt(1))}"/>
      <line class="sunarc-horizon" x1="4" y1="${cy}" x2="${W-4}" y2="${cy}"/>
      <path class="sunarc-done ${bodyIsSun?'d-day':'d-night'}" data-draw d="${doneArc}"/>
      <circle class="sunarc-end" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3"/>
      <circle class="sunarc-end" cx="${rxp.toFixed(1)}" cy="${ryp.toFixed(1)}" r="3"/>
      <circle class="sunarc-glow" style="--glowc:${bodyIsSun?'var(--sun)':'#cdd7ff'}" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="22" fill="url(#sa-glow)"/>
      ${bodyIsSun
        ? `<circle class="sunarc-sun" cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="8.5"/>`
        : `<path class="sunarc-moon" transform="translate(${(bx-8).toFixed(1)} ${(by-8).toFixed(1)})" d="M8 0 A8 8 0 1 0 8 16 A6.2 6.2 0 1 1 8 0 Z"/>`}
    </svg>
    <div class="sunarc-labels">
      <span><b>${fmtHour(sr)}</b><small>amanecer</small></span>
      <span class="sunarc-cap">${caption}</span>
      <span class="sunarc-r"><b>${fmtHour(ss)}</b><small>atardecer</small></span>
    </div>
  </div>`;
}
