// Piezas de UI compartidas entre secciones.
import {icon} from '../ui-icons.js';
import {term} from '../tooltip.js';
import {weatherIconSVG} from '../icons.js';
import {wmoLabel} from '../weather.js';
import {wind as fmtWind,cardinal,round} from '../format.js';

export {icon,term,weatherIconSVG,wmoLabel};

export function card(bodyHTML,{title,termKey,cls='',reveal=true}={}){
  const head=title?`<div class="card-h">${
    termKey?term(termKey,title):`<span>${title}</span>`}</div>`:'';
  return `<section class="card ${cls}" ${reveal?'data-reveal':''}>${head}${bodyHTML}</section>`;
}

export function statTile({iconName,label,value,sub='',termKey}){
  return `<div class="tile" ${reveal()}>
    <span class="tile-ic">${icon(iconName,{size:18})}</span>
    <span class="tile-k">${termKey?term(termKey,label):label}</span>
    <span class="tile-v">${value}</span>
    ${sub?`<span class="tile-sub">${sub}</span>`:''}
  </div>`;
}
const reveal=()=>'data-reveal';

// Badge circular con ícono, tematizable: neutral | accent | water | sun.
export function iconBadge(name,tone='neutral',size=30){
  return `<span class="ibadge ib-${tone}" style="--ib-sz:${size}px">${icon(name,{size:Math.round(size*0.54)})}</span>`;
}

// Tile de métrica unificada: badge + valor grande + chip de contexto + pie opcional.
export function metricTile({iconName,badgeHTML,tone='neutral',label,value,unit='',chip='',chipTone='',foot='',termKey,wide=false}){
  const badge=badgeHTML||iconBadge(iconName,tone,wide?34:30);
  return `<div class="mtile${wide?' mtile-wide':''}" data-reveal>
    ${badge}
    <div class="mtile-body">
      <span class="mtile-k">${termKey?term(termKey,label):label}</span>
      <span class="mtile-v">${value}${unit?`<i class="mtile-u">${unit}</i>`:''}</span>
    </div>
    ${chip?`<span class="mtile-chip${chipTone?` mc-${chipTone}`:''}">${chip}</span>`:''}
    ${foot?`<div class="mtile-foot">${foot}</div>`:''}
  </div>`;
}

// Mini-medidor lineal con labels: escala [min,max], banda ideal [lo,hi] rotulada,
// y un pin en `val` con su número. Para Delta-T, viento vs perfil, etc.
export function miniGauge(val,lo,hi,min,max,{tone='accent',unit='',idealLabel='ideal'}={}){
  const span=(max-min)||1;
  const clamp=v=>Math.max(0,Math.min(100,v));
  const pos=clamp((val-min)/span*100);
  const l=clamp((lo-min)/span*100), r=clamp((hi-min)/span*100);
  const ok=val>=lo&&val<=hi;
  const near=pos>75; // el label del pin se corre a la izquierda si está muy al borde
  return `<span class="mgauge">
    <span class="mg-track">
      <span class="mg-ideal mg-${tone}" style="left:${l}%;width:${Math.max(3,r-l)}%"></span>
      <span class="mg-pin${ok?' ok':''}" style="left:${pos}%"></span>
      <span class="mg-pinlbl${near?' left':''}" style="left:${pos}%">${round(val)}${unit}</span>
    </span>
    <span class="mg-scale">
      <span>${round(min)}${unit}</span>
      <span class="mg-idlbl mg-${tone}">${idealLabel} ${round(lo)}–${round(hi)}${unit}</span>
      <span>${round(max)}${unit}</span>
    </span>
  </span>`;
}

export function semaphore(state,label){
  const txt=label||({verde:'Favorable',amarillo:'Con reparos',rojo:'No recomendado'}[state]||state);
  return `<span class="sem sem-${state}"><i class="sem-dot"></i>${txt}</span>`;
}

export function sectionTitle(text,extraHTML=''){
  return `<div class="sec-title"><h2>${text}</h2>${extraHTML}</div>`;
}

export function emptyState(text){
  return `<div class="empty">${icon('cloud',{size:28})}<p>${text}</p></div>`;
}

export function pillRow(items){
  return `<div class="pills">${items.map(([ic,txt,tk])=>
    `<span class="pill">${icon(ic,{size:13})}${tk?term(tk,txt):txt}</span>`).join('')}</div>`;
}

// Flecha de dirección de viento (apunta hacia dónde SOPLA el viento).
export function windArrow(deg,size=14){
  const to=(Math.round(deg)+180)%360;
  return `<svg class="wd-arrow" viewBox="0 0 24 24" width="${size}" height="${size}" style="transform:rotate(${to}deg)"><path fill="currentColor" d="M12 2.5 19 20l-7-4-7 4z"/></svg>`;
}

// Flecha dentro de un badge circular — versión "notoria".
export function windDial(deg,size=22){
  return `<span class="wind-dial" style="--wd-sz:${size}px">${windArrow(deg,Math.round(size*0.62))}</span>`;
}

// Bloque de viento consistente y prominente: dial + velocidad + rumbo + ráfaga.
// gustHi: fuerza el destaque ámbar de la ráfaga.
export function windChip(speedKmh,deg,gustKmh,{compact=false,dialSize=22}={}){
  const strong=gustKmh!=null && (gustKmh>=35 || gustKmh>=(speedKmh??0)+14);
  const gust=gustKmh!=null
    ? `<span class="wc-gust${strong?' hi':''}">${icon('gust',{size:11})}${fmtWind(gustKmh,{unit:false})}</span>` : '';
  return `<span class="windchip${compact?' wc-compact':''}">
    ${windDial(deg,dialSize)}
    <span class="wc-main"><b class="wc-spd">${fmtWind(speedKmh,{unit:!compact})}</b><span class="wc-dir">${cardinal(deg)}</span></span>
    ${gust}
  </span>`;
}
