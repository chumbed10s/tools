// Ingesta de archivos de origen: KMZ, KML, SHP (+DBF) y ZIP.
import JSZip from 'https://esm.sh/jszip@3.10.1?bundle';
import {kml as parseKML} from 'https://esm.sh/@tmcw/togeojson@5.8.1?bundle';
import {readSHP,readDBF} from './shp-io.js';
import {addLayer} from './map.js';
import {setStatus} from './ui.js';
import {fmtHa} from './geo.js';

function resultMsg(lyr){return `${lyr.name} · ${lyr.nFeat} feat${lyr.ha>0?' · '+fmtHa(lyr.ha)+' ha':''}`;}

export async function processFiles(files){
  const arr=Array.from(files),byBase={};
  arr.forEach(f=>{const parts=f.name.split('.');const ext=parts.pop().toLowerCase();const base=parts.join('.').toLowerCase();if(!byBase[base])byBase[base]={};byBase[base][ext]=f;});
  for(const[,exts]of Object.entries(byBase)){
    try{
      if(exts.kmz)await loadKMZ(exts.kmz);
      else if(exts.kml)await loadKML(exts.kml);
      else if(exts.shp){const sb=await exts.shp.arrayBuffer();const db=exts.dbf?await exts.dbf.arrayBuffer():null;await loadSHP(exts.shp.name.replace(/\.shp$/i,''),sb,db);}
      else if(exts.zip)await loadZIP(exts.zip);
    }catch(err){setStatus('error',err.message);}
  }
}

async function loadKMZ(file){
  setStatus('loading',file.name+'…');
  const zip=await JSZip.loadAsync(file);
  const kmls=Object.keys(zip.files).filter(n=>n.toLowerCase().endsWith('.kml')&&!zip.files[n].dir);
  if(!kmls.length)throw new Error('No hay KML dentro del KMZ');
  const all=[];
  for(const n of kmls){const str=await zip.files[n].async('string');const gj=parseKML(new DOMParser().parseFromString(str,'text/xml'));if(gj?.features)all.push(...gj.features);}
  const gj={type:'FeatureCollection',features:all.filter(f=>f.geometry?.type)};
  if(!gj.features.length)throw new Error('Sin geometrías en '+file.name);
  const lyr=addLayer(file.name.replace(/\.kmz$/i,''),gj);
  setStatus('success',resultMsg(lyr));
}

async function loadKML(file){
  setStatus('loading',file.name+'…');
  const str=await file.text();
  const gj=parseKML(new DOMParser().parseFromString(str,'text/xml'));
  gj.features=(gj.features||[]).filter(f=>f.geometry?.type);
  if(!gj.features.length)throw new Error('Sin geometrías en '+file.name);
  const lyr=addLayer(file.name.replace(/\.kml$/i,''),gj);
  setStatus('success',resultMsg(lyr));
}

async function loadSHP(name,shpBuf,dbfBuf){
  setStatus('loading',name+'…');
  const feats=readSHP(shpBuf);
  const recs=dbfBuf?readDBF(dbfBuf):feats.map(()=>({}));
  feats.forEach((f,i)=>{f.properties=recs[i]||{}});
  const gj={type:'FeatureCollection',features:feats.filter(f=>f.geometry?.type)};
  if(!gj.features.length)throw new Error('Sin geometrías en '+name+'.shp');
  const lyr=addLayer(name,gj);
  setStatus('success',resultMsg(lyr));
}

async function loadZIP(file){
  setStatus('loading','Analizando ZIP…');
  const zip=await JSZip.loadAsync(file);
  const shpNames=Object.keys(zip.files).filter(n=>n.toLowerCase().endsWith('.shp')&&!zip.files[n].dir);
  if(!shpNames.length)throw new Error('No hay SHP dentro del ZIP');
  for(const sn of shpNames){
    const base=sn.replace(/\.shp$/i,'');
    const dk=Object.keys(zip.files).find(n=>n.toLowerCase()===base.toLowerCase()+'.dbf');
    const sb=await zip.files[sn].async('arraybuffer');
    const db=dk?await zip.files[dk].async('arraybuffer'):null;
    await loadSHP(sn.split('/').pop().replace(/\.shp$/i,''),sb,db);
  }
}
