/**
 * SGA v3 — Map Utilities
 * Mapa OSM com TODOS os 497 municipios do RS
 * Dados de risco, sensores e abrigos dinamicos
 */
const MapUtils = {

  initMainMap() {
    if (SGA.ui.mapInited) return;
    SGA.ui.mapInited = true;
    setTimeout(async function() {
      var center = SGA.config.mapCenter || [-29.5, -53.0];
      var zoom   = SGA.config.mapZoom   || 7;
      var m = L.map('leaflet-map', { zoomControl:true }).setView(center, zoom);

      // ── BASE MAPS — seletor no canto superior direito ──────────────────
      var baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap | CPRM · ANA HidroWeb · Cidades Acolhedoras / Correa Eco Social',
        maxZoom: 18,
      }).addTo(m);
      var baseMaps = {
        '🗺 Padrão (OSM)': baseOSM,
        '🛰 Satélite (Esri World Imagery)': L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: 'Esri · Maxar · Earthstar Geographics', maxZoom: 19 }),
        '⛰ Topográfico (OpenTopoMap)': L.tileLayer(
          'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          { attribution: '© OpenStreetMap · SRTM | © OpenTopoMap (CC-BY-SA)', maxZoom: 17 }),
        '🏔 Terreno/Relevo (Esri World Topo)': L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          { attribution: 'Esri · USGS · NOAA', maxZoom: 19 }),
        '💧 Claro/hídrico (CARTO Voyager)': L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }),
      };
      L.control.layers(baseMaps, null, { position: 'topright', collapsed: true }).addTo(m);

      SGA.maps.main = m;

      // Carregar TODOS os 497 municípios
      var todos = await MapUtils._carregarTodosMunicipios();
      MapUtils._buildAllLayers(m, todos);

      ['risco','pluvio','hidrov'].forEach(function(id) {
        if (SGA.maps.layerGroups[id]) SGA.maps.layerGroups[id].addTo(m);
      });
    }, 150);
  },

  initMiniMap() {
    if (SGA.ui.miniMapInited) return;
    SGA.ui.miniMapInited = true;
    var el = document.getElementById('mini-map');
    if (!el) return;

    var center = SGA.config.mapCenter || [-29.5, -53.0];
    var m = L.map('mini-map', {
      zoomControl:false, attributionControl:false,
      dragging:true, scrollWheelZoom:false,
    }).setView(center, SGA.config.municipioAtivo ? 10 : 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18}).addTo(m);

    // Carregar municípios para o mini-mapa
    MapUtils._carregarTodosMunicipios().then(function(todos) {
      // Se tem município ativo, mostrar apenas a região; senão, todo o RS
      var lista = SGA.config.municipioAtivo
        ? todos.filter(function(mu){ return mu.risco && mu.risco.nivel >= 3; })
        : todos;

      lista.forEach(function(mu) {
        var cor = mu.risco ? mu.risco.cor : '#4BAF82';
        L.circle([mu.lat, mu.lng], {
          radius: 4000 + (mu.risco ? mu.risco.nivel * 1500 : 1000),
          color: cor, fillColor: cor,
          fillOpacity: 0.30, weight: 1,
        })
        .bindTooltip('<b>'+mu.nome+'</b><br>'+(mu.risco ? mu.risco.nivel_str : 'N/D'), {sticky:true})
        .addTo(m);
      });
    });

    SGA.maps.mini = m;
  },

  async _carregarTodosMunicipios() {
    if (SGA._municipiosCache) return SGA._municipiosCache;
    try {
      var r = await fetch('/src/assets/data/municipios_rs.json');
      SGA._municipiosCache = await r.json();
      return SGA._municipiosCache;
    } catch(e) {
      return SGA.municipios || [];
    }
  },

  _buildAllLayers(m, todos) {
    var lg = SGA.maps.layerGroups;

    // ZONAS DE RISCO — todos os 497 municípios
    lg.risco = L.layerGroup();
    todos.forEach(function(mu) {
      var cor = mu.risco ? mu.risco.cor : '#4BAF82';
      var nivel = mu.risco ? mu.risco.nivel : 1;
      var score = mu.risco ? mu.risco.score_ia : 0.1;
      L.circle([mu.lat, mu.lng], {
        radius: 3000 + nivel * 2000,
        color: cor, fillColor: cor,
        fillOpacity: 0.15 + score * 0.35,
        weight: 1.2,
      })
      .bindTooltip(
        '<b>'+mu.nome+'</b><br>'
        +'Risco: '+(mu.risco ? mu.risco.nivel_str : 'N/D')+'<br>'
        +'Score IA: '+(mu.risco ? mu.risco.score_ia.toFixed(3) : 'N/D')+'<br>'
        +'Pop: '+mu.populacao.toLocaleString('pt-BR')+'<br>'
        +'Bacia: '+(mu.bacia_hidrografica||'N/D'),
        {sticky:true}
      ).addTo(lg.risco);

      // Label do município (visível só no zoom > 10)
      L.marker([mu.lat, mu.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="font-size:9px;font-weight:700;color:'+cor+';white-space:nowrap;text-shadow:0 0 3px #fff">'+mu.nome+'</div>',
          iconSize: [0,0],
        }),
        pane: 'tooltipPane',
      }).addTo(lg.risco);
    });

    // (Camada "Hidrografia" removida — hidrografia oficial disponível via
    //  IBGE: Rios BC250 e Lagos/Massas d'água, em GeoOficial)

  // ── ESTAÇÕES ANA — estado inteiro (GeoJSON do backend, pontos reais) ──
    // 🟢 ativa (12h) · 🟡 silenciosa · ⚫ convencional
    lg.hidrov = L.layerGroup();   // botão "Réguas ANA"  → fluviométricas
    lg.pluvio = L.layerGroup();   // botão "Pluviômetros" → pluviométricas
    var API = (window.MunicipioInit && MunicipioInit.API_BASE) || 'https://sga-api-1705.onrender.com';
    fetch(API + '/api/ana/estacoes-geojson')
      .then(function(r){ return r.json(); })
      .then(function(fc){
        (fc.features || []).forEach(function(f){
          var p = f.properties, c = f.geometry.coordinates; // GeoJSON = [lng, lat]
          var alvo = (p.tipo === 'Pluviometrica') ? lg.pluvio : lg.hidrov;
          var tip = '<b>' + p.codigo + '</b> — ' + p.nome +
                    (p.rio ? '<br>' + p.rio : '') +
                    '<br>' + (p.municipio || '') +
                    '<br>Status: ' + p.categoria +
                    (p.ultima_cota_cm  != null ? '<br>Cota: ' + (p.ultima_cota_cm/100).toFixed(2) + ' m' : '') +
                    (p.ultima_chuva_mm != null ? '<br>Chuva: ' + p.ultima_chuva_mm + ' mm' : '') +
                    (p.ultima_medicao_em ? '<br>Medição: ' + String(p.ultima_medicao_em).slice(0,16).replace('T',' ') : '');
          L.circleMarker([c[1], c[0]], {
            radius: p.categoria === 'ativa' ? 6 : 4,
            color: '#fff', weight: 1,
            fillColor: p.cor || '#8E8E8E', fillOpacity: 0.9
          }).bindTooltip(tip, {sticky:true}).addTo(alvo);
        });
      })
      .catch(function(e){ console.warn('[mapa] estacoes-geojson:', e.message); });

    // CPRM — suscetibilidade (municípios com risco >= 4)
    lg.cprm = L.layerGroup();
    todos.filter(function(mu){ return mu.risco && mu.risco.nivel >= 4; }).forEach(function(mu) {
      L.circle([mu.lat, mu.lng], {
        radius: 8000,
        color:'#7F55CC', fillColor:'#7F55CC', fillOpacity:.18, weight:1.5, dashArray:'6 4'
      })
      .bindTooltip('CPRM — Suscetibilidade alta · '+mu.nome, {sticky:true})
      .addTo(lg.cprm);
    });

    // ABRIGOS — pontos reais (base estadual OSM, mesma da página "Abrigos & Rotas"),
    // filtrados pelo município ativo. Construção dinâmica em _construirAbrigos().
    lg.abrigo = L.layerGroup();

    // ROTAS DE FUGA — sede do município → abrigos candidatos mais próximos,
    // traçado real pelas vias (OSRM/OSM). Construção dinâmica em _construirRotas().
    lg.rota = L.layerGroup();
  },

  // ── ABRIGOS & ROTAS dinâmicos por município ──────────────────────────────
  // Fonte: /data/geo/abrigos_rs.geojson (locais OSM com cod. IBGE — mesma
  // base da AbrigosPage). HONESTIDADE: capacidade não é inventada; rota OSRM
  // NÃO considera alagamentos — navegação ao vivo é via Waze/Google Maps.

  _abrigosIbge: undefined,  // município da última construção da camada abrigo
  _rotasIbge:   undefined,  // idem para rotas

  _ABRIGO_TIPOS: {
    shelter:          ['Abrigo mapeado',      '🏠'],
    community_centre: ['Centro comunitário',  '🏢'],
    sports_centre:    ['Ginásio / esportivo', '🏟'],
    school:           ['Escola',              '🏫'],
  },

  _distKm(la1, lo1, la2, lo2) {
    var R = 6371, dLa = (la2-la1)*Math.PI/180, dLo = (lo2-lo1)*Math.PI/180;
    var a = Math.sin(dLa/2)*Math.sin(dLa/2) +
            Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)*Math.sin(dLo/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  async _baseAbrigos() {
    if (SGA._abrigosBaseCache) return SGA._abrigosBaseCache;
    try {
      var r = await fetch('/data/geo/abrigos_rs.geojson', { signal: AbortSignal.timeout(15000) });
      if (r.ok) {
        var gj = await r.json();
        SGA._abrigosBaseCache = gj.features || [];
        return SGA._abrigosBaseCache;
      }
    } catch(e) { console.warn('[mapa] base de abrigos:', e.message); }
    return [];
  },

  // Mesma regra da AbrigosPage: município (cod IBGE) + vizinhança de 12 km
  _abrigosDoMunicipio(base, m) {
    var self = this, ibge = String(m.cod_ibge);
    return base
      .map(function(f) {
        var c = f.geometry.coordinates, p = f.properties || {};
        return { nome: p.nome, tipoRaw: p.tipo, ibge: p.ibge, lat: c[1], lng: c[0],
                 dist_km: +self._distKm(m.lat, m.lng, c[1], c[0]).toFixed(1) };
      })
      .filter(function(l){ return l.ibge === ibge || l.dist_km <= 12; })
      .map(function(l){
        var t = self._ABRIGO_TIPOS[l.tipoRaw] || ['Local', '📍'];
        return { nome: l.nome, tipo: t[0], icone: t[1], lat: l.lat, lng: l.lng, dist_km: l.dist_km };
      })
      .sort(function(a,b){ return a.dist_km - b.dist_km; })
      .slice(0, 40);
  },

  _linksNavegacao(lat, lng) {
    var gmaps = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
    var waze  = 'https://www.waze.com/ul?ll=' + lat + '%2C' + lng + '&navigate=yes';
    return '<div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;font-weight:700">' +
           '<a href="' + gmaps + '" target="_blank" rel="noopener">🧭 Google Maps</a>' +
           '<a href="' + waze  + '" target="_blank" rel="noopener">🚙 Waze</a></div>';
  },

  _avisoMapa(titulo, msg) {
    if (!SGA.maps.main) return;
    L.popup({ maxWidth: 280 })
      .setLatLng(SGA.maps.main.getCenter())
      .setContent('<b>' + titulo + '</b><br>' + msg)
      .openOn(SGA.maps.main);
  },

  async _construirAbrigos() {
    var lg = SGA.maps.layerGroups;
    if (!lg.abrigo) return;
    var m = SGA.config.municipioAtivo;
    lg.abrigo.clearLayers();
    this._abrigosIbge = m ? m.cod_ibge : null;
    if (!m || m.lat == null) {
      this._avisoMapa('🏠 Abrigos', 'Selecione um município para ver os locais candidatos a abrigo (fonte OpenStreetMap).');
      return;
    }
    var locais = this._abrigosDoMunicipio(await this._baseAbrigos(), m);
    locais.forEach(function(l) {
      var pop = '<b>' + l.icone + ' ' + l.nome + '</b><br>' +
        'Tipo: ' + l.tipo + '<br>' +
        'Distância da sede: ' + l.dist_km + ' km<br>' +
        'Coordenadas: ' + l.lat.toFixed(5) + ', ' + l.lng.toFixed(5) + '<br>' +
        'Capacidade: não publicada — designação é da Defesa Civil' +
        MapUtils._linksNavegacao(l.lat, l.lng) +
        '<div style="margin-top:4px;font-size:10px;color:#444">Fonte: OpenStreetMap · a rota nos apps usa condições ao vivo (trânsito/bloqueios)</div>';
      L.marker([l.lat, l.lng], {
        icon: L.divIcon({
          className:'',
          html:'<div style="width:18px;height:18px;border-radius:4px;background:#2D7A5C;border:2px solid #fff;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">A</div>',
          iconSize:[18,18], iconAnchor:[9,9],
        })
      })
      .bindTooltip('<b>' + l.nome + '</b><br>' + l.tipo + ' · ' + l.dist_km + ' km da sede', {sticky:true})
      .bindPopup(pop, { maxWidth: 300 })
      .addTo(lg.abrigo);
    });
    if (!locais.length) {
      this._avisoMapa('🏠 Abrigos', 'Nenhum local candidato com nome mapeado no OSM em ' + m.nome +
        ' nem num raio de 12 km — lacuna do mapeamento comunitário, não ausência de abrigos. Consulte a Defesa Civil (199).');
    }
  },

  async _construirRotas() {
    var lg = SGA.maps.layerGroups;
    if (!lg.rota) return;
    var m = SGA.config.municipioAtivo;
    lg.rota.clearLayers();
    this._rotasIbge = m ? m.cod_ibge : null;
    if (!m || m.lat == null) {
      this._avisoMapa('🟢 Rotas de fuga', 'Selecione um município para traçar as rotas (sede → abrigos candidatos mais próximos).');
      return;
    }
    var destinos = this._abrigosDoMunicipio(await this._baseAbrigos(), m)
      .filter(function(l){ return l.dist_km >= 0.3; })   // ignora locais colados na sede
      .slice(0, 3);
    if (!destinos.length) {
      this._avisoMapa('🟢 Rotas de fuga', 'Sem abrigos candidatos mapeados para traçar rotas em ' + m.nome + '. Consulte a Defesa Civil (199).');
      return;
    }
    var aviso = '<div style="margin-top:4px;font-size:10px;color:#8a5a00"><b>Atenção:</b> traçado pelas vias (OSRM/OpenStreetMap) — ' +
                'NÃO considera alagamentos, pontes caídas ou interdições em tempo real. ' +
                'Para condições ao vivo, abra a rota no Waze ou Google Maps.</div>';
    await Promise.all(destinos.map(async function(l) {
      var pop = '<b>🟢 Rota de fuga → ' + l.nome + '</b><br>' + 'Tipo: ' + l.tipo + '<br>';
      try {
        var url = 'https://router.project-osrm.org/route/v1/driving/' +
                  m.lng + ',' + m.lat + ';' + l.lng + ',' + l.lat +
                  '?overview=full&geometries=geojson&alternatives=false';
        var r = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var j = await r.json();
        if (!j.routes || !j.routes.length) throw new Error('sem rota');
        var rt = j.routes[0];
        var latlngs = rt.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
        pop += 'Distância pela via: ' + (rt.distance/1000).toFixed(1) + ' km<br>' +
               'Tempo estimado (sem trânsito): ' + Math.round(rt.duration/60) + ' min' +
               MapUtils._linksNavegacao(l.lat, l.lng) + aviso;
        L.polyline(latlngs, { color:'#2D7A5C', weight:3.5, opacity:.85 })
          .bindTooltip('Rota de fuga → ' + l.nome + ' · ' + (rt.distance/1000).toFixed(1) + ' km (OSRM)', {sticky:true})
          .bindPopup(pop, { maxWidth: 300 })
          .addTo(lg.rota);
      } catch(e) {
        // Fallback honesto: linha reta tracejada, claramente marcada como aproximação
        console.warn('[mapa] OSRM indisponível para ' + l.nome + ':', e.message);
        pop += 'Distância em linha reta: ' + l.dist_km + ' km<br>' +
               '<span style="color:#8a5a00">Roteador OSRM indisponível — traçado aproximado (linha reta).</span>' +
               MapUtils._linksNavegacao(l.lat, l.lng) + aviso;
        L.polyline([[m.lat, m.lng], [l.lat, l.lng]], { color:'#2D7A5C', weight:2.5, opacity:.7, dashArray:'8 5' })
          .bindTooltip('Rota aproximada → ' + l.nome + ' (OSRM indisponível)', {sticky:true})
          .bindPopup(pop, { maxWidth: 300 })
          .addTo(lg.rota);
      }
    }));
  },

  toggleLayer(id) {
    if (!SGA.maps.main) return;
    var state = SGA.ui.mapLayers;
    state[id] = !state[id];
    var lg = SGA.maps.layerGroups[id];
    if (lg) {
      if (state[id]) {
        // Abrigos e Rotas são dinâmicos: (re)constrói se o município mudou
        var ibgeAtual = SGA.config.municipioAtivo ? SGA.config.municipioAtivo.cod_ibge : null;
        if (id === 'abrigo' && MapUtils._abrigosIbge !== ibgeAtual) MapUtils._construirAbrigos();
        if (id === 'rota'   && MapUtils._rotasIbge   !== ibgeAtual) MapUtils._construirRotas();
        lg.addTo(SGA.maps.main);
      }
      else SGA.maps.main.removeLayer(lg);
    }
    var btn = document.getElementById('lb-' + id);
    if (btn) {
      var classes = {risco:' on',pluvio:' on-amber',hidrov:' on-blue',cprm:' on',abrigo:' on',rota:' on'};
      btn.className = 'layer-btn' + (state[id] ? (classes[id]||' on') : '');
    }
  },

  _addMuniCircle(target, mu) {
    var cor = mu.risco ? mu.risco.cor : '#4BAF82';
    var score = mu.risco ? mu.risco.score_ia : 0.1;
    L.circle([mu.lat, mu.lng], {
      radius: 3000 + score * 6000,
      color: cor, fillColor: cor,
      fillOpacity: 0.20 + score * 0.40,
      weight: 1.5,
    })
    .bindTooltip('<b>'+mu.nome+'</b><br>Risco: '+(mu.risco?mu.risco.nivel_str:'N/D'), {sticky:true})
    .addTo(target);
  },

  // Centralizar mapa no município ativo
  centralizarMunicipio(municipio) {
    if (SGA.maps.main && municipio) {
      SGA.maps.main.setView([municipio.lat, municipio.lng], 11);
      // Camadas dinâmicas acompanham o filtro de município
      var st = SGA.ui.mapLayers;
      if (st.abrigo) MapUtils._construirAbrigos();
      if (st.rota)   MapUtils._construirRotas();
    }
    if (SGA.maps.mini && municipio) {
      SGA.maps.mini.setView([municipio.lat, municipio.lng], 10);
    }
  },
};

window.MapUtils  = MapUtils;
window.toggleLayer = function(id) { MapUtils.toggleLayer(id); };
