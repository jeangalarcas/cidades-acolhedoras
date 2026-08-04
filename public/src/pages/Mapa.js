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
        <button id="lb-hidrov" class="layer-btn on-blue"  onclick="toggleLayer('hidrov')">📏 Réguas ANA</button>
        <button id="lb-pluvio" class="layer-btn on-amber" onclick="toggleLayer('pluvio')">🌧 Pluviômetros</button>
        <button id="lb-cprm"   class="layer-btn"         onclick="toggleLayer('cprm')">🟣 CPRM Suscet.</button>
        <button id="lb-abrigo" class="layer-btn"         onclick="toggleLayer('abrigo')">🏠 Abrigos</button>
        <button id="lb-rota"   class="layer-btn"         onclick="toggleLayer('rota')">🟢 Rotas de fuga</button>
        <button id="lb-bacias" class="layer-btn"         onclick="BaciasCamada.toggle()">🌊 Bacias</button>
      </div>

      <!-- CAMADAS OFICIAIS IBGE (desligadas por padrão · carregam sob demanda) -->
      <div class="map-toolbar" style="border-top:none">
        <span style="font-size:11px;font-weight:700;color:var(--text-2);margin-right:4px" title="Fontes: IBGE Malha 2022 · Bairros CD2022 + Censo 2022 · BC250 v2025">IBGE:</span>
        <button id="lg-uf"      class="layer-btn" onclick="GeoOficial.toggle('uf')">🗺 Limite RS</button>
        <button id="lg-mun"     class="layer-btn" onclick="GeoOficial.toggle('mun')">🔲 Municípios</button>
        <button id="lg-bairros" class="layer-btn" onclick="GeoOficial.toggle('bairros')">🏘 Bairros</button>
        <button id="lg-rios"    class="layer-btn" onclick="GeoOficial.toggle('rios')">〰 Rios BC250</button>
        <button id="lg-massas"  class="layer-btn" onclick="GeoOficial.toggle('massas')">🔵 Lagos/Massas</button>
        <span style="font-size:11px;font-weight:700;color:var(--text-2);margin:0 4px 0 10px">GIS:</span>
        <button id="wg-dist" class="layer-btn" onclick="MedirMapa.distancia()" title="Cliques adicionam pontos; duplo clique encerra">📏 Medir distância</button>
        <button id="wg-area" class="layer-btn" onclick="MedirMapa.area()" title="Cliques desenham o polígono; duplo clique fecha">⬛ Medir área</button>
        <button class="layer-btn" onclick="MedirMapa.limpar()">✕</button>
      </div>

      <!-- CAMADAS DE CHEIA (BHO/ANA · SGB · IPH-UFRGS · simulação HAND · sob demanda) -->
      <div class="map-toolbar" style="border-top:none">
        <span style="font-size:11px;font-weight:700;color:var(--text-2);margin-right:4px" title="Fontes: BHO 2017 (ANA) · Manchas SGB/CPRM e IPH-UFRGS · Simulação HAND (ANADEM 30m) · CNEFE 2022 (IBGE)">CHEIAS:</span>
        <button id="lc-fluxo"   class="layer-btn" onclick="CamadasCheia.toggleFluxo()" title="Escoamento animado no sentido real do fluxo (topologia BHO/ANA)">🌊 Escoamento</button>
        <button id="lc-manchas" class="layer-btn" onclick="CamadasCheia.toggleManchas()" title="Manchas oficiais por cota de régua — Montenegro, S.S. do Caí, Lajeado, Alegrete, Uruguaiana">🟦 Manchas oficiais</button>
        <button id="lc-hand"    class="layer-btn" onclick="CamadasCheia.toggleSimulada()" title="SIMULAÇÃO HAND (região de Canoas) — não considera diques/bombas">🟪 Simulação (Canoas)</button>
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