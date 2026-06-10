/**
 * SGA — Estado Global da Aplicação
 * Centraliza todos os dados reativos do sistema
 */

const SGA = {

  // ── Configuração regional ──────────────────────────────────────
  config: {
    region: 'Vale do Rio Pardo',
    state: 'RS',
    version: '3.0.0',
    mapCenter: [-29.85, -52.45],
    mapZoom: 9,
    alertThresholds: {
      cota:  3.5,   // metros
      chuva: 80,    // mm/h
      solo:  85,    // % saturação
      scoreAlert: 0.40,
      scoreHigh:  0.65,
      scoreCritical: 0.85,
    },
    dataRefreshMs: 300000, // 5 minutos
  },

  // ── Estado de UI ──────────────────────────────────────────────
  ui: {
    currentPage: 'painel',
    mapLayers: {
      base:   true,
      risco:  true,
      hidro:  true,
      pluvio: true,
      hidrov: true,
      cprm:   false,
      abrigo: false,
      rota:   false,
    },
    intTab: 'all',
    mapInited: false,
    miniMapInited: false,
  },

  // ── Dados de municípios ────────────────────────────────────────
  municipios: [
    { id:'rio-pardo',         name:'Rio Pardo',           lat:-29.99, lng:-52.37, score:0.94, risco:'Crítico',  pop:38700,  col:'#B83A2E', nota:'Cota: 4,8m · +2,4m acima normal' },
    { id:'santa-cruz',        name:'Santa Cruz do Sul',   lat:-29.72, lng:-52.43, score:0.82, risco:'Alto',     pop:130400, col:'#E85B50', nota:'Pardinho: 3,9m · TR 25a' },
    { id:'venancio-aires',    name:'Venâncio Aires',      lat:-29.61, lng:-52.19, score:0.76, risco:'Alto',     pop:68200,  col:'#E85B50', nota:'Rio Pardo: 3,4m · subindo' },
    { id:'passo-sobrado',     name:'Passo do Sobrado',    lat:-29.78, lng:-52.05, score:0.71, risco:'Alto',     pop:8900,   col:'#E85B50', nota:'Inundação + deslizamento' },
    { id:'cachoeira-sul',     name:'Cachoeira do Sul',    lat:-30.04, lng:-52.89, score:0.55, risco:'Médio',   pop:83200,  col:'#E8A23A', nota:'Jacuí: 6,2m · atenção' },
    { id:'arroio-tigre',      name:'Arroio do Tigre',     lat:-29.34, lng:-53.10, score:0.52, risco:'Médio',   pop:13900,  col:'#E8A23A', nota:'Inundação moderada' },
    { id:'candelaria',        name:'Candelária',           lat:-29.67, lng:-52.77, score:0.48, risco:'Médio',   pop:30800,  col:'#E8A23A', nota:'Deslizamento potencial' },
    { id:'vale-sol',          name:'Vale do Sol',          lat:-29.51, lng:-52.68, score:0.45, risco:'Médio',   pop:10600,  col:'#E8A23A', nota:'Rio Pardinho — atenção' },
    { id:'sinimbu',           name:'Sinimbu',              lat:-29.52, lng:-52.52, score:0.22, risco:'Baixo',   pop:12200,  col:'#4BAF82', nota:'Normal' },
    { id:'encruzilhada',      name:'Encruzilhada do Sul', lat:-30.54, lng:-52.52, score:0.18, risco:'Baixo',   pop:24900,  col:'#4BAF82', nota:'Estável' },
    { id:'pantano-grande',    name:'Pantano Grande',       lat:-30.19, lng:-52.37, score:0.15, risco:'Baixo',   pop:10200,  col:'#4BAF82', nota:'Estável' },
    { id:'ibarama',           name:'Ibarama',              lat:-29.36, lng:-53.01, score:0.19, risco:'Baixo',   pop:6100,   col:'#4BAF82', nota:'Normal' },
    { id:'herveiras',         name:'Herveiras',            lat:-29.23, lng:-52.77, score:0.14, risco:'Baixo',   pop:3600,   col:'#4BAF82', nota:'Normal' },
    { id:'lagoa-bonita',      name:'Lagoa Bonita do Sul', lat:-29.44, lng:-52.89, score:0.12, risco:'Baixo',   pop:3800,   col:'#4BAF82', nota:'Normal' },
    { id:'general-camara',    name:'General Câmara',       lat:-29.90, lng:-51.79, score:0.68, risco:'Alto',    pop:8900,   col:'#E85B50', nota:'Rio Jacuí — atenção' },
  ],

  // ── Estações ANA HidroWeb ─────────────────────────────────────
  estacoesANA: [
    { cod:'87480000', nome:'Rio Pardo — Ponte Nova',    rio:'Rio Pardo',    municipio:'Rio Pardo',           lat:-29.98, lng:-52.36, cota:4.80, normal:2.40, variacao:'+2,4m', vazao:1840, status:'Crítico' },
    { cod:'87600000', nome:'Pardinho — Santa Cruz',     rio:'Rio Pardinho', municipio:'Santa Cruz do Sul',   lat:-29.72, lng:-52.42, cota:3.90, normal:2.10, variacao:'+1,8m', vazao:920,  status:'Alto' },
    { cod:'87620000', nome:'Venâncio Aires',             rio:'Rio Pardo',    municipio:'Venâncio Aires',      lat:-29.61, lng:-52.18, cota:3.40, normal:2.20, variacao:'+1,2m', vazao:680,  status:'Alto' },
    { cod:'87400000', nome:'Cachoeira do Sul',           rio:'Rio Jacuí',    municipio:'Cachoeira do Sul',    lat:-30.04, lng:-52.88, cota:6.20, normal:5.40, variacao:'+0,8m', vazao:2140, status:'Atenção' },
    { cod:'87520000', nome:'Candelária',                 rio:'Rio Pardo',    municipio:'Candelária',           lat:-29.67, lng:-52.79, cota:3.10, normal:2.70, variacao:'+0,4m', vazao:510,  status:'Normal' },
    { cod:'87540000', nome:'Encruzilhada',               rio:'Rio Camaquã',  municipio:'Encruzilhada do Sul', lat:-30.54, lng:-52.51, cota:2.20, normal:2.10, variacao:'+0,1m', vazao:180,  status:'Normal' },
  ],

  // ── Sensores IoT ──────────────────────────────────────────────
  sensoresHidro: [
    { id:'AH-03', local:'Rio Pardo — município', lat:-29.98, lng:-52.36, cota:4.80, normal:2.40, taxa:'+11cm/m', status:'Crítico', col:'#B83A2E', serie:[1.8,2.1,2.5,2.9,3.4,3.8,4.2,4.8] },
    { id:'AH-07', local:'Rio Pardinho — S.Cruz', lat:-29.72, lng:-52.42, cota:3.90, normal:2.10, taxa:'+6cm/m',  status:'Alto',    col:'#C17D2A', serie:[1.8,2.0,2.4,2.7,3.1,3.4,3.6,3.9] },
    { id:'AH-11', local:'Rio Pardo — Candelária', lat:-29.67, lng:-52.75, cota:3.20, normal:2.50, taxa:'+4cm/m',  status:'Alto',    col:'#C17D2A', serie:[1.5,1.8,2.1,2.4,2.7,2.9,3.1,3.2] },
    { id:'AH-15', local:'Jacuí — Cachoeira',      lat:-30.04, lng:-52.88, cota:2.60, normal:2.40, taxa:'+1cm/m',  status:'Normal',  col:'#2D7A5C', serie:[2.2,2.3,2.4,2.5,2.5,2.5,2.6,2.6] },
    { id:'AH-19', local:'Arroio Botucaraí',        lat:-29.67, lng:-52.54, cota:null, normal:1.80, taxa:null,      status:'Offline', col:'#888880', serie:[] },
  ],

  sensoresPluvio: [
    { id:'PV-02', local:'Serra Botucaraí',    lat:-29.67, lng:-52.54, mmh:138, acum6h:620, status:'Crítico', col:'#B83A2E', serie:[18,42,68,90,112,124,132,138] },
    { id:'PV-08', local:'Venâncio Aires',     lat:-29.61, lng:-52.18, mmh:92,  acum6h:380, status:'Alto',    col:'#C17D2A', serie:[12,30,48,62,72,80,88,92] },
    { id:'PV-12', local:'Santa Cruz do Sul',  lat:-29.72, lng:-52.44, mmh:74,  acum6h:280, status:'Alto',    col:'#C17D2A', serie:[10,22,38,50,60,66,70,74] },
    { id:'PV-15', local:'Rio Pardo — cidade', lat:-29.98, lng:-52.37, mmh:88,  acum6h:350, status:'Alto',    col:'#C17D2A', serie:[14,28,44,58,68,76,82,88] },
    { id:'PV-20', local:'Cachoeira do Sul',   lat:-30.04, lng:-52.87, mmh:38,  acum6h:180, status:'Normal',  col:'#2D7A5C', serie:[8,12,18,24,28,32,35,38] },
  ],

  sensoresSolo: [
    { id:'T-04', local:'Serra Botucaraí',    tipo:'Tensiômetro',   valor:89, unidade:'% sat.', limiar:85, status:'Crítico' },
    { id:'I-02', local:'Encosta NE Botucaraí',tipo:'Inclinômetro',  valor:2.8,unidade:'mm/dia', limiar:2.0,status:'Alto' },
    { id:'P-07', local:'Morro da Igreja',    tipo:'Piezômetro',    valor:1.9,unidade:'m nf',   limiar:1.0,status:'Alto' },
    { id:'T-09', local:'Candelária',          tipo:'Tensiômetro',   valor:72, unidade:'% sat.', limiar:85, status:'Normal' },
    { id:'A-01', local:'Ponte Rio Pardo',     tipo:'Acelerômetro',  valor:0.6,unidade:'g',      limiar:1.5,status:'Normal' },
  ],

  // ── Abrigos ──────────────────────────────────────────────────
  abrigos: [
    { id:'a1', nome:'Ginásio Municipal — Rio Pardo',   lat:-29.99, lng:-52.37, cap:2000, ocup:65, cota:24, acess:true },
    { id:'a2', nome:'SENAI — Santa Cruz do Sul',       lat:-29.70, lng:-52.45, cap:2500, ocup:8,  cota:28, acess:true },
    { id:'a3', nome:'Escola Tiradentes — V. Aires',   lat:-29.61, lng:-52.21, cap:1200, ocup:22, cota:31, acess:true },
    { id:'a4', nome:'Ginásio Candelária',               lat:-29.67, lng:-52.79, cap:900,  ocup:35, cota:26, acess:true },
  ],

  // ── Alertas ativos ────────────────────────────────────────────
  alertas: [
    { id:'a1', nivel:'Crítico', titulo:'Inundação iminente — Rio Pardo', local:'Município de Rio Pardo', score:0.94, hora:'14:32', desc:'Rio: 4,8m (+2,4m) · TR 50a · 3.800 pessoas', fontes:['ANA','CEMADEN','IA-LSTM'] },
    { id:'a2', nivel:'Alto',    titulo:'Solo saturado — Serra Botucaraí', local:'Candelária / Santa Cruz', score:0.71, hora:'12:18', desc:'T-04: 89% · I-02: 2,8mm/d', fontes:['IoT','CPRM'] },
    { id:'a3', nivel:'Alto',    titulo:'Chuva extrema — Bacia Norte',    local:'Venâncio Aires / Pardo', score:0.68, hora:'11:55', desc:'138mm/h · CN=84', fontes:['CEMADEN','GOES-16'] },
  ],

  // ── Dados CadÚnico / SUAS / SAMU ─────────────────────────────
  social: {
    cadunico: { familias_risco:3820, bolsa_familia:2190, pcds_idosos:840, criancas:620 },
    suas: { cras:18, creas:4, acolhimento:8, vagas:1240, assistentes:42 },
    samu: { viaturas:8, equipes_bombeiros:6, ocorrencias:24, tmr_min:12, resgates_24h:38 },
  },

  // ── Referências Leaflet (preenchidas em runtime) ──────────────
  maps: {
    main: null,
    mini: null,
    layerGroups: {},
  },

};

// Exporta como global para acesso em todos os módulos
window.SGA = SGA;
