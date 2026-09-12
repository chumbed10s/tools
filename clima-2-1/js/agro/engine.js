// Construcción de series agro-meteorológicas crudas (sin semáforos ni perfiles).
import {deltaTSeries,inversionSeries,dewRiskSeries,frostByDay,accumulations} from './meteo.js';

export function buildFields(data){
  const h=data.hourly;
  const dT=deltaTSeries(h);
  const inv=inversionSeries(h);
  const dew=dewRiskSeries(h);
  const get=(arr,i)=>arr?arr[i]:null;
  return i=>({
    temp:get(h.temperature_2m,i),
    wind:get(h.wind_speed_10m,i),
    gust:get(h.wind_gusts_10m,i),
    rh:get(h.relative_humidity_2m,i),
    deltaT:dT[i],
    invScore:inv[i]?.score||0,
    invFlag:inv[i]?.flag||false,
    pprob:get(h.precipitation_probability,i)??0,
    precip:get(h.precipitation,i)??0,
    soilTemp:get(h.soil_temperature_6cm,i)??get(h.soil_temperature_0cm,i),
    soilMoist:get(h.soil_moisture_1_to_3cm,i)??get(h.soil_moisture_0_to_1cm,i),
    dew:dew[i]||false,
  });
}

// Frase del balance hídrico: compara lluvia acumulada vs. ET0 acumulada.
export function waterBalancePhrase(balance){
  if(balance<=-15)return 'Balance muy negativo: se está secando con fuerza';
  if(balance<0)return 'Balance negativo: se está secando';
  if(balance<10)return 'Balance equilibrado: sin déficit marcado';
  return 'Balance positivo: sobra de agua respecto al consumo';
}

export {frostByDay,accumulations};
