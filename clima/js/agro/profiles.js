// Perfiles de tarea: cada uno es el MISMO motor (engine.js) con otro set de
// umbrales declarativos. Agregar una tarea = agregar un objeto acá.
import * as storage from '../storage.js';

// Tipos de regla que entiende el motor:
//  range {min,max, softMin?, softMax?}  — dentro del rango = verde; en el margen = amarillo
//  max   {max, hardMax}                 — <=max verde; <=hardMax amarillo; sino rojo
//  min   {min, softMin}                 — >=min verde; >=softMin amarillo; sino rojo
//  flag  {severity:'rojo'|'amarillo'}   — si la señal booleana es true, ese estado
// `field` es una serie calculada por el motor (ver engine.FIELDS).

export const DEFAULT_PROFILES=[
  {
    id:'dron', name:'Dron', icon:'drone',
    blurb:'Aplicación aérea con dron: muy sensible a viento, ráfaga e inversión.',
    rules:[
      {field:'wind',  label:'Viento',        type:'range', min:3, max:12, softMin:2, softMax:16, unit:'wind'},
      {field:'gust',  label:'Ráfaga',        type:'max',   max:18, hardMax:25, unit:'wind'},
      {field:'rh',    label:'Humedad',       type:'min',   min:55, softMin:45, unit:'pct'},
      {field:'deltaT',label:'Delta-T',       type:'range', min:2, max:8, softMin:1, softMax:10},
      {field:'inv',   label:'Inversión térmica', type:'flag', severity:'rojo'},
      {field:'pprob', label:'Prob. lluvia',  type:'max',   max:20, hardMax:40, unit:'pct'},
      {field:'precip',label:'Lluvia',        type:'max',   max:0.1, hardMax:0.5, unit:'rain'},
    ],
  },
  {
    id:'terrestre', name:'Fumigadora', icon:'sprayer',
    blurb:'Pulverización terrestre autopropulsada o de arrastre.',
    rules:[
      {field:'wind',  label:'Viento',        type:'range', min:3, max:18, softMin:2, softMax:24, unit:'wind'},
      {field:'gust',  label:'Ráfaga',        type:'max',   max:28, hardMax:38, unit:'wind'},
      {field:'rh',    label:'Humedad',       type:'min',   min:45, softMin:35, unit:'pct'},
      {field:'deltaT',label:'Delta-T',       type:'range', min:2, max:10, softMin:1, softMax:12},
      {field:'inv',   label:'Inversión térmica', type:'flag', severity:'amarillo'},
      {field:'pprob', label:'Prob. lluvia',  type:'max',   max:30, hardMax:50, unit:'pct'},
      {field:'precip',label:'Lluvia',        type:'max',   max:0.2, hardMax:1, unit:'rain'},
    ],
  },
  {
    id:'siembra', name:'Siembra', icon:'seed',
    blurb:'Entrada al lote para sembrar: piso, temperatura y humedad de suelo.',
    rules:[
      {field:'precip',   label:'Lluvia',            type:'max', max:0.1, hardMax:0.6, unit:'rain'},
      {field:'pprob',    label:'Prob. lluvia',      type:'max', max:35, hardMax:60, unit:'pct'},
      {field:'soilTemp', label:'Temp. de suelo',    type:'min', min:10, softMin:8},
      {field:'soilMoist',label:'Humedad de suelo',  type:'range', min:0.14, max:0.34, softMin:0.09, softMax:0.42},
      {field:'wind',     label:'Viento',            type:'max', max:35, hardMax:50, unit:'wind'},
    ],
  },
  {
    id:'cosecha', name:'Cosecha', icon:'wheat',
    blurb:'Trilla: grano seco, sin rocío ni lluvia, con poder de secado.',
    rules:[
      {field:'rh',       label:'Humedad',       type:'max', max:65, hardMax:80, unit:'pct'},
      {field:'dew',      label:'Rocío',         type:'flag', severity:'rojo'},
      {field:'precip',   label:'Lluvia',        type:'max', max:0, hardMax:0.2, unit:'rain'},
      {field:'pprob',    label:'Prob. lluvia',  type:'max', max:25, hardMax:45, unit:'pct'},
      {field:'rad',      label:'Radiación',     type:'min', min:150, softMin:60},
    ],
  },
];

let cache=null;

export function getProfiles(){
  if(cache)return cache;
  const saved=storage.loadProfiles();
  cache=saved&&Array.isArray(saved)&&saved.length?saved:clone(DEFAULT_PROFILES);
  return cache;
}
export function getProfile(id){
  return getProfiles().find(p=>p.id===id)||getProfiles()[0];
}
export function saveProfile(profile){
  const list=getProfiles();
  const i=list.findIndex(p=>p.id===profile.id);
  if(i>=0)list[i]=profile; else list.push(profile);
  storage.saveProfiles(list);
}
export function resetProfiles(){
  cache=clone(DEFAULT_PROFILES);
  storage.clearProfiles();
  return cache;
}
export function resetProfile(id){
  const def=DEFAULT_PROFILES.find(p=>p.id===id);
  if(!def)return;
  const list=getProfiles();
  const i=list.findIndex(p=>p.id===id);
  if(i>=0){list[i]=clone(def);storage.saveProfiles(list);}
}
export function createProfile(name){
  const id='p'+Date.now().toString(36);
  const p={id,name:name||'Nuevo perfil',icon:'sliders',blurb:'',custom:true,
    rules:clone(DEFAULT_PROFILES[1].rules)};
  const list=getProfiles();list.push(p);storage.saveProfiles(list);
  return p;
}
export function deleteProfile(id){
  cache=getProfiles().filter(p=>p.id!==id);
  storage.saveProfiles(cache);
}

function clone(x){return JSON.parse(JSON.stringify(x));}
