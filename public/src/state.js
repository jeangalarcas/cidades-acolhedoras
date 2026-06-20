/**
 * SGA v3 — Estado Global Dinâmico
 * Configurado pelo município ou bacia selecionada pelo usuário
 * Remove dependência do Vale do Rio Pardo
 */
const SGA = {

  config: {
    region:      'Rio Grande do Sul',
    state:       'RS',
    version:     '3.0.0',
    mapCenter:   [-29.5, -53.0],
    mapZoom:     7,
    municipioAtivo: null,
    baciaAtiva:     null,
    alertThresholds: {
      cota:          3.5,
      chuva:         80,
      solo:          85,
      scoreAlert:    0.40,
      scoreHigh:     0.65,
      scoreCritical: 0.85,
    },
    dataRefreshMs: 300000,
  },

  ui: {
    currentPage:   'painel',
    mapLayers:     { base:true, risco:true, hidro:true, pluvio:true, hidrov:true, cprm:false, abrigo:false, rota:false },
    intTab:        'all',
    mapInited:     false,
    miniMapInited: false,
  },

  // Dados dinâmicos — preenchidos pelo DataService para o município/bacia ativo
  municipios:     [],   // todos os 497 (carregados do JSON)
  alertas:        [],   // alertas do município ativo
  estacoesANA:    [],   // estações do município ativo
  sensoresHidro:  [],
  sensoresPluvio: [],
  sensoresSolo:   [],
  abrigos:        [],
  social:         { cadunico:{}, suas:{}, samu:{} },

  maps: { main:null, mini:null, layerGroups:{} },
};

window.SGA = SGA;
