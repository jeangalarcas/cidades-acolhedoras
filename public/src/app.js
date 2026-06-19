/**
 * SGA v3 â€” AplicaÃ§Ã£o Principal
 * Vale do Rio Pardo â†’ 497 MunicÃ­pios do RS Â· Cidades Acolhedoras
 */

const App = {

  async init() {
    // 1. Detecta e ativa o municÃ­pio (URL, sessionStorage ou padrÃ£o)
    if (window.MunicipioInit && window.MunicipioService) {
      await MunicipioInit.init('canoas');
    }

    // 2. Renderiza a UI
    this.renderShell();

    // 3. Inicializa funcionalidades
    this.startClock();
    this.initMiniMap();
    this.initSparklines();
    this.startDataRefresh();

    // 4. Carrega tabela de municÃ­pios em background
    setTimeout(() => MunicipiosPage.iniciar(), 1000);

    // 5. Navega para o painel
    Router.go('painel');

    // 6. Atualiza label do municÃ­pio na sidebar
    if (SGA.config.municipioAtivo) {
      const el = document.getElementById('sb-municipio-nome');
      if (el) el.textContent = SGA.config.municipioAtivo.nome;
    }

    console.log('[SGA v3] Sistema inicializado Â· 497 municÃ­pios disponÃ­veis');
  },

  renderShell() {
    document.getElementById('app').innerHTML = `
      ${TopBar.render()}
      <div class="app-wrap">
        ${Sidebar.render()}
        <div class="content" id="content">
          ${PainelPage.render()}
          ${MapaPage.render()}
          ${AlertasPage.render()}
          ${FluxoPage.render()}
          ${SensoresPage.render()}
          ${IntegracoesPage.render()}
          ${HidroWebPage.render()}
          ${GeodadosPage.render()}
          ${IAPage.render()}
          ${MunicipiosPage.render()}
          ${AbrigosPage.render()}
          ${CanaisPage.render()}
          ${CanoasPage.render()}
              ${RelatorioPage.render()}
        </div>
      </div>
    `;
  },

  startClock() {
    const pad = v => ('0'+v).slice(-2);
    const update = () => {
      const n = new Date();
      const el = document.getElementById('clock');
      if (el) el.textContent =
        `${pad(n.getDate())}/${pad(n.getMonth()+1)}/${n.getFullYear()} ` +
        `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    };
    update();
    setInterval(update, 1000);
  },

  initMiniMap()    { setTimeout(() => MapUtils.initMiniMap(), 400); },
  initSparklines() { setTimeout(() => SparklineUtils.renderAll(), 500); },

  startDataRefresh() {
    setInterval(() => {
      console.log('[SGA] Ciclo de atualizaÃ§Ã£o de dados...');
    }, SGA.config.dataRefreshMs);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());

function fazerLogout(){localStorage.removeItem('sga_session');window.location.href='login.html';}window.fazerLogout=fazerLogout;

function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var wrap = document.querySelector('.app-wrap');
  var overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick = toggleSidebar;
    wrap.appendChild(overlay);
  }
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  document.body.classList.toggle('sidebar-open');
}

function checkMobile() {
  var btn = document.getElementById('btn-menu');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
}
window.addEventListener('resize', checkMobile);
document.addEventListener('DOMContentLoaded', function(){ setTimeout(checkMobile, 600); });
window.toggleSidebar = toggleSidebar;

// -- MENU MOBILE --------------------------------------------------
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  var overlay = document.getElementById('sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', toggleSidebar);
    document.querySelector('.app-wrap').appendChild(overlay);
  }
  var isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('active', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function checkMobile() {
  var btn = document.getElementById('btn-menu');
  if (!btn) return;
  btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  // Fechar sidebar se redimensionou para desktop
  if (window.innerWidth > 768) {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Fechar sidebar ao navegar para outra página
var _goOriginal = window.go;
window.go = function(id) {
  if (window.innerWidth <= 768) {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  if (_goOriginal) _goOriginal(id);
};

window.toggleSidebar = toggleSidebar;
window.addEventListener('resize', checkMobile);
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(checkMobile, 800);
});

// -- MENU MOBILE FINAL --------------------------------------------
window._sidebarOpen = false;

function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  window._sidebarOpen = !window._sidebarOpen;
  sidebar.classList.toggle('open', window._sidebarOpen);

  var overlay = document.getElementById('mob-overlay');
  if (!overlay && window._sidebarOpen) {
    overlay = document.createElement('div');
    overlay.id = 'mob-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;';
    overlay.onclick = function() { closeSidebar(); };
    document.body.appendChild(overlay);
  }
  if (overlay) overlay.style.display = window._sidebarOpen ? 'block' : 'none';
}

function closeSidebar() {
  window._sidebarOpen = false;
  var sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.classList.remove('open');
  var overlay = document.getElementById('mob-overlay');
  if (overlay) overlay.style.display = 'none';
}

function checkMobileBtn() {
  var btn = document.getElementById('btn-menu');
  if (!btn) return;
  var isMobile = window.innerWidth <= 768;
  btn.style.display = isMobile ? 'flex' : 'none';
  if (!isMobile) closeSidebar();
}

// Override go() para fechar sidebar ao navegar
var __go = window.go;
window.go = function(id) {
  closeSidebar();
  if (__go) __go(id);
};

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.addEventListener('resize', checkMobileBtn);
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(checkMobileBtn, 500);
});

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
    ov.onclick = function(){ toggleSidebar(); };
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
var _go0 = window.go;
window.go = function(id){ closeSidebar(); if(_go0) _go0(id); };
window.toggleSidebar = toggleSidebar;
function _checkBtn() {
  var btn = document.getElementById('btn-menu');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  if (window.innerWidth > 768) closeSidebar();
}
window.addEventListener('resize', _checkBtn);
document.addEventListener('DOMContentLoaded', function(){ setTimeout(_checkBtn, 600); });