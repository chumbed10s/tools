// Hectáreas y clasificación por campo numérico (coropletas).
import {CPLT} from './state.js';

function ringAreaM2(ring){const lat=ring.reduce((s,c)=>s+c[1],0)/ring.length*Math.PI/180;const mLon=111320*Math.cos(lat),mLat=110540;let a=0;for(let i=0,j=ring.length-1;i<ring.length;j=i++)a+=(ring[j][0]*mLon+ring[i][0]*mLon)*(ring[i][1]*mLat-ring[j][1]*mLat);return Math.abs(a)/2;}

export function featureHa(f){const g=f.geometry;if(!g)return 0;const cp=rs=>(ringAreaM2(rs[0])-rs.slice(1).reduce((s,r)=>s+ringAreaM2(r),0))/10000;if(g.type==='Polygon')return cp(g.coordinates);if(g.type==='MultiPolygon')return g.coordinates.reduce((s,p)=>s+cp(p),0);return 0;}
export function totalHa(gj){return gj.features.reduce((s,f)=>s+featureHa(f),0)}
export function fmtHa(ha){return ha>=10000?(ha/1000).toFixed(1)+' k':ha>=100?ha.toFixed(0):ha.toFixed(1)}
export function fmtNum(n){if(typeof n!=='number'||isNaN(n))return'—';const s=n>=1000?(n/1000).toFixed(2)+'k':Math.abs(n)<1?n.toFixed(3):n%1===0?n.toFixed(0):n.toFixed(2);return s.replace(/\.?0+$/,'');}

export function numericFields(gj){const seen=new Set();gj.features.slice(0,50).forEach(f=>{Object.entries(f.properties||{}).forEach(([k,v])=>{if(typeof v==='number'||(typeof v==='string'&&v!==''&&!isNaN(parseFloat(v))))seen.add(k);})});return[...seen];}

export function weightedAvg(gj,field){let sp=0,sa=0,sc=0;gj.features.forEach(f=>{const v=parseFloat(f.properties?.[field]);if(isNaN(v))return;const ha=featureHa(f);if(ha>0){sp+=v*ha;sa+=ha;}else{sp+=v;sc++;}});if(sa>0)return sp/sa;if(sc>0)return sp/sc;return null;}

export function buildClasses(gj,field){const vals=gj.features.map(f=>parseFloat(f.properties?.[field])).filter(v=>!isNaN(v));if(!vals.length)return null;const unique=[...new Set(vals.map(v=>Math.round(v*1000)/1000))].sort((a,b)=>a-b);if(unique.length<=8){const classes=unique.map((v,i)=>({label:fmtNum(v),color:CPLT[i%CPLT.length],test:val=>Math.round(val*1000)/1000===v,count:vals.filter(x=>Math.round(x*1000)/1000===v).length,ha:gj.features.filter(f=>{const fv=parseFloat(f.properties?.[field]);return !isNaN(fv)&&Math.round(fv*1000)/1000===v}).reduce((s,f)=>s+featureHa(f),0)}));return{type:'discrete',classes,avg:weightedAvg(gj,field)};}const N=5,min=Math.min(...vals),max=Math.max(...vals),step=(max-min)/N;const classes=Array.from({length:N},(_,i)=>{const lo=min+i*step,hi=min+(i+1)*step;return{label:`${fmtNum(lo)}–${fmtNum(hi)}`,color:CPLT[i%CPLT.length],test:val=>i===N-1?(val>=lo&&val<=hi):(val>=lo&&val<hi),count:vals.filter(v=>i===N-1?v>=lo&&v<=hi:v>=lo&&v<hi).length,ha:gj.features.filter(f=>{const fv=parseFloat(f.properties?.[field]);return !isNaN(fv)&&(i===N-1?fv>=lo&&fv<=hi:fv>=lo&&fv<hi)}).reduce((s,f)=>s+featureHa(f),0)};});return{type:'interval',classes,avg:weightedAvg(gj,field)};}

export function getClassColor(val,cls){if(!cls)return null;const f=cls.classes.find(c=>c.test(val));return f?.color??cls.classes[cls.classes.length-1].color;}
