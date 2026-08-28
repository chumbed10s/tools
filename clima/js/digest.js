// "El día en palabras": genera observaciones en lenguaje natural a partir del
// pronóstico. No es IA — son reglas sobre los datos — pero se lee como un parte
// corto. Cubre clima, comparación con ayer / lo que viene, y (en modo agro)
// Delta-T, inversión, helada y ventana de aplicación.
import {state,agroOn} from './state.js';
import {nowHourIndex,todayStartIndex,todayDailyIndex,wmoCategory} from './weather.js';
import {temp,wind,rain,pct,fmtHour,round} from './format.js';
import {deltaT,inversionSeries,frostByDay} from './agro/meteo.js';
import {getProfile} from './agro/profiles.js';
import {evaluateRange,bestBlocks,dayRollup} from './agro/engine.js';

const P=0; // prioridad base

export function buildDigest(data){
  if(!data)return [];
  const h=data.hourly, c=data.current, d=data.daily;
  const now=nowHourIndex(data);
  const day0=todayStartIndex(data);
  const di=todayDailyIndex(data);
  const end=Math.min(h.time.length, now+24);
  const out=[];
  const add=(iconName,text,tone='',prio=5)=>out.push({iconName,text,tone,prio});

  // ── Lluvia en las próximas 24 h ──
  {
    let s=-1,e=-1,mm=0,pk=0;
    for(let i=now;i<end;i++){
      const wet=(h.precipitation_probability[i]||0)>=45 || (h.precipitation[i]||0)>=0.25;
      if(wet){if(s<0)s=i;e=i;mm+=h.precipitation[i]||0;pk=Math.max(pk,h.precipitation_probability[i]||0);}
      else if(s>=0 && i-e>2)break;
    }
    if(s>=0){
      const cuando = s<=now+1 ? 'ahora mismo'
        : e>s ? `de ${fmtHour(h.time[s])} a ${fmtHour(h.time[e+1]||h.time[e])}`
        : `hacia las ${fmtHour(h.time[s])}`;
      const cuanto = mm>=1 ? ` (unos ${rain(mm)})` : '';
      add('cloud-rain',`Lluvia probable ${cuando}${cuanto}.`, mm>=12?'warn':'', 3);
    }else{
      add('sun',`Sin lluvia en las próximas 24 horas.`,'',7);
    }
  }

  // ── Nubosidad: cambia a lo largo del día ──
  {
    const nowCloud=c.cloud_cover ?? h.cloud_cover[now] ?? 0;
    const later=avg(h.cloud_cover, Math.min(end,now+7), Math.min(end,now+11));
    if(nowCloud>=60 && later<=35) add('sun','Va aclarando hacia la tarde.','',6);
    else if(nowCloud<=35 && later>=65) add('cloud','Se nubla después del mediodía.','',6);
  }

  // ── Temperatura: amplitud del día y comparación con ayer ──
  {
    const hi=d.temperature_2m_max[di], lo=d.temperature_2m_min[di];
    const yHiIdx=[day0-24, day0-1];
    const yHi=maxOf(h.temperature_2m, yHiIdx[0], yHiIdx[1]);
    let txt=`Hoy entre ${temp(lo)} y ${temp(hi)}.`;
    if(yHi!=null){
      const dd=Math.round(hi-yHi);
      if(dd>=3) txt=`Máxima de ${temp(hi)}, ${dd}° más que ayer.`;
      else if(dd<=-3) txt=`Máxima de ${temp(hi)}, ${-dd}° menos que ayer.`;
    }
    add('thermometer',txt,'',6);
    if(lo<=6 && !agroOn()) add('thermometer-down',`Noche fría: baja hasta ${temp(lo)}.`,'',5);
  }

  // ── Viento: pico y rotación ──
  {
    let pk=0,pkAt=now;
    for(let i=now;i<Math.min(h.time.length,now+14);i++){ if(h.wind_speed_10m[i]>pk){pk=h.wind_speed_10m[i];pkAt=i;} }
    const nowW=c.wind_speed_10m;
    if(pk>=25 && pk>nowW+8) add('wind',`El viento arrecia hacia ${fmtHour(h.time[pkAt])}, hasta ${wind(pk)}.`, pk>=45?'warn':'', 4);
    const d0=card8(h.wind_direction_10m[now]), d1=card8(h.wind_direction_10m[Math.min(h.time.length-1,now+8)]);
    if(d0!==d1) add('compass',`El viento rota de ${d0} a ${d1} en el correr del día.`,'',7);
  }

  if(agroOn()){
    const prof=getProfile(state.activeProfileId);
    // ── Delta-T ahora ──
    const dt=deltaT(c.temperature_2m,c.relative_humidity_2m);
    if(dt<2) add('et0',`Delta-T en ${dt.toFixed(1)}: muy bajo, la gota casi no evapora (riesgo de deriva).`,'warn',3);
    else if(dt>8) add('et0',`Delta-T en ${dt.toFixed(1)}: alto, la gota se evapora antes de llegar al objetivo.`,'warn',3);
    else add('et0',`Delta-T en ${dt.toFixed(1)}: dentro de lo ideal para pulverizar.`,'ok',5);

    // ── Inversión térmica ──
    const inv=inversionSeries(h);
    let is=-1,ie=-1;
    for(let i=now;i<Math.min(h.time.length,now+18);i++){ if(inv[i]?.flag){if(is<0)is=i;ie=i;} else if(is>=0)break; }
    if(is>=0){
      const txt = ie>is ? `de ${fmtHour(h.time[is])} a ${fmtHour(h.time[ie+1]||h.time[ie])}` : `alrededor de ${fmtHour(h.time[is])}`;
      add('layers',`Probable inversión térmica ${txt} — no apliques en ese rango.`,'warn',2);
    }

    // ── Helada esta noche ──
    const frost=(frostByDay(data,state.alerts.frostThreshold)[di+1]||frostByDay(data,state.alerts.frostThreshold)[di]);
    if(frost && frost.level!=='sin'){
      add('thermometer-down',`${frost.level==='fuerte'?'Helada fuerte':'Riesgo de helada'} esta noche: mínima ${temp(frost.min)} cerca de las ${fmtHour(frost.minAt)}.`, frost.level==='fuerte'?'warn':'', 1);
    }

    // ── Ventana de aplicación del perfil activo ──
    const scored=evaluateRange(data,prof,now,24);
    if(scored.length){
      const blocks=bestBlocks(scored,{minLen:2});
      if(scored[0].state!=='rojo'){
        const until=blocks[0]?fmtHour(h.time[blocks[0].to]):null;
        add(prof.icon,`Buen momento para ${prof.name.toLowerCase()}${until?` hasta las ${until}`:' ahora'}.`,'ok',3);
      }else if(blocks[0]){
        add(prof.icon,`Ventana para ${prof.name.toLowerCase()}: de ${fmtHour(h.time[blocks[0].from])} a ${fmtHour(h.time[blocks[0].to])}.`,'',4);
      }else{
        const r=scored[0].reasons[0];
        add(prof.icon,`Hoy no hay ventana para ${prof.name.toLowerCase()}${r?` (${r.label.toLowerCase()}: ${r.detail})`:''}.`,'',4);
      }
    }
  }

  // ── Lo que viene (próximos 3 días) ──
  {
    const rainNext=[1,2,3].find(k=> (d.precipitation_sum[di+k]||0)>=6 && (d.precipitation_sum[di]||0)<3);
    if(rainNext) add('calendar',`${dayName(d.time[di+rainNext])} llega la lluvia (~${rain(d.precipitation_sum[di+rainNext])}).`,'',6);
    const hiToday=d.temperature_2m_max[di];
    const drop=[1,2,3].find(k=> (hiToday - d.temperature_2m_max[di+k])>=6);
    if(drop && !rainNext) add('calendar',`${dayName(d.time[di+drop])} refresca: la máxima cae a ${temp(d.temperature_2m_max[di+drop])}.`,'',7);
  }

  return out.sort((a,b)=>a.prio-b.prio).slice(0,7);
}

