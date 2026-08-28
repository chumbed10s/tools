// Seguimiento de posición: mientras la app está abierta y la ubicación activa es
// GPS, vigila el movimiento del usuario. Si se movió más de MOVE_KM, actualiza
// las coordenadas + el nombre y avisa con un toast.
import {state,activeLocation} from './state.js';
import {haversineKm,reverseGeocode} from './geocode.js';
import * as storage from './storage.js';
import {toast} from './toast.js';

const MOVE_KM=2;
const GPS_ID='gps-current';
let watchId=null, onMoved=null, busy=false;

function getPosition(opts){
  return new Promise((res,rej)=>{
    if(!navigator.geolocation)return rej(new Error('sin geolocalización'));
    navigator.geolocation.getCurrentPosition(res,rej,opts||{timeout:8000,maximumAge:120000});
  });
}

async function handleFix(lat,lon,{announce=true}={}){
  if(busy)return;
  lat=+lat.toFixed(4);lon=+lon.toFixed(4);
  state.geo.lastFix={lat,lon,at:Date.now()};
  const gps=state.locations.find(l=>l.id===GPS_ID);
  const act=activeLocation();
  if(!gps||!act||!act.isGPS)return;               // sólo si estás viendo el GPS
  const moved=haversineKm({lat:gps.lat,lon:gps.lon},{lat,lon});
  if(moved<MOVE_KM)return;

  busy=true;
  const prevLabel=gps.label;
  gps.lat=lat;gps.lon=lon;
  try{Object.assign(gps,await reverseGeocode(lat,lon));}catch(_){/* conserva el nombre */}
  storage.saveLocations(state.locations);
  if(announce&&gps.label&&gps.label!==prevLabel){
    toast(`Estás en ${gps.label}${prevLabel?` (antes ${prevLabel})`:''}`,{iconName:'location-dot',tone:'info',duration:6000});
  }
  try{await onMoved?.();}finally{busy=false;}
}

// Chequeo puntual — se llama en el arranque y en cada "actualizar".
export async function checkGeoOnce(){
  const act=activeLocation();
  if(!act||!act.isGPS)return;
  try{
    const pos=await getPosition({timeout:8000,maximumAge:0});
    await handleFix(pos.coords.latitude,pos.coords.longitude);
  }catch(_){/* seguimos con las últimas coords conocidas */}
}

export function initGeoWatch({onMoved:cb}={}){
  onMoved=cb;
  startWatch();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopWatch(); else startWatch();
  });
}

function startWatch(){
  if(watchId!=null||!navigator.geolocation)return;
  const act=activeLocation();
  if(!act||!act.isGPS){state.geo.watching=false;return;}
  state.geo.watching=true;
  watchId=navigator.geolocation.watchPosition(
    p=>handleFix(p.coords.latitude,p.coords.longitude),
    ()=>{},
    {enableHighAccuracy:false,maximumAge:120000,timeout:20000}
  );
  window.dispatchEvent(new CustomEvent('geo-watch-change'));
}
function stopWatch(){
  if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null;}
  state.geo.watching=false;
  window.dispatchEvent(new CustomEvent('geo-watch-change'));
}
export function syncGeoWatch(){
  const act=activeLocation();
  if(act&&act.isGPS)startWatch(); else stopWatch();
}
