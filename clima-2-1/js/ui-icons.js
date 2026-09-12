// Íconos de UI: Font Awesome (vía CDN, cargado en index.html) — los íconos de
// clima siguen siendo Meteocons (js/icons.js), esto es solo el chrome de la app.
const MAP={
  'chevron-down':'chevron-down','location-dot':'location-dot','gear':'gear',
  'arrows-rotate':'arrows-rotate','magnifying-glass':'magnifying-glass',
  'crosshairs':'crosshairs','xmark':'xmark','plus':'plus','pen':'pen',
  'check':'check','trash':'trash','play':'play','pause':'pause',
  'arrow-up':'arrow-up','arrow-down':'arrow-down','triangle-exclamation':'triangle-exclamation',
  'droplet':'droplet','wind':'wind','sun':'sun','moon':'moon','snowflake':'snowflake',
  'temperature-half':'temperature-half','circle-info':'circle-info','clock':'clock',
  'map':'map','chart-line':'chart-line','cloud-rain':'cloud-rain','eye':'eye',
  'gauge':'gauge-high','layer-group':'layer-group','wind-gust':'wind','cloud':'cloud',
};

export function icon(name,{size=16,cls='',style='solid',color=''}={}){
  const fa=MAP[name]||name;
  return `<i class="fa-${style} fa-${fa} ui-ic ${cls}" style="font-size:${size}px${color?`;color:${color}`:''}" aria-hidden="true"></i>`;
}
