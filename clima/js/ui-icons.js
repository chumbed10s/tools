// Íconos de interfaz como SVG inline — reemplazo de Font Awesome, sin CDN.
// Trazo monocromo (currentColor). Uso: icon('wind', {size:16, cls:'x'}).
// viewBox 0 0 24 24, stroke-based salvo donde el relleno lee mejor.

const P={
  // ── clima / datos ──
  droplet:'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  wind:'M3 8h11a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h9',
  gust:'M3 9h12a3 3 0 1 0-3-3M3 15h8a3 3 0 1 1-2 2.6',
  gauge:'M12 13l4-4M4.5 18a9 9 0 1 1 15 0M12 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  thermometer:'M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z',
  'thermometer-up':'M8 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0zM17 3v8M17 3l2.5 2.5M17 3l-2.5 2.5',
  'thermometer-down':'M8 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0zM17 11V3M17 11l2.5-2.5M17 11l-2.5-2.5',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  sunrise:'M12 3v6M9 6l3-3 3 3M3 18h3M18 18h3M5.5 13.5 7 15M18.5 13.5 17 15M7.5 18a4.5 4.5 0 0 1 9 0M2 21h20',
  sunset:'M12 9V3M9 6l3 3 3-3M3 18h3M18 18h3M5.5 13.5 7 15M18.5 13.5 17 15M7.5 18a4.5 4.5 0 0 1 9 0M2 21h20',
  sun:'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  moon:'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  uv:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  cloud:'M7 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 18H7z',
  'cloud-rain':'M7 15a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 15M8 19l-1 2M12 19l-1 2M16 19l-1 2',
  'cloud-bolt':'M7 15a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 18 15M12 15l-2 4h3l-2 4',
  snowflake:'M12 2v20M4 6l16 12M20 6 4 18M9 4l3 2 3-2M9 20l3-2 3 2M4.5 9.5 5 12l-.5 2.5M19.5 9.5 19 12l.5 2.5',
  fog:'M4 9h16M6 13h12M4 17h16M8 21h8',
  radiation:'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 3a9 9 0 0 1 7.8 4.5l-6 3.5M12 21a9 9 0 0 1-7.8-4.5l6-3.5M20 17a9 9 0 0 1-16 0h7',
  soil:'M3 15h18M3 15l2-4h14l2 4M6 15v3M12 15v3M18 15v3M9 11l1-3M15 11l-1-3',
  dew:'M12 15a4 4 0 0 0 4-4c0-2.5-4-7-4-7s-4 4.5-4 7a4 4 0 0 0 4 4zM6 20h12',
  et0:'M12 3s5 6 5 10a5 5 0 0 1-10 0M7 13l-3 3M7 17l-3 3M5 13v.01',
  compass:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  // ── navegación / interfaz ──
  clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  calendar:'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zM4 9h16M8 3v4M16 3v4',
  list:'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01',
  x:'M6 6l12 12M18 6 6 18',
  'chevron-down':'M6 9l6 6 6-6',
  'chevron-right':'M9 6l6 6-6 6',
  'chevron-left':'M15 6l-6 6 6 6',
  'arrow-up':'M12 20V5M12 5l-6 6M12 5l6 6',
  refresh:'M20 11a8 8 0 1 0-.5 4M20 5v6h-6',
  search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  'location-dot':'M12 21s7-6.3 7-12A7 7 0 0 0 5 9c0 5.7 7 12 7 12zM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  crosshairs:'M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  bell:'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0',
  sliders:'M4 8h10M18 8h2M4 16h2M10 16h10M14 5v6M8 13v6',
  gear:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.7 13H4a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 5.8 6.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.7V4a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .3 1.8h.5a2 2 0 0 1 0 4h-.2z',
  check:'M5 12l5 5L20 6',
  alert:'M12 3 2 20h20L12 3zM12 9v5M12 17.5h.01',
  layers:'M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5',
  bolt:'M13 2 4 14h7l-2 8 9-12h-7l2-8z',
  // ── tareas agro ──
  drone:'M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4M3 6h4M17 6h4M3 18h4M17 18h4M9 9h6v6H9zM12 15v3M10 20h4',
  sprayer:'M14 8h4l2 3v6a2 2 0 0 1-2 2h-3M15 19H6a2 2 0 0 1-2-2v-3l2-3h4M9 8V5h4v3M12 5V3M17 3l1 2M19.5 3l-1 2M18 6l1.5 1',
  seed:'M12 21V11M12 11c0-3 2-5 5-5 0 3-2 5-5 5zM12 13c0-3-2-5-5-5 0 3 2 5 5 5zM6 21h12',
  wheat:'M12 21V9M12 9l3-3M12 9 9 6M12 13l3-3M12 13l-3-3M12 5l3-3M12 5 9 2',
  mountain:'M3 19h18L14 7l-3 5-2-3-6 10z',
};

const FILLED=new Set(['drone']);

export function icon(name,{size=16,cls='',stroke=1.75}={}){
  const d=P[name];
  if(!d)return '';
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" `
    +`stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" `
    +`aria-hidden="true">${d.split('|').map(seg=>`<path d="${seg}"/>`).join('')}</svg>`;
}

export function hasIcon(name){return name in P;}
