// Tema (system/light/dark) y acento de color — ambos en state.settings, persistidos.
import {state,ACCENTS} from './state.js';
import {saveSettings} from './storage.js';

const darkMQ=window.matchMedia('(prefers-color-scheme: dark)');

export function initTheme(){
  applyTheme(state.settings.theme||'system');
  applyAccent(state.settings.accent||'azul');
  darkMQ.addEventListener('change',()=>{
    if((state.settings.theme||'system')==='system')applyTheme('system');
  });
}

export function applyTheme(theme){
  const root=document.documentElement;
  if(theme==='light'||theme==='dark')root.setAttribute('data-theme',theme);
  else root.removeAttribute('data-theme');
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',isDark()?'#111214':'#f4f4f5');
}

export function setTheme(theme){
  state.settings.theme=theme;
  saveSettings(state.settings);
  applyTheme(theme);
}

export function applyAccent(key){
  const hex=ACCENTS[key]||ACCENTS.azul;
  document.documentElement.style.setProperty('--accent',hex);
}
export function setAccent(key){
  state.settings.accent=key;
  saveSettings(state.settings);
  applyAccent(key);
}

export function isDark(){
  const t=state.settings.theme||'system';
  return t==='dark'||(t==='system'&&darkMQ.matches);
}
