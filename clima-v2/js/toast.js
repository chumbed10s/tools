// Cola simple de toasts (abajo, sobre la barra de navegación).
import {fa} from './fa.js';

function host(){
  let h=document.getElementById('toast-host');
  if(!h){h=document.createElement('div');h.id='toast-host';document.body.appendChild(h);}
  return h;
}

export function toast(message,{iconName='info',tone='',duration=4200,action}={}){
  const el=document.createElement('div');
  el.className='toast'+(tone?` toast-${tone}`:'');
  el.innerHTML=`<span class="toast-ic">${fa(iconName)}</span>`
    +`<span class="toast-msg">${message}</span>`;
  if(action){
    const b=document.createElement('button');
    b.className='toast-action';b.textContent=action.label;
    b.addEventListener('click',()=>{action.onClick?.();close();});
    el.appendChild(b);
  }
  host().appendChild(el);
  requestAnimationFrame(()=>el.classList.add('in'));
  let t=setTimeout(close,duration);
  el.addEventListener('pointerenter',()=>clearTimeout(t));
  el.addEventListener('pointerleave',()=>{t=setTimeout(close,1600);});
  function close(){
    el.classList.remove('in');
    el.addEventListener('transitionend',()=>el.remove(),{once:true});
    setTimeout(()=>el.remove(),400);
  }
  return {close};
}

export function dismissAllToasts(){
  host().querySelectorAll('.toast').forEach(t=>t.remove());
}
