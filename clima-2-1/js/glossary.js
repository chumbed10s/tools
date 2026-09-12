// Mini-glosario meteorológico: definición corta (toast) + detallada con ejemplo
// y, para algunos términos, un diagrama SVG simple (modal "Ver más").
import {icon} from './ui-icons.js';
export const GLOSSARY={
  humedad:{label:'Humedad relativa',short:'Humedad relativa del aire a 2 m de altura.',
    long:'Porcentaje de vapor de agua que contiene el aire respecto al máximo que podría contener a esa temperatura. No mide "cuánta agua hay" en términos absolutos, sino qué tan cerca está el aire de saturarse.',
    example:'Con 90% de humedad y temperatura en descenso, el aire se acerca rápido al punto de rocío — es común ver rocío o niebla al amanecer.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la humedad es de ${v} (${chip}). ${chip==='Húmeda'?'Buena probabilidad de rocío o niebla si la temperatura baja un poco más.':chip==='Seca'?'Aire seco: mayor evaporación y más riesgo de desecación.':'Nivel de humedad típico, sin condiciones extremas.'}`},
  puntoRocio:{label:'Punto de rocío',short:'Temperatura a la que el aire se satura y condensa en rocío.',
    long:'Es la temperatura a la que habría que enfriar el aire (sin cambiar su contenido de humedad) para que se sature y el vapor empiece a condensarse en agua líquida. Cuanto más alto el punto de rocío, más "pesado"/húmedo se siente el aire.',
    example:'Punto de rocío de 20° se siente bochornoso incluso con temperaturas moderadas; uno de 5° se siente seco aunque haga calor.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el punto de rocío es de ${v} (${chip}). ${chip==='Bochornoso'?'El aire se siente pesado y húmedo, aunque la temperatura no sea extrema.':chip==='Seco'?'El aire se siente liviano y seco.':'Sensación de humedad ambiente agradable.'}`},
  deltaT:{label:'Delta-T',short:'Diferencia entre temperatura y bulbo húmedo — clave para fumigar.',
    long:'Es la diferencia entre la temperatura del aire y la temperatura de bulbo húmedo (la que marcaría un termómetro envuelto en tela mojada). Un Delta-T entre 2 y 8 indica condiciones ideales para pulverizar: gotas que no se evaporan demasiado rápido ni quedan sin secarse.',
    example:'Delta-T de 12 en un día caluroso y seco: las gotas se evaporan antes de llegar al cultivo — no es buen momento para fumigar.',
    svg:'band',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el Delta-T es de ${v} (${chip}). ${chip==='Ideal'?'Buen momento para pulverizar: las gotas no se evaporan de más ni quedan sin secar.':chip==='Alto'?'Las gotas se evaporan muy rápido — no conviene fumigar ahora.':'Las gotas pueden tardar en secarse — atención a la deriva.'}`},
  deficitVapor:{label:'Déficit de presión de vapor (VPD)',short:'Diferencia entre el vapor actual y el máximo que el aire puede contener — indica estrés hídrico.',
    long:'El VPD mide cuánta "sed" tiene el aire: la diferencia entre la presión de vapor de agua actual y la presión de vapor de saturación. Un VPD alto significa que el aire "tira" agua de las plantas más rápido (mayor transpiración), lo que puede estresarlas si el suelo no tiene humedad suficiente.',
    example:'VPD de 1.5 kPa en pleno día de verano: las plantas transpiran mucho — puede ser buen momento para regar si el suelo está seco.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el déficit de vapor es de ${v} (${chip}). ${chip==='Alto'?'El aire le pide mucha agua a las plantas — si el suelo está seco, puede haber estrés hídrico.':chip==='Bajo'?'El aire está casi saturado, las plantas transpiran poco.':'Las plantas transpiran a un ritmo normal.'}`},
  viento:{label:'Viento',short:'Velocidad y dirección del viento a la altura indicada.',
    long:'Velocidad y dirección del aire en movimiento horizontal. La dirección indica de dónde sopla el viento (no hacia dónde va). A mayor altura, el viento suele ser más fuerte y constante porque hay menos fricción con el terreno.',
    example:'Viento de 15 km/h del SSE a 10 m puede ser 25 km/h a 80 m — relevante si vas a fumigar con avión o dron.',
    svg:'compass',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el viento está en ${v} (${chip}). ${chip==='Fuerte'?'Puede afectar la deriva de una pulverización o mover estructuras livianas.':chip==='Calmo'?'Condiciones tranquilas, aunque un viento muy calmo de noche también favorece la inversión térmica.':'Viento moderado y manejable.'}`},
  rafagas:{label:'Ráfagas',short:'Ráfaga máxima esperada en la hora.',
    long:'Pico de velocidad del viento en un lapso corto (segundos), más alto que la velocidad sostenida. Ráfagas mucho más fuertes que el viento de base indican inestabilidad atmosférica o cercanía de tormentas.',
    example:'Viento sostenido de 20 km/h con ráfagas de 45 km/h: cuidado con estructuras livianas, invernaderos o pulverizaciones.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la ráfaga esperada es de ${v} (${chip}). ${chip==='Fuerte'?'Bastante más que el viento sostenido — cuidado con estructuras livianas o pulverizaciones.':'Sin diferencia notable respecto al viento sostenido.'}`},
  probLluvia:{label:'Probabilidad de lluvia',short:'Probabilidad de que llueva en esa hora.',
    long:'Porcentaje de certeza del modelo de que caerá algo de precipitación (aunque sea mínima) en esa hora, en el punto exacto de la ubicación. No indica cuánto va a llover, solo qué tan probable es que llueva algo.',
    example:'70% de probabilidad no garantiza lluvia intensa — puede ser una llovizna de 0.2 mm.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la probabilidad de lluvia es ${v} (${chip}). ${chip==='Alta'?'Buena chance de que llueva en la hora — conviene tenerlo en cuenta antes de fumigar o trabajar al aire libre.':chip==='Baja'?'Poco probable que llueva.':'Probabilidad intermedia, vale la pena revisar el radar/pronóstico horario.'}`},
  precipitacion:{label:'Precipitación',short:'Cantidad de lluvia acumulada en la hora.',
    long:'Milímetros de agua caída durante esa hora específica (1 mm equivale a 1 litro por metro cuadrado). Es la cantidad real esperada, distinta de la probabilidad.',
    example:'5 mm en una hora es lluvia moderada a fuerte; 0.2 mm es apenas una llovizna.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} se esperan ${v} de lluvia (${chip}). ${chip==='Intensa'?'Cantidad considerable para una sola hora.':chip==='Sin lluvia'?'No se espera precipitación.':'Cantidad menor, sin mayor impacto.'}`},
  presion:{label:'Presión atmosférica',short:'Presión a nivel del mar, y su tendencia (subiendo/bajando/estable).',
    long:'Peso de la columna de aire sobre ese punto, ajustado a nivel del mar para poder comparar entre ubicaciones. La tendencia (comparada con 3 horas atrás) es más útil que el valor absoluto: presión en caída suele anticipar mal tiempo, en aumento suele anticipar mejora.',
    example:'Presión bajando rápido en pocas horas suele preceder a un frente frío o tormenta.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la presión es de ${v}, con tendencia "${chip}". ${chip.includes('bajando')?'Puede anticipar un cambio hacia peor tiempo.':chip.includes('subiendo')?'Suele anticipar mejora del tiempo.':'Sin cambios significativos previstos por ahora.'}`},
  inversion:{label:'Inversión térmica',short:'Probabilidad de inversión térmica (aire frío atrapado cerca del suelo).',
    long:'Normalmente la temperatura baja con la altura; en una inversión ocurre lo contrario cerca del suelo, atrapando aire frío, humedad y partículas (como productos fitosanitarios) cerca de la superficie. Es más probable de noche, con cielo despejado y viento calmo.',
    example:'Alta probabilidad de inversión a la madrugada: no es buen momento para fumigar, la deriva del producto puede desplazarse mucho más de lo esperado.',
    svg:'inversion',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la probabilidad de inversión es ${v} (${chip}). ${chip==='Alta'?'Mejor evitar fumigar: el producto puede quedar atrapado cerca del suelo y desplazarse más de lo esperado.':'Condiciones normales de mezcla del aire.'}`},
  potTormenta:{label:'Potencial de tormenta (CAPE)',short:'Energía disponible en la atmósfera para formar tormentas.',
    long:'CAPE (Energía Potencial Convectiva Disponible) mide cuánta energía tiene el aire para ascender y formar nubes de tormenta si se dispara la convección. Valores altos no garantizan tormenta, pero indican que si se forma, puede ser intensa.',
    example:'CAPE de 3000 J/kg en una tarde de verano: condiciones para tormentas fuertes con granizo si algo dispara la convección.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el potencial de tormenta es "${chip}". ${chip==='Alta'?'Si se dispara la convección, las tormentas pueden ser intensas.':chip==='Mínima'?'Atmósfera estable, poco probable que se formen tormentas fuertes.':'Cierta energía disponible, pero no extrema.'}`},
  liftedIndex:{label:'Índice de levantamiento',short:'Mide la inestabilidad atmosférica — negativo indica mayor riesgo de tormenta.',
    long:'Compara la temperatura que tendría una parcela de aire al ascender con la temperatura real del ambiente a esa altura. Valores negativos indican atmósfera inestable (favorable a tormentas); valores positivos indican estabilidad.',
    example:'Índice de -6: atmósfera muy inestable, alta chance de tormentas si hay disparador (frente, calentamiento diurno).',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el índice es de ${v} — atmósfera "${chip.toLowerCase()}". ${chip==='Muy inestable'?'Alta chance de tormentas si aparece un disparador.':chip==='Estable'?'Poco probable que se disparen tormentas.':'Condición intermedia.'}`},
  cin:{label:'Inhibición convectiva (CIN)',short:'"Tapa" que impide que se disparen tormentas aunque haya energía disponible.',
    long:'Es la energía que hay que vencer para que una parcela de aire empiece a ascender libremente. Actúa como una tapa: aunque el CAPE sea alto, un CIN alto puede evitar que se formen tormentas — hasta que algo (calor, un frente) lo rompe.',
    example:'CAPE alto + CIN alto: la atmósfera "está cargada" pero no dispara — si el CIN se rompe de golpe (por la tarde), las tormentas pueden ser explosivas.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la "tapa" es ${chip.toLowerCase()} (${v}). ${chip==='Fuerte'?'Difícil que se disparen tormentas ahora, pero si se rompe más tarde pueden ser intensas.':'Poca resistencia a que se dispare la convección.'}`},
  capaLimite:{label:'Altura de capa límite',short:'Altura hasta donde el aire se mezcla bien con el suelo.',
    long:'Es la altura de la capa de atmósfera que está en contacto e influenciada directamente por la superficie, donde el aire se mezcla verticalmente. Una capa límite baja (común de noche) atrapa humedad y contaminantes cerca del suelo; una capa alta (típica de la tarde) favorece buena dispersión.',
    example:'Capa límite de solo 100 m de noche: cualquier producto aplicado queda "atrapado" cerca del suelo, mayor riesgo de deriva y acumulación.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la capa límite es de ${v} (${chip}). ${chip==='Baja'?'El aire se mezcla poco con la altura — cualquier producto aplicado queda más concentrado cerca del suelo.':chip==='Alta'?'Buena dispersión vertical del aire.':'Mezcla vertical moderada.'}`},
  uv:{label:'Índice UV',short:'Radiación ultravioleta — a mayor valor, mayor riesgo de quemadura solar.',
    long:'Escala estandarizada (0 en adelante) de la intensidad de radiación ultravioleta que llega a la superficie. A partir de 6 se considera alto, y conviene protección solar; por encima de 8, exposición directa prolongada es riesgosa.',
    example:'UV 9 al mediodía de verano: piel clara puede quemarse en menos de 20 minutos sin protección.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el índice UV es ${v} (${chip}). ${chip==='Alto'||chip==='Muy alto'?'Usá protección solar si vas a estar expuesto un rato.':'Riesgo bajo de quemadura solar por ahora.'}`},
  nubosidad:{label:'Nubosidad',short:'Porcentaje del cielo cubierto por nubes.',
    long:'Fracción del cielo cubierta por nubes de cualquier tipo y altura, expresada en porcentaje. 0% es cielo despejado, 100% es cielo totalmente cubierto (aunque no necesariamente lluvioso).',
    example:'92% de nubosidad con 0% de probabilidad de lluvia: día gris y cubierto, pero sin lluvia esperada.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} el cielo está "${chip.toLowerCase()}" (${v} de nubosidad).`},
  visibilidad:{label:'Visibilidad',short:'Distancia horizontal máxima a la que se puede ver con claridad.',
    long:'Distancia hasta la cual un objeto grande puede distinguirse contra el cielo. Se reduce por niebla, lluvia intensa, polvo o humo. Es relevante para vuelos agrícolas y traslados.',
    example:'Visibilidad de 1 km por niebla matinal: no es seguro operar un dron o avión fumigador hasta que se disipe.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} la visibilidad es de ${v} (${chip}). ${chip==='Mala'?'No es buen momento para volar un dron o avión fumigador.':'Sin restricciones por visibilidad.'}`},
  radDirecta:{label:'Radiación directa',short:'Radiación solar que llega directamente del sol, sin dispersarse.',
    long:'Energía solar que llega en línea recta desde el sol, sin ser dispersada por la atmósfera o las nubes. Es la componente que genera sombras nítidas y calienta más intensamente las superficies expuestas.',
    example:'Con cielo despejado al mediodía, casi toda la radiación es directa; con nubes espesas, cae a casi cero.'},
  radDifusa:{label:'Radiación difusa',short:'Radiación solar dispersada por la atmósfera y las nubes.',
    long:'Energía solar que llega dispersada en todas direcciones por partículas, nubes o el propio aire — es la luz que ilumina incluso las zonas de sombra en un día nublado.',
    example:'En un día nublado casi toda la radiación que llega es difusa, por eso hay luz pero pocas sombras marcadas.'},
  sunshine:{label:'Duración de sol',short:'Minutos de sol directo (sin nubes) durante esa hora.',
    long:'Tiempo dentro de la hora en que la radiación solar directa superó el umbral necesario para considerarse "sol pleno" (no tapado por nubes). Distinto de si es de día o no: puede ser de día y nublado, con 0 minutos de sol.',
    example:'35 de 60 minutos con sol: la hora tuvo nubes intermitentes, no cielo despejado todo el tiempo.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} hubo ${v} de sol pleno en la hora (${chip}).`},
  sueloTemp:{label:'Temperatura de suelo',short:'Temperatura del suelo a la profundidad indicada.',
    long:'Temperatura medida a distintas profundidades del suelo. Las capas superficiales (0-6cm) reaccionan rápido a la temperatura del aire y el sol; las profundas (18-54cm) cambian mucho más lento y reflejan mejor la tendencia de varios días.',
    example:'Suelo a 6cm por debajo de 0°: riesgo de helada de suelo aunque el aire esté unos grados por encima de cero.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} esa capa de suelo está a ${v}.${chip?` ${chip}.`:''}`},
  sueloHumedad:{label:'Humedad de suelo',short:'Humedad volumétrica del suelo en esa capa.',
    long:'Fracción del volumen de suelo ocupada por agua, en esa capa de profundidad. Las capas superficiales reflejan lluvias recientes; las profundas reflejan la reserva de agua disponible para raíces más desarrolladas.',
    example:'Humedad óptima en superficie pero muy baja a 27-81cm: puede haber llovido poco y parejo, sin recargar la reserva profunda que usan raíces más grandes.',
    phrase:(v,chip,tone,time)=>`${whenPrefix(time)} esa capa de suelo tiene ${v} de humedad (${chip}). ${chip==='Seco'?'Puede ser momento de regar si el cultivo tiene raíces en esa profundidad.':chip==='Saturado'?'Poca capacidad de absorber más agua por ahora.':'Nivel de humedad adecuado.'}`},
  amanecer:{label:'Amanecer',short:'Hora de salida del sol hoy.',
    long:'Momento en que el borde superior del sol cruza el horizonte por la mañana, calculado según la ubicación y la fecha. Marca el inicio del día solar.',
    example:'Amanece más tarde en invierno y más temprano en verano — la diferencia puede ser de varias horas según la latitud.',
    phrase:v=>`Hoy el sol sale a las ${v}.`},
  atardecer:{label:'Atardecer',short:'Hora de puesta del sol hoy.',
    long:'Momento en que el sol desaparece por debajo del horizonte al final del día. A partir de ahí baja rápido la luz disponible y, en el campo, se acorta la ventana para trabajar a la luz del día.',
    example:'Si el atardecer es a las 18:47, conviene terminar tareas a la luz del día con margen antes de esa hora.',
    phrase:v=>`Hoy el sol se pone a las ${v}.`},
  helada:{label:'Riesgo de helada',short:'Probabilidad de temperatura bajo cero durante la próxima noche/madrugada.',
    long:'Estimación del riesgo de que la temperatura del aire baje de 0° en las próximas horas nocturnas, a partir del pronóstico horario de temperatura mínima. Cielo despejado y viento calmo aumentan el riesgo real de helada.',
    example:'Riesgo "fuerte" con mínima de -2°: conviene proteger cultivos sensibles o adelantar cosecha si es posible.',
    phrase:(v,chip)=>chip?`Riesgo "${chip.toLowerCase()}" para esta noche, con mínima estimada de ${v}.`:`Para esta noche: ${v}.`},
  et0:{label:'Evapotranspiración de referencia (ET0)',short:'Agua que un cultivo de referencia pierde por día hacia la atmósfera.',
    long:'Estima cuánta agua perdería por evaporación y transpiración un cultivo de referencia (pasto corto, bien regado) en un día, según temperatura, viento, radiación y humedad. Es la base para calcular cuánto regar.',
    example:'ET0 de 6 mm en un día caluroso y ventoso: el cultivo necesita bastante agua de reposición ese día.',
    phrase:v=>`Hoy la evapotranspiración de referencia es de ${v}.`},
  balanceHidrico:{label:'Balance hídrico',short:'Diferencia entre lluvia caída y agua evapotranspirada en el período.',
    long:'Compara cuánta agua cayó como lluvia contra cuánta se perdió por evapotranspiración (ET0) en los últimos días. Un balance negativo indica que el suelo se está secando; uno positivo, que hay sobra de agua respecto al consumo.',
    example:'Balance de -18 mm en 7 días: llovió bastante menos de lo que se evaporó — el suelo se está secando y puede convenir regar.',
    phrase:(v,chip,tone,time)=>`${time?`A ${time}`:'Hasta ahora'} el balance es de ${v} (${chip}). ${chip==='Muy negativo'?'El suelo se está secando con fuerza — conviene regar si es posible.':chip==='Negativo'?'El suelo se está secando — conviene vigilar la humedad disponible.':chip==='Positivo'?'Hay sobra de agua respecto al consumo del período.':'Sin déficit marcado por ahora.'}`},
  solTranscurrido:{label:'Sol transcurrido',short:'Horas de luz solar que ya pasaron hoy.',
    long:'Tiempo transcurrido desde el amanecer hasta ahora (o hasta el atardecer si ya se puso el sol). Ayuda a dimensionar cuánta luz de trabajo ya se aprovechó en el día.',
    example:'Con 3h 20m de sol transcurridas y el trabajo recién arrancando, todavía queda buena parte del día de luz.',
    phrase:v=>`Hoy ya pasaron ${v} de sol.`},
  solRestante:{label:'Sol restante',short:'Horas de luz solar que quedan hoy.',
    long:'Tiempo que falta desde ahora hasta la puesta del sol (0 si ya anocheció). Es la ventana de luz natural que queda disponible para trabajar.',
    example:'Con 2h de sol restante, alcanza para terminar una tarea corta pero no para arrancar una que lleve todo el día.',
    phrase:v=>`Hoy quedan ${v} de sol.`},
  diaTranscurrido:{label:'Día transcurrido',short:'Porcentaje del día (24 h) que ya pasó.',
    long:'Fracción de las 24 horas del día que ya transcurrió, tomando la medianoche como inicio. Es un progreso simple del día completo, no solo de las horas de luz.',
    example:'62% del día transcurrido a las 15:00: quedan aproximadamente 9 horas hasta la medianoche.',
    phrase:v=>`Ya pasó ${v} del día.`},
  diaRestante:{label:'Día restante',short:'Porcentaje del día (24 h) que todavía falta.',
    long:'Fracción de las 24 horas del día que todavía no transcurrió, hasta la medianoche. Es el complemento del día transcurrido.',
    example:'38% del día restante a las 15:00: todavía quedan varias horas, incluida la noche, antes de la medianoche.',
    phrase:v=>`Todavía falta ${v} del día.`},
};

let modalEl=null;

function ensureModal(){
  if(modalEl)return modalEl;
  modalEl=document.createElement('div');
  modalEl.className='glossary-modal';
  modalEl.hidden=true;
  modalEl.innerHTML=`
    <div class="glossary-backdrop"></div>
    <div class="glossary-sheet">
      <button class="glossary-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
      <h3 class="glossary-title"></h3>
      <div class="glossary-card">
        <span class="glossary-card-ic"></span>
        <div class="glossary-card-main">
          <div class="glossary-card-val"></div>
          <div class="glossary-card-chip"></div>
        </div>
        <span class="glossary-card-time"></span>
      </div>
      <div class="glossary-body">
        <div class="glossary-diagram"></div>
        <p class="glossary-long"></p>
        <div class="glossary-example"></div>
        <div class="glossary-now"></div>
      </div>
    </div>`;
  document.body.appendChild(modalEl);
  const close=()=>{modalEl.hidden=true;};
  modalEl.querySelector('.glossary-backdrop').addEventListener('click',close);
  modalEl.querySelector('.glossary-close').addEventListener('click',close);
  return modalEl;
}

const SVGS={
  band:`<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="26" width="192" height="8" rx="4" fill="#3a3a40"/>
    <rect x="70" y="26" width="60" height="8" rx="4" fill="#22c55e"/>
    <text x="70" y="20" fill="#9d9da8" font-size="9">2</text>
    <text x="126" y="20" fill="#9d9da8" font-size="9">8</text>
    <text x="4" y="48" fill="#9d9da8" font-size="9">Bajo</text>
    <text x="86" y="48" fill="#22c55e" font-size="9">Ideal</text>
    <text x="170" y="48" fill="#9d9da8" font-size="9">Alto</text>
  </svg>`,
  compass:`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="44" fill="none" stroke="#3a3a40" stroke-width="2"/>
    <text x="50" y="14" fill="#9d9da8" font-size="10" text-anchor="middle">N</text>
    <text x="50" y="94" fill="#9d9da8" font-size="10" text-anchor="middle">S</text>
    <text x="10" y="54" fill="#9d9da8" font-size="10" text-anchor="middle">O</text>
    <text x="90" y="54" fill="#9d9da8" font-size="10" text-anchor="middle">E</text>
    <circle cx="50" cy="50" r="4" fill="#0d9488"/>
  </svg>`,
  inversion:`<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
    <line x1="20" y1="70" x2="180" y2="70" stroke="#3a3a40" stroke-width="2"/>
    <path d="M20 68 C60 40, 90 66, 110 30 C130 8, 160 6, 180 6" fill="none" stroke="#0ea5e9" stroke-width="2.5"/>
    <text x="20" y="16" fill="#9d9da8" font-size="9">Altura</text>
    <text x="140" y="76" fill="#9d9da8" font-size="9">Temperatura →</text>
    <text x="30" y="60" fill="#ef4444" font-size="9">Aire frío atrapado</text>
  </svg>`,
};

// Prefijo temporal de cada frase: hora puntual ("A las 14:00") si `time` es un
// reloj HH:MM, o la etiqueta tal cual (p.ej. "Hoy en promedio") si no lo es.
function whenPrefix(time){
  if(!time)return'Ahora';
  if(/^\d{2}:\d{2}$/.test(time))return`A las ${time}`;
  return time;
}

function genericPhrase(value,chipLabel,chipTone,time){
  if(!value)return'';
  const when=whenPrefix(time);
  if(!chipLabel)return`${when} está en ${value}.`;
  const clause=chipTone==='warn'?' — prestale atención.':chipTone==='ok'?' — en buen rango.':'.';
  return`${when} está en ${value} (${chipLabel})${clause}`;
}

export function openGlossary(term,ctx={}){
  const g=GLOSSARY[term];
  if(!g)return;
  const {value='',chipLabel='',chipTone='',iconName='',color='#9d9da8',time=''}=ctx;
  const el=ensureModal();
  el.querySelector('.glossary-title').textContent=g.label;

  const card=el.querySelector('.glossary-card');
  if(value){
    card.hidden=false;
    card.style.borderColor=color;
    const icWrap=card.querySelector('.glossary-card-ic');
    icWrap.innerHTML=icon(iconName||'circle-info',{size:20,color});
    icWrap.style.background=`${color}22`;
    card.querySelector('.glossary-card-val').textContent=value;
    const chipEl=card.querySelector('.glossary-card-chip');
    chipEl.textContent=chipLabel;
    chipEl.className=`glossary-card-chip${chipTone?` mc-${chipTone}`:''}`;
    chipEl.hidden=!chipLabel;
    const timeEl=card.querySelector('.glossary-card-time');
    timeEl.textContent=time||'';
    timeEl.hidden=!time;
  }else{
    card.hidden=true;
  }

  el.querySelector('.glossary-long').textContent=g.long;
  el.querySelector('.glossary-example').innerHTML=g.example?`<b>Ejemplo:</b> ${g.example}`:'';
  const diagram=el.querySelector('.glossary-diagram');
  if(g.svg&&SVGS[g.svg]){diagram.innerHTML=SVGS[g.svg];diagram.hidden=false;}
  else{diagram.innerHTML='';diagram.hidden=true;}
  const nowEl=el.querySelector('.glossary-now');
  const phrase=value?(g.phrase?g.phrase(value,chipLabel,chipTone,time):genericPhrase(value,chipLabel,chipTone,time)):'';
  if(phrase){nowEl.innerHTML=`<b>En tu ubicación:</b> ${phrase}`;nowEl.hidden=false;}
  else{nowEl.innerHTML='';nowEl.hidden=true;}
  el.hidden=false;
}
