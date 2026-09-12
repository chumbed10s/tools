// Helpers compartidos entre secciones.
import {fa} from '../fa.js';
import {weatherIconSVG} from '../icons.js';
import {statusLabel} from '../agro/engine.js';

export const $=(sel,root=document)=>root.querySelector(sel);
export const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];

export function statTile(iconName,label,value,{tone=''}={}){
  return `<div class="stat-tile${tone?' tone-'+tone:''}">
    <span class="stat-ic">${fa(iconName)}</span>
    <span class="stat-v">${value}</span>
    <span class="stat-l">${label}</span>
  </div>`;
}

export function digestList(items){
  if(!items.length)return '';
  return `<ul class="digest-list">${items.map(it=>`
    <li class="digest-item${it.tone?' tone-'+it.tone:''}">
      <span class="digest-ic">${fa(it.iconName)}</span>
      <span class="digest-txt">${it.text}</span>
    </li>`).join('')}</ul>`;
}

export function alertBar(alerts){
  if(!alerts.length)return '';
  return `<div class="alert-bar">${alerts.map(a=>`
    <div class="alert-card tone-${a.tone}">
      <span class="alert-ic">${fa(a.iconName)}</span>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-detail">${a.detail}</div>
        <div class="alert-tip">${a.tip}</div>
      </div>
    </div>`).join('')}</div>`;
}

const SEM={verde:'ok',amarillo:'warn',rojo:'bad'};
export function semDot(stateName){
  return `<span class="sem-dot sem-${SEM[stateName]||''}" title="${statusLabel(stateName)}"></span>`;
}

export function weatherIcon(code,isDay,size=48){
  return weatherIconSVG(code,{size,isDay,alt:''});
}

export function profileTabsHTML(profiles,activeId){
  return `<div class="profile-tabs" role="tablist">${profiles.map(p=>`
    <button class="profile-tab${p.id===activeId?' active':''}" data-profile="${p.id}">
      ${fa(p.icon)}<span>${p.name}</span>
    </button>`).join('')}</div>`;
}
