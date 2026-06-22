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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap | CPRM · ANA HidroWeb · Cidades Acolhedoras / Correa Eco Social',
        maxZoom: 18,
      }).addTo(m);

      SGA.maps.main = m;

      // Carregar TODOS os 497 municípios
      var todos = await MapUtils._carregarTodosMunicipios();
      MapUtils._buildAllLayers(m, todos);

      ['risco','hidro','pluvio','hidrov'].forEach(function(id) {
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

    // HIDROGRAFIA — principais rios do RS
    lg.hidro = L.layerGroup();
    var rios = [
      {pts:[[-29.50,-52.80],[-29.67,-52.54],[-29.79,-52.38],[-29.99,-52.37],[-30.04,-52.10],[-29.90,-51.80]], nome:'Rio Pardo'},
      {pts:[[-29.40,-52.60],[-29.52,-52.50],[-29.62,-52.44],[-29.72,-52.43]], nome:'Rio Pardinho'},
      {pts:[[-29.20,-53.50],[-29.35,-53.20],[-29.47,-52.90],[-29.52,-52.65],[-29.67,-52.54]], nome:'Rio Jacui Superior'},
      {pts:[[-30.04,-52.89],[-30.02,-52.40],[-29.90,-51.80],[-29.95,-51.50],[-30.00,-51.20]], nome:'Rio Jacui'},
      {pts:[[-29.97,-51.22],[-30.02,-51.18],[-30.05,-51.15]], nome:'Guaiba'},
      {pts:[[-29.95,-51.20],[-29.75,-51.15],[-29.62,-51.05],[-29.47,-50.98]], nome:'Rio dos Sinos'},
      {pts:[[-30.85,-52.52],[-30.54,-52.52],[-30.28,-52.38],[-30.05,-52.10]], nome:'Rio Camaqua'},
      {pts:[[-29.75,-57.08],[-29.60,-56.50],[-29.40,-55.80],[-29.20,-54.80]], nome:'Rio Uruguai'},
      {pts:[[-29.95,-51.20],[-29.97,-51.18],[-29.92,-51.15],[-29.87,-51.12]], nome:'Rio Gravataí'},
    ];
    rios.forEach(function(r) {
      L.polyline(r.pts, {color:'#2A5A8C', weight:2.5, opacity:.55})
        .bindTooltip(r.nome+' · ANA HidroWeb', {sticky:true}).addTo(lg.hidro);
    });

    // RÉGUAS ANA — estações ativas
    lg.hidrov = L.layerGroup();
    var ESTACOES_ANA = [
      {cod:'87480000',nome:'Rio Gravataí — Canoas',   lat:-29.923,lng:-51.187,cota:2.1,status:'Normal'},
      {cod:'87110000',nome:'Rio dos Sinos — S.Leopoldo',lat:-29.767,lng:-51.148,cota:1.8,status:'Normal'},
      {cod:'87150000',nome:'Rio Caí — Montenegro',     lat:-29.692,lng:-51.461,cota:1.5,status:'Normal'},
      {cod:'86990000',nome:'Guaíba — Porto Alegre',    lat:-30.020,lng:-51.218,cota:0.8,status:'Normal'},
      {cod:'87380000',nome:'Rio Jacuí — Cachoeira Sul',lat:-30.040,lng:-52.890,cota:5.8,status:'Normal'},
      {cod:'87600000',nome:'Rio Pardinho — S.Cruz',    lat:-29.725,lng:-52.428,cota:2.1,status:'Normal'},
    ];
    ESTACOES_ANA.forEach(function(s) {
      var cor = s.status==='Critico'?'#B83A2E':s.status==='Alerta'?'#E8A23A':'#2D7A5C';
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className:'',
          html:'<div style="width:14px;height:14px;border-radius:3px;background:'+cor+';border:2px solid #fff;color:#fff;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">H</div>',
          iconSize:[14,14], iconAnchor:[7,7],
        })
      })
      .bindTooltip('<b>'+s.nome+'</b><br>Cota: '+s.cota+'m · '+s.status+'<br><em>ANA HidroWeb</em>', {sticky:true})
      .addTo(lg.hidrov);
    });

    // PLUVIÔMETROS
    lg.pluvio = L.layerGroup();
    (SGA.sensoresPluvio||[]).forEach(function(s) {
      var cor = s.status==='Critico'?'#B83A2E':s.status==='Alto'?'#E8A23A':'#2D7A5C';
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({
          className:'',
          html:'<div style="width:14px;height:14px;border-radius:50%;background:'+cor+';border:2px solid #fff;color:#fff;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">P</div>',
          iconSize:[14,14], iconAnchor:[7,7],
        })
      })
      .bindTooltip('<b>'+s.id+'</b><br>'+s.local+'<br>'+s.mmh+'mm/h · '+s.status, {sticky:true})
      .addTo(lg.pluvio);
    });

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

    // ABRIGOS
    lg.abrigo = L.layerGroup();
    (SGA.abrigos||[]).forEach(function(a) {
      var vagas = typeof a.vagas_livres !== 'undefined' ? a.vagas_livres : Math.round((a.capacidade||a.cap||0) * 0.7);
      L.marker([a.lat, a.lng], {
        icon: L.divIcon({
          className:'',
          html:'<div style="width:18px;height:18px;border-radius:4px;background:#2D7A5C;border:2px solid #fff;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">A</div>',
          iconSize:[18,18], iconAnchor:[9,9],
        })
      })
      .bindTooltip('<b>'+(a.nome||a.nome)+'</b><br>'+vagas+' vagas livres', {sticky:true})
      .addTo(lg.abrigo);
    });

    // ROTAS (OSM-based)
    lg.rota = L.layerGroup();
    [
      {pts:[[-29.99,-52.37],[-29.90,-52.40],[-29.72,-52.43]], label:'RS-471 → Santa Cruz'},
      {pts:[[-29.99,-52.37],[-30.04,-52.50],[-30.04,-52.89]], label:'RS-287 → Cachoeira do Sul'},
      {pts:[[-29.99,-52.37],[-30.10,-52.20],[-30.20,-51.80],[-30.10,-51.50]], label:'BR-290 → Porto Alegre'},
    ].forEach(function(r) {
      L.polyline(r.pts, {color:'#2D7A5C', weight:2.5, opacity:.7, dashArray:'8 5'})
        .bindTooltip('Rota de fuga: '+r.label+' · OSM', {sticky:true}).addTo(lg.rota);
    });
  },

  toggleLayer(id) {
    if (!SGA.maps.main) return;
    var state = SGA.ui.mapLayers;
    state[id] = !state[id];
    var lg = SGA.maps.layerGroups[id];
    if (lg) {
      if (state[id]) lg.addTo(SGA.maps.main);
      else SGA.maps.main.removeLayer(lg);
    }
    var btn = document.getElementById('lb-' + id);
    if (btn) {
      var classes = {risco:' on',hidro:' on-blue',pluvio:' on-amber',hidrov:' on-blue',cprm:' on',abrigo:' on',rota:' on'};
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
    }
    if (SGA.maps.mini && municipio) {
      SGA.maps.mini.setView([municipio.lat, municipio.lng], 10);
    }
  },
};

window.MapUtils  = MapUtils;
window.toggleLayer = function(id) { MapUtils.toggleLayer(id); };
