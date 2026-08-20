// Lectura y escritura del formato Shapefile binario (.shp/.shx/.dbf/.prj) + empaquetado ZIP.
import JSZip from 'https://esm.sh/jszip@3.10.1?bundle';
import {WGS84_PRJ} from './state.js';

// ── Lectura ──────────────────────────────────────────────
function ringArea(ring){let a=0;for(let i=0,j=ring.length-1;i<ring.length;j=i++)a+=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];return a/2;}
function pointInRing(pt,ring){
  const[px,py]=pt;let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const[xi,yi]=ring[i],[xj,yj]=ring[j];
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function ringContained(inner,outer){return inner.every(pt=>pointInRing(pt,outer));}
// Agrupa los anillos de un registro Polygon en contorno(s) externo(s) + sus huecos.
// No confía en el sentido de giro (CW/CCW) ni en el orden de los anillos en el archivo
// — algunos exportadores no lo respetan — sino en contención geométrica real: el anillo
// más grande que contiene por completo a otro es su contorno externo.
function groupRings(parts){
  const areas=parts.map(r=>Math.abs(ringArea(r)));
  const order=parts.map((_,i)=>i).sort((a,b)=>areas[b]-areas[a]);
  const outerOf=new Array(parts.length).fill(-1);
  order.forEach(i=>{
    for(const j of order){
      if(j===i||outerOf[j]!==-1)continue; // j debe ser en sí mismo un contorno externo
      if(areas[j]<=areas[i])continue;
      if(ringContained(parts[i],parts[j])){outerOf[i]=j;break;}
    }
  });
  const polys=[],polyIdx=new Map();
  order.forEach(i=>{if(outerOf[i]===-1){polyIdx.set(i,polys.length);polys.push([parts[i]]);}});
  order.forEach(i=>{if(outerOf[i]!==-1){const pi=polyIdx.get(outerOf[i]);if(pi!==undefined)polys[pi].push(parts[i]);}});
  return polys;
}
function p2g(parts,st){if(!parts.length)return null;if(st===3)return parts.length===1?{type:'LineString',coordinates:parts[0]}:{type:'MultiLineString',coordinates:parts};if(parts.length===1)return{type:'Polygon',coordinates:parts};const polys=groupRings(parts);return polys.length===1?{type:'Polygon',coordinates:polys[0]}:{type:'MultiPolygon',coordinates:polys};}

export function readSHP(buf){const v=new DataView(buf);const feats=[];let off=100;while(off+8<=buf.byteLength){const cl=v.getInt32(off+4,false)*2;off+=8;if(off+cl>buf.byteLength)break;const rt=v.getInt32(off,true);if(rt===0){off+=cl;continue;}if(rt===1){feats.push({type:'Feature',geometry:{type:'Point',coordinates:[v.getFloat64(off+4,true),v.getFloat64(off+12,true)]},properties:{}});}else if(rt===3||rt===5){const np=v.getInt32(off+36,true),npt=v.getInt32(off+40,true);const parts=[];for(let i=0;i<np;i++)parts.push(v.getInt32(off+44+i*4,true));const pb=off+44+np*4;const pts=[];for(let i=0;i<npt;i++)pts.push([v.getFloat64(pb+i*16,true),v.getFloat64(pb+i*16+8,true)]);feats.push({type:'Feature',geometry:p2g(parts.map((s,i)=>pts.slice(s,parts[i+1]??npt)),rt),properties:{}});}off+=cl;}return feats;}
export function readDBF(buf){const v=new DataView(buf),dec=new TextDecoder('latin1');const nr=v.getInt32(4,true),hs=v.getInt16(8,true),rs=v.getInt16(10,true);const fields=[];let off=32;while(off<hs-1&&v.getUint8(off)!==0x0D){fields.push({name:dec.decode(new Uint8Array(buf,off,11)).replace(/\0.*$/,''),type:String.fromCharCode(v.getUint8(off+11)),len:v.getUint8(off+16)});off+=32;}const recs=[];let ro=hs;for(let i=0;i<nr;i++){const del=v.getUint8(ro);ro++;const rec={};fields.forEach(f=>{const raw=dec.decode(new Uint8Array(buf,ro,f.len)).trim();rec[f.name]=(f.type==='N'||f.type==='F')?(parseFloat(raw)||0):raw;ro+=f.len;});if(del!==0x2A)recs.push(rec);}return recs;}

// ── Escritura ────────────────────────────────────────────
function wH(buf,st,bl,bb){const v=new DataView(buf);v.setInt32(0,9994,false);v.setInt32(24,bl/2,false);v.setInt32(28,1000,true);v.setInt32(32,st,true);[bb.xmin,bb.ymin,bb.xmax,bb.ymax,0,0,0,0].forEach((n,i)=>v.setFloat64(36+i*8,n,true));}
function eXY(g,fn){if(!g)return;switch(g.type){case'Point':fn(g.coordinates[0],g.coordinates[1]);break;case'MultiPoint':case'LineString':g.coordinates.forEach(c=>fn(c[0],c[1]));break;case'MultiLineString':case'Polygon':g.coordinates.forEach(r=>r.forEach(c=>fn(c[0],c[1])));break;case'MultiPolygon':g.coordinates.forEach(p=>p.forEach(r=>r.forEach(c=>fn(c[0],c[1]))));break;}}
function bbF(fs){let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;fs.forEach(f=>eXY(f.geometry,(x,y)=>{if(x<a)a=x;if(y<b)b=y;if(x>c)c=x;if(y>d)d=y}));return{xmin:a,ymin:b,xmax:c,ymax:d};}
function bPt(fs){const pts=[];fs.forEach(f=>{const g=f.geometry;if(g.type==='Point')pts.push({c:g.coordinates,p:f.properties});else if(g.type==='MultiPoint')g.coordinates.forEach(c=>pts.push({c,p:f.properties}))});const C=20,R=28,fl=100+pts.length*R,bb=bbF(fs);const sb=new ArrayBuffer(fl);wH(sb,1,fl,bb);const sv=new DataView(sb);const xb=new ArrayBuffer(100+pts.length*8);wH(xb,1,100+pts.length*8,bb);const xv=new DataView(xb);let so=100,xo=100;pts.forEach((pt,i)=>{xv.setInt32(xo,so/2,false);xv.setInt32(xo+4,C/2,false);xo+=8;sv.setInt32(so,i+1,false);sv.setInt32(so+4,C/2,false);so+=8;sv.setInt32(so,1,true);sv.setFloat64(so+4,pt.c[0],true);sv.setFloat64(so+12,pt.c[1],true);so+=C;});return{shp:new Uint8Array(sb),shx:new Uint8Array(xb),recs:pts.map(p=>({props:p.p}))};}
function bLin(fs,st){const recs=[];fs.forEach(f=>{const g=f.geometry,p=f.properties;if(g.type==='LineString')recs.push({parts:[g.coordinates],props:p});else if(g.type==='MultiLineString')recs.push({parts:g.coordinates,props:p});else if(g.type==='Polygon')recs.push({parts:g.coordinates,props:p});else if(g.type==='MultiPolygon')g.coordinates.forEach(rings=>recs.push({parts:rings,props:p}))});const sz=recs.map(r=>{const np=r.parts.length,npt=r.parts.reduce((s,p)=>s+p.length,0);return{np,npt,cb:44+4*np+16*npt}});const tc=sz.reduce((s,z)=>s+z.cb,0),fl=100+recs.length*8+tc,bb=bbF(fs);const sb=new ArrayBuffer(fl);wH(sb,st,fl,bb);const sv=new DataView(sb);const xb=new ArrayBuffer(100+recs.length*8);wH(xb,st,100+recs.length*8,bb);const xv=new DataView(xb);let so=100,xo=100;recs.forEach((rec,i)=>{const{np,npt,cb}=sz[i];xv.setInt32(xo,so/2,false);xv.setInt32(xo+4,cb/2,false);xo+=8;sv.setInt32(so,i+1,false);sv.setInt32(so+4,cb/2,false);so+=8;sv.setInt32(so,st,true);let rx=Infinity,ry=Infinity,rX=-Infinity,rY=-Infinity;rec.parts.forEach(pt=>pt.forEach(([x,y])=>{if(x<rx)rx=x;if(y<ry)ry=y;if(x>rX)rX=x;if(y>rY)rY=y}));sv.setFloat64(so+4,rx,true);sv.setFloat64(so+12,ry,true);sv.setFloat64(so+20,rX,true);sv.setFloat64(so+28,rY,true);sv.setInt32(so+36,np,true);sv.setInt32(so+40,npt,true);let ps=0;rec.parts.forEach((pt,pi)=>{sv.setInt32(so+44+pi*4,ps,true);ps+=pt.length});let po=so+44+np*4;rec.parts.forEach(pt=>pt.forEach(c=>{sv.setFloat64(po,c[0],true);sv.setFloat64(po+8,c[1],true);po+=16}));so+=cb;});return{shp:new Uint8Array(sb),shx:new Uint8Array(xb),recs:recs.map(r=>({props:r.props}))};}
function bDBF(recs){const enc=new TextEncoder(),fm=new Map();recs.forEach(r=>Object.keys(r.props||{}).forEach(k=>{const key=k.slice(0,10);if(!fm.has(key))fm.set(key,5)}));recs.forEach(r=>(Object.entries(r.props||{})).forEach(([k,v])=>{const key=k.slice(0,10);if(!fm.has(key))return;const s=v===null||v===undefined?'':(typeof v==='object'?JSON.stringify(v):String(v));fm.set(key,Math.min(254,Math.max(fm.get(key),s.length)))}));const fields=[...fm.entries()];const hs=32+fields.length*32+1,rs=1+fields.reduce((s,[,l])=>s+l,0);const buf=new ArrayBuffer(hs+recs.length*rs);const v=new DataView(buf),b=new Uint8Array(buf);const now=new Date();v.setUint8(0,3);v.setUint8(1,now.getFullYear()-1900);v.setUint8(2,now.getMonth()+1);v.setUint8(3,now.getDate());v.setInt32(4,recs.length,true);v.setInt16(8,hs,true);v.setInt16(10,rs,true);fields.forEach(([n,l],i)=>{const base=32+i*32;b.set(enc.encode(n),base);v.setUint8(base+11,0x43);v.setUint8(base+16,l)});v.setUint8(32+fields.length*32,0x0D);let off=hs;recs.forEach(r=>{b[off]=0x20;off++;fields.forEach(([n,l])=>{const raw=(r.props||{})[n];let val=raw===null||raw===undefined?'':(typeof raw==='object'?JSON.stringify(raw):String(raw));val=val.slice(0,l);const vb=enc.encode(val);b.set(vb,off);for(let k=vb.length;k<l;k++)b[off+k]=0x20;off+=l})});return b;}

export async function exportAsZip(gj,baseName='shapefile'){const zip=new JSZip();const pf=gj.features.filter(f=>['Point','MultiPoint'].includes(f.geometry?.type));const lf=gj.features.filter(f=>['LineString','MultiLineString'].includes(f.geometry?.type));const pof=gj.features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));const multi=[pf,lf,pof].filter(a=>a.length>0).length>1;const n=t=>multi?`${baseName}_${t}`:baseName;if(pf.length){const{shp,shx,recs}=bPt(pf);const nm=n('puntos');zip.file(nm+'.shp',shp);zip.file(nm+'.shx',shx);zip.file(nm+'.dbf',bDBF(recs));zip.file(nm+'.prj',WGS84_PRJ)}if(lf.length){const{shp,shx,recs}=bLin(lf,3);const nm=n('lineas');zip.file(nm+'.shp',shp);zip.file(nm+'.shx',shx);zip.file(nm+'.dbf',bDBF(recs));zip.file(nm+'.prj',WGS84_PRJ)}if(pof.length){const{shp,shx,recs}=bLin(pof,5);const nm=n('poligonos');zip.file(nm+'.shp',shp);zip.file(nm+'.shx',shx);zip.file(nm+'.dbf',bDBF(recs));zip.file(nm+'.prj',WGS84_PRJ)}return zip.generateAsync({type:'blob',compression:'DEFLATE'});}

// ── Helpers de exportación (modal) ──────────────────────
// Rango Unicode de marcas diacríticas combinantes (construido por código para evitar mojibake de escapes \u en el editor).
const DIACRITICS_RE=new RegExp('['+String.fromCharCode(92,117,48,51,48,48)+'-'+String.fromCharCode(92,117,48,51,54,102)+']','g');
export function sanitizeName(s){return(s||'').trim().normalize('NFD').replace(DIACRITICS_RE,'').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_-]/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'')||'shapefile';}
export function fileRows(n,gj){const pf=gj.features.some(f=>['Point','MultiPoint'].includes(f.geometry?.type));const lf=gj.features.some(f=>['LineString','MultiLineString'].includes(f.geometry?.type));const pof=gj.features.some(f=>['Polygon','MultiPolygon'].includes(f.geometry?.type));const multi=[pf,lf,pof].filter(Boolean).length>1;const names=[];if(pf)names.push(multi?n+'_puntos':n);if(lf)names.push(multi?n+'_lineas':n);if(pof)names.push(multi?n+'_poligonos':n);return names.flatMap(x=>[x+'.shp',x+'.dbf']);}
