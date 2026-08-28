// Glosario de términos meteorológicos y agronómicos. Cada entrada: qué es +
// por qué importa en el campo. Se muestra vía tooltip.js en cualquier elemento
// con data-term="clave".
export const GLOSSARY={
  dew_point:{
    title:'Punto de rocío',
    body:'Temperatura a la que el aire se satura y empieza a condensar. Si la temperatura del aire baja hasta ahí, se forma rocío y se moja la hoja. Cuanto más cerca está del aire actual, más húmedo el ambiente: importa para la persistencia de la aplicación y para saber cuándo se seca el cultivo para cosecha.',
  },
  delta_t:{
    title:'Delta-T',
    body:'Diferencia entre la temperatura del aire y la de bulbo húmedo. Mide qué tan rápido se evapora la gota. Ideal para pulverizar: 2 a 8. Por debajo de 2 la gota casi no evapora (riesgo de deriva por gotas que quedan suspendidas); por encima de 10 la gota se evapora antes de llegar al objetivo.',
  },
  inversion:{
    title:'Inversión térmica',
    body:'Situación en la que el aire cerca del suelo está más frío que el de arriba, típica de noches despejadas y sin viento. El aire no se mezcla: las gotas y el vapor quedan atrapados en una capa fina y pueden desplazarse lejos del lote. Es una de las principales causas de deriva; en inversión no se aplica.',
  },
  gust:{
    title:'Ráfaga',
    body:'Pico de velocidad del viento en un lapso corto, por encima del promedio. Aunque el viento medio esté en rango, ráfagas altas rompen el patrón de aspersión y aumentan la deriva, sobre todo con dron.',
  },
  uv_index:{
    title:'Índice UV',
    body:'Intensidad de la radiación ultravioleta solar. 0–2 bajo, 3–5 moderado, 6–7 alto, 8–10 muy alto. Además del cuidado personal, la UV alta degrada más rápido algunos principios activos aplicados sin incorporar.',
  },
  cape:{
    title:'CAPE',
    body:'Energía potencial convectiva disponible (J/kg). Indica cuánta "gasolina" tiene la atmósfera para formar tormentas. Por debajo de ~300 es estable; 1000–2500 favorece tormentas fuertes; más de 2500, severas. Útil para anticipar cortar la jornada.',
  },
  et0:{
    title:'ET0 (evapotranspiración de referencia)',
    body:'Agua que un cultivo de referencia perdería por evaporación y transpiración, en mm. Restada a la lluvia da el balance hídrico: si ET0 supera a la lluvia varios días, el perfil de suelo se seca.',
  },
  soil_moisture:{
    title:'Humedad de suelo',
    body:'Contenido de agua en el suelo (m³/m³ o %). Define la transitabilidad (piso) para entrar con maquinaria y la cama de siembra. Muy baja: mala germinación; muy alta: compactación y patinaje.',
  },
  soil_temp:{
    title:'Temperatura de suelo',
    body:'Temperatura a pocos centímetros de profundidad. Marca el arranque de la germinación: la mayoría de los cultivos de verano necesitan suelo por encima de 8–12 °C sostenidos para sembrar.',
  },
  apparent_temp:{
    title:'Sensación térmica',
    body:'Temperatura que percibe el cuerpo combinando aire, humedad, viento y sol. No cambia la fisiología del cultivo pero sí las condiciones de trabajo y el golpe de calor.',
  },
  pressure:{
    title:'Presión atmosférica',
    body:'Peso de la columna de aire (hPa). Su tendencia importa más que el valor: presión que cae marca llegada de mal tiempo; presión que sube, estabilización.',
  },
  visibility:{
    title:'Visibilidad',
    body:'Distancia horizontal a la que se distingue un objeto. Baja visibilidad suele indicar niebla o bruma: alta humedad y, a menudo, inversión.',
  },
  wind_shear:{
    title:'Cortante de viento',
    body:'Diferencia de viento entre la superficie y capas más altas (80–180 m). Cortante fuerte con viento bajo en superficie es señal de inversión y de que el dron, al subir, encuentra otro régimen.',
  },
  frost:{
    title:'Helada',
    body:'Temperatura del aire que baja lo suficiente para dañar tejidos. La helada meteorológica es a 0 °C en abrigo; la agronómica se considera desde ~3 °C porque a nivel de suelo y hoja hace varios grados menos.',
  },
  precip_prob:{
    title:'Probabilidad de precipitación',
    body:'Chance de que llueva algo medible en esa hora/día. No dice cuánto: hay que mirarla junto con los milímetros esperados.',
  },
  spray_window:{
    title:'Ventana de aplicación',
    body:'Franja horaria en la que se cumplen todas las condiciones del perfil elegido (viento, humedad, Delta-T, sin inversión, sin lluvia). Verde: todo en rango. Amarillo: aplicable con reparos.',
  },
};

export function glossaryEntry(term){return GLOSSARY[term]||null;}
