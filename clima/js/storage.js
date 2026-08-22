// Persistencia en localStorage: ubicaciones guardadas, tema, y el último clima
// conocido por ubicación (para poder mostrar algo si no hay conexión).
const K_LOCATIONS='clima.locations';
const K_ACTIVE='clima.activeLocationId';
const K_THEME='clima.theme';
const K_CACHE_PREFIX='clima.cache.';

export function loadLocations(){
  try{return JSON.parse(localStorage.getItem(K_LOCATIONS))||[];}catch(_){return[];}
}
export function saveLocations(locations){
  localStorage.setItem(K_LOCATIONS,JSON.stringify(locations));
}
export function loadActiveId(){
  return localStorage.getItem(K_ACTIVE)||null;
}
export function saveActiveId(id){
  if(id)localStorage.setItem(K_ACTIVE,id);else localStorage.removeItem(K_ACTIVE);
}
export function loadTheme(){
  return localStorage.getItem(K_THEME)||'system';
}
export function saveTheme(theme){
  localStorage.setItem(K_THEME,theme);
}
export function loadCache(locationId){
  try{return JSON.parse(localStorage.getItem(K_CACHE_PREFIX+locationId))||null;}catch(_){return null;}
}
export function saveCache(locationId,data){
  try{localStorage.setItem(K_CACHE_PREFIX+locationId,JSON.stringify({data,fetchedAt:Date.now()}));}catch(_){/* cuota llena: no es crítico */}
}
