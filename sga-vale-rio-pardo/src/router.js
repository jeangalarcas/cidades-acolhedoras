/**
 * SGA — Router
 */
const Router = {
  pages: ['painel','mapa','alertas','fluxo','sensores','integracoes',
          'hidroweb','geodados','ia','municipios','abrigos','canais','relatorio'],

  go(pageId) {
    if (!this.pages.includes(pageId)) return;
    SGA.ui.currentPage = pageId;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById('nav-' + pageId);
    if (navEl) navEl.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById('p-' + pageId);
    if (pageEl) pageEl.classList.add('active');

    // Callbacks pós-navegação
    if (pageId === 'mapa'       && !SGA.ui.mapInited)     MapUtils.initMainMap();
    if (pageId === 'sensores')  SparklineUtils.renderAll();
    if (pageId === 'hidroweb')  SparklineUtils.renderHidroWeb();
    if (pageId === 'municipios' && MunicipiosPage._todos.length === 0) MunicipiosPage.iniciar();
  },
};

window.go = (id) => Router.go(id);
