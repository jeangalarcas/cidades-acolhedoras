/**
 * SGA — Mapa OSM + Camadas
 */
const MapaPage = {
  render() {
    return `
    <div class="page" id="p-mapa">
      <div class="page-header">
        <div>
          <div class="page-title">Mapa de Risco</div>
          <div class="page-sub">OpenStreetMap · CPRM GeoSGB · ANA HidroWeb</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="MapUtils.initMainMap()">↺ Recentrar</button>
        </div>
      </div>

      <!-- TOOLBAR DE CAMADAS -->
      <div class="map-toolbar">
        <span style="font-size:11px;font-weight:700;color:var(--text-2);margin-right:4px">Camadas:</span>
        <button id="lb-risco"  class="layer-btn on"      onclick="toggleLayer('risco')">🔴 Zonas de risco</button>
        <button id="lb-hidro"  class="layer-btn on-blue"  onclick="toggleLayer('hidro')">💧 Hidrografia</button>
        <button id="lb-hidrov" class="layer-btn on-blue"  onclick="toggleLayer('hidrov')">📏 Réguas ANA</button>
        <button id="lb-pluvio" class="layer-btn on-amber" onclick="toggleLayer('pluvio')">🌧 Pluviômetros</button>
        <button id="lb-cprm"   class="layer-btn"         onclick="toggleLayer('cprm')">🟣 CPRM Suscet.</button>
        <button id="lb-abrigo" class="layer-btn"         onclick="toggleLayer('abrigo')">🏠 Abrigos</button>
        <button id="lb-rota"   class="layer-btn"         onclick="toggleLayer('rota')">🟢 Rotas de fuga</button>
      </div>

      <!-- MAPA + LEGENDA -->
      <div class="map-wrap" style="flex:1;display:flex;flex-direction:column;margin:0;border-radius:0">
        <div id="leaflet-map" style="flex:1"></div>
        <div class="map-legend">
          <div class="map-legend-title">LEGENDA — RISCO</div>
          ${[
            ['#7B0000','Crítico (5)'],
            ['#B83A2E','Alto (4)'],
            ['#E8A23A','Médio-Alto (3)'],
            ['#C9B830','Médio (2)'],
            ['#4BAF82','Baixo (1)'],
          ].map(([cor,label]) => `
            <div class="legend-row">
              <div class="legend-dot" style="background:${cor}"></div>
              <span style="font-size:10px">${label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
  },
};
window.MapaPage = MapaPage;