// ── Digest acotado a un día concreto del pronóstico (para Semana / Por hora) ──
export function dayDigest(data,dayIdx){
  if(!data)return [];
  const h=data.hourly, d=data.daily;
  const date=d.time[dayIdx];
  const s=h.time.findIndex(t=>t.slice(0,10)===date);
  if(s<0)return [];
  const e=Math.min(h.time.length,s+24);
  const out=[]; const add=(i,t,tone='',p=5)=>out.push({iconName:i,text:t,tone,prio:p});

  // temperatura + vs día previo
  {
    const hi=d.temperature_2m_max[dayIdx], lo=d.temperature_2m_min[dayIdx];
    const prevHi=dayIdx>0?d.temperature_2m_max[dayIdx-1]:null;
    let txt=`Entre ${temp(lo)} y ${temp(hi)}.`;
    if(prevHi!=null){
      const dd=Math.round(hi-prevHi);
      if(dd>=3)txt=`Máxima ${temp(hi)}, ${dd}° más cálido que el día anterior.`;
      else if(dd<=-3)txt=`Máxima ${temp(hi)}, ${-dd}° más fresco que el día anterior.`;
    }
    add('thermometer',txt,'',5);
  }
  // lluvia
  {
    let ws=-1,we=-1,mm=0;
    for(let i=s;i<e;i++){
      const wet=(h.precipitation_probability[i]||0)>=45||(h.precipitation[i]||0)>=0.25;
      if(wet){if(ws<0)ws=i;we=i;mm+=h.precipitation[i]||0;}
      else if(ws>=0&&i-we>2)break;
    }
    if(ws>=0){
      const cuando = we>ws ? `de ${fmtHour(h.time[ws])} a ${fmtHour(h.time[we+1]||h.time[we])}` : `hacia las ${fmtHour(h.time[ws])}`;
      add('cloud-rain',`Lluvia probable ${cuando}${mm>=1?` (~${rain(mm)})`:''}.`, mm>=12?'warn':'',4);
    }
    else add('sun','Día sin lluvia.','',7);
  }
  // viento
  {
    let pk=0,pkAt=s;
    for(let i=s;i<e;i++)if(h.wind_speed_10m[i]>pk){pk=h.wind_speed_10m[i];pkAt=i;}
    const dir=card8(h.wind_direction_10m[pkAt]);
    if(pk>=25)add('wind',`Viento hasta ${wind(pk)} del ${dir} hacia ${fmtHour(h.time[pkAt])}.`, pk>=45?'warn':'',5);
    else add('wind',`Viento flojo, máx ${wind(pk)} del ${dir}.`,'',7);
  }

  if(agroOn()){
    const prof=getProfile(state.activeProfileId);
    const frost=frostByDay(data,state.alerts.frostThreshold)[dayIdx];
    if(frost&&frost.level!=='sin')add('thermometer-down',`${frost.level==='fuerte'?'Helada fuerte':'Riesgo de helada'} esa noche: ${temp(frost.min)} cerca de las ${fmtHour(frost.minAt)}.`, frost.level==='fuerte'?'warn':'',1);
    const inv=inversionSeries(h); let iv=0;
    for(let i=s;i<e;i++)if(inv[i]?.flag)iv++;
    if(iv>=2)add('layers',`${iv} h con probable inversión térmica (de noche).`,'warn',3);
    const roll=dayRollup(data,prof,dayIdx);
    if(roll.best)add(prof.icon,`Mejor franja para ${prof.name.toLowerCase()}: ${fmtHour(h.time[roll.best.from])} a ${fmtHour(h.time[roll.best.to])}.`,'ok',2);
    else add(prof.icon,`Sin ventana para ${prof.name.toLowerCase()} ese día.`,'',4);
    const midDt=deltaT(h.temperature_2m[s+13]??h.temperature_2m[s],h.relative_humidity_2m[s+13]??h.relative_humidity_2m[s]);
    add('et0',`Delta-T al mediodía ~${midDt.toFixed(1)} (${midDt>=2&&midDt<=8?'ideal':midDt<2?'muy bajo':'alto'}).`, (midDt<2||midDt>8)?'warn':'ok',6);
  }
  return out.sort((a,b)=>a.prio-b.prio).slice(0,agroOn()?6:4);
}

// ── helpers ──
function avg(a,s,e){let n=0,t=0;for(let i=s;i<e;i++){if(a[i]!=null){t+=a[i];n++;}}return n?t/n:0;}
function maxOf(a,s,e){let m=null;for(let i=Math.max(0,s);i<=e && i<a.length;i++){if(a[i]!=null && (m==null||a[i]>m))m=a[i];}return m;}
const C8=['norte','noreste','este','sureste','sur','suroeste','oeste','noroeste'];
function card8(deg){return C8[Math.round(((deg%360)/45))%8];}
const DN=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
function dayName(dstr){const x=new Date(dstr+'T12:00');return 'El '+DN[x.getDay()];}
