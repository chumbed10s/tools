// Zonas sensibles: dibujo manual, carga desde SHP y su lista con estado de riesgo.
import {state} from './state.js';
import {map} from './map.js';
import {setStatus} from './ui.js';
import {readSHP} from './shp-io.js';
import {updateMapForHour} from './drift.js';
import {startPolygonDraw} from './draw.js';

export function startDrawZone(){
  startPolygonDraw({color:'#f97316',onFinish:pts=>openZoneModal(pts)});
}

export async function loadShpAsZone(input){
  const file=input.files[0];if(!file)return;
  const buf=await file.arrayBuffer();
  const feats=readSHP(buf).filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));
  if(!feats.length){setStatus('error','No hay polígonos en el SHP');return;}
  const allLls=[];
  feats.forEach(f=>{
    const g=f.geometry;
    const ring=g.type==='Polygon'?g.coordinates[0]:g.coordinates[0][0];
    allLls.push(ring.map(c=>[c[1],c[0]]));
  });
  openZoneModal(allLls[0],true,allLls);
  input.value='';
}

function openZoneModal(lls,multi=false,allLls=null){
  state.pendingZoneLatlngs=multi?allLls:[lls];
  document.getElementById('zone-name-inp').value='';
  const sel=document.getElementById('zone-type-sel');
  sel.innerHTML=[...state.savedTypes,'➕ Nuevo tipo...'].map(t=>`<option value="${t}">${t}</option>`).join('');
  document.getElementById('zone-type-new').style.display='none';
  document.getElementById('zone-modal').style.display='flex';
  setTimeout(()=>document.getElementById('zone-name-inp').focus(),60);
}
export function closeZoneModal(){document.getElementById('zone-modal').style.display='none';state.pendingZoneLatlngs=null;}
export function onZoneTypeChange(){
  const sel=document.getElementById('zone-type-sel').value;
  document.getElementById('zone-type-new').style.display=sel==='➕ Nuevo tipo...'?'block':'none';
}
export function confirmZone(){
  const name=document.getElementById('zone-name-inp').value.trim()||'Zona';
  let type=document.getElementById('zone-type-sel').value;
  if(type==='➕ Nuevo tipo...'){
    type=document.getElementById('zone-type-new').value.trim()||'Otro';
    if(!state.savedTypes.includes(type))state.savedTypes.push(type);
  }
  if(!state.pendingZoneLatlngs?.length)return;
  state.pendingZoneLatlngs.forEach((lls,i)=>{
    const id=state.zoneId++;
    const zoneName=state.pendingZoneLatlngs.length>1?`${name} ${i+1}`:name;
    const poly=L.polygon(lls,{color:'#f97316',fillColor:'#f97316',fillOpacity:.2,weight:2}).addTo(map);
    poly.bindTooltip(zoneName,{permanent:true,direction:'center',className:'',offset:[0,0]}).openTooltip();
    state.sensitiveZones.push({id,name:zoneName,type,latlngs:lls,polygon:poly,warnMarker:null,atRisk:false});
  });
  closeZoneModal();
  renderZonesList();
  updateMapForHour(state.activeHourIdx);
}
export function removeZone(id){
  const i=state.sensitiveZones.findIndex(z=>z.id===id);if(i===-1)return;
  const z=state.sensitiveZones[i];
  if(z.polygon)map.removeLayer(z.polygon);
  if(z.warnMarker)map.removeLayer(z.warnMarker);
  state.sensitiveZones.splice(i,1);
  renderZonesList();
}
export function renderZonesList(){
  const el=document.getElementById('zones-list');
  if(!el)return;
  if(!state.sensitiveZones.length){el.innerHTML='<div class="zone-empty">Sin zonas. Dibujá o cargá un SHP.</div>';return;}
  el.innerHTML=state.sensitiveZones.map(z=>`
    <div class="zone-card${z.atRisk?' zone-at-risk':''}">
      <div class="zone-swatch"></div>
      <div class="zone-info">
        <div class="zone-name">${z.atRisk?'<i class="fa-solid fa-triangle-exclamation"></i> ':''}${z.name}</div>
        <div class="zone-type">${z.type}</div>
      </div>
      <button class="ibtn" onclick="removeZone(${z.id})" title="Eliminar"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
}
