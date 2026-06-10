/**
 * SGA — OSM Service (OpenStreetMap + Overpass API)
 */
const OSMService = {
  OVERPASS: 'https://overpass-api.de/api/interpreter',

  async fetchEquipamentosPublicos(bbox) {
    // bbox: [south, west, north, east]
    const query = `[out:json][timeout:25];
      (
        node["amenity"~"hospital|school|shelter|fire_station"](${bbox.join(',')});
        way["amenity"~"hospital|school|shelter"](${bbox.join(',')});
      );
      out body; >; out skel qt;`;

    // PRODUÇÃO:
    // const resp = await fetch(this.OVERPASS, { method:'POST', body: 'data=' + encodeURIComponent(query) });
    // return await resp.json();

    // MOCK
    return { elements: [] };
  },

  async fetchRodovias(bbox) {
    // Retorna rodovias para cálculo de rotas de fuga via OSM
    // PRODUÇÃO: usar OSRM ou Valhalla para roteamento real
    return { routes: [] };
  },
};
window.OSMService = OSMService;


/**
 * SGA — CPRM Service (GeoSGB · WMS/WFS)
 */
const CPRMService = {
  GEOSERVER: 'https://geoportal.cprm.gov.br/geoserver/wms',

  getWMSUrl(layer) {
    return `${this.GEOSERVER}?service=WMS&version=1.1.0&request=GetMap` +
           `&layers=${layer}&format=image/png&transparent=true`;
  },

  LAYERS: {
    suscetibilidade_inundacao:    'geoportal:suscetibilidade_inundacao',
    suscetibilidade_deslizamento: 'geoportal:suscetibilidade_deslizamento',
    geologia:                     'geoportal:geologia_250k',
    aptidao:                      'geoportal:aptidao_agricola',
  },

  // Em produção: adicionar como L.tileLayer.wms(CPRMService.getWMSUrl(...), {...}) no Leaflet
};
window.CPRMService = CPRMService;


/**
 * SGA — CEMADEN Service
 */
const CEMADENService = {
  BASE: 'https://www.cemaden.gov.br/mapainterativo/load/carregaEstacoes.php',

  ESTACOES_VALE: ['431210201A','431210401A','431480501A'],

  async fetchDados() {
    // PRODUÇÃO: usar API CEMADEN com chave de acesso
    // const resp = await fetch(`${this.BASE}?uf=RS&municipio=...`);
    // return await resp.json();
    return SGA.sensoresPluvio.map(s => ({
      codEstacao: s.id,
      municipio:  s.local,
      acumulado:  s.mmh,
      status:     s.status,
    }));
  },
};
window.CEMADENService = CEMADENService;


/**
 * SGA — IBGE Service (API SIDRA v3)
 */
const IBGEService = {
  SIDRA: 'https://servicodados.ibge.gov.br/api/v3/agregados',
  MALHA: 'https://servicodados.ibge.gov.br/api/v3/malhas',

  // Códigos IBGE dos municípios do Vale do Rio Pardo
  CODIGOS_MUNICIPIOS: {
    'rio-pardo':       4315602,
    'santa-cruz':      4316808,
    'venancio-aires':  4322905,
    'cachoeira-sul':   4303003,
    'candelaria':      4304804,
  },

  async fetchMalha(codigoMunicipio) {
    // PRODUÇÃO:
    // const resp = await fetch(`${this.MALHA}/municipios/${codigoMunicipio}?formato=application/vnd.geo+json`);
    // return await resp.json();
    return null;
  },

  async fetchPopulacao(codigoMunicipio) {
    // Tabela 6579 — Censo 2022
    // PRODUÇÃO:
    // const resp = await fetch(`${this.SIDRA}/6579/variaveis/93?localidades=N6[${codigoMunicipio}]`);
    // return await resp.json();
    return null;
  },
};
window.IBGEService = IBGEService;


/**
 * SGA — Open-Meteo Service (NWP gratuito · ECMWF + GFS)
 */
const OpenMeteoService = {
  BASE: 'https://api.open-meteo.com/v1/forecast',

  async fetchPrevisao(lat, lng) {
    try {
      const url = `${this.BASE}?latitude=${lat}&longitude=${lng}` +
        `&hourly=precipitation,precipitation_probability,temperature_2m,windspeed_10m` +
        `&forecast_days=3&timezone=America%2FSao_Paulo`;

      // PRODUÇÃO (API é gratuita, sem chave necessária):
      // const resp = await fetch(url);
      // return await resp.json();

      // MOCK
      return { hourly: { precipitation: Array(72).fill(0).map(() => Math.random() * 15) } };

    } catch (err) {
      console.error('[OpenMeteo] Erro:', err);
      return null;
    }
  },
};
window.OpenMeteoService = OpenMeteoService;


