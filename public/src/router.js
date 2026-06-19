$router = @'
const Router = {
  pages: ['painel','mapa','alertas','fluxo','sensores','integracoes',
          'hidroweb','geodados','ia','municipios','abrigos','canais',
          'canoas','relatorio'],

  go(pageId) {
    if (!this.pages.includes(pageId)) return;
    SGA.ui.currentPage = pageId;

    // Atualizar nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    var navEl = document.getElementById('nav-' + pageId);
    if (navEl) navEl.classList.add('active');

    // Mostrar pagina correta
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    var pageEl = document.getElementById('p-' + pageId);
    if (pageEl) pageEl.classList.add('active');

    // Callbacks pos-navegacao
    if (pageId === 'mapa' && !SGA.ui.mapInited) MapUtils.initMainMap();
    if (pageId === 'sensores') setTimeout(function(){ SparklineUtils.renderAll(); }, 100);
    if (pageId === 'hidroweb') setTimeout(function(){ SparklineUtils.renderHidroWeb(); }, 100);
    if (pageId === 'municipios' && MunicipiosPage._todos.length === 0) MunicipiosPage.iniciar();
    if (pageId === 'canoas') setTimeout(function(){ CanoasPage.atualizar(); }, 100);
  },
};

window.go = function(id) { Router.go(id); };
'@
[System.IO.File]::WriteAllText(
    (Join-Path $PWD 'public\src\router.js'),
    $router,
    (New-Object System.Text.UTF8Encoding $false)
)
Write-Host "router.js reescrito"
