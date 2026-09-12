// Persistencia en localStorage: ubicaciones guardadas (con alias), ajustes,
// y el último clima conocido por ubicación (para poder mostrar algo offline).
import {DEFAULT_SETTINGS} from './state.js';

const K_LOCATIONS='clima.locations';
const K_ACTIVE='clima.activeLocationId';
const K_SETTINGS='clima.settings';
const K_CACHE_PREFIX='clima.cache.';
const K_LAST_UPDATED='clima.lastUpdated';

function readJSON(key,fallback){
  try{const v=JSON.parse(localStorage.getItem(key));return v==null?fallback:v;}catch(_){return fallback;}
}

export function loadLocations(){return readJSON(K_LOCATIONS,[]);}
export function saveLocations(locations){localStorage.setItem(K_LOCATIONS,JSON.stringify(locations));}
export function loadActiveId(){return localStorage.getItem(K_ACTIVE)||null;}
export function saveActiveId(id){if(id)localStorage.setItem(K_ACTIVE,id);else localStorage.removeItem(K_ACTIVE);}

export function loadSettings(){return {...DEFAULT_SETTINGS,...readJSON(K_SETTINGS,{})};}
export function saveSettings(settings){localStorage.setItem(K_SETTINGS,JSON.stringify(settings));}

export function loadCache(locationId){return readJSON(K_CACHE_PREFIX+locationId,null);}
export function saveCache(locationId,data){
  try{localStorage.setItem(K_CACHE_PREFIX+locationId,JSON.stringify({data,fetchedAt:Date.now()}));}
  catch(_){/* cuota llena: no es crítico */}
}
export function clearCache(){
  Object.keys(localStorage).filter(k=>k.startsWith(K_CACHE_PREFIX)).forEach(k=>localStorage.removeItem(k));
}

export function loadLastUpdated(){const v=+localStorage.getItem(K_LAST_UPDATED);return v||null;}
export function saveLastUpdated(ts){localStorage.setItem(K_LAST_UPDATED,String(ts));}
