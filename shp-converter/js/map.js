// Mapa Leaflet, capas y su render en el panel "Capas".
import {state,LPLT} from './state.js';
import {featureHa,totalHa,fmtHa,fmtNum,numericFields,buildClasses,getClassColor} from './geo.js';
import {openWxForLayer} from './weather.js';
import {openExportModal} from './ui.js';
import {startPolygonDraw} from './draw.js';

const osmL=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:20,crossOrigin:true});
const satL=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:20,crossOrigin:true});
// Instancia de imagery propia para el grupo híbrido: reusar la misma capa `satL` acá y como
// entrada independiente del control rompía el toggle de Leaflet (satL dejaba de renderizar).
const hybridImgL=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri',maxZoom:20,crossOrigin:true});
const hybridLabelsL=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,crossOrigin:true});
const hybridL=L.layerGroup([hybridImgL,hybridLabelsL]);
export const map=L.map('map',{layers:[hybridL]}).setView([-34,-63],5);
L.control.layers({
  '<i class="fa-solid fa-road"></i> Calles':osmL,
  '<i class="fa-solid fa-satellite"></i> Satélite':satL,
  '<i class="fa-solid fa-layer-group"></i> Híbrido':hybridL,
},{},{position:'topright'}).addTo(map);

export function geomCls(t=''){const s=t.toLowerCase();if(s.includes('polygon'))return'poly';if(s.includes('line')||s.includes('string'))return'line';return'pt';}

function makeMapLayer(gj,lyr){
  const color=lyr.color;
  return L.geoJSON(gj,{
    style:f=>{
      if(lyr.clsData){const val=parseFloat(f.properties?.[lyr.choroField]);if(!isNaN(val)){const c=getClassColor(val,lyr.clsData);return{color:'rgba(0,0,0,0.3)',fillColor:c,fillOpacity:.85,weight:.8};}}
      const cls=geomCls(f.geometry?.type);
      if(cls==='poly')return{color,fillColor:color,fillOpacity:.18,weight:2,opacity:.9};
      if(cls==='line')return{color,weight:3,opacity:.9};
      return{color,weight:2};
    },
    pointToLayer:(f,ll)=>L.circleMarker(ll,{fillColor:lyr.clsData&&lyr.choroField?getClassColor(parseFloat(f.properties?.[lyr.choroField]),lyr.clsData)||color:color,color:'#fff',weight:1.5,radius:6,fillOpacity:.92}),
    onEachFeature:(f,layer)=>{
      const ha=featureHa(f);
      const rows=[];
      if(ha>0)rows.push(`<tr><td class="pk">área</td><td class="pv pha">${fmtHa(ha)} ha</td></tr>`);
      if(lyr.choroField){const val=f.properties?.[lyr.choroField];if(val!==undefined&&val!==null&&val!==''){const c=getClassColor(parseFloat(val),lyr.clsData);const dot=c?`<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c};margin-right:4px;vertical-align:middle"></span>`:'';rows.push(`<tr><td class="pk">${lyr.choroField}</td><td class="pv pcls">${dot}${parseFloat(val).toFixed(2)}</td></tr>`);}}
      Object.entries(f.properties||{}).filter(([k,v])=>k!==lyr.choroField&&v!==null&&v!==undefined&&v!=='').slice(0,15).forEach(([k,v])=>rows.push(`<tr><td class="pk">${k}</td><td class="pv">${String(v).slice(0,100)}</td></tr>`));
      if(rows.length)layer.bindPopup(`<table class="ptbl">${rows.join('')}</table>`,{maxWidth:300});
    }
  });
}

export function addLayer(name,gj){
  const color=LPLT[state.colorIdx++%LPLT.length];
  const id=state.layerId++;
  const ha=totalHa(gj),nFeat=gj.features.length;
  const types=[...new Set(gj.features.map(f=>f.geometry?.type).filter(Boolean))];
  const numFields=numericFields(gj);
  const lyr={id,name,gj,color,ha,nFeat,types,numFields,visible:true,choroField:null,clsData:null,mapLyr:null};
  lyr.mapLyr=makeMapLayer(gj,lyr).addTo(map);
  state.layers.push(lyr);
  try{map.fitBounds(lyr.mapLyr.getBounds(),{padding:[40,40]})}catch(_){}
  renderAll();
  return lyr;
}

export function removeLayer(id){const i=state.layers.findIndex(l=>l.id===id);if(i===-1)return;map.removeLayer(state.layers[i].mapLyr);state.layers.splice(i,1);renderAll();}
export function toggleLayer(id){const l=state.layers.find(l=>l.id===id);if(!l)return;l.visible=!l.visible;if(l.visible)l.mapLyr.addTo(map);else map.removeLayer(l.mapLyr);renderAll();}
export function setField(id,field){const l=state.layers.find(l=>l.id===id);if(!l)return;l.choroField=field||null;l.clsData=field?buildClasses(l.gj,field):null;map.removeLayer(l.mapLyr);l.mapLyr=makeMapLayer(l.gj,l).addTo(map);renderAll();}
export function fitLayer(id){const l=state.layers.find(l=>l.id===id);if(!l)return;try{map.fitBounds(l.mapLyr.getBounds(),{padding:[40,40]})}catch(_){}}
export function downloadLayer(id){openExportModal(id);}