/**
 * SGA — CadÚnico Service (Gov.br API)
 */
const CadUnicoService = {
  BASE: 'https://api.gov.br/cadunico',

  async fetchFamiliasRisco(municipioIBGE) {
    // PRODUÇÃO: requer autenticação OAuth2 via Gov.br
    // Endpoint: GET /familias?municipio={codigo}&em_area_risco=true
    return SGA.social.cadunico;
  },

  async fetchPrioritarios(municipioIBGE) {
    // Retorna famílias com PCDs/idosos/gestantes para evacuação assistida
    return { total: SGA.social.cadunico.pcds_idosos };
  },
};
window.CadUnicoService = CadUnicoService;


/**
 * SGA — SUAS Service (MDS · Rede Socioassistencial)
 */
const SUASService = {
  BASE: 'https://aplicacoes.mds.gov.br/sagi/snas/vigilancia',

  async fetchEquipamentos(municipioIBGE) {
    // PRODUÇÃO: API SAGI/MDS
    return SGA.social.suas;
  },

  async ativarProtocolo(nivel) {
    // Ativa protocolo de acolhimento conforme nível de alerta
    console.log(`[SUAS] Protocolo de acolhimento ativado — nível: ${nivel}`);
    // Em produção: notificar CRAS, CREAS e unidades de acolhimento
  },
};
window.SUASService = SUASService;


/**
 * SGA — SAMU / Bombeiros CAD Service
 */
const SAMUService = {
  // CAD = Computer-Aided Dispatch
  // Integração via WebSocket com a central do SAMU regional

  ws: null,

  connect(wsUrl) {
    // PRODUÇÃO:
    // this.ws = new WebSocket(wsUrl || 'wss://cad.samu.rs.gov.br/ws');
    // this.ws.onmessage = (event) => this._handleOcorrencia(JSON.parse(event.data));
    console.log('[SAMU] Conexão CAD simulada');
  },

  async fetchOcorrencias() {
    return SGA.social.samu;
  },

  async despacharViatura(tipo, lat, lng, motivo) {
    console.log(`[SAMU] Despacho: ${tipo} → ${lat},${lng} — ${motivo}`);
    // Em produção: POST para API CAD
  },

  _handleOcorrencia(data) {
    console.log('[SAMU] Nova ocorrência:', data);
    AlertEngine.emitir({ nivel:'Alto', ...data });
  },
};
window.SAMUService = SAMUService;


/**
 * SGA — Sensor Service (IoT · LoRaWAN + 4G)
 */
const SensorService = {
  REFRESH_MS: 300000, // 5 minutos

  async fetchAll() {
    return {
      hidro:  SGA.sensoresHidro,
      pluvio: SGA.sensoresPluvio,
      solo:   SGA.sensoresSolo,
    };
  },

  async fetchSensorById(id) {
    return [...SGA.sensoresHidro, ...SGA.sensoresPluvio, ...SGA.sensoresSolo]
      .find(s => s.id === id) || null;
  },

  startPolling() {
    this.fetchAll();
    setInterval(() => this.fetchAll(), this.REFRESH_MS);
  },
};
window.SensorService = SensorService;


/**
 * SGA — Notification Service
 * Gerencia os 9 canais de emissão de alertas
 */
const NotificationService = {

  CANAIS: ['app','sms','whatsapp','radio','sirenes','telegram','tv','email','wearable'],

  async enviar(alerta) {
    const canais = this._canaisPorNivel(alerta.nivel);
    console.log(`[Notificação] Nível: ${alerta.nivel} → Canais: ${canais.join(', ')}`);

    // Em produção: chamar APIs reais de cada canal
    // await Promise.all(canais.map(c => this._enviarCanal(c, alerta)));
  },

  _canaisPorNivel(nivel) {
    switch(nivel) {
      case 'Crítico': return ['app','sms','whatsapp','radio','sirenes','telegram','tv','email'];
      case 'Alto':    return ['app','sms','whatsapp','radio','email','telegram'];
      case 'Atenção': return ['app','whatsapp','telegram'];
      default:        return ['app'];
    }
  },

  async _enviarCanal(canal, alerta) {
    // PRODUÇÃO — implementar cada canal:
    // 'sms':      Twilio / Zenvia API
    // 'whatsapp': WhatsApp Business API (Meta)
    // 'app':      Firebase Cloud Messaging (FCM)
    // 'telegram': Telegram Bot API
    // 'email':    SendGrid / AWS SES
    // 'radio':    Integração com sistema de áudio IP
    // 'sirenes':  MQTT para controladores LoRaWAN das sirenes
    // 'tv':       Feed RSS/API para portais de notícias
    console.log(`[${canal.toUpperCase()}] Enviando alerta nível ${alerta.nivel}...`);
  },
};
window.NotificationService = NotificationService;
