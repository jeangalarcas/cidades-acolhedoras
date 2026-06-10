/**
 * SGA — Sparkline Utilities
 */
const SparklineUtils = {
  render(id, values, color) {
    const el = document.getElementById(id);
    if (!el || !values.length) return;
    const max = Math.max(...values);
    el.innerHTML = values.map(v =>
      `<div class="sparkline-bar" style="height:${Math.round(v/max*22)+3}px;background:${color};opacity:${(.35+v/max*.65).toFixed(2)}"></div>`
    ).join('');
  },

  renderAll() {
    SGA.sensoresHidro.forEach(s => {
      if (s.serie.length) this.render('sp-' + s.id.toLowerCase().replace('-',''), s.serie, s.col);
    });
    SGA.sensoresPluvio.forEach(s => {
      if (s.serie.length) this.render('sp-' + s.id.toLowerCase().replace('-',''), s.serie, s.col);
    });
  },

  renderHidroWeb() {
    this.render('hw-ah03', [1.8,2.1,2.5,2.9,3.4,3.8,4.2,4.8], '#B83A2E');
    this.render('hw-ah07', [1.8,2.0,2.4,2.7,3.1,3.4,3.6,3.9], '#C17D2A');
  },
};
window.SparklineUtils = SparklineUtils;


/**
 * SGA — Risk Utilities
 */
const RiskUtils = {
  scoreToLevel(score) {
    if (score >= 0.85) return { label:'Crítico',  pillClass:'pill-red',    color:'#B83A2E' };
    if (score >= 0.65) return { label:'Alto',      pillClass:'pill-amber',  color:'#E85B50' };
    if (score >= 0.40) return { label:'Médio',     pillClass:'pill-amber',  color:'#E8A23A' };
    return                    { label:'Baixo',     pillClass:'pill-green',  color:'#4BAF82' };
  },

  isAlertActive(atual, limiar) { return atual > limiar; },

  calcScore(cota, cotaNormal, mmh, saturacao) {
    const cotaScore  = Math.min((cota - cotaNormal) / 3.0, 1);
    const chuvaScore = Math.min(mmh / 150, 1);
    const soloScore  = Math.min(saturacao / 100, 1);
    return Math.round(Math.max(cotaScore * .45 + chuvaScore * .35 + soloScore * .20, 0) * 100) / 100;
  },
};
window.RiskUtils = RiskUtils;


/**
 * SGA — Formatters
 */
const Fmt = {
  date(d) {
    const n = d || new Date();
    const p = v => ('0'+v).slice(-2);
    return `${p(n.getDate())}/${p(n.getMonth()+1)}/${n.getFullYear()} ${p(n.getHours())}:${p(n.getMinutes())}`;
  },
  num(v, dec=0)  { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits:dec, maximumFractionDigits:dec }); },
  pct(v)         { return Math.round(v) + '%'; },
  cota(v)        { return v != null ? v.toFixed(2) + 'm' : '—'; },
  mmh(v)         { return v != null ? v + 'mm/h' : '—'; },
};
window.Fmt = Fmt;


/**
 * SGA — Hydrological Utilities
 * Fórmulas para cálculo de CN, IDF e runoff
 */
const HydroUtils = {
  /**
   * Runoff pelo método SCS-CN
   * @param {number} P  - Precipitação acumulada (mm)
   * @param {number} CN - Curve Number da bacia
   * @returns {number} Runoff Q (mm)
   */
  runoffSCS(P, CN) {
    const S = 25400 / CN - 254;       // Retenção potencial (mm)
    const Ia = 0.2 * S;               // Abstração inicial
    if (P <= Ia) return 0;
    return Math.pow(P - Ia, 2) / (P - Ia + S);
  },

  /**
   * Intensidade IDF simplificada (Método de Bell, adaptado RS)
   * @param {number} T  - Tempo de retorno (anos)
   * @param {number} t  - Duração (minutos)
   * @returns {number} Intensidade (mm/h)
   */
  intensidadeIDF(T, t) {
    // Coeficientes calibrados para o Vale do Rio Pardo (ANA HidroWeb)
    const K = 1640, m = 0.185, b = 0.72, n = 0.88;
    return K * Math.pow(T, m) / Math.pow(t + b, n);
  },

  /** CN médio por tipo de uso do solo (USDA SCS) */
  CN_POR_USO: {
    'mata_nativa':    40,
    'campo':          65,
    'agricultura':    75,
    'pastagem':       70,
    'urbano_baixo':   77,
    'urbano_alto':    88,
    'agua':           98,
  },

  /** Tempo de concentração (Fórmula de Kirpich) */
  tempConcentracao(L_km, deltaH_m) {
    return 0.0663 * Math.pow(L_km, 0.77) * Math.pow(deltaH_m / L_km, -0.385);
  },
};
window.HydroUtils = HydroUtils;


/**
 * SGA — Export Utilities
 */
const ExportUtils = {
  toCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows    = data.map(r => Object.values(r).join(',')).join('\n');
    const blob    = new Blob([headers + '\n' + rows], { type:'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
  },

  printPage() { window.print(); },
};
window.ExportUtils = ExportUtils;
