// Wrapper fino sobre Chart.js (CDN): muestra spinner mientras carga y un
// mensaje de error inline si el script no llega a cargar.
const CDN='https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
let loadPromise=null;

function loadChartJs(){
  if(window.Chart)return Promise.resolve();
  if(loadPromise)return loadPromise;
  loadPromise=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=CDN;
    s.onload=()=>window.Chart?resolve():reject(new Error('Chart.js no definido'));
    s.onerror=()=>reject(new Error('no se pudo cargar Chart.js'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

// container: elemento donde va el gráfico. config: config de Chart.js.
// Devuelve la instancia de Chart, o null si falló (ya deja el mensaje de error puesto).
export async function mountChart(container,config){
  container.innerHTML=`<div class="chart-status"><div class="spinner spinner-sm"></div></div>`;
  try{
    await loadChartJs();
  }catch(_){
    container.innerHTML=`<div class="chart-status chart-error">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      <span>No se pudo cargar el gráfico</span></div>`;
    return null;
  }
  container.innerHTML='';
  const canvas=document.createElement('canvas');
  container.appendChild(canvas);
  return new window.Chart(canvas.getContext('2d'),config);
}
