// Tema: system / light / dark. Vive en state.settings.theme (persistido).
import {state} from './state.js';
import {saveSettings} from './storage.js';

const darkMQ=window.matchMedia('(prefers-color-scheme: dark)');

export function initTheme(){
  applyTheme(state.settings.theme||'system');
  darkMQ.addEventListener('change',()=>{
    if((state.settings.theme||'system')==='system')applyTheme('system');
  });
}

export function applyTheme(theme){
  const root=document.documentElement;
  if(theme==='light'||theme==='dark')root.setAttribute('data-theme',theme);
  else root.removeAttribute('data-theme');
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',isDark()?'#13110e':'#e8e4db');
}

export function setTheme(theme){
  state.settings.theme=theme;
  saveSettings(state.settings);
  applyTheme(theme);
}

export function isDark(){
  const t=state.settings.theme||'system';
  return t==='dark'||(t==='system'&&darkMQ.matches);
}

// legado: alterna claro/oscuro explícito
export function toggleTheme(){setTheme(isDark()?'light':'dark');}
