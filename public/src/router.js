const Router = {
  pages: [
    'painel','mapa','alertas','fluxo','sensores','integracoes',
    'hidroweb','geodados','ia','municipios','abrigos','canais',
    'municipio','relatorio'
  ],

  go(pageId) {
    if (!this.pages.includes(pageId)) return;
    SGA.ui.currentPage = pageId;

    document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
    var navEl = document.getElementById('nav-' + pageId);
    if (navEl) navEl.classList.add('active');

    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    var pageEl = document.getElementById('p-' + pageId);
    if (pageEl) pageEl.classList.add('active');

    // Fechar sidebar no mobile
    if (window.innerWidth <= 768) closeSidebar();

    // Callbacks pós-navegação
    if (pageId === 'mapa') {
      if (!SGA.ui.mapInited) MapUtils.initMainMap();
      else if (SGA.config.municipioAtivo) MapUtils.centralizarMunicipio(SGA.config.municipioAtivo);
    }
    if (pageId === 'painel') setTimeout(function(){ PainelPage.atualizar(); }, 100);
    if (pageId === 'sensores') setTimeout(function(){ SparklineUtils.renderAll(); }, 100);
    if (pageId === 'hidroweb') setTimeout(function(){ SparklineUtils.renderHidroWeb(); }, 100);
    if (pageId === 'municipios' && MunicipiosPage._todos.length === 0) MunicipiosPage.iniciar();
    if (pageId === 'municipio') setTimeout(function(){
      MunicipioPage.iniciar(MunicipioService.getAtivo() || SGA.config.municipioAtivo);
    }, 100);
  },
};

window.go = function(id) { Router.go(id); };
