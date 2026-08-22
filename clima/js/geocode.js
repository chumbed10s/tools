// Búsqueda de ubicaciones por nombre — mismo proveedor que el clima (Open-Meteo Geocoding).
export async function searchLocations(query){
  const q=query.trim();
  if(q.length<2)return[];
  const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=es&format=json`;
  const res=await fetch(url);
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();
  return(data.results||[]).map(r=>({
    id:`geo-${r.id}`,
    label:r.name,
    admin1:r.admin1||'',
    country:r.country||'',
    countryCode:(r.country_code||'').toUpperCase(),
    lat:r.latitude,
    lon:r.longitude,
    isGPS:false,
  }));
}

// Geocodificación inversa (coordenadas → nombre de lugar) para la ubicación por GPS —
// BigDataCloud tiene un endpoint gratuito pensado para uso desde el cliente, sin API key.
export async function reverseGeocode(lat,lon){
  const url=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`;
  const res=await fetch(url);
  if(!res.ok)throw new Error('HTTP '+res.status);
  const d=await res.json();
  return{
    label:d.locality||d.city||d.principalSubdivision||'Mi ubicación',
    admin1:d.principalSubdivision||'',
    country:d.countryName||'',
    countryCode:(d.countryCode||'').toUpperCase(),
  };
}

export function flagEmoji(countryCode){
  if(!countryCode||countryCode.length!==2)return'';
  const base=127397;
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map(c=>base+c.charCodeAt(0)));
}
