// Claro/oscuro: por defecto sigue al sistema; al tocar el toggle queda fijo y persiste.
import {loadTheme,saveTheme} from './storage.js';

export function initTheme(){
  applyTheme(loadTheme());
}
function applyTheme(theme){
  const root=document.documentElement;
  if(theme==='light'||theme==='dark')root.setAttribute('data-theme',theme);
  else root.removeAttribute('data-theme');
  updateToggleIcon(theme);
}
function updateToggleIcon(theme){
  const btn=document.getElementById('theme-toggle');
  if(!btn)return;
  const isDark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  btn.innerHTML=isDark
    ?'<i class="fa-solid fa-moon"></i>'
    :'<i class="fa-solid fa-sun"></i>';
}

export function toggleTheme(){
  const current=loadTheme();
  const isDarkNow=current==='dark'||(current==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  const next=isDarkNow?'light':'dark';
  saveTheme(next);
  applyTheme(next);
}