// ── Dibujar lote a mano ─────────────────────────────────────
export function startDrawLot(){
  const color=LPLT[state.colorIdx%LPLT.length];
  startPolygonDraw({color,onFinish:pts=>addDrawnLayer(pts)});
}
function addDrawnLayer(pts){
  const ring=pts.map(([lat,lon])=>[lon,lat]);
  ring.push(ring[0]);
  const gj={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]},properties:{}}]};
  state.manualLotCount++;
  addLayer('Lote manual '+state.manualLotCount,gj);
}

export function renderAll(){renderLayers();renderLegend();}

function renderLayers(){
  const el=document.getElementById('llist');
  if(!state.layers.length){el.innerHTML='<div class="layer-empty">Sin capas cargadas</div>';return;}
  el.innerHTML=state.layers.map(lyr=>{
    const haStr=lyr.ha>0?`<div class="lha">${fmtHa(lyr.ha)}</div><div class="lha-lbl">ha totales</div>`:'';
    const typeStr=[...new Set(lyr.types.map(t=>geomCls(t)==='poly'?'Polígonos':geomCls(t)==='line'?'Líneas':'Puntos'))].join(' + ');
    let fieldHtml='';
    if(lyr.numFields.length>0){const opts=['<option value="">— sin campo —</option>',...lyr.numFields.map(f=>`<option value="${f}"${f===lyr.choroField?'selected':''}>${f}</option>`)].join('');fieldHtml=`<div class="field-row"><span class="field-lbl">Campo:</span><select class="field-sel" onchange="setField(${lyr.id},this.value)">${opts}</select></div>`;}
    let clsHtml='';
    if(lyr.clsData){const avg=lyr.clsData.avg!==null?fmtNum(lyr.clsData.avg):'—';const hasHa=lyr.ha>0;clsHtml=`<div class="cls-list"><div class="cls-avg">Prom. pond. <span>${avg} ${lyr.choroField}</span></div>${lyr.clsData.classes.map(c=>`<div class="cls-row"><div class="cls-sq" style="background:${c.color}"></div><div class="cls-label">${c.label}</div><span class="cls-cnt">${hasHa&&c.ha>0?fmtHa(c.ha)+' ha':c.count}</span></div>`).join('')}</div>`;}
    return`<div class="lcard${lyr.visible?'':' hidden'}"><div class="lcard-top"><div class="lswatch" style="background:${lyr.color}"></div><div class="lname" title="${lyr.name}">${lyr.name}</div><div class="lbtns"><button class="ibtn" onclick="toggleLayer(${lyr.id})">${lyr.visible?'<i class="fa-solid fa-eye"></i>':'<i class="fa-solid fa-eye-slash"></i>'}</button><button class="ibtn" onclick="removeLayer(${lyr.id})"><i class="fa-solid fa-xmark"></i></button></div></div><div class="lmeta">${typeStr} · ${lyr.nFeat} features</div>${haStr}${fieldHtml}${clsHtml}<div class="btn-row"><button class="btn-sm" onclick="openWxForLayer(${lyr.id})" id="btn-wx-${lyr.id}"><i class="fa-solid fa-wind"></i> Clima</button><button class="btn-sm" onclick="downloadLayer(${lyr.id})"><i class="fa-solid fa-download"></i> SHP</button><button class="btn-sm" onclick="fitLayer(${lyr.id})"><i class="fa-solid fa-crosshairs"></i></button></div></div>`;
  }).join('');
}

function renderLegend(){
  const leg=document.getElementById('legend'),rows=document.getElementById('leg-rows');
  if(!state.layers.length){leg.classList.remove('visible');return;}
  leg.classList.add('visible');
  rows.innerHTML=state.layers.filter(l=>l.visible).map(lyr=>{
    let d='';
    if(lyr.ha>0)d+=`<div class="leg-lsub">${fmtHa(lyr.ha)} ha · ${lyr.nFeat} features</div>`;
    else d+=`<div class="leg-lsub">${lyr.nFeat} features</div>`;
    if(lyr.clsData){d+=lyr.clsData.classes.map(c=>`<div class="leg-cls-row"><div class="leg-cls-sq" style="background:${c.color}"></div><div class="leg-cls-lbl">${c.label}</div></div>`).join('');if(lyr.clsData.avg!==null)d+=`<div class="leg-avg-lbl">Ø ${fmtNum(lyr.clsData.avg)} ${lyr.choroField}</div>`;}
    return`<div class="leg-layer"><div class="leg-lname"><div class="leg-lswatch" style="background:${lyr.color}"></div>${lyr.name}</div>${d}</div>`;
  }).join('');
}
