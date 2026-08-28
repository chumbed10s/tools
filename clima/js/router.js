// Router de secciones: barra inferior, transición entre vistas, sync con el hash.
import {state,SECTIONS,agroOn} from './state.js';
import {motionOn} from './anim.js';

const routes={};
let viewEl=null, navEl=null, busy=false;

export function register(name,mod){routes[name]=mod;}
export function currentSection(){return state.section;}

export function initRouter({view,nav}){
  viewEl=view;navEl=nav;
  navEl.addEventListener('click',e=>{
    const b=e.target.closest('[data-nav]');
    if(b)go(b.dataset.nav);
  });
  window.addEventListener('hashchange',()=>{
    const h=location.hash.replace('#','');
    if(SECTIONS.includes(h)&&h!==state.section)go(h,{fromHash:true});
  });
  const initial=SECTIONS.includes(location.hash.replace('#',''))
    ?location.hash.replace('#','') : state.section;
  go(initial,{initial:true});
}

export async function go(name,{initial=false,fromHash=false}={}){
  if(name==='campo'&&!agroOn())name='ahora';
  if(!routes[name]||busy)return;
  if(name===state.section&&!initial){ // re-tap: scroll arriba
    viewEl.scrollTo({top:0,behavior:motionOn()?'smooth':'auto'});
    return;
  }
  const prev=state.section;
  state.section=name;
  if(!fromHash)history.replaceState(null,'',`#${name}`);
  syncNav();

  const doRender=()=>{
    viewEl.innerHTML='';
    viewEl.scrollTop=0;
    routes[prev]?.unmount?.();
    routes[name].render(viewEl);
    routes[name].mount?.();
    viewEl.classList.remove('view-leaving');
    if(motionOn()){
      viewEl.classList.add('view-entering');
      requestAnimationFrame(()=>viewEl.classList.remove('view-entering'));
    }
  };

  if(initial||!motionOn()){doRender();return;}
  busy=true;
  viewEl.classList.add('view-leaving');
  await wait(150);
  doRender();
  busy=false;
}

// Re-renderiza la sección actual (p. ej. al llegar datos nuevos).
export function refreshCurrent(){
  if(!routes[state.section])return;
  const y=viewEl.scrollTop;
  routes[state.section].render(viewEl);
  routes[state.section].mount?.();
  viewEl.scrollTop=y;
}

function syncNav(){
  navEl.querySelectorAll('[data-nav]').forEach(b=>{
    b.classList.toggle('active',b.dataset.nav===state.section);
    b.setAttribute('aria-current',b.dataset.nav===state.section?'page':'false');
  });
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
