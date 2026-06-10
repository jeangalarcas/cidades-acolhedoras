/**
 * SGA — Map Utilities
 * Helpers para o Leaflet: inicialização, ícones, camadas, interações
 */

const MapUtils = {

  /** Inicializa o mapa principal (página Mapa) */
  initMainMap() {
    if (SGA.ui.mapInited) return;
    SGA.ui.mapInited = true;

    setTimeout(() => {
      const m = L.map('leaflet-map', { zoomControl: true })
        .setView(SGA.config.mapCenter, SGA.config.mapZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CPRM · ANA HidroWeb · Cidades Acolhedoras',
        maxZoom: 18,
      }).addTo(m);

      SGA.maps.main = m;
      this._buildAllLayers(m, 'main');

      // Ativa camadas padrão
      ['risco','hidro','pluvio','hidrov'].forEach(id => {
        if (SGA.maps.layerGroups[id]) SGA.maps.layerGroups[id].addTo(m);
      });
    }, 150);
  },

  /** Inicializa o mini-mapa do painel */
  initMiniMap() {
    if (SGA.ui.miniMapInited) return;
    SGA.ui.miniMapInited = true;

    const el = document.getElementById('mini-map');
    if (!el) return;

    const m = L.map('mini-map', {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    }).setView(SGA.config.mapCenter, 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(m);

    // Círculos de risco dos municípios
    SGA.municipios.forEach(mu => this._addMuniCircle(m, mu));

    // Rio Pardo
    L.polyline([[-29.50,-52.80],[-29.67,-52.54],[-29.79,-52.38],[-29.99,-52.37],[-30.04,-52.10],[-29.90,-51.80]],
      { color:'#2A5A8C', weight:3, opacity:.6 }).addTo(m);

    SGA.maps.mini = m;
  },

  /** Constrói todos os layer groups */
  _buildAllLayers(m, context) {
    const lg = SGA.maps.layerGroups;

    // Zonas de risco — municípios
    lg.risco = L.layerGroup();
    SGA.municipios.forEach(mu => this._addMuniCircle(lg.risco, mu));

    // Hidrografia
    lg.hidro = L.layerGroup();
    L.polyline([[-29.50,-52.80],[-29.67,-52.54],[-29.79,-52.38],[-29.99,-52.37],[-30.04,-52.10],[-29.90,-51.80]],
      { color:'#2A5A8C', weight:4, opacity:.65 })
      .bindTooltip('Rio Pardo · ANA HidroWeb', { sticky:true }).addTo(lg.hidro);
    L.polyline([[-29.40,-52.60],[-29.52,-52.50],[-29.62,-52.44],[-29.72,-52.43]],
      { color:'#3B7FC4', weight:2.5, opacity:.55 })
      .bindTooltip('Rio Pardinho', { sticky:true }).addTo(lg.hidro);

    // Réguas ANA HidroWeb
    lg.hidrov = L.layerGroup();
    SGA.sensoresHidro.forEach(s => {
      if (!s.cota) return;
      L.marker([s.lat, s.lng], { icon: this._sensorIcon(s.col, 'H') })
        .bindTooltip(`<strong>${s.id}</strong><br>${s.local}<br>Cota: <strong>${s.cota}m</strong> · ${s.status}<br><em>ANA HidroWeb</em>`, { sticky:true })
        .addTo(lg.hidrov);
    });

    // Pluviômetros
    lg.pluvio = L.layerGroup();
    SGA.sensoresPluvio.forEach(s => {
      L.marker([s.lat, s.lng], { icon: this._sensorIcon(s.col, 'P') })
        .bindTooltip(`<strong>${s.id}</strong><br>${s.local}<br>${s.mmh}mm/h · ${s.status}<br><em>CEMADEN + IoT</em>`, { sticky:true })
        .addTo(lg.pluvio);
    });

    // CPRM — suscetibilidade (overlay)
    lg.cprm = L.layerGroup();
    [
      { lat:-29.99, lng:-52.37, r:4500, col:'#B83A2E', label:'CPRM — Suscetib. alta inundação' },
      { lat:-29.67, lng:-52.54, r:3800, col:'#7F55CC', label:'CPRM — Suscetib. alta deslizamento' },
      { lat:-29.72, lng:-52.43, r:4200, col:'#E85B50', label:'CPRM — Suscetib. alta inundação' },
    ].forEach(z => {
      L.circle([z.lat, z.lng], { radius:z.r, color:z.col, fillColor:z.col, fillOpacity:.22, weight:1.5, dashArray:'6 4' })
        .bindTooltip(z.label + ' · <em>CPRM GeoSGB</em>', { sticky:true })
        .addTo(lg.cprm);
    });

    // Abrigos
    lg.abrigo = L.layerGroup();
    SGA.abrigos.forEach(a => {
      const vagas = Math.round(a.cap * (1 - a.ocup/100));
      L.marker([a.lat, a.lng], { icon: this._abrigoIcon() })
        .bindTooltip(`<strong>${a.nome}</strong><br>${vagas} vagas livres (${a.ocup}% ocup.) · Cota ${a.cota}m`, { sticky:true })
        .addTo(lg.abrigo);
    });

    // Rotas de fuga (OSM-based)
    lg.rota = L.layerGroup();
    L.polyline([[-29.99,-52.37],[-29.90,-52.40],[-29.82,-52.41],[-29.72,-52.43]],
      { color:'#2D7A5C', weight:3, opacity:.75, dashArray:'8 5' })
      .bindTooltip('Rota de fuga: RS-471 → Santa Cruz do Sul · <em>OSM</em>', { sticky:true })
      .addTo(lg.rota);
  },

  /** Toggle de camada no mapa principal */
  toggleLayer(id) {
    if (!SGA.maps.main) return;
    const state = SGA.ui.mapLayers;
    state[id] = !state[id];
    const lg = SGA.maps.layerGroups[id];
    if (lg) {
      if (state[id]) lg.addTo(SGA.maps.main);
      else SGA.maps.main.removeLayer(lg);
    }
    // Atualiza estilo do botão
    const btn = document.getElementById('lb-' + id);
    if (btn) {
      btn.className = 'layer-btn' + (state[id] ?
        { risco:' on', hidro:' on-blue', pluvio:' on-amber', hidrov:' on-blue', cprm:' on', abrigo:' on', rota:' on' }[id] || ' on'
        : '');
    }
  },

  /** Adiciona círculo de município ao mapa */
  _addMuniCircle(target, mu) {
    const radius = 4000 + mu.score * 5000;
    L.circle([mu.lat, mu.lng], {
      radius,
      color: mu.col,
      fillColor: mu.col,
      fillOpacity: 0.35 + mu.score * 0.4,
      weight: 1.5,
    })
    .bindTooltip(
      `<strong>${mu.name}</strong><br>Risco: ${mu.risco} · Score IA: ${mu.score}<br>Pop: ${mu.pop.toLocaleString('pt-BR')}<br>${mu.nota}`,
      { sticky: true }
    )
    .addTo(target instanceof L.Map ? target : target);

    L.marker([mu.lat, mu.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="map-icon-muni" style="color:${mu.col}">${mu.name}</div>`,
        iconSize: [0, 0],
      }),
    }).addTo(target instanceof L.Map ? target : target);
  },

  /** Ícone para sensores (réguas e pluviômetros) */
  _sensorIcon(color, letter) {
    return L.divIcon({
      className: '',
      html: `<div class="map-icon-sensor" style="background:${color}">${letter}</div>`,
      iconSize: [14, 14],
    });
  },

  /** Ícone para abrigos */
  _abrigoIcon() {
    return L.divIcon({
      className: '',
      html: `<div class="map-icon-abrigo">A</div>`,
      iconSize: [18, 18],
    });
  },
};

window.MapUtils = MapUtils;
// Expõe toggleLayer globalmente para uso inline no HTML
window.toggleLayer = (id) => MapUtils.toggleLayer(id);
