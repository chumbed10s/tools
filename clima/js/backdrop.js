// Cielo atmosférico: degradado suave por hora y condición, halo de sol/luna,
// y partículas mínimas (lluvia/nieve finas, bruma que deriva, estrellas).
// Sin nubes dibujadas ni lomas. Se apaga con reduced-motion / toggle / pestaña
// oculta. Cap ~30 fps.
import {state} from './state.js';
import {prefersReduced} from './anim.js';

let cv,ctx,raf=0,W=0,H=0,dpr=1;
let scene={cat:'clear',isDay:1,dayFrac:0.5,precip:0,cape:0,cloud:20};
let drops=[],stars=[],haze=[],flash=0,flashT=0,t0=0,lastPaint=0;
const FRAME_MS=1000/30;

// Paletas de cielo (arriba → horizonte). Colores desaturados, "de sistema".
const SKY={
  dawn:['#243a5e','#5b6b8c','#b78a8f','#e3b48f'],
  day:['#3f6ea6','#6f9cc9','#a7c6e0','#cfe0ec'],
  dusk:['#1e2f52','#4a4f7d','#8a6f8f','#c98f77'],
  night:['#0a1020','#101a30','#18243f','#1f2c48'],
};

function baseSky(){
  const f=scene.dayFrac;
  if(!scene.isDay) return SKY.night;
  if(f<0.10||f>0.90) return SKY.dawn;
  if(f>0.74) return SKY.dusk;
  return SKY.day;
}
function overcastMix(cols){
  const heavy=['overcast','fog','drizzle','rain','showers','snow','snowshowers','storm'].includes(scene.cat);
  const k=heavy?0.5:Math.min(0.34,scene.cloud/300);
  const g=scene.isDay?[150,158,168]:[36,40,50];
  return cols.map(hex=>{
    const c=hx(hex);
    return `rgb(${mix(c[0],g[0],k)},${mix(c[1],g[1],k)},${mix(c[2],g[2],k)})`;
  });
}

export function initBackdrop(canvas){
  cv=canvas;ctx=cv.getContext('2d');
  resize();
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  start();
}
function resize(){
  if(!cv)return;
  dpr=Math.min(2,window.devicePixelRatio||1);
  W=cv.clientWidth;H=cv.clientHeight;
  cv.width=W*dpr;cv.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  seedStars();seedHaze();
}

export function setBackdrop({category='clear',isDay=1,hour=12,sunrise,sunset,precipMm=0,cape=0,cloudCover=20}={}){
  let frac=0.5;
  if(sunrise&&sunset){
    const sr=new Date(sunrise).getHours()+new Date(sunrise).getMinutes()/60;
    const ss=new Date(sunset).getHours()+new Date(sunset).getMinutes()/60;
    frac=Math.max(0,Math.min(1,(hour-sr)/Math.max(1,(ss-sr))));
  }
  scene={cat:category,isDay:isDay?1:0,dayFrac:frac,precip:precipMm,cape,cloud:cloudCover};
  // el contenido sobre el cielo (hero) usa esto para elegir tinta clara u oscura
  document.documentElement.classList.toggle('sky-night', !scene.isDay);
  seedDrops();
  if(!running())drawFrame(performance.now());
}

function seedStars(){
  stars=[];
  const n=Math.round(W*H/12000);
  for(let i=0;i<n;i++)stars.push({x:Math.random()*W,y:Math.random()*H*0.66,r:Math.random()*1.1+0.25,p:Math.random()*7});
}
function seedHaze(){
  haze=[];
  for(let i=0;i<3;i++)haze.push({y:H*(0.2+i*0.22),x:Math.random()*W,v:(4+Math.random()*6)/60*(i%2?-1:1),o:0.04+Math.random()*0.05});
}
function seedDrops(){
  const rain=['drizzle','rain','showers','storm'].includes(scene.cat);
  const snow=['snow','snowshowers'].includes(scene.cat);
  const inten=Math.min(1,(scene.precip||(rain?0.4:snow?0.3:0))/2.6);
  const n=Math.round((rain?180:snow?90:0)*Math.max(0.12,inten));
  drops=[];
  for(let i=0;i<n;i++)drops.push({
    x:Math.random()*W,y:Math.random()*H,
    len:snow?0:7+Math.random()*9,
    v:(snow?38+Math.random()*26:300+Math.random()*170)/60,
    drift:snow?(Math.random()-0.5)*0.5:0.7,
    r:snow?0.9+Math.random()*1.5:0, snow,
  });
}

