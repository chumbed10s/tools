// Animación de números: en vez de arrancar de 0, cada refresh anima desde el
// último valor que estaba en pantalla hasta el nuevo.
import {state} from './state.js';

const easeOut=t=>1-Math.pow(1-t,3);

function currentNumeric(el){
  const raw=(el.dataset.rawValue??el.textContent).replace(/[^\d.-]/g,'');
  const n=parseFloat(raw);
  return Number.isNaN(n)?null:n;
}

export function motionOn(){
  return state.settings.motion!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function countUp(el,to,{dur=650,decimals=0,prefix='',suffix=''}={}){
  if(to==null||Number.isNaN(to)){el.textContent='–';return;}
  const from=currentNumeric(el);
  const start=from==null||!motionOn()?to:from;
  el.dataset.rawValue=String(to);
  if(start===to||!motionOn()){
    el.textContent=`${prefix}${to.toFixed(decimals)}${suffix}`;
    return;
  }
  const t0=performance.now();
  function step(now){
    const p=Math.min(1,(now-t0)/dur);
    const v=start+(to-start)*easeOut(p);
    el.textContent=`${prefix}${v.toFixed(decimals)}${suffix}`;
    if(p<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function countUpAll(root=document){
  root.querySelectorAll('[data-count]').forEach(el=>{
    const to=parseFloat(el.dataset.count);
    countUp(el,to,{
      decimals:+(el.dataset.decimals||0),
      prefix:el.dataset.prefix||'',
      suffix:el.dataset.suffix||'',
    });
  });
}

// Flecha de tendencia para la reproducción del día: compara contra la hora anterior.
export function trendArrow(newVal,oldVal){
  if(newVal==null||oldVal==null||Math.abs(newVal-oldVal)<0.05)return '';
  const up=newVal>oldVal;
  return `<i class="fa-solid fa-arrow-${up?'up':'down'} trend-arrow ${up?'up':'down'}" aria-hidden="true"></i>`;
}
