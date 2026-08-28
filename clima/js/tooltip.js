// Controlador único y delegado de tooltips de glosario.
// Disparadores en cualquier elemento con [data-term]:
//   · tap/click  → alterna (abre y queda fijo)
//   · hover      → abre tras 300 ms (solo puntero fino), cierra al salir si fue por hover
//   · long-press → abre en táctil
// Cierra: Esc, scroll, click afuera, o volver a tocar el término.
import {glossaryEntry} from './glossary.js';
import {icon} from './ui-icons.js';

let pop=null, anchor=null, openedByHover=false, hoverTimer=null, pressTimer=null;

function ensurePop(){
  if(pop)return pop;
  pop=document.createElement('div');
  pop.className='gloss-pop';
  pop.setAttribute('role','tooltip');
  document.body.appendChild(pop);
  return pop;
}

function place(el){
  const p=ensurePop();
  const r=el.getBoundingClientRect();
  const margin=8, pw=Math.min(320,window.innerWidth-2*margin);
  p.style.width=pw+'px';
  p.style.visibility='hidden';
  p.classList.add('in');
  const ph=p.offsetHeight;
  let top=r.bottom+8, below=true;
  if(top+ph>window.innerHeight-margin && r.top-8-ph>margin){top=r.top-8-ph;below=false;}
  let left=r.left+r.width/2-pw/2;
  left=Math.max(margin,Math.min(left,window.innerWidth-margin-pw));
  p.style.top=`${Math.round(top+window.scrollY)}px`;
  p.style.left=`${Math.round(left+window.scrollX)}px`;
  p.dataset.dir=below?'below':'above';
  const arrowX=r.left+r.width/2-left;
  p.style.setProperty('--ax',`${Math.max(14,Math.min(pw-14,arrowX))}px`);
  p.style.visibility='';
}

function open(el){
  const term=el.dataset.term;
  const entry=glossaryEntry(term);
  if(!entry)return;
  const p=ensurePop();
  p.innerHTML=`<div class="gloss-h">${entry.title}</div><div class="gloss-b">${entry.body}</div>`;
  anchor=el;
  el.setAttribute('aria-describedby','gloss-pop');
  p.id='gloss-pop';
  place(el);
  requestAnimationFrame(()=>p.classList.add('in'));
}

function close(){
  if(!pop)return;
  pop.classList.remove('in');
  if(anchor)anchor.removeAttribute('aria-describedby');
  anchor=null;openedByHover=false;
}

function isOpenFor(el){return anchor===el&&pop&&pop.classList.contains('in');}

export function initTooltips(){
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-term]');
    if(el){
      e.preventDefault();
      if(isOpenFor(el)&&!openedByHover)close();
      else{openedByHover=false;open(el);}
      return;
    }
    if(pop&&!e.target.closest('.gloss-pop'))close();
  });

  document.addEventListener('pointerover',e=>{
    if(e.pointerType!=='mouse')return;
    const el=e.target.closest('[data-term]');
    if(!el||isOpenFor(el))return;
    clearTimeout(hoverTimer);
    hoverTimer=setTimeout(()=>{openedByHover=true;open(el);},300);
  });
  document.addEventListener('pointerout',e=>{
    if(e.pointerType!=='mouse')return;
    const el=e.target.closest('[data-term]');
    if(!el)return;
    clearTimeout(hoverTimer);
    if(openedByHover&&anchor===el)setTimeout(()=>{if(openedByHover)close();},120);
  });

  // long-press táctil
  document.addEventListener('touchstart',e=>{
    const el=e.target.closest('[data-term]');
    if(!el)return;
    clearTimeout(pressTimer);
    pressTimer=setTimeout(()=>{openedByHover=false;open(el);},420);
  },{passive:true});
  document.addEventListener('touchend',()=>clearTimeout(pressTimer));
  document.addEventListener('touchmove',()=>clearTimeout(pressTimer),{passive:true});

  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  window.addEventListener('scroll',()=>close(),{passive:true,capture:true});
  window.addEventListener('resize',()=>close());
}

// Envuelve un texto como término explicable.
export function term(key,label){
  return `<span class="term" data-term="${key}" tabindex="0" role="button">${label}`
    +`${icon('info',{size:12,cls:'term-i'})}</span>`;
}
