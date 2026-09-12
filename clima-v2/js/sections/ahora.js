// "Ahora": condición actual, titular del día, alertas y detalle inmediato.
import {state,activeData,activeLocation,agroOn} from '../state.js';
import {nowHourIndex,todayDailyIndex,wmoLabel} from '../weather.js';
import {temp,wind,pct,cardinal,fmtHour,hours as fmtHours} from '../format.js';
import {buildDigest} from '../digest.js';
import {buildAlerts} from '../alerts.js';
import {sunArcSVG} from '../sun-arc.js';
import {fa} from '../fa.js';
import {statTile,digestList,alertBar,weatherIcon} from './common.js';

export const label='Ahora';
export const navIcon='now';

export function render(root){
  const data=activeData();
  const loc=activeLocation();
  if(!loc){
    root.innerHTML=`<div class="empty-state">
      <span class="empty-ic">${fa('location-dot')}</span>
      <p>Elegí una ubicación para ver el clima.</p>
      <button class="btn-primary" id="empty-pick">Buscar ubicación</button>
    </div>`;
    root.querySelector('#empty-pick').addEventListener('click',()=>window.dispatchEvent(new CustomEvent('open-locations')));
    return;
  }
  if(!data){
    root.innerHTML=`<div class="empty-state"><span class="empty-ic">${fa('refresh')}</span><p>Cargando pronóstico…</p></div>`;
    return;
  }
  const c=data.current, d=data.daily;
  const now=nowHourIndex(data), di=todayDailyIndex(data);
  const digest=buildDigest(data);
  const lede=digest[0], rest=digest.slice(1);
  const alerts=buildAlerts(data);

  root.innerHTML=`
  <section class="hero">
    <div class="hero-main">
      <div class="hero-cond">
        <span class="hero-icon">${weatherIcon(c.weather_code,c.is_day,84)}</span>
        <div class="hero-tv">
          <span class="hero-temp">${temp(c.temperature_2m)}</span>
          <span class="hero-label">${wmoLabel(c.weather_code)} · sensación ${temp(c.apparent_temperature)}</span>
        </div>
      </div>
      ${lede?`<p class="hero-lede"><span class="hero-lede-ic">${fa(lede.iconName)}</span>${lede.text}</p>`:''}
      ${alertBar(alerts)}
      ${digestList(rest)}
    </div>
    <aside class="hero-side">
      <div class="side-card">
        ${sunArcSVG({sunrise:d.sunrise[di],sunset:d.sunset[di],nextSunrise:d.sunrise[di+1],prevSunset:d.sunset[di-1]})}
      </div>
      <div class="stat-grid">
        ${statTile('wind','Viento',`${wind(c.wind_speed_10m)} ${cardinal(c.wind_direction_10m)}`)}
        ${statTile('gust','Ráfagas',wind(c.wind_gusts_10m))}
        ${statTile('droplet','Humedad',pct(c.relative_humidity_2m))}
        ${statTile('gauge','Presión',`${Math.round(c.pressure_msl)} hPa`)}
        ${statTile('uv','Índice UV',Math.round(data.daily.uv_index_max[di]))}
        ${statTile('sunrise','Amanecer',fmtHour(d.sunrise[di]))}
        ${statTile('sunset','Atardecer',fmtHour(d.sunset[di]))}
        ${statTile('clock','Luz del día',fmtHours(d.daylight_duration[di]))}
      </div>
    </aside>
  </section>`;
}
