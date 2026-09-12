// Minimapa híbrido (satélite + etiquetas) sin API key: dos capas <img> superpuestas
// de los servicios públicos de ArcGIS (World_Imagery + Reference/World_Boundaries_and_Places).
// Son <img>, no fetch, así que no hace falta CORS para mostrarlas. Se pide siempre a una
// resolución fija (más grande que el contenedor) y se muestra responsive con CSS.
const IMAGERY='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';
const LABELS='https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/export';

export function miniMapHTML(lat,lon,{reqWidth=800,reqHeight=200,spanDeg=0.018,className='minimap'}={}){
  const latSpan=spanDeg;
  const lonSpan=spanDeg*(reqWidth/reqHeight)/Math.max(.15,Math.cos(lat*Math.PI/180));
  const bb=[lon-lonSpan,lat-latSpan,lon+lonSpan,lat+latSpan].join(',');
  const common=`bbox=${bb}&bboxSR=4326&imageSR=102100&size=${reqWidth},${reqHeight}&format=png32&f=image`;
  return`<span class="${className}">
    <img class="minimap-layer" src="${IMAGERY}?${common}" width="${reqWidth}" height="${reqHeight}" alt="" loading="lazy">
    <img class="minimap-layer" src="${LABELS}?${common}&transparent=true" width="${reqWidth}" height="${reqHeight}" alt="" loading="lazy">
    <span class="minimap-pin"></span>
  </span>`;
}
