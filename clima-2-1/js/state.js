// Estado en memoria de la app + constantes.
export const DAYS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const DAYS_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export const SECTIONS=['ahora','porhora','semana','ubicaciones'];

export const ACCENTS={
  azul:'#3b82f6', verde:'#16a34a', violeta:'#8b5cf6', rosa:'#ec4899',
  naranja:'#f97316', turquesa:'#0ea5e9', rojo:'#ef4444', lima:'#65a30d',
};

// Open-Meteo actualiza sus modelos horarios aprox. una vez por hora — refrescar
// más seguido que eso no trae datos más nuevos, así que alineamos el polling ahí.
export const REFRESH_MS=60*60*1000;

export const DEFAULT_SETTINGS={
  tempUnit:'c', windUnit:'kmh', rainUnit:'mm', clock:'24',
  theme:'system', accent:'azul', motion:true,
};

export const state={
  section:'ahora',
  overlay:null,           // {type:'page'|'modal', name, payload} — vista actual sobre la sección
  locations:[],           // [{id,label,admin1,country,countryCode,lat,lon,isGPS,alias}]
  activeLocationId:null,
  weatherByLocation:{},   // id -> {data, fetchedAt, offline}
  lastUpdated:null,       // timestamp del último fetch ok de la ubicación activa
  dayDetailIdx:null,      // día (índice en daily.time) abierto en el detalle
  playback:{playing:false, hour:0, timer:null},
  settings:{...DEFAULT_SETTINGS},
  geo:{watching:false, lastFix:null},
  pendingPorHoraDate:null, // fecha (YYYY-MM-DD) a abrir en "Por hora" al navegar desde "Resumen"
  loading:false,
};

export function activeLocation(){
  return state.locations.find(l=>l.id===state.activeLocationId)||null;
}
export function activeWeather(){
  return state.activeLocationId?state.weatherByLocation[state.activeLocationId]:null;
}
export function activeData(){
  const w=activeWeather();
  return w&&w.data?w.data:null;
}
export function locationDisplayName(loc){
  return loc.alias?.trim()||loc.label;
}
