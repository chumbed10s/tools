// Íconos de interfaz: Font Awesome 7 Free Solid (vendorizado en vendor/, sin red).
// Uso: fa('wind') → '<i class="fa-solid fa-wind" aria-hidden="true"></i>'
// Los íconos de condición climática (sol/nube/lluvia grandes) siguen siendo los
// SVG de Meteocons en assets/weather/ — ver icons.js. Esto es sólo para chrome de UI,
// tiles de datos y viñetas del digest/alertas.

const MAP={
  // datos/clima
  droplet:'droplet', wind:'wind', gust:'wind', gauge:'gauge-high',
  thermometer:'temperature-half', 'thermometer-up':'temperature-arrow-up',
  'thermometer-down':'temperature-arrow-down', eye:'eye',
  sunrise:'arrow-up', sunset:'arrow-down', sun:'sun', moon:'moon', uv:'sun-plant-wilt',
  cloud:'cloud', 'cloud-rain':'cloud-rain', 'cloud-bolt':'cloud-bolt',
  snowflake:'snowflake', fog:'smog', radiation:'radiation', soil:'layer-group',
  dew:'droplet', et0:'arrow-right-arrow-left', compass:'compass',
  // navegación/interfaz
  clock:'clock', calendar:'calendar-days', list:'list', grid:'table-cells',
  info:'circle-info', x:'xmark', close:'xmark',
  'chevron-down':'chevron-down', 'chevron-right':'chevron-right', 'chevron-left':'chevron-left',
  'chevron-up':'chevron-up',
  'arrow-up':'arrow-up', refresh:'arrows-rotate', search:'magnifying-glass',
  'location-dot':'location-dot', crosshairs:'location-crosshairs', bell:'bell',
  sliders:'sliders', gear:'gear', check:'check', alert:'triangle-exclamation',
  layers:'layer-group', bolt:'bolt',
  // navegación de secciones
  now:'circle-dot', hourly:'chart-line', week:'calendar-week', field:'tractor', settings:'gear',
  // perfiles de tarea agro
  drone:'satellite-dish', sprayer:'spray-can', seed:'seedling', wheat:'wheat-awn',
  mountain:'mountain-sun', plus:'plus', trash:'trash', reset:'rotate-left',
};

export function fa(name,{size,cls=''}={}){
  const n=MAP[name]||name;
  const style=size?` style="font-size:${size}px"`:'';
  return `<i class="fa-solid fa-${n} ${cls}"${style} aria-hidden="true"></i>`;
}
export const hasFa=name=>name in MAP;
