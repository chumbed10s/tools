// Descarga y parseo del pronóstico (Open-Meteo Forecast API) para una ubicación.
const CURRENT=['temperature_2m','relative_humidity_2m','apparent_temperature','is_day','precipitation','weather_code','cloud_cover','pressure_msl','wind_speed_10m','wind_direction_10m','wind_gusts_10m'];
const HOURLY=['temperature_2m','relative_humidity_2m','dew_point_2m','apparent_temperature','precipitation_probability','precipitation','weather_code','pressure_msl','cloud_cover','visibility','wind_speed_10m','wind_direction_10m','wind_gusts_10m','uv_index','is_day'];
const DAILY=['weather_code','temperature_2m_max','temperature_2m_min','apparent_temperature_max','apparent_temperature_min','sunrise','sunset','daylight_duration','uv_index_max','precipitation_sum','precipitation_probability_max','precipitation_hours','wind_speed_10m_max','wind_gusts_10m_max','wind_direction_10m_dominant'];

export async function fetchForecast(lat,lon){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    +`&current=${CURRENT.join(',')}`
    +`&hourly=${HOURLY.join(',')}`
    +`&daily=${DAILY.join(',')}`
    +`&timezone=auto&forecast_days=15&wind_speed_unit=kmh`;
  const res=await fetch(url);
  if(!res.ok)throw new Error('HTTP '+res.status);
  return res.json();
}

// Índice de la hora "ahora" dentro de hourly.time — el forecast ya viene en hora
// local de la ubicación (timezone=auto), así que comparamos directo sin corregir nada.
export function nowHourIndex(data){
  const nowLocal=data.current.time.slice(0,13); // "YYYY-MM-DDTHH", ya en tz local
  let idx=data.hourly.time.findIndex(t=>t.slice(0,13)>=nowLocal);
  return idx<0?0:idx;
}

export function wmoCategory(c){
  if(c===0)return'clear';if(c===1)return'mostly';if(c===2)return'partly';
  if(c===3)return'overcast';if(c<=48)return'fog';if(c<=57)return'drizzle';
  if(c<=67)return'rain';if(c<=77)return'snow';if(c<=82)return'showers';
  if(c<=86)return'snowshowers';return'storm';
}
export function wmoLabel(c){
  const L={0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',
    45:'Niebla',48:'Niebla escarchada',51:'Llovizna débil',53:'Llovizna',55:'Llovizna intensa',
    56:'Llovizna helada',57:'Llovizna helada intensa',61:'Lluvia débil',63:'Lluvia',
    65:'Lluvia intensa',66:'Lluvia helada',67:'Lluvia helada intensa',71:'Nevada débil',
    73:'Nevada',75:'Nevada intensa',77:'Granizo fino',80:'Chubascos débiles',
    81:'Chubascos',82:'Chubascos intensos',85:'Chubascos de nieve débiles',86:'Chubascos de nieve',
    95:'Tormenta',96:'Tormenta con granizo',99:'Tormenta con granizo intensa'};
  return L[c]||'Variable';
}
