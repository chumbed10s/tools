// Persistencia en localStorage: ubicaciones guardadas, ajustes, perfiles de
// tarea, config de alertas, y el último clima conocido por ubicación (para
// poder mostrar algo si no hay conexión).
import {DEFAULT_SETTINGS,DEFAULT_ALERTS} from './state.js';

const K_LOCATIONS='clima.locations';
const K_ACTIVE='clima.activeLocationId';
const K_THEME='clima.theme';            // legado: se migra a settings.theme
const K_SETTINGS='clima.settings';
const K_PROFILES='clima.profiles';
const K_ALERTS='clima.alerts';
const K_PROFILE_ACTIVE='clima.activeProfileId';
const K_CACHE_PREFIX='clima.cache.';

function readJSON(key,fallback){
  try{const v=JSON.parse(localStorage.getItem(key));return v==null?fallback:v;}catch(_){return fallback;}
}

export function loadLocations(){return readJSON(K_LOCATIONS,[]);}
export function saveLocations(locations){localStorage.setItem(K_LOCATIONS,JSON.stringify(locations));}
export function loadActiveId(){return localStorage.getItem(K_ACTIVE)||null;}
export function saveActiveId(id){if(id)localStorage.setItem(K_ACTIVE,id);else localStorage.removeItem(K_ACTIVE);}

export function loadSettings(){
  const legacyTheme=localStorage.getItem(K_THEME);
  const base={...DEFAULT_SETTINGS,...readJSON(K_SETTINGS,{})};
  if(legacyTheme&&!localStorage.getItem(K_SETTINGS))base.theme=legacyTheme;
  return base;
}
export function saveSettings(settings){localStorage.setItem(K_SETTINGS,JSON.stringify(settings));}

export function loadAlerts(){return {...DEFAULT_ALERTS,...readJSON(K_ALERTS,{})};}
export function saveAlerts(alerts){localStorage.setItem(K_ALERTS,JSON.stringify(alerts));}

export function loadProfiles(){return readJSON(K_PROFILES,null);}
export function saveProfiles(profiles){localStorage.setItem(K_PROFILES,JSON.stringify(profiles));}
export function clearProfiles(){localStorage.removeItem(K_PROFILES);}

export function loadActiveProfileId(){return localStorage.getItem(K_PROFILE_ACTIVE)||'dron';}
export function saveActiveProfileId(id){localStorage.setItem(K_PROFILE_ACTIVE,id);}

// legado
export function loadTheme(){return loadSettings().theme;}
export function saveTheme(theme){const s=loadSettings();s.theme=theme;saveSettings(s);}

export function loadCache(locationId){return readJSON(K_CACHE_PREFIX+locationId,null);}
export function saveCache(locationId,data){
  try{localStorage.setItem(K_CACHE_PREFIX+locationId,JSON.stringify({data,fetchedAt:Date.now()}));}
  catch(_){/* cuota llena: no es crítico */}
}
export function clearCache(){
  Object.keys(localStorage).filter(k=>k.startsWith(K_CACHE_PREFIX)).forEach(k=>localStorage.removeItem(k));
}
