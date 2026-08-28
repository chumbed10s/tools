// Helpers de animación — todos respetan prefers-reduced-motion y el toggle de Ajustes.
import {state} from './state.js';

const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
export function prefersReduced(){return mq.matches;}
export function motionOn(){return !!state.settings?.motion && !mq.matches;}

// Revela con leve subida + fade, escalonado, los hijos [data-reveal] de un contenedor.
let io=null;
export function reveal(root=document){
  if(!motionOn()){
    root.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('in'));
    return;
  }
  if(!io){
    io=new IntersectionObserver(entries=>{
      for(const e of entries){
        if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
      }
    },{rootMargin:'0px 0px -8% 0px',threshold:0.05});
  }
  const els=[...root.querySelectorAll('[data-reveal]:not(.in)')];
  els.forEach((el,i)=>{
    el.style.setProperty('--rd',`${Math.min(i,8)*45}ms`);
    io.observe(el);
  });
}

// Cuenta un número hacia su valor. el.dataset.to define el destino.
export function countUp(el,to,{dur=650,decimals=0,prefix='',suffix='°'}={}){
  const from=parseFloat(el.dataset._from??'0')||0;
  if(!motionOn()){el.textContent=prefix+to.toFixed(decimals)+suffix;el.dataset._from=to;return;}
  const t0=performance.now();
  const step=now=>{
    const p=Math.min(1,(now-t0)/dur);
    const e=1-Math.pow(1-p,3);
    const v=from+(to-from)*e;
    el.textContent=prefix+v.toFixed(decimals)+suffix;
    if(p<1)requestAnimationFrame(step);else el.dataset._from=to;
  };
  requestAnimationFrame(step);
}
export function countUpAll(root=document){
  root.querySelectorAll('[data-count]').forEach(el=>{
    const to=parseFloat(el.dataset.count);
    if(Number.isNaN(to))return;
    countUp(el,to,{
      decimals:+(el.dataset.dec||0),
      prefix:el.dataset.prefix||'',
      suffix:el.dataset.suffix??'°',
    });
  });
}

// Dibuja trazos SVG (stroke-dasharray) dentro de un contenedor.
export function drawPaths(root){
  if(!motionOn()){root.querySelectorAll('[data-draw]').forEach(p=>{p.style.strokeDashoffset='0';});return;}
  root.querySelectorAll('[data-draw]').forEach((p,i)=>{
    let len=0;try{len=p.getTotalLength();}catch(_){}
    if(!len)return;
    p.style.strokeDasharray=len;
    p.style.strokeDashoffset=len;
    p.style.transition='none';
    requestAnimationFrame(()=>{
      p.style.transition=`stroke-dashoffset .9s cubic-bezier(.4,0,.2,1) ${i*90}ms`;
      p.style.strokeDashoffset='0';
    });
  });
}
