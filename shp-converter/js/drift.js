// Motor de deriva: para la hora activa, identifica TODOS los tramos del borde
// del lote que quedan a favor del viento (no una única línea — con viento
// diagonal pueden ser dos lados a la vez) y proyecta el cono de deriva desde
// esos tramos hacia las zonas sensibles.
import {state} from './state.js';
import {map} from './map.js';
import {wxIconHTML,wxStatus,wxColor} from './weather.js';
import {renderZonesList} from './zones.js';

const LAT2M=111320;
const lon2m=lat=>111320*Math.cos(lat*Math.PI/180);

export function polyCentroid(lls){
  // Si el anillo viene cerrado (1er punto == último), no contar ese punto dos veces:
  // promediarlo así sesga el centroide hacia esa esquina.
  const pts=(lls.length>1&&lls[0][0]===lls[lls.length-1][0]&&lls[0][1]===lls[lls.length-1][1])?lls.slice(0,-1):lls;
  return[pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length];
}

function pointInPolygon(pt,poly){
  const[py,px]=pt;
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const[yi,xi]=poly[i],[yj,xj]=poly[j];
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}

// Área con signo (shoelace) — su signo da el sentido de recorrido del anillo,
// que es lo único que hace falta para saber de qué lado de cada arista queda
// "afuera" del polígono (funciona con cualquier forma, cóncava o convexa,
// a diferencia de comparar contra el centroide).
function ringSignedArea(pts){
  let a=0;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++)a+=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1];
  return a/2;
}

// Un borde real (trazado a mano o por GPS) tiene micro-zigzags de un par de metros
// que, evaluados arista por arista, hacen que la normal "a favor del viento" entre y
// salga todo el tiempo — fragmentando el resultado en decenas de tramos minúsculos en
// vez de mostrar el lado del lote que realmente importa. Se simplifica el contorno
// (Douglas-Peucker, en metros locales) antes de clasificar aristas, para que solo
// los quiebres reales del límite (esquinas, muescas) generen un tramo nuevo.
const SIMPLIFY_TOL_M=6;
function dpSimplify(pts,tol){
  if(pts.length<3)return pts;
  const[x1,y1]=pts[0],[x2,y2]=pts[pts.length-1];
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  let maxD=0,idx=0;
  for(let i=1;i<pts.length-1;i++){
    const[x,y]=pts[i];
    const d=Math.abs(dy*x-dx*y+x2*y1-y2*x1)/len;
    if(d>maxD){maxD=d;idx=i;}
  }
  if(maxD>tol){
    const left=dpSimplify(pts.slice(0,idx+1),tol);
    const right=dpSimplify(pts.slice(idx),tol);
    return left.slice(0,-1).concat(right);
  }
  return[pts[0],pts[pts.length-1]];
}
function simplifyRing(ring,tol){
  const n=ring.length;
  if(n<=4)return ring;
  const mid=Math.floor(n/2);
  const half1=dpSimplify(ring.slice(0,mid+1),tol);
  const half2=dpSimplify(ring.slice(mid),tol);
  return half1.slice(0,-1).concat(half2);
}

// Bordes del lote a favor del viento (pueden ser varias cadenas separadas) + una
// proyección rectangular por cadena: el mismo ancho del borde real, trasladada
// en línea recta driftKm hacia donde sopla el viento (sin ensanchar ni angostar).
function fieldRiskGeometry(ringLatLng,windToDeg,driftKm){
  const ring=(ringLatLng[0][0]===ringLatLng[ringLatLng.length-1][0]&&ringLatLng[0][1]===ringLatLng[ringLatLng.length-1][1])
    ?ringLatLng.slice(0,-1):ringLatLng;
  const m=ring.length;
  if(m<3)return null;

  const lat0=ring.reduce((s,p)=>s+p[0],0)/m;
  const lon0=ring.reduce((s,p)=>s+p[1],0)/m;
  const m2lon=lon2m(lat0);
  const toXY=([lat,lon])=>[(lon-lon0)*m2lon,(lat-lat0)*LAT2M];
  const toLL=(x,y)=>[lat0+y/LAT2M,lon0+x/m2lon];

  const pts=ring.map(toXY);
  const ccw=ringSignedArea(pts)>0;

  // Simplificar antes de clasificar aristas — así el ruido/zigzag de un borde real no
  // fragmenta el resultado (ver comentario de simplifyRing).
  const simPts=simplifyRing(pts,SIMPLIFY_TOL_M);
  const sm=simPts.length;

  const theta=windToDeg*Math.PI/180;
  const windX=Math.sin(theta),windY=Math.cos(theta); // vector unitario hacia donde sopla el viento

  // Clasificar cada arista por su normal saliente real (según el sentido del anillo, no por distancia al centroide)
  const edges=simPts.map((a,i)=>{
    const b=simPts[(i+1)%sm];
    const ex=b[0]-a[0],ey=b[1]-a[1];
    const len=Math.hypot(ex,ey)||1;
    const nx=(ccw?ey:-ey)/len,ny=(ccw?-ex:ex)/len;
    const downwind=(nx*windX+ny*windY)>1e-6;
    return{a,b,downwind};
  });

  if(!edges.some(e=>e.downwind))return{chainsLatLng:[],conesLatLng:[]};

  // Agrupar aristas "a favor del viento" en cadenas contiguas (pueden ser varias, ej. Norte + Oeste con viento del SE)
  const chains=[];
  let cur=[];
  for(let k=0;k<sm;k++){
    if(edges[k].downwind)cur.push(edges[k]);
    else if(cur.length){chains.push(cur);cur=[];}
  }
  if(cur.length){
    if(chains.length&&edges[0].downwind)chains[0]=cur.concat(chains[0]);
    else chains.push(cur);
  }
  const chainVerts=chains.map(chain=>[chain[0].a,...chain.map(e=>e.b)]);
  const chainsLatLng=chainVerts.map(vs=>vs.map(([x,y])=>toLL(x,y)));

  // Proyección rectangular por cadena: cada vértice del borde real, trasladado en línea
  // recta driftKm hacia el viento — mismo ancho de punta a punta, sin cono.
  const shiftX=windX*driftKm*1000,shiftY=windY*driftKm*1000;
  const conesLatLng=chainVerts.map(vs=>{
    const far=vs.map(([x,y])=>[x+shiftX,y+shiftY]);
    const rectPts=[...vs,...far.slice().reverse()];
    return rectPts.map(([x,y])=>toLL(x,y));
  });

  return{chainsLatLng,conesLatLng};
}

