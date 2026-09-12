// Descarga y parseo del pronóstico (Open-Meteo Forecast API) para una ubicación.
const CURRENT=['temperature_2m','relative_humidity_2m','apparent_temperature','is_day','precipitation',
  'weather_code','cloud_cover','pressure_msl','wind_speed_10m','wind_direction_10m','wind_gusts_10m'];

const HOURLY=['temperature_2m','relative_humidity_2m','dew_point_2m','apparent_temperature',
  'precipitation_probability','precipitation','weather_code','pressure_msl','surface_pressure',
  'cloud_cover','visibility','wind_speed_10m','wind_direction_10m','wind_gusts_10m',
  'wind_speed_80m','wind_speed_120m','wind_speed_180m',
  'wind_direction_80m','wind_direction_120m','wind_direction_180m',
  'temperature_80m','temperature_120m','temperature_180m',
  'uv_index','is_day','soil_temperature_0cm','soil_temperature_6cm','soil_temperature_18cm','soil_temperature_54cm',
  'soil_moisture_0_to_1cm','soil_moisture_1_to_3cm','soil_moisture_3_to_9cm','soil_moisture_9_to_27cm','soil_moisture_27_to_81cm',
  'et0_fao_evapotranspiration','shortwave_radiation','direct_radiation','diffuse_radiation','sunshine_duration',
  'cape','lifted_index','convective_inhibition','vapour_pressure_deficit','boundary_layer_height'];

const DAILY=['weather_code','temperature_2m_max','temperature_2m_min','apparent_temperature_max',
  'apparent_temperature_min','sunrise','sunset','daylight_duration','sunshine_duration','uv_index_max',
  'precipitation_sum','snowfall_sum','precipitation_probability_max','precipitation_hours',
  'wind_speed_10m_max','wind_gusts_10m_max','wind_direction_10m_dominant','et0_fao_evapotranspiration'];

export async function fetchForecast(lat,lon){
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    +`&current=${CURRENT.join(',')}`
    +`&hourly=${HOURLY.join(',')}`
    +`&daily=${DAILY.join(',')}`
    +`&timezone=auto&forecast_days=15&past_days=31&wind_speed_unit=kmh`;
  const res=await fetch(url);
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();
  data._pastDays=31;
  data._forecastDays=15;
  return data;
}

// Índice de la hora "ahora" dentro de hourly.time — el forecast ya viene en hora
// local de la ubicación (timezone=auto), así que comparamos directo sin corregir nada.
export function nowHourIndex(data){
  const nowLocal=data.current.time.slice(0,13); // "YYYY-MM-DDTHH", ya en tz local
  let idx=data.hourly.time.findIndex(t=>t.slice(0,13)>=nowLocal);
  return idx<0?0:idx;
}

// Índice del primer registro de "hoy" (00:00 local) — el past_days deja 31 días
// de historia por delante, así que los índices "de pronóstico" arrancan acá.
export function todayStartIndex(data){
  const today=data.current.time.slice(0,10); // YYYY-MM-DD local
  const i=data.hourly.time.findIndex(t=>t.slice(0,10)===today);
  return i<0?0:i;
}
export function todayDailyIndex(data){
  const today=data.current.time.slice(0,10);
  const i=data.daily.time.findIndex(t=>t===today);
  return i<0?0:i;
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
