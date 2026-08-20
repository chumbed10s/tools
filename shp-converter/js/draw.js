// Interacción genérica de dibujo de polígono sobre el mapa: click = vértice,
// click en el primer punto (o botón Finalizar) = cerrar, Esc = cancelar.
// La usan tanto "Dibujar zona sensible" (zones.js) como "Dibujar lote" (map.js).
import {map} from './map.js';
import {setStatus} from './ui.js';

let active=false,pts=[],line=null,dots=[],onFinish=null,drawColor='#f97316';

export function startPolygonDraw({color='#f97316',onFinish:finishCb}){
  if(active){cancelPolygonDraw();return;}
  active=true;pts=[];dots=[];line=null;onFinish=finishCb;drawColor=color;
  setStatus('warn','Click = agregar vértice · Click en el 1er punto o Finalizar para cerrar · Esc = cancelar');
  map.getContainer().style.cursor='crosshair';
  const fb=document.createElement('div');
  fb.id='draw-fb';
  fb.className='draw-fb';
  fb.innerHTML='<button class="draw-fb-btn draw-fb-ok" onclick="finishPolygonDraw()"><i class="fa-solid fa-check"></i> Finalizar</button>'
    +'<button class="draw-fb-btn draw-fb-cancel" onclick="cancelPolygonDraw()"><i class="fa-solid fa-xmark"></i> Cancelar</button>';
  document.getElementById('map').appendChild(fb);
  map.on('click',onMapClick);
  document.addEventListener('keydown',onKey);
}

function onMapClick(e){
  if(!active)return;
  const pt=[e.latlng.lat,e.latlng.lng];
  if(pts.length>=3){
    const f=pts[0];
    const d=Math.hypot((pt[0]-f[0])*111320,(pt[1]-f[1])*111320*Math.cos(f[0]*Math.PI/180));
    if(d<40){finishPolygonDraw();return;}
  }
  pts.push(pt);
  const dot=L.circleMarker(e.latlng,{radius:5,fillColor:drawColor,fillOpacity:1,color:'#fff',weight:1.5,interactive:pts.length===1}).addTo(map);
  if(pts.length===1)dot.on('click',ev=>{L.DomEvent.stopPropagation(ev);finishPolygonDraw();});
  dots.push(dot);
  if(line)map.removeLayer(line);
  if(pts.length>1)line=L.polyline([...pts,pts[0]],{color:drawColor,dashArray:'6,4',weight:2}).addTo(map);
}

export function finishPolygonDraw(){
  if(!active)return;
  if(pts.length<3){setStatus('warn','Necesitás mínimo 3 puntos');return;}
  const result=[...pts];
  const cb=onFinish;
  cleanup();
  cb?.(result);
}

export function cancelPolygonDraw(){cleanup();setStatus('warn','Dibujo cancelado');}

function onKey(e){if(e.key==='Escape')cancelPolygonDraw();if(e.key==='Enter')finishPolygonDraw();}

function cleanup(){
  active=false;
  map.off('click',onMapClick);
  document.removeEventListener('keydown',onKey);
  map.getContainer().style.cursor='';
  dots.forEach(d=>map.removeLayer(d));
  if(line)map.removeLayer(line);
  dots=[];line=null;pts=[];onFinish=null;
  document.getElementById('draw-fb')?.remove();
}
