// Router con historial real: cada tab, y cada página/modal superpuesto, es su
// propio nivel de history.pushState. El botón/gesto atrás del navegador cierra
// un nivel a la vez en vez de sacar de la app.
import {state,SECTIONS} from './state.js';

let renderSection=null, renderOverlay=null, onChange=null;
let booted=false;

export function initRouter({onSection,onOverlay,onAny}={}){
  renderSection=onSection;
  renderOverlay=onOverlay;
  onChange=onAny;
  window.addEventListener('popstate',e=>applyState(e.state,{fromPop:true}));

  const initial=(location.hash||'#ahora').slice(1);
  const name=SECTIONS.includes(initial)?initial:'ahora';
  history.replaceState({t:'section',name},'','#'+name);
  applyState({t:'section',name},{fromPop:false});
  booted=true;
}

function applyState(st,{fromPop}){
  if(!st){st={t:'section',name:state.section||'ahora'};}
  if(st.t==='section'){
    state.section=st.name;
    state.overlay=null;
    renderSection?.(st.name);
  }else{
    state.overlay={type:st.t,name:st.name,payload:st.payload};
    renderOverlay?.(state.overlay);
  }
  onChange?.(st,{fromPop});
}

export function go(name){
  if(!SECTIONS.includes(name))return;
  if(state.section===name&&!state.overlay){
    document.querySelector('.view')?.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  history.pushState({t:'section',name},'','#'+name);
  applyState({t:'section',name},{fromPop:false});
}

// Página a pantalla completa (Ajustes, detalle de día) o modal chico (agregar
// ubicación, editar alias) — ambos son un nivel de historial propio.
export function openOverlay(type,name,payload){
  const st={t:type,name,payload};
  history.pushState(st,'','#'+state.section+'/'+name);
  applyState(st,{fromPop:false});
}
export const openPage=(name,payload)=>openOverlay('page',name,payload);
export const openModal=(name,payload)=>openOverlay('modal',name,payload);

export function closeOverlay(){
  if(state.overlay)history.back();
}

export function refreshCurrent(){
  if(state.overlay)renderOverlay?.(state.overlay);
  else renderSection?.(state.section);
}
