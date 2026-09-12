// Router de secciones. Cada navegación entre secciones deja una entrada real
// en el historial (pushState) — así el gesto de "atrás" en el celular navega
// dentro de la app en vez de salir directo del sitio. Los modales (ubicaciones,
// detalle de día) también empujan una entrada liviana para que "atrás" los cierre.
import {state,SECTIONS} from './state.js';

const routes={};
let viewEl=null, onNav=null, busy=false;

export function register(name,mod){routes[name]=mod;}
export function currentSection(){return state.section;}

export function initRouter({view,onNavigate}){
  viewEl=view;onNav=onNavigate;
  window.addEventListener('popstate',e=>{
    const st=e.state;
    if(st&&st.overlay){window.dispatchEvent(new CustomEvent('router-close-overlay',{detail:st.overlay}));return;}
    const name=(st&&st.section)||sectionFromHash();
    if(SECTIONS.includes(name))render(name,{push:false});
  });
  const initial=sectionFromHash();
  history.replaceState({section:initial},'',`#${initial}`);
  render(initial,{push:false,initial:true});
}

function sectionFromHash(){
  const h=location.hash.replace('#','');
  return SECTIONS.includes(h)?h:state.section;
}

export function go(name){
  if(!routes[name]||name===state.section)return scrollTopIfSame(name);
  history.pushState({section:name},'',`#${name}`);
  render(name,{push:false});
}

function scrollTopIfSame(name){
  if(name===state.section&&viewEl)viewEl.scrollTo({top:0,behavior:'smooth'});
}

function render(name,{initial=false}={}){
  if(!routes[name]||busy)return;
  const prev=state.section;
  state.section=name;
  routes[prev]?.unmount?.();
  viewEl.innerHTML='';
  viewEl.scrollTop=0;
  routes[name].render(viewEl);
  routes[name].mount?.();
  onNav?.(name,{initial});
}

// Re-renderiza la sección actual (p. ej. al llegar datos nuevos), preservando scroll.
export function refreshCurrent(){
  if(!routes[state.section])return;
  const y=viewEl.scrollTop;
  routes[state.section].render(viewEl);
  routes[state.section].mount?.();
  viewEl.scrollTop=y;
}

// ── Overlays (modal / detalle de día): empujan una entrada de historial propia
// para que el gesto de "atrás" los cierre en vez de salir de la sección. ──
export function pushOverlay(id){
  history.pushState({overlay:id},'',location.hash);
}
export function closeOverlay(){
  if(history.state&&history.state.overlay)history.back();
}
