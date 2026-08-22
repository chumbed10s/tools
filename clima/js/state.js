// Estado en memoria de la app + constantes.
export const DAYS=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export const DAYS_SHORT=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export const state={
  locations:[],           // [{id,label,admin1,country,countryCode,lat,lon,isGPS}]
  activeLocationId:null,
  weatherByLocation:{},    // id -> {data, fetchedAt, offline}
  expandedDayIdx:0,         // qué día del acordeón está abierto (0 = hoy, -1 = ninguno)
  theme:'system',
  loading:false,
};

export function activeLocation(){
  return state.locations.find(l=>l.id===state.activeLocationId)||null;
}
export function activeWeather(){
  return state.activeLocationId?state.weatherByLocation[state.activeLocationId]:null;
}
