// Alertas in-app derivadas del pronóstico de la ubicación activa. Sin infra:
// son banners dentro de la app. Texto descriptivo + un consejo accionable.
import {state,agroOn} from './state.js';
import {frostByDay,inversionSeries,deltaT} from './agro/meteo.js';
import {getProfile} from './agro/profiles.js';
import {evaluateRange,bestBlocks,scoreHour,buildFields} from './agro/engine.js';
import {nowHourIndex,todayDailyIndex,wmoLabel} from './weather.js';
import {temp,wind,rain,pct,fmtHour,round} from './format.js';

const PRIORITY={frost:0,storm:1,inversion:2,rain:3,wind:4,window:5};

export function buildAlerts(data){
  if(!data)return [];
  const a=state.alerts, h=data.hourly, out=[];
  const nowIdx=nowHourIndex(data);
  const di=todayDailyIndex(data);
  const horizon=Math.min(h.time.length,nowIdx+24);

  // ── Helada ──
  if(a.frost){
    const frost=frostByDay(data,a.frostThreshold);
    const tonight=frost[di+1]||frost[di];
    if(tonight&&tonight.level!=='sin'){
      let hrs=0;
      if(tonight.startAt&&tonight.endAt){
        hrs=Math.round((new Date(tonight.endAt)-new Date(tonight.startAt))/3.6e6)+1;
      }
      const soil=tonight.soilMin!=null?` El suelo bajaría a ${temp(tonight.soilMin)}.`:'';
      out.push({
        id:'frost',tone:'frost',iconName:'thermometer-down',
        title:tonight.level==='fuerte'?'Helada fuerte esta noche':'Riesgo de helada esta noche',
        detail:`Mínima de ${temp(tonight.min)} hacia las ${fmtHour(tonight.minAt)}`
          +(tonight.startAt?`, por debajo de ${a.frostThreshold}° desde las ${fmtHour(tonight.startAt)} hasta las ${fmtHour(tonight.endAt)}${hrs?` (${hrs} h)`:''}.`:'.')
          +soil,
        tip:tonight.level==='fuerte'
          ? 'Protegé cultivos sensibles y evitá regar de noche; puede haber daño en hoja.'
          : 'Vigilá lotes en zonas bajas: a nivel de suelo suele hacer 2–4° menos.',
      });
    }
  }

  // ── Tormenta ──
  if(a.storm){
    let peak=0,onset=null,end=null,hail=false;
    for(let i=nowIdx;i<horizon;i++){
      const c=h.cape?.[i]??0;
      if(c>peak)peak=c;
      const stormy=h.weather_code[i]>=95||c>=a.stormCape;
      if(stormy){if(onset===null)onset=i;end=i;}
      if(h.weather_code[i]>=96)hail=true;
    }
    if(peak>=a.stormCape*0.7||onset!==null){
      const rango=onset!==null?`entre las ${fmtHour(h.time[onset])} y las ${fmtHour(h.time[end])}`:`en las próximas horas`;
      out.push({
        id:'storm',tone:'storm',iconName:'cloud-bolt',
        title:hail?'Tormentas con posible granizo':'Tormentas probables',
        detail:`Se esperan tormentas ${rango}. Energía convectiva de hasta ${round(peak)} J/kg`
          +(peak>=2500?' (potencial de tormenta severa).':peak>=1500?' (tormentas fuertes).':'.'),
        tip:'Cerrá la aplicación con margen: el viento rota y racha antes de que llegue la celda.',
      });
    }
  }

  // ── Inversión térmica ──
  if(agroOn()){
    const inv=inversionSeries(h);
    let s=-1,e=-1;
    for(let i=nowIdx;i<Math.min(h.time.length,nowIdx+18);i++){
      if(inv[i]?.flag){if(s<0)s=i;e=i;}
      else if(s>=0)break;
    }
    if(s>=0&&e-s>=1){
      out.push({
        id:'inversion',tone:'storm',iconName:'layers',
        title:'Inversión térmica prevista',
        detail:`Condiciones de inversión entre las ${fmtHour(h.time[s])} y las ${fmtHour(h.time[e])} `
          +`(noche despejada, viento flojo). Las gotas y el vapor quedan atrapados cerca del suelo.`,
        tip:'No pulverices en ese rango: es la principal causa de deriva a distancia.',
      });
    }
  }

  // ── Lluvia significativa ──
  {
    let s=-1,e=-1,acc=0;
    for(let i=nowIdx;i<horizon;i++){
      const mm=h.precipitation[i]||0;
      if(mm>=0.2||h.precipitation_probability[i]>=55){if(s<0)s=i;e=i;acc+=mm;}
      else if(s>=0&&i-e>2)break;
    }
    if(s>=0&&(acc>=6||e-s>=4)){
      out.push({
        id:'rain',tone:'window',iconName:'cloud-rain',
        title:acc>=15?'Lluvia importante en camino':'Lluvia prevista',
        detail:`Alrededor de ${rain(acc)} entre las ${fmtHour(h.time[s])} y las ${fmtHour(h.time[e])}`
          +` (prob. máx ${pct(Math.max(...h.precipitation_probability.slice(s,e+1)))}).`,
        tip:acc>=15?'Puede complicar el piso del lote y la transitabilidad los próximos días.'
          :'Buena para recarga de perfil; planificá labores en seco alrededor de esa franja.',
      });
    }
  }

  // ── Viento fuerte ──
  {
    let g=0,when=null;
    for(let i=nowIdx;i<Math.min(h.time.length,nowIdx+12);i++){
      if(h.wind_gusts_10m[i]>g){g=h.wind_gusts_10m[i];when=h.time[i];}
    }
    if(g>=40){
      out.push({
        id:'wind',tone:'storm',iconName:'wind',
        title:'Viento fuerte',
        detail:`Ráfagas de hasta ${wind(g)} hacia las ${fmtHour(when)}.`,
        tip:g>=55?'Suspendé aplicaciones y asegurá lonas y silobolsas.':'Fuera de rango para pulverizar; revisá coberturas.',
      });
    }
  }

  // ── Ventana de aplicación del perfil activo ──
  if(a.window&&agroOn()){
    const prof=getProfile(state.activeProfileId);
    const fieldsAt=buildFields(data);
    const scored=evaluateRange(data,prof,nowIdx,24);
    if(scored.length){
      const now=scored[0];
      const blocks=bestBlocks(scored,{minLen:2});
      const f=fieldsAt(nowIdx);
      const cond=`viento ${wind(f.wind)}, humedad ${pct(f.rh)}, Delta-T ${deltaT(f.temp,f.rh).toFixed(1)}`;
      if(now.state!=='rojo'){
        const until=blocks[0]?h.time[blocks[0].to]:null;
        out.push({id:'window',tone:'window',iconName:prof.icon,
          title:`Ventana abierta para ${prof.name.toLowerCase()}`,
          detail:until
            ? `Condiciones ${now.state==='verde'?'favorables':'aceptables'} ahora y hasta las ${fmtHour(until)} (${cond}).`
            : `Condiciones ${now.state==='verde'?'favorables':'aceptables'} ahora (${cond}).`,
          tip:'Aprovechá el bloque: revisá el semáforo por hora en la pestaña Campo.'});
      }else{
        const reason=now.reasons[0];
        const next=blocks[0];
        out.push({id:'window',tone:'window',iconName:prof.icon,
          title:`Sin ventana para ${prof.name.toLowerCase()} ahora`,
          detail:(reason?`Limita ${reason.label.toLowerCase()}: ${reason.detail}. `:'')
            +(next?`Próxima oportunidad de las ${fmtHour(h.time[next.from])} a las ${fmtHour(h.time[next.to])}.`
                  :'Sin bloques favorables en las próximas 24 h.'),
          tip:'Cambiá de tarea en Campo para ver si otra ventana (terrestre, siembra) sí está abierta.'});
      }
    }
  }

  return out.sort((x,y)=>(PRIORITY[x.id]??9)-(PRIORITY[y.id]??9)).slice(0,4);
}
