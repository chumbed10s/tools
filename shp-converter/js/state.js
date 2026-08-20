// Paletas, constantes y estado compartido entre módulos.
export const LPLT=['#ff6b6b','#ffd43b','#69db7c','#4dabf7','#ffa94d','#cc5de8','#63e6be','#f783ac'];
export const CPLT=['#2ecc71','#f1c40f','#e67e22','#e74c3c','#9b59b6','#3498db','#1abc9c','#e91e63'];
export const WGS84_PRJ='GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
export const COL_W=78;
export const DAYS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export const state={
  layers:[],
  colorIdx:0,
  layerId:0,
  wxActive:{layerId:null,data:null,lat:null,lon:null,name:''},
  wxNowIdx:0,
  activeHourIdx:0,
  driftKm:2,
  wxMarkerLayer:null,
  driftLayers:[],
  sensitiveZones:[],
  zoneId:0,
  savedTypes:['Casa','Colza','Lino','Soja','Girasol','Apiario','Agua'],
  pendingZoneLatlngs:null,
  pendingExportId:null,
  manualLotCount:0,
};