function drawFrame(now){
  if(!ctx)return;
  if(running()&&now-lastPaint<FRAME_MS){raf=requestAnimationFrame(drawFrame);return;}
  lastPaint=now;
  const dt=Math.min(2.4,(now-(t0||now))/16.67);t0=now;
  const moving=running()?1:0;

  // degradado de cielo
  const cols=overcastMix(baseSky());
  const g=ctx.createLinearGradient(0,0,0,H);
  cols.forEach((c,i)=>g.addColorStop(i/(cols.length-1),c));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  // estrellas
  if(!scene.isDay){
    for(const s of stars){
      s.p+=0.018*dt*moving;
      ctx.globalAlpha=0.3+0.3*Math.sin(s.p);
      ctx.fillStyle='#dfe6ff';
      ctx.fillRect(s.x,s.y,s.r,s.r);
    }
    ctx.globalAlpha=1;
  }

  // halo de sol / luna (sin disco cartoon: solo resplandor)
  if(scene.cat!=='fog'){
    const bx=W*(0.14+0.72*scene.dayFrac);
    const by=H*0.9-Math.sin(Math.max(0.03,Math.min(0.97,scene.dayFrac))*Math.PI)*H*0.72;
    const rad=scene.isDay?Math.min(W,H)*0.5:Math.min(W,H)*0.32;
    const gl=ctx.createRadialGradient(bx,by,0,bx,by,rad);
    if(scene.isDay){
      gl.addColorStop(0,'rgba(255,244,214,.55)');
      gl.addColorStop(.35,'rgba(255,236,196,.18)');
    }else{
      gl.addColorStop(0,'rgba(214,224,255,.30)');
      gl.addColorStop(.4,'rgba(190,204,240,.08)');
    }
    gl.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);
    // núcleo tenue
    const core=ctx.createRadialGradient(bx,by,0,bx,by,scene.isDay?26:16);
    core.addColorStop(0,scene.isDay?'rgba(255,250,232,.9)':'rgba(226,232,255,.7)');
    core.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=core;ctx.beginPath();ctx.arc(bx,by,scene.isDay?26:16,0,7);ctx.fill();
  }

  // bruma que deriva
  for(const b of haze){
    b.x+=b.v*dt*moving;
    if(b.x<-W)b.x+=W*2; if(b.x>W)b.x-=W*2;
    const hg=ctx.createLinearGradient(0,b.y-40,0,b.y+40);
    hg.addColorStop(0,'rgba(255,255,255,0)');
    hg.addColorStop(.5,`rgba(${scene.isDay?'255,255,255':'160,170,190'},${b.o})`);
    hg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=hg;ctx.fillRect(0,b.y-40,W,80);
  }

  // niebla densa
  if(scene.cat==='fog'){
    ctx.fillStyle=scene.isDay?'rgba(206,212,220,.42)':'rgba(120,128,140,.34)';
    ctx.fillRect(0,0,W,H);
  }

  // precipitación
  if(drops.length){
    ctx.strokeStyle=scene.isDay?'rgba(190,206,226,.5)':'rgba(150,170,200,.45)';
    ctx.fillStyle='rgba(240,246,255,.8)';
    ctx.lineWidth=1;
    for(const d of drops){
      d.y+=d.v*dt*moving; d.x+=d.drift*dt*moving;
      if(d.y>H){d.y=-10;d.x=Math.random()*W;}
      if(d.snow){ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill();}
      else{ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-d.drift*3,d.y+d.len);ctx.stroke();}
    }
  }

  // tormenta: destellos suaves
  if(scene.cat==='storm'){
    flashT-=dt*moving;
    if(flashT<=0){flash=1;flashT=220+Math.random()*420;}
    if(flash>0){ctx.fillStyle=`rgba(255,255,255,${0.2*flash})`;ctx.fillRect(0,0,W,H);flash-=0.07*dt;}
  }

  if(running())raf=requestAnimationFrame(drawFrame);
}

function running(){return state.settings?.backdrop && !prefersReduced() && !document.hidden;}
function start(){
  if(raf)return;
  if(!running()){drawFrame(performance.now());return;}
  raf=requestAnimationFrame(drawFrame);
}
function stop(){cancelAnimationFrame(raf);raf=0;}
export function refreshBackdrop(){stop();start();}

const hx=h=>{const m=h.replace('#','');return[parseInt(m.slice(0,2),16),parseInt(m.slice(2,4),16),parseInt(m.slice(4,6),16)];};
const mix=(a,b,k)=>Math.round(a+(b-a)*k);
