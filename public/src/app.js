/**
 * SGA v3 — Aplicacao Principal
 * Sistema de Gestao e Alertas Climaticos
 * Cidades Acolhedoras · Rio Grande do Sul · 497 Municipios
 */

const App = {

  async init() {
    // 1. Detectar municipio/bacia selecionada (URL, sessionStorage)
    if (window.MunicipioInit && window.MunicipioService) {
      await MunicipioInit.init(null); // sem default — exige seleção
    }

    // 2. Renderizar UI
    this.renderShell();

    // 3. Funcionalidades
    this.startClock();
    this.initMiniMap();
    this.initSparklines();
    this.startDataRefresh();

    // 4. Carregar tabela de municípios em background
    setTimeout(function() { MunicipiosPage.iniciar(); }, 1200);
    if (window.PainelSituacao) setTimeout(function() { PainelSituacao.iniciar(); }, 900);

    // 5. Navegar para painel ou município conforme parâmetro URL
    var params = new URLSearchParams(window.location.search);
    var munId  = params.get('municipio');
    var bacId  = params.get('bacia');

    if (munId) {
      // Vindo do seletor com município específico
      Router.go('municipio');
      setTimeout(async function() {
        var m = await MunicipioService.ativar(munId);
        if (m) {
          MunicipioPage.iniciar(m);
          App._atualizarTopbar(m.nome, m.risco ? m.risco.nivel_str : '');
        }
      }, 800);
    } else if (bacId) {
      // Vindo do seletor com bacia hidrográfica oficial (modo bacia)
      Router.go('mapa');
      if (window.BaciaMode) BaciaMode.iniciar(bacId);
      else App._atualizarTopbar('Bacia — ' + bacId, '');
    } else if (SGA.config.municipioAtivo) {
      Router.go('municipio');
      setTimeout(function() {
        MunicipioPage.iniciar(SGA.config.municipioAtivo);
      }, 600);
    } else {
      Router.go('painel');
    }

    // 6. Atualizar sidebar
    App._atualizarSidebar();

    console.log('[SGA v3] Sistema inicializado · 497 municipios disponiveis');
  },

  _atualizarTopbar(nome, nivel) {
    var titulo = document.getElementById('tb-title-text');
    if (titulo) titulo.textContent = 'SGA — ' + nome;
    var sub = document.querySelector('.tb-sub');
    if (sub) sub.textContent = nome + (nivel ? ' · ' + nivel : '');
  },

  _atualizarSidebar() {
    var m = SGA.config.municipioAtivo;
    var el = document.getElementById('sb-municipio-nome');
    var sub = document.querySelector('.sb-region-sub');
    var cnt = document.getElementById('sb-muni-count');
    if (el) el.textContent = m ? m.nome : 'Nenhum selecionado';
    if (sub) sub.textContent = m ? (m.mesorregiao || 'Rio Grande do Sul') : 'Selecione um municipio';
    if (cnt) cnt.textContent = m ? '1' : '0';
  },

  renderShell() {
    document.getElementById('app').innerHTML = `
      ${TopBar.render()}
      <div class="app-wrap">
        ${Sidebar.render()}
        <div class="content" id="content">
          <div id="painel-situacao"></div>
          ${PainelPage.render()}
          ${ControlePage.render()}
          ${MapaPage.render()}
          ${AlertasPage.render()}
          ${FluxoPage.render()}
          ${SensoresPage.render()}
          ${IntegracoesPage.render()}
          ${HidroWebPage.render()}
          ${GeodadosPage.render()}
          ${IAPage.render()}
          ${MunicipiosPage.render()}
          ${AnaliseEspacialPage.render()}
          ${AbrigosPage.render()}
          ${CanaisPage.render()}
          ${MunicipioPage.render()}
          ${RelatorioPage.render()}
        </div>
      </div>
    `;
  },

  startClock() {
    var pad = function(v) { return ('0'+v).slice(-2); };
    var update = function() {
      var n = new Date();
      var el = document.getElementById('clock');
      if (el) el.textContent =
        pad(n.getDate())+'/'+pad(n.getMonth()+1)+'/'+n.getFullYear()+' '+
        pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());
    };
    update();
    setInterval(update, 1000);
  },

  initMiniMap()    { setTimeout(function() { MapUtils.initMiniMap(); }, 400); },
  initSparklines() { setTimeout(function() { SparklineUtils.renderAll(); }, 500); },

  startDataRefresh() {
    setInterval(function() {
      var m = SGA.config.municipioAtivo;
      if (m && window.MunicipioPage && document.getElementById('p-municipio')
          && document.getElementById('p-municipio').classList.contains('active')) {
        MunicipioPage.atualizar();
      }
    }, SGA.config.dataRefreshMs);
  },
};

// MENU MOBILE
window._sbOpen = false;
function toggleSidebar() {
  window._sbOpen = !window._sbOpen;
  var sb = document.querySelector('.sidebar');
  if (sb) sb.classList.toggle('open', window._sbOpen);
  var ov = document.getElementById('mob-overlay');
  if (!ov && window._sbOpen) {
    ov = document.createElement('div');
    ov.id = 'mob-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;';
    ov.onclick = function() { toggleSidebar(); };
    document.body.appendChild(ov);
  }
  if (ov) ov.style.display = window._sbOpen ? 'block' : 'none';
}
function closeSidebar() {
  window._sbOpen = false;
  var sb = document.querySelector('.sidebar');
  if (sb) sb.classList.remove('open');
  var ov = document.getElementById('mob-overlay');
  if (ov) ov.style.display = 'none';
}
function checkMobileBtn() {
  var btn = document.getElementById('btn-menu');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  if (window.innerWidth > 768) closeSidebar();
}
function fazerLogout() {
  localStorage.removeItem('sga_session');
  sessionStorage.clear();
  window.location.href = 'login.html';
}
window.toggleSidebar = toggleSidebar;
window.closeSidebar  = closeSidebar;
window.fazerLogout   = fazerLogout;
window.addEventListener('resize', checkMobileBtn);
document.addEventListener('DOMContentLoaded', function() { setTimeout(checkMobileBtn, 600); });

// Inicializar aplicação
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { App.init(); }, 100);
});
