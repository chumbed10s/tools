// Bootstrap: conecta los módulos con el DOM y expone los handlers que usan
// los atributos onclick generados dinámicamente en las listas (capas/zonas/clima).
import {processFiles} from './loaders.js';
import {renderAll,removeLayer,toggleLayer,setField,downloadLayer,fitLayer,startDrawLot} from './map.js';
import {openWxForLayer,closeWx,refreshWx,jumpToDay,selectHour,stepHour,toggleDayTabs} from './weather.js';
import {setDriftRadius} from './drift.js';
import {finishPolygonDraw,cancelPolygonDraw} from './draw.js';
import {startDrawZone,loadShpAsZone,closeZoneModal,onZoneTypeChange,confirmZone,removeZone} from './zones.js';
import {closeModal,updatePreview,confirmExport,capturePNG,initTabs,initExportModalKeys} from './ui.js';

Object.assign(window,{
  removeLayer,toggleLayer,setField,downloadLayer,fitLayer,startDrawLot,
  openWxForLayer,closeWx,refreshWx,jumpToDay,selectHour,stepHour,toggleDayTabs,
  setDriftRadius,
  finishPolygonDraw,cancelPolygonDraw,
  startDrawZone,loadShpAsZone,closeZoneModal,onZoneTypeChange,confirmZone,removeZone,
  closeModal,updatePreview,confirmExport,capturePNG,
});

initTabs();
initExportModalKeys();

const dz=document.getElementById('dz'),fi=document.getElementById('fi');
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('over')}));
['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('over')}));
dz.addEventListener('drop',e=>processFiles(e.dataTransfer.files));
fi.addEventListener('change',e=>{if(e.target.files.length)processFiles(e.target.files)});

document.getElementById('png-btn').addEventListener('click',capturePNG);

renderAll();
