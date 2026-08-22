// Íconos de clima: Meteocons (basmilius/weather-icons, MIT), animados, vía CDN.
// Evita reinventar íconos de clima a mano — este set ya es preciso y lindo.
import {wmoCategory} from './weather.js';

const ICON_BASE='https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg/';

// code WMO → nombre de archivo Meteocons, separado por día/noche donde existe esa variante.
const MAP={
  clear:{day:'clear-day',night:'clear-night'},
  mostly:{day:'clear-day',night:'clear-night'},
  partly:{day:'partly-cloudy-day',night:'partly-cloudy-night'},
  overcast:{day:'overcast-day',night:'overcast-night'},
  fog:{day:'fog-day',night:'fog-night'},
  drizzle:{day:'drizzle',night:'drizzle'},
  freezing:{day:'sleet',night:'sleet'},
  rain:{day:'rain',night:'rain'},
  extremeRain:{day:'extreme-day-rain',night:'extreme-night-rain'},
  snow:{day:'snow',night:'snow'},
  showers:{day:'partly-cloudy-day-rain',night:'partly-cloudy-night-rain'},
  extremeShowers:{day:'extreme-day-rain',night:'extreme-night-rain'},
  snowshowers:{day:'partly-cloudy-day-snow',night:'partly-cloudy-night-snow'},
  storm:{day:'thunderstorms-day-rain',night:'thunderstorms-night-rain'},
};

// Reclasifica algunos códigos WMO más fino que wmoCategory (que agrupa para el
// semáforo de viento) — acá nos interesa elegir el ícono correcto, no el color.
function iconKey(code){
  if(code===65)return'extremeRain';
  if(code===66||code===67||code===56||code===57)return'freezing';
  if(code===82)return'extremeShowers';
  return wmoCategory(code);
}

export function iconName(code,isDay){
  const key=iconKey(code);
  const entry=MAP[key]||MAP.overcast;
  return isDay?entry.day:entry.night;
}

export function weatherIconSVG(code,{size=48,isDay=true,alt=''}={}){
  const name=iconName(code,isDay);
  return`<img class="wi" src="${ICON_BASE}${name}.svg" width="${size}" height="${size}" alt="${alt}" loading="lazy">`;
}

export function iconURL(code,isDay){
  return`${ICON_BASE}${iconName(code,isDay)}.svg`;
}
