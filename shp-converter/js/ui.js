// Status box, pestañas del sidebar, modal de exportación y captura PNG.
import {state} from './state.js';
import {exportAsZip,sanitizeName,fileRows} from './shp-io.js';

const STATUS_ICON={loading:'fa-spinner fa-spin',success:'fa-circle-check',error:'fa-circle-xmark',warn:'fa-triangle-exclamation'};
function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
export function setStatus(type,msg){
  const b=document.getElementById('sbox'),p=document.getElementById('spanel');
  b.className='sbox '+type;
  b.innerHTML=`<i class="fa-solid ${STATUS_ICON[type]||'fa-circle-info'}"></i> ${escapeHtml(msg)}`;
  p.style.display='block';
}

export function dl(filename,blob){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Pestañas Capas / Clima / Zonas ─────────────────────────
export function initTabs(){
  document.querySelectorAll('.mode-tab').forEach(btn=>{
    btn.addEventListener('click',()=>switchTab(btn.dataset.tab));
  });
}
function switchTab(name){
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));
}

// ── Modal de exportación a Shapefile ───────────────────────
export function openExportModal(id){
  const lyr=state.layers.find(l=>l.id===id);if(!lyr)return;
  state.pendingExportId=id;
  const inp=document.getElementById('exp-name');
  inp.value=sanitizeName(lyr.name);
  updatePreview();
  document.getElementById('export-modal').style.display='flex';
  setTimeout(()=>{inp.focus();inp.select();},60);
}
export function closeModal(){document.getElementById('export-modal').style.display='none';state.pendingExportId=null;}
export function updatePreview(){
  const lyr=state.layers.find(l=>l.id===state.pendingExportId);if(!lyr)return;
  const name=sanitizeName(document.getElementById('exp-name').value);
  const rows=fileRows(name,lyr.gj);
  document.getElementById('exp-preview').innerHTML=rows.map(f=>`<div class="prev-file"><div class="prev-file-dot"></div>${f}</div>`).join('')
    +`<div class="prev-file" style="margin-top:4px;color:var(--dim)"><div class="prev-file-dot" style="background:var(--dim)"></div>+ .shx y .prj por cada capa</div>`;
}
export async function confirmExport(){
  const lyr=state.layers.find(l=>l.id===state.pendingExportId);if(!lyr)return;
  const name=sanitizeName(document.getElementById('exp-name').value);
  closeModal();
  setStatus('loading','Generando…');
  try{
    const blob=await exportAsZip(lyr.gj,name);
    dl(name+'.zip',blob);
    setStatus('success',name+'.zip');
  }catch(err){setStatus('error',err.message);}
}

export function initExportModalKeys(){
  document.addEventListener('keydown',e=>{
    if(!state.pendingExportId)return;
    if(e.key==='Escape')closeModal();
    if(e.key==='Enter')confirmExport();
  });
}

// ── Captura PNG ─────────────────────────────────────────────
export async function capturePNG(){
  setStatus('loading','Capturando…');
  try{
    const canvas=await html2canvas(document.querySelector('.layout'),{useCORS:true,scale:Math.min(window.devicePixelRatio||2,2),logging:false,backgroundColor:'#070a06',allowTaint:false});
    canvas.toBlob(blob=>{dl('mapa_captura.png',blob);setStatus('success','PNG guardado')},'image/png');
  }catch(err){setStatus('error',err.message);}
}
