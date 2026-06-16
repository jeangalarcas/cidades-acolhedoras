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
    if (typeof SGA === 'undefined') return;
    SGA.sensoresHidro.forEach(s => {
      if (s.serie && s.serie.length)
        this.render('sp-' + s.id.toLowerCase().replace('-',''), s.serie, s.col);
    });
    SGA.sensoresPluvio.forEach(s => {
      if (s.serie && s.serie.length)
        this.render('sp-' + s.id.toLowerCase().replace('-',''), s.serie, s.col);
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
    if (score >= 0.85) return { label:'Critico',  pillClass:'pill-red',    color:'#B83A2E' };
    if (score >= 0.65) return { label:'Alto',      pillClass:'pill-amber',  color:'#E85B50' };
    if (score >= 0.40) return { label:'Medio',     pillClass:'pill-amber',  color:'#E8A23A' };
    return                    { label:'Baixo',     pillClass:'pill-green',  color:'#4BAF82' };
  },
  isAlertActive(atual, limiar) { return atual > limiar; },
  calcScore(cota, cotaNormal, mmh, saturacao) {
    const cotaScore  = Math.min((cota - cotaNormal) / 3.0, 1);
    const chuvaScore = Math.min(mmh / 150, 1);
    const soloScore  = Math.min(saturacao / 100, 1);
    return Math.round(Math.max(cotaScore*.45 + chuvaScore*.35 + soloScore*.20, 0)*100)/100;
  },
};
window.RiskUtils = RiskUtils;

/**
 * SGA — Export Utilities
 */
const ExportUtils = {
  toCSV(data, filename) {
    if (!data || !data.length) return;
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

/**
 * SGA — Hydrological Utilities
 */
const HydroUtils = {
  runoffSCS(P, CN) {
    const S = 25400/CN - 254;
    const Ia = 0.2*S;
    if (P <= Ia) return 0;
    return Math.pow(P-Ia,2)/(P-Ia+S);
  },
  intensidadeIDF(T, t) {
    const K=1640, m=0.185, b=0.72, n=0.88;
    return K*Math.pow(T,m)/Math.pow(t+b,n);
  },
};
window.HydroUtils = HydroUtils;