// Un anillo íntegramente contenido dentro de otro anillo de la misma capa es un
// hueco/obstáculo (ej. un árbol sin sembrar) cargado como feature aparte, no un
// límite externo real — se excluye para que solo el borde real del lote participe
// del cálculo de deriva. Se prueban todos los vértices (no un centroide aproximado,
// que un anillo cerrado con el primer punto repetido puede sesgar hacia una esquina).
function fieldRingsOf(lyr){
  const allRings=[];
  lyr.gj.features.forEach(f=>{
    const g=f.geometry;if(!g)return;
    if(g.type==='Polygon')allRings.push(g.coordinates[0].map(c=>[c[1],c[0]]));
    else if(g.type==='MultiPolygon')g.coordinates.forEach(p=>allRings.push(p[0].map(c=>[c[1],c[0]])));
  });
  return allRings.filter((ring,i)=>
    !allRings.some((other,j)=>i!==j&&ring.every(pt=>pointInPolygon(pt,other)))
  );
}

export function updateMapForHour(idx){
  if(!state.wxActive.data)return;
  const h=state.wxActive.data.hourly;
  if(idx<0||idx>=h.time.length)return;
  const speed=Math.round(h.wind_speed_10m[idx]);
  const gust=Math.round(h.wind_gusts_10m[idx]);
  const dir=Math.round(h.wind_direction_10m[idx]);
  const code=h.weather_code[idx];
  const st=wxStatus(speed,gust);
  const color=wxColor(st);
  const {lat,lon,name}=state.wxActive;
  const hour=h.time[idx].slice(11,16);
  const windToDeg=(dir+180)%360;

  // ── Tooltip flotante con la hora y el viento actual ──
  if(state.wxMarkerLayer){state.wxMarkerLayer.remove();state.wxMarkerLayer=null;}
  const tooltipHtml=`<div class="wx-mm ${st}" style="pointer-events:none">
    <div class="wx-mm-top">
      <span class="wx-mm-time">${hour}</span>
      ${wxIconHTML(code)}
      <i class="fa-solid fa-arrow-up wx-mm-dir" style="transform:rotate(${windToDeg}deg)"></i>
      <span class="wx-mm-spd">${speed}</span><span class="wx-mm-unit"> km/h</span>
    </div>
    <div class="wx-mm-name">Ráf ${gust} km/h · ${name}</div>
  </div>`;
  state.wxMarkerLayer=L.marker([lat,lon],{icon:L.divIcon({html:tooltipHtml,className:'',iconAnchor:[0,0]}),interactive:false}).addTo(map);

  // ── Bordes a favor del viento + cono de deriva por cada lote de la capa activa ──
  state.driftLayers.forEach(l=>map.removeLayer(l));
  state.driftLayers=[];
  const activeLyr=state.layers.find(l=>l.id===state.wxActive.layerId);
  const cones=[];
  if(activeLyr){
    fieldRingsOf(activeLyr).forEach(ring=>{
      const geo=fieldRiskGeometry(ring,windToDeg,state.driftKm);
      if(!geo)return;
      geo.chainsLatLng.forEach(chain=>{
        const edgeLine=L.polyline(chain,{color,weight:5,opacity:.95}).addTo(map);
        state.driftLayers.push(edgeLine);
      });
      geo.conesLatLng.forEach(coneLatLng=>{
        const cone=L.polygon(coneLatLng,{color,fillColor:color,fillOpacity:.12,weight:1.5,opacity:.6,dashArray:'4,4'}).addTo(map);
        state.driftLayers.push(cone);
        cones.push(coneLatLng);
      });
    });
  }

  // ── Riesgo de cada zona sensible: ¿algún vértice o su centroide cae en algún cono? ──
  state.sensitiveZones.forEach(z=>{
    const testPts=[...z.latlngs,polyCentroid(z.latlngs)];
    const atRisk=cones.some(cone=>testPts.some(pt=>pointInPolygon(pt,cone)));
    z.atRisk=atRisk;
    if(z.polygon){
      z.polygon.setStyle(atRisk
        ?{color:'#ef4444',fillColor:'#ef4444',fillOpacity:.28,weight:3}
        :{color:'#f97316',fillColor:'#f97316',fillOpacity:.18,weight:2});
    }
    if(z.warnMarker){z.warnMarker.remove();z.warnMarker=null;}
    if(atRisk){
      const center=polyCentroid(z.latlngs);
      const wDiv='<i class="fa-solid fa-triangle-exclamation zone-risk-badge" style="font-size:20px;color:#ef4444;filter:drop-shadow(0 0 4px rgba(239,68,68,.9))"></i>';
      z.warnMarker=L.marker(center,{icon:L.divIcon({html:wDiv,className:'',iconAnchor:[10,10]}),interactive:false}).addTo(map);
    }
  });
  renderZonesList();
}

export function setDriftRadius(val){
  state.driftKm=val;
  document.getElementById('drift-val').textContent=val+' km';
  updateMapForHour(state.activeHourIdx);
}
