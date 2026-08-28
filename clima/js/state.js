// Estado en memoria de la app + constantes.
export const DAYS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const DAYS_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
export const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export const SECTIONS=['ahora','porhora','semana','campo','ajustes'];

// Ajustes por defecto — los reales se cargan de storage en el arranque.
export const DEFAULT_SETTINGS={
  tempUnit:'c',        // 'c' | 'f'
  windUnit:'kmh',      // 'kmh' | 'ms' | 'kn' | 'mph'
  rainUnit:'mm',       // 'mm' | 'in'
  clock:'24',          // '24' | '12'
  theme:'system',      // 'system' | 'light' | 'dark'
  motion:true,         // animaciones de entrada / conteo / dibujado
  backdrop:true,       // cielo vivo animado
  agroMode:true,       // ventanas de aplicación, Delta-T, inversión, heladas, sección Campo
  firstDay:0,          // día visible por defecto en Semana (índice)
};

export const DEFAULT_ALERTS={
  frost:true,  frostThreshold:3,      // °C (mínima agronómica)
  window:true,                        // aviso cuando se abre una ventana buena
  storm:true,  stormCape:800,         // J/kg
  notifyLocationId:null,              // ubicación vigilada para notificaciones del sistema
};

export const state={
  section:'ahora',
  locations:[],            // [{id,label,admin1,country,countryCode,lat,lon,isGPS}]
  activeLocationId:null,
  weatherByLocation:{},    // id -> {data, fetchedAt, offline}
  expandedDayIdx:0,        // compat. con la vista de día
  dayDetailIdx:null,       // día abierto en la vista de detalle (o null)
  weekView:'list',         // 'list' | 'heatmap'
  activeProfileId:'dron',  // perfil de tarea activo en "Campo" y en los semáforos
  settings:{...DEFAULT_SETTINGS},
  alerts:{...DEFAULT_ALERTS},
  profiles:null,           // se llena desde agro/profiles.js
  geo:{watching:false, lastFix:null},  // lastFix: {lat,lon,at}
  jumpHourISO:null,   // al entrar a "Por hora": abrir + resaltar esta hora
  loading:false,
};

export const agroOn=()=>state.settings?.agroMode!==false;

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
